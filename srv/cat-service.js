const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");
const FormData = require('form-data');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');
const streamToBlob = require('stream-to-blob')
const LOG = cds.log('cat-service.js')
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 3000;

class SalesCatalogService extends cds.ApplicationService {
    async init() {
        // Connect to all services at once
        const creds = JSON.parse(process.env.VCAP_SERVICES).objectstore[0].credentials;
        this.bucket = creds.bucket;
        this.client = new S3Client({
            region: creds.region,
            credentials: {
                accessKeyId: creds.access_key_id,
                secretAccessKey: creds.secret_access_key,
            },
        });

        const [db, s4HanaSales, s4HanaBP, DocumentExtraction_Dest] = await Promise.all([
            cds.connect.to("db"),
            cds.connect.to("API_SALES_ORDER_SRV"),
            cds.connect.to("API_BUSINESS_PARTNER"),
            cds.connect.to('DocumentExtraction_Dest')
        ]);

        // Store connections
        this.db = db;
        this.s4HanaSales = s4HanaSales;
        this.s4HanaBP = s4HanaBP;
        this.DocumentExtraction_Dest = DocumentExtraction_Dest;

        const { salesorder, attachments } = this.entities;
        const AttachmentsSrv = await cds.connect.to("attachments");

        // Setup event handlers
        this.before("NEW", salesorder.drafts, async (req) => {
            const documentId = await new SequenceHelper({
                db: this.db,
                sequence: "ZSALES_DOCUMENT_ID",
                table: "zsalesorder_SalesOrderEntity",
                field: "documentId",
            }).getNextNumber();
            req.data.documentId = documentId.toString();
        });

        this.after('SAVE', attachments.drafts, async (req) => {
            // debugger;
        });

        this.before('SAVE', salesorder, async (req) => {
            if (!req.data.SalesOrder) {
                if (req.data.SalesOrderType) {
                    try {
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

                        const response = await this.s4HanaSales.run(
                            INSERT.into('A_SalesOrder').entries(payload)
                        );

                        console.log('S/4HANA response:', response);
                        req.data.SalesOrder = response.SalesOrder;
                    } catch (error) {
                        console.error('Error posting to S/4HANA:', error);
                        req.error(500, 'Failed to create sales order in S/4HANA', error);
                    }
                } else {
                    try {

                        const content = await cds.run(SELECT.one.from(attachments.drafts).
                            columns('ID', 'url', 'content', 'mimeType').where({ up__ID: req.data.ID }));

                        // const response = await SELECT.from(attachments, keys).columns("url");
                        let content_s3;
                        if (content?.url) {
                            const Key = content.url;
                            content_s3 = await this.client.send(
                                new GetObjectCommand({
                                    Bucket: this.bucket,
                                    Key,
                                })
                            )
                        };

                        let fileContent
                        try {
                            fileContent = await streamToString(content_s3.Body)
                        } catch (err) { };

                        let keys = { ID: content.ID };
                        LOG.info(req.data);
                        LOG.info(content);

                        // Convert buffer to base64
                        // const base64String = Buffer.from(fileContent).toString('base64');

                        // Process document
                        const form = new FormData();
                        const fileBuffer = Buffer.from(fileContent, 'base64');
                        form.append('file', fileBuffer, {
                            filename: req.data.attachments[0].filename,
                            contentType: req.data.attachments[0].mimeType
                        });

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

                        let status = '';
                        let extractionResults;

                        // Submit document for extraction with error handling
                        try {
                            const extractionResponse = await this.DocumentExtraction_Dest.send({
                                method: 'POST',
                                path: '/',
                                data: form,
                                headers: {
                                    'Content-Type': 'multipart/form-data',
                                    'Content-Length': form.getLengthSync()
                                }
                            });

                            if (extractionResponse.status === 'PENDING') {
                                // Poll for results
                                let retries = 0;
                                let jobDone = false;

                                while (!jobDone && retries < MAX_RETRIES) {
                                    const jobStatus = await this.DocumentExtraction_Dest.get(`/${extractionResponse.id}`);
                                    console.log(`Attempt ${retries + 1}: Current job status is '${jobStatus.status}'`);

                                    if (jobStatus.status === "DONE") {
                                        jobDone = true;
                                        extractionResults = jobStatus.extraction;
                                    } else {
                                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                                        retries++;
                                    }
                                }

                                if (!jobDone) {
                                    status = `Extraction failed after ${MAX_RETRIES} attempts`;
                                    await updateDraftOnly(req.data.SalesOrder.ID, status);
                                    return;
                                }
                            }
                        } catch (error) {
                            status = `Document extraction failed: ${error.message}`;
                            await updateDraftOnly(req.data.SalesOrder.ID, status);
                            return;
                        }

                        // Map extraction results
                        const headerFields = extractionResults.headerFields.reduce((acc, field) => {
                            acc[field.name] = field.value;
                            return acc;
                        }, {});

                        const lineItems = extractionResults.lineItems.map(item => {
                            return item.reduce((acc, field) => {
                                acc[field.name] = field.value;
                                return acc;
                            }, {});
                        });

                        const removeSpecialCharacters = (str) => {
                            if (!str) return str;
                            return str.replace(/[^a-zA-Z0-9\s]/g, '');
                        };

                        // Separate BP lookups with error handling
                        let soldToResponse = null;
                        let shipToResponse = null;

                        try {
                            soldToResponse = await this.s4HanaBP.run(
                                SELECT.one.from('A_BusinessPartnerAddress')
                                    .where({
                                        StreetName: removeSpecialCharacters(headerFields.senderStreet),
                                        HouseNumber: removeSpecialCharacters(headerFields.senderHouseNumber),
                                        CityName: removeSpecialCharacters(headerFields.senderCity),
                                        PostalCode: removeSpecialCharacters(headerFields.senderPostalCode),
                                        Region: removeSpecialCharacters(headerFields.senderState)
                                    })
                            );
                        } catch (error) {
                            status = `SoldTo BP lookup failed: ${error.message}`;
                        }

                        try {
                            shipToResponse = await this.s4HanaBP.run(
                                SELECT.one.from('A_BusinessPartnerAddress')
                                    .where({
                                        // StreetName: removeSpecialCharacters(headerFields.shipToStreet),
                                        HouseNumber: headerFields.shipToHouseNumber,
                                        CityName: headerFields.shipToCity,
                                        PostalCode: headerFields.shipToPostalCode,
                                        Region: headerFields.shipToState,
                                        Country: headerFields.shipToCountryCode
                                    })
                            );
                        } catch (error) {
                            status = `ShipTo BP lookup failed: ${error.message}`;
                        }


                        // Check if both BP lookups failed
                        if (!soldToResponse && !shipToResponse) {
                            status = 'Both Business Partner lookups failed';
                            await updateDraftOnly(req.data.SalesOrder.ID, status);
                            return;
                        }

                        // Create S4HANA sales order
                        const salesOrderPayload = {
                            SalesOrderType: 'OR',
                            SoldToParty: '1000294',//soldToResponse?.BusinessPartner || shipToResponse?.BusinessPartner,
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

                        try {
                            const s4Response = await this.s4HanaSales.run(
                                INSERT.into('A_SalesOrder').entries(salesOrderPayload)
                            );

                            req.data.SalesOrder = s4Response.SalesOrder,
                                req.data.SalesOrderType = s4Response.SalesOrderType,
                                req.data.SoldToParty = s4Response.SoldToParty,
                                req.data.TransactionCurrency = s4Response.TransactionCurrency,
                                req.data.SalesOrderDate = s4Response.SalesOrderDate,
                                req.data.RequestedDeliveryDate = s4Response.RequestedDeliveryDate,
                                req.data.Status = 'Sales Order Created';

                            const lineItemsPayload = lineItems.map((item, index) => ({
                                SalesOrder: s4Response.SalesOrder,
                                SalesOrderItem: String((index + 1) * 10),
                                Material: item.customerMaterialNumber,
                                SalesOrderItemText: item.description,
                                RequestedQuantity: parseFloat(item.quantity),
                            }));
                            req.data.to_Item = lineItemsPayload;

                            req.notify("Order has been successfully created");

                        } catch (error) {
                            req.data.Status = `S4HANA Sales Order creation failed: ${error.message}`;
                            return;
                        }

                    } catch (error) {
                        console.error('Error in process:', error);
                        req.error(500, `Processing error: ${error.message}`);
                    }
                }
            }
        });

        async function streamToString(stream) {
            const chunks = [];
            return new Promise((resolve, reject) => {
                stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
                stream.on('error', (err) => reject(err))
                stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));//resolve(Buffer.concat(chunks).toString('utf8')))
            })
        }

        this.on('postSalesWorkflow', async (req) => {

            const newSalesorder = {
                TransactionCurrency: req.data.currencyCode,
                to_Item: req.data.to_Item.map(item => ({
                    Material: item.customerMaterialNumber || '',
                    SalesOrderItemText: item.description || '',
                    RequestedQuantity: parseFloat(item.quantity) || 0
                })),
                DraftAdministrativeData_DraftUUID: cds.utils.uuid(),
            };

            const oSalesorder = await this.send({
                query: INSERT.into(salesorder).entries(newSalesorder),
                event: "NEW",
            });
            // Construct the sales order payload
            const salesOrderPayload = {
                SalesOrderType: 'OR',
                SoldToParty: '1000294', // Use the relevant party data
                TransactionCurrency: req.data.currencyCode || '',
                SalesOrderDate: new Date(req.data.documentDate || Date.now()).toISOString(),
                RequestedDeliveryDate: new Date(req.data.requestedDeliveryDate || Date.now()).toISOString(),
                to_Item: {
                    results: req.data.to_Item.map((item, index) => ({
                        SalesOrderItem: String((index + 1) * 10),
                        Material: item.customerMaterialNumber || '',
                        SalesOrderItemText: item.description || '',
                        RequestedQuantity: parseFloat(item.quantity) || 0
                    }))
                }
            };

            try {
                const s4Response = await this.s4HanaSales.run(
                    INSERT.into('A_SalesOrder').entries(salesOrderPayload)
                );

                const dbUpdatePayload = {
                    SalesOrder: s4Response.SalesOrder,
                    SalesOrderType: s4Response.SalesOrderType,
                    SoldToParty: s4Response.SoldToParty,
                    TransactionCurrency: s4Response.TransactionCurrency,
                    SalesOrderDate: s4Response.SalesOrderDate,
                    RequestedDeliveryDate: s4Response.RequestedDeliveryDate,
                    Status: 'Sales Order Created',
                    DraftAdministrativeData_DraftUUID: oSalesorder.DraftAdministrativeData_DraftUUID,
                    IsActiveEntity: true
                };


                // Update sales order draft
                await db.run(
                    UPDATE(salesorder.drafts)
                        .set(dbUpdatePayload)
                        .where({ ID: oSalesorder.ID })
                );

                // Get updated draft
                const entitySet = await db.run(
                    SELECT.one.from(salesorder.drafts)
                        .columns(cpx => {
                            cpx`*`,
                                cpx.to_Item(cfy => { cfy`*` }),
                                cpx.attachments(afy => { afy`*` })
                        })
                        .where({ ID: oSalesorder.ID })
                );

                const lineItemsPayload = lineItems.map((item, index) => ({
                    SalesOrder: s4Response.SalesOrder,
                    SalesOrderItem: String((index + 1) * 10),
                    Material: item.customerMaterialNumber,
                    SalesOrderItemText: item.description,
                    RequestedQuantity: parseFloat(item.quantity),
                    up__ID: oSalesorder.ID,
                    DraftAdministrativeData_DraftUUID: cds.utils.uuid(),
                }));


                entitySet.to_Item = lineItemsPayload;
                // Insert into main table and delete draft only on success
                await INSERT(entitySet).into(salesorder);

                await DELETE(salesorder.drafts).where({
                    DraftAdministrativeData_DraftUUID: oSalesorder.DraftAdministrativeData_DraftUUID,
                });
                return {
                    message: 'Sales Order Successfully Created',
                    indicator: 'Y',
                    salesorder: s4Response.SalesOrder
                };

            } catch (error) {
                await updateDraftOnly(oSalesorder.ID, `S4HANA Sales Order creation failed: ${error.message}`);
                return {
                    message: `S4HANA Sales Order creation failed: ${error.message}`,
                    indicator: 'N',
                }
            }
        });

        async function updateDraftOnly(ID, status) {
            await db.run(
                UPDATE(salesorder.drafts)
                    .set({ Status: status })
                    .where({ ID: ID })
            );
        }
        
        await super.init();
    }
}

module.exports = { SalesCatalogService };