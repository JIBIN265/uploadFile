const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");
const { Console } = require('console');

class SalesCatalogService extends cds.ApplicationService {
    async init() {
        const { salesorder, Files, SalesOrderItem, ApisalesOrder } = this.entities;
        const db = await cds.connect.to("db");
        const s4HanaService = await cds.connect.to("API_SALES_ORDER_SRV");
        // const cmisApi = await cds.connect.to('DMS_REPO');

        // Handle the creation of a new draft sales order
        this.before("NEW", salesorder.drafts, async (req) => {
            if (req.target.name !== "SalesCatalogService.salesorder.drafts") return;

            // Generate the document ID using SequenceHelper
            const documentId = new SequenceHelper({
                db: db,
                sequence: "ZSALES_DOCUMENT_ID",
                table: "zsalesorder_SalesOrderEntity",
                field: "documentId",
            });

            let number = await documentId.getNextNumber();
            req.data.documentId = number.toString();

            // Create document in SAP Document Management Service
            // if (req.data.to_Files && req.data.to_Files.length > 0) {
            //     const file = req.data.to_Files[0];
            //     const currentTime = new Date().toISOString().replace(/[:.-]/g, '_');
            //     const fileName = `${req.data.documentId}_${currentTime}.${file.contentType.split('/').pop()}`;
            //     const fileContentBuffer = Buffer.from(file.content, 'base64');

            //     try {

            //         const tokenResponse = await axios.post(
            //             'https://yk2lt6xsylvfx4dz.authentication.us10.hana.ondemand.com/oauth/token',
            //             new URLSearchParams({
            //                 grant_type: 'client_credentials',
            //                 client_id: 'sb-d63004e0-0505-4cbd-8f63-e3dd95a2f3c8!b220961|sdm-di-DocumentManagement-sdm_integration!b6332',
            //                 client_secret: 'qeavgF21Rh7or3EESH3dEzaoDcQ='
            //             }),
            //             {
            //                 headers: {
            //                     'Content-Type': 'application/x-www-form-urlencoded'
            //                 }
            //             }
            //         );

            //         const accessToken = tokenResponse.data.access_token;

            //         const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
            //         const formData = new FormData();

            //         const multipartBody = [
            //             `--${boundary}`,
            //             'Content-Disposition: form-data; name="cmisaction"',
            //             '',
            //             'createDocument',

            //             `--${boundary}`,
            //             'Content-Disposition: form-data; name="propertyId[0]"',
            //             '',
            //             'cmis:name',

            //             `--${boundary}`,
            //             'Content-Disposition: form-data; name="propertyValue[0]"',
            //             '',
            //             fileName,

            //             `--${boundary}`,
            //             'Content-Disposition: form-data; name="cmis:objectTypeId"',
            //             '',
            //             'cmis:document',

            //             `--${boundary}`,
            //             `Content-Disposition: form-data; name="content"; filename="${fileName}"`,
            //             `Content-Type: ${file.contentType}`,
            //             '',
            //             fileContentBuffer, // The actual file content

            //             `--${boundary}--`,
            //             ''
            //         ];

            //         const bodyBuffer = Buffer.concat(multipartBody.map(part =>
            //             Buffer.isBuffer(part) ? part : Buffer.from(part + '\r\n')
            //         ));

            //         // POST to CMIS API for file creation
            //         const result = await axios.post(
            //             'https://api-sdm-di.cfapps.us10.hana.ondemand.com/browser/02501e52-6509-4f3a-91f2-1fc29e1393fb/root',
            //             bodyBuffer,
            //             {
            //                 headers: {
            //                     'Content-Type': `multipart/form-data; boundary=${boundary}`,
            //                     'Authorization': `Bearer ${accessToken}`,
            //                     'Content-Length': bodyBuffer.length // Ensure Content-Length is set
            //                 }
            //             }
            //         );
            //         console.log('Document created:', result);
            //         // Store the document ID or other relevant information
            //         req.data.documentReference = result.id; // Assuming the API returns an ID
            //     } catch (error) {
            //         console.error('Error creating document:', error);
            //         req.error(500, `Failed to create document: ${error.message}`);
            //     }
            // }
        });

        // Handle the SAVE operation for sales order
        this.before('SAVE', salesorder, async (req) => {
            // Prepare payload for the external API
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

            // Post the payload to the S/4HANA OData service using srv.run
            // try {
            //     const response = await s4HanaService.run(
            //         INSERT.into('A_SalesOrder').entries(payload)
            //     );
            //     console.log('S/4HANA response:', response);
            //     req.data.SalesOrder = response.SalesOrder;
            // } catch (error) {
            //     console.error('Error posting to S/4HANA:', error);
            //     req.error(500, 'Failed to create sales order in S/4HANA', error);
            // }
        });

        await super.init();
    }
}
module.exports = { SalesCatalogService };