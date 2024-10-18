const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const axios = require('axios');
const FormData = require('form-data');

const AWS_REGION = "us-east-1";
const BUCKET_NAME = "hcp-28765fe3-bcf6-46d5-abdc-35a089911ca4";
const OAUTH_URL = 'https://yk2lt6xsylvfx4dz.authentication.us10.hana.ondemand.com/oauth/token';
const DOX_API_URL = 'https://aiservices-dox.cfapps.us10.hana.ondemand.com/document-information-extraction/v1/document/jobs';
const CLIENT_CREDENTIALS = {
    grant_type: 'client_credentials',
    client_id: 'sb-85d7253d-72f6-496a-9a3f-d7a30d0831cf!b220961|dox-xsuaa-std-production!b9505',
    client_secret: 'ae70b6b9-804a-4d38-9f6d-af5043dd7256$uywq7WnT8c7sYcnNtFP6PMR3oksIwhctDuVnw_QQxYQ='
};
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;

class SalesCatalogService extends cds.ApplicationService {
    async init() {
        const { salesorder } = this.entities;
        const db = await cds.connect.to("db");
        this.s4HanaService = await cds.connect.to("API_SALES_ORDER_SRV");
        this.DocumentExtraction_Dest = await cds.connect.to('DocumentExtraction_Dest');

        // Handle the creation of a new draft sales order
        this.before("NEW", salesorder.drafts, this.handleNewSalesOrder.bind(this, db));

        // Handle the SAVE operation for sales order
        this.before('SAVE', salesorder, this.handleSaveSalesOrder);

        // Handle S3 file retrieval
        this.on('getS3File', this.handleS3FileRetrieval);

        // Add a new handler for processing extraction results
        this.on('processExtractionResults', this.handleExtractionResults);

        await super.init();
    }

    // Handler for creating a new sales order
    async handleNewSalesOrder(db, req) {
        const documentId = await new SequenceHelper({
            db,
            sequence: "ZSALES_DOCUMENT_ID",
            table: "zsalesorder_SalesOrderEntity",
            field: "documentId",
        }).getNextNumber();
        req.data.documentId = documentId.toString();

        if (req.data.attachments?.length > 0) {
            try {
                const accessToken = await this.getAccessToken();
                await this.submitDocumentForExtraction(req.data.attachments[0], accessToken);
            } catch (error) {
                console.error('Error in Document Extraction process:', error.message);
                req.error(500, 'Error in Document Extraction process');
            }
        }
    }

    // Helper to get OAuth token
    async getAccessToken() {
        const tokenResponse = await axios.post(OAUTH_URL, new URLSearchParams(CLIENT_CREDENTIALS), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return tokenResponse.data.access_token;
    }

    // Helper to submit document for extraction
    async submitDocumentForExtraction(attachment, accessToken) {
        const form = new FormData();
        const fileBuffer = Buffer.from(attachment.content, 'base64');
        form.append('file', fileBuffer, { filename: attachment.filename, contentType: attachment.mimeType });

        const options = {
            schemaName: 'SAP_purchaseOrder_schema',
            clientId: 'default',
            documentType: 'Purchase Order',
            receivedDate: new Date().toISOString().slice(0, 10),
            enrichment: {
                sender: { top: 5, type: "businessEntity", subtype: "supplier" },
                employee: { type: "employee" }
            }
        };
        form.append('options', JSON.stringify(options));

        const postResponse = await axios.post(DOX_API_URL, form, {
            headers: { 'Authorization': `Bearer ${accessToken}`, ...form.getHeaders() }
        });

        const jobId = postResponse.data.id;
        await this.pollForJobCompletion(jobId);
    }

    // Helper to poll for document extraction job completion
    async pollForJobCompletion(jobId) {
        for (let retries = 0; retries < MAX_RETRIES; retries++) {
            const getResponse = await this.DocumentExtraction_Dest.get(`/document/jobs/${jobId}`);
            console.log(`Attempt ${retries + 1}: Current job status is '${getResponse.status}'`);

            if (getResponse.status === "DONE") {
                console.log("Job is ready!");
                await this.handleExtractionResults(jobId);
                return;
            }

            await this.delay(RETRY_DELAY_MS);
        }
        throw new Error(`Job did not reach 'DONE' status after ${MAX_RETRIES} attempts`);
    }

    // Helper to introduce delay between retries
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // New method to handle extraction results
    async handleExtractionResults(jobId) {
        const extractionResults = await this.getExtractionResults(jobId);
        const salesOrderPayload = this.mapExtractionToSalesOrder(extractionResults);
        await this.createSalesOrderInS4HANA(salesOrderPayload);
    }

    // Helper method to get extraction results
    async getExtractionResults(jobId) {
        const response = await this.DocumentExtraction_Dest.get(`/document/jobs/${jobId}`);
        return response.extraction;
    }

    // Helper method to map extraction results to sales order payload
    mapExtractionToSalesOrder(extraction) {
        const headerFields = extraction.headerFields.reduce((acc, field) => {
            acc[field.name] = field.value;
            return acc;
        }, {});

        const lineItems = extraction.lineItems.map(item => {
            return item.reduce((acc, field) => {
                acc[field.name] = field.value;
                return acc;
            }, {});
        });

        return {
            SalesOrderType: 'OR', // Default value, adjust as needed
            SalesOrganization: '1000', // Default value, adjust as needed
            DistributionChannel: '10', // Default value, adjust as needed
            OrganizationDivision: '00', // Default value, adjust as needed
            SoldToParty: headerFields.soldToParty || '',
            PurchaseOrderByCustomer: headerFields.purchaseOrderNumber || '',
            TransactionCurrency: headerFields.currency || 'USD',
            SalesOrderDate: new Date(headerFields.documentDate || Date.now()).toISOString(),
            PricingDate: new Date(headerFields.documentDate || Date.now()).toISOString(),
            RequestedDeliveryDate: new Date(headerFields.requestedDeliveryDate || Date.now()).toISOString(),
            ShippingCondition: headerFields.shippingCondition || '',
            CompleteDeliveryIsDefined: false,
            IncotermsClassification: headerFields.incoterms || '',
            IncotermsLocation1: headerFields.incotermsLocation || '',
            CustomerPaymentTerms: headerFields.paymentTerms || '',
            to_Item: {
                results: lineItems.map((item, index) => ({
                    SalesOrderItem: (index + 1) * 10,
                    Material: item.materialNumber || '',
                    SalesOrderItemText: item.description || '',
                    RequestedQuantity: parseFloat(item.quantity) || 0,
                    RequestedQuantityUnit: item.unit || 'EA',
                    ItemGrossWeight: parseFloat(item.grossWeight) || 0,
                    ItemNetWeight: parseFloat(item.netWeight) || 0,
                    ItemWeightUnit: item.weightUnit || 'KG',
                    NetAmount: parseFloat(item.netAmount) || 0,
                    MaterialGroup: item.materialGroup || '',
                    ProductionPlant: item.productionPlant || '',
                    StorageLocation: item.storageLocation || '',
                    DeliveryGroup: item.deliveryGroup || '',
                    ShippingPoint: item.shippingPoint || ''
                }))
            }
        };
    }

    // Helper method to create sales order in S/4HANA
    async createSalesOrderInS4HANA(payload) {
        try {
            const response = await this.s4HanaService.run(
                INSERT.into('A_SalesOrder').entries(payload)
            );
            console.log('S/4HANA response:', response);
            return response.SalesOrder;
        } catch (error) {
            console.error('Error posting to S/4HANA:', error);
            throw new Error('Failed to create sales order in S/4HANA');
        }
    }

    // Handler for saving sales order
    async handleSaveSalesOrder(req) {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return `/Date(${date.getTime()})/`;
        };

        const payload = {
            SalesOrderType: req.data.SalesOrderType,
            SalesOrganization: req.data.SalesOrganization,
            DistributionChannel: req.data.DistributionChannel,
            OrganizationDivision: req.data.OrganizationDivision,
            SoldToParty: req.data.SoldToParty,
            PurchaseOrderByCustomer: req.data.PurchaseOrderByCustomer,
            TransactionCurrency: req.data.TransactionCurrency,
            SalesOrderDate: new Date(req.data.SalesOrderDate).toISOString(),
            PricingDate: new Date(req.data.PricingDate).toISOString(),
            RequestedDeliveryDate: new Date(req.data.RequestedDeliveryDate).toISOString(),
            ShippingCondition: req.data.ShippingCondition,
            CompleteDeliveryIsDefined: req.data.CompleteDeliveryIsDefined ?? false,
            IncotermsClassification: req.data.IncotermsClassification,
            IncotermsLocation1: req.data.IncotermsLocation1,
            CustomerPaymentTerms: req.data.CustomerPaymentTerms,
            to_Item: {
                results: req.data.to_Item.map(item => ({
                    SalesOrderItem: item.SalesOrderItem,
                    Material: item.Material,
                    SalesOrderItemText: item.SalesOrderItemText,
                    RequestedQuantity: item.RequestedQuantity,
                    RequestedQuantityUnit: item.RequestedQuantityUnit,
                    ItemGrossWeight: item.ItemGrossWeight,
                    ItemNetWeight: item.ItemNetWeight,
                    ItemWeightUnit: item.ItemWeightUnit,
                    NetAmount: item.NetAmount,
                    MaterialGroup: item.MaterialGroup,
                    ProductionPlant: item.ProductionPlant,
                    StorageLocation: item.StorageLocation,
                    DeliveryGroup: item.DeliveryGroup,
                    ShippingPoint: item.ShippingPoint
                }))
            }
        };

        // Post the payload to S/4HANA OData service using srv.run
        try {
            const response = await this.s4HanaService.run(
                INSERT.into('A_SalesOrder').entries(payload)
            );
            console.log('S/4HANA response:', response);
            req.data.SalesOrder = response.SalesOrder;
        } catch (error) {
            console.error('Error posting to S/4HANA:', error);
            req.error(500, 'Failed to create sales order in S/4HANA', error);
        }
    }

    // Handler for S3 file retrieval
    async handleS3FileRetrieval(req) {
        const { fileName, accessKeyId, secretAccessKey } = req.data;
        if (!fileName || !accessKeyId || !secretAccessKey) return req.error(400, 'File name, access key ID, and secret access key are required');

        const s3Client = new S3Client({ region: AWS_REGION, credentials: { accessKeyId, secretAccessKey } });
        try {
            const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: fileName });
            const response = await s3Client.send(command);
            const fileContent = await this.streamToString(response.Body);
            return { content: fileContent, accessKeyId, secretAccessKey };
        } catch (error) {
            return req.error(500, `Failed to retrieve file from S3: ${error.message}`);
        }
    }

    // Helper to convert stream to string
    streamToString(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", chunk => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        });
    }
}

module.exports = { SalesCatalogService };