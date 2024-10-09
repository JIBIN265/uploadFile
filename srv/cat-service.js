const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");

class SalesCatalogService extends cds.ApplicationService {
    async init() {
        const { salesorder, AttachmentEntity, SalesOrderItem, ApisalesOrder } = this.entities;
        const db = await cds.connect.to("db");
        const s4HanaService = await cds.connect.to("API_SALES_ORDER_SRV"); // Connect to the S/4HANA OData service

        // Before creating a new draft sales order
        this.before("NEW", salesorder.drafts, async (req) => {
            if (req.target.name !== "SalesCatalogService.salesorder.drafts") return;

            const documentId = new SequenceHelper({
                db: db,
                sequence: "ZSALES_DOCUMENT_ID",
                table: "zsalesorder_SalesOrderEntity",
                field: "documentId",
            });

            let number = await documentId.getNextNumber();
            req.data.documentId = number.toString();
        });

        // Handle the SAVE operation for salesorder
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

            // Post the payload to S/4HANA OData service using srv.run
            try {
                const response = await s4HanaService.run(
                    INSERT.into('A_SalesOrder').entries(payload)
                );
                console.log('S/4HANA response:', response);
                req.data.SalesOrder = response.SalesOrder;
            } catch (error) {
                console.error('Error posting to S/4HANA:', error);
                req.error(500, 'Failed to create sales order in S/4HANA', error);
            }
        });

        this.on('CREATE', 'Attachments', async (req) => {
            const { FileName, MimeType, FileSize, FileContent } = req.data;

            // Validate input data
            if (!FileName || !FileContent) {
                return req.error(400, 'File name or content is missing.');
            }

            try {
                // Decode base64 content
                const decodedContent = Buffer.from(FileContent, 'base64');

                // Check if file size matches the decoded content
                if (decodedContent.length !== FileSize) {
                    return req.error(400, 'File size mismatch.');
                }

                // Create the attachment record in the database
                const result = await cds.transaction(req).run(
                    INSERT.into(AttachmentEntity).entries({
                        FileName: FileName,
                        MimeType: MimeType,
                        FileSize: FileSize,
                        FileContent: decodedContent,
                        UploadDate: new Date()
                    })
                );

                // Return the result
                return result;

            } catch (error) {
                console.error('Error while uploading file:', error);
                req.error(500, 'An error occurred while processing the file upload.');
            }
        });

        await super.init();
    }
}

module.exports = { SalesCatalogService };
