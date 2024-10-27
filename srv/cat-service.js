const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const axios = require('axios');
const FormData = require('form-data');

const AWS_REGION = "us-east-1";
const BUCKET_NAME = "hcp-28765fe3-bcf6-46d5-abdc-35a089911ca4";
const OAUTH_URL = 'https://partdb-msi.authentication.eu10.hana.ondemand.com/oauth/token';
const DOX_API_URL = 'https://aiservices-dox.cfapps.eu10.hana.ondemand.com/document-information-extraction/v1/document/jobs';
const CLIENT_CREDENTIALS = {
    grant_type: 'client_credentials',
    client_id: 'sb-59a2e4c8-d749-4ec5-bd0b-707fa71bd9db!b476844|na-f20548c0-157d-417b-8bbb-1c9f35ecfb2d!b20821',
    client_secret: '7ee9001b-f27e-4520-af59-129504ff79e4$mdDfPjT0dtZheMxJ-qHSmicAzM-KUVsH8dpR0Hfcmyg='
};
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 3000;

class SalesCatalogService extends cds.ApplicationService {
    init() {
        return Promise.all([
            cds.connect.to("db"),
            cds.connect.to("API_SALES_ORDER_SRV"),
            cds.connect.to("API_BUSINESS_PARTNER"),
            cds.connect.to('DocumentExtraction_Dest')
        ]).then(([db, s4HanaSales, s4HanaBP, DocumentExtraction_Dest]) => {
            this.db = db;
            this.s4HanaSales = s4HanaSales;
            this.s4HanaBP = s4HanaBP;
            this.DocumentExtraction_Dest = DocumentExtraction_Dest;

            const { salesorder } = this.entities;

            this.before("NEW", salesorder.drafts, (req) => this.handleNewSalesOrder(db, req));
            this.before('SAVE', salesorder, this.handleSaveSalesOrder.bind(this));
            this.on('getS3File', this.handleS3FileRetrieval.bind(this));
            this.on('processExtractionResults', this.handleExtractionResults.bind(this));
            // this.on('processDocument', (req) => this.handleProcessDocument(req,salesorder,db));
            this.on('processDocument', async (req) => {
                const newSalesorder = Object.assign({}, req.data.salesOrder);
                newSalesorder.DraftAdministrativeData_DraftUUID = cds.utils.uuid();
                const oSalesorder = await this.send({
                    query: INSERT.into(salesorder).entries(newSalesorder),
                    event: "NEW",
                });
                // const result = await this.handleProcessDocument(oSalesorder);
                // if (!result.success) {
                //     req.error(500, result.message);
                // }
                req.notify("Order has been successfully created");
                return oSalesorder;
            });
            return super.init();
        });
    }

    async handleNewSalesOrder(db, req) {
        const documentId = await new SequenceHelper({
            db,
            sequence: "ZSALES_DOCUMENT_ID",
            table: "zsalesorder_SalesOrderEntity",
            field: "documentId",
        }).getNextNumber();

        req.data.documentId = documentId.toString();
    }


    async handleProcessDocument(salesorder) {
        try {

            const accessToken = await this.getAccessToken();
            await this.submitDocumentForExtraction(salesorder.attachments[0], accessToken, { salesorder });

            return {
                success: true,
                message: "Document processing initiated successfully"
            };
        } catch (error) {
            console.error('Error in Document Extraction process:', error.message);
            return {
                success: false,
                message: `Error in Document Extraction process: ${error.message}`
            };
        }
    }

    getAccessToken() {
        return axios.post(OAUTH_URL, new URLSearchParams(CLIENT_CREDENTIALS), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(response => response.data.access_token);
    }

    async submitDocumentForExtraction(attachment, accessToken, req) {
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

        // return axios.post(DOX_API_URL, form, {
        //     headers: { 'Authorization': `Bearer ${accessToken}`, ...form.getHeaders() }
        // })
        // return this.DocumentExtraction_Dest.post('document/jobs', form)
        //  {
        // headers: {
        //     ...form.getHeaders()
        // }
        // }
        // )

        let response;
        try {
            response = await this.DocumentExtraction_Dest.send
                ({
                    method: 'POST', path: '/', data: form, headers:
                        { 'Content-Type': 'multipart/form-data', 'Content-Length': form.getLengthSync() }
                })
            if (response.status >= 200 && response.status < 300) {
                const jobId = response.data.id;
                return this.pollForJobCompletion(jobId, 0, req);
            } else {
                console.log('Error:', response.status, response.statusText);
            }

        }
        catch (error) {
            debugger
            throw new Error("MyAPI err: " + error.message);
        }
        debugger
        // const response = await this.DocumentExtraction_Dest.send
        //     ({
        //         method: 'POST', path: '/document/jobs', data: form, headers:
        //             { 'Content-Type': 'multipart/form-data', 'Accept': 'multipart/mixed' }
        //     })



        // // .then(postResponse => {
        //     const jobId = postResponse.data.id;
        //     return this.pollForJobCompletion(jobId, 0, req);
        // });
    }

    pollForJobCompletion(jobId, retries = 0, req) {
        return this.DocumentExtraction_Dest.get(`/document/jobs/${jobId}`)
            .then(getResponse => {
                console.log(`Attempt ${retries + 1}: Current job status is '${getResponse.status}'`);

                if (getResponse.status === "DONE") {
                    console.log("Job is ready!");
                    return this.handleExtractionResults(jobId, req);
                }

                if (retries >= MAX_RETRIES) {
                    throw new Error(`Job did not reach 'DONE' status after ${MAX_RETRIES} attempts`);
                }

                return new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
                    .then(() => this.pollForJobCompletion(jobId, retries + 1, req));
            });
    }

    handleExtractionResults(jobId, req) {
        return this.getExtractionResults(jobId)
            .then(extractionResults => this.mapExtractionToSalesOrder(extractionResults))
            .then(salesOrderPayload => this.createSalesOrderInS4HANA(salesOrderPayload, req));
    }

    getExtractionResults(jobId) {
        return this.DocumentExtraction_Dest.get(`/document/jobs/${jobId}`)
            .then(response => response.extraction);
    }

    deleteExtractionDocument(jobId) {
        return this.DocumentExtraction_Dest.delete(`/document/jobs/${jobId}`)
            .then(() => {
                console.log(`Successfully deleted document job ${jobId}`);
            })
            .catch(error => {
                console.error(`Error deleting document job ${jobId}:`, error);
                throw new Error('Failed to delete extraction document');
            });
    }

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

        return Promise.all([
            this.s4HanaBP.run(
                SELECT.one.from('A_BusinessPartnerAddress')
                    .where({
                        // BusinessPartnerFullName: headerFields.senderName,
                        StreetName: headerFields.senderStreet,
                        HouseNumber: headerFields.senderHouseNumber,
                        CityName: headerFields.senderCity,
                        PostalCode: headerFields.senderPostalCode,
                        Region: headerFields.senderState,
                        // Country: headerFields.senderCountryCode
                    })
            ).catch(error => {
                console.error(`Error fetching Sold-to Party: ${error.message}`);
                return null;
            }),
            this.s4HanaBP.run(
                SELECT.one.from('A_BusinessPartnerAddress')
                    .where({
                        // StreetName: headerFields.shipToStreet,
                        HouseNumber: headerFields.shipToHouseNumber,
                        CityName: headerFields.shipToCity,
                        PostalCode: headerFields.shipToPostalCode,
                        Region: headerFields.shipToState
                    })
            ).catch(error => {
                console.error(`Error fetching Ship-to Party: ${error.message}`);
                return null;
            })
        ]).then(([soldToResponse, shipToResponse]) => {
            return {
                SalesOrderType: 'OR',
                SoldToParty: '1000294', //shipToResponse.BusinessPartner,//soldToResponse.BusinessPartner, //? shipToResponse.BusinessPartner : null),
                TransactionCurrency: headerFields.currencyCode || '',
                SalesOrderDate: new Date(headerFields.documentDate || Date.now()).toISOString(),
                RequestedDeliveryDate: new Date(headerFields.requestedDeliveryDate || Date.now()).toISOString(),
                to_Item: {
                    results: lineItems.map((item, index) => ({
                        SalesOrderItem: String((index + 1) * 10),
                        Material: item.customerMaterialNumber || '',
                        SalesOrderItemText: item.description || '',
                        RequestedQuantity: parseFloat(item.quantity) || 0
                    }))
                }
            };
        });
    }

    createSalesOrderInS4HANA(payload, req) {
        return this.s4HanaSales.run(
            INSERT.into('A_SalesOrder').entries(payload)
        )
            .then(response => {
                console.log('S/4HANA response:', response);
                // Update request data with response values
                req.data.SalesOrder = response.SalesOrder;
                req.data.SalesOrderType = response.SalesOrderType;
                req.data.TransactionCurrency = response.TransactionCurrency;
                req.data.SalesOrderDate = response.SalesOrderDate;
                req.data.RequestedDeliveryDate = response.RequestedDeliveryDate;
                req.data.PricingDate = response.PricingDate;
                req.data.ShippingCondition = response.ShippingCondition;
                req.data.to_Item = payload.to_Item.results.map((item, index) => ({
                    SalesOrderItem: String((index + 1) * 10),
                    Material: item.Material || '',
                    SalesOrderItemText: item.SalesOrderItemText || '',
                    RequestedQuantity: item.RequestedQuantity || 0
                }));

                return response.SalesOrder;
            })
            .catch(error => {
                console.error('Error posting to S/4HANA:', error);
                throw new Error('Failed to create sales order in S/4HANA');
            });
    }

    handleSaveSalesOrder(req) {
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

        return this.s4HanaSales.run(
            INSERT.into('A_SalesOrder').entries(payload)
        )
            .then(response => {
                console.log('S/4HANA response:', response);
                req.data.SalesOrder = response.SalesOrder;
            })
            .catch(error => {
                console.error('Error posting to S/4HANA:', error);
                req.error(500, 'Failed to create sales order in S/4HANA', error);
            });
    }

    handleS3FileRetrieval(req) {
        const { fileName, accessKeyId, secretAccessKey } = req.data;
        if (!fileName || !accessKeyId || !secretAccessKey) {
            return req.error(400, 'File name, access key ID, and secret access key are required');
        }

        const s3Client = new S3Client({
            region: AWS_REGION,
            credentials: { accessKeyId, secretAccessKey }
        });

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName
        });

        return s3Client.send(command)
            .then(response => this.streamToString(response.Body))
            .then(fileContent => ({
                content: fileContent,
                accessKeyId,
                secretAccessKey
            }))
            .catch(error => {
                return req.error(500, `Failed to retrieve file from S3: ${error.message}`);
            });
    }

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