const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");
const FormData = require('form-data');

const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 3000;

class SalesCatalogService extends cds.ApplicationService {
    async init() {
        // Connect to all services at once
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

        const { salesorder } = this.entities;

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

        this.before('SAVE', salesorder, async (req) => {
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
        });

        this.on('processDocument', async (req) => {
            try {
                // Create new sales order
                const newSalesorder = {
                    ...req.data.salesOrder,
                    DraftAdministrativeData_DraftUUID: cds.utils.uuid()
                };

                const oSalesorder = await this.send({
                    query: INSERT.into(salesorder).entries(newSalesorder),
                    event: "NEW",
                });

                // Process document
                const form = new FormData();
                const attachment = oSalesorder.attachments[0];
                const fileBuffer = Buffer.from(attachment.content, 'base64');
                form.append('file', fileBuffer, {
                    filename: attachment.filename,
                    contentType: attachment.mimeType
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

                // Submit document for extraction
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
                    let extractionResults;

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
                        throw new Error(`Job did not reach 'DONE' status after ${MAX_RETRIES} attempts`);
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

                    // Get business partner data
                    const [soldToResponse, shipToResponse] = await Promise.all([
                        this.s4HanaBP.run(
                            SELECT.one.from('A_BusinessPartnerAddress')
                                .where({
                                    StreetName: headerFields.senderStreet,
                                    HouseNumber: headerFields.senderHouseNumber,
                                    CityName: headerFields.senderCity,
                                    PostalCode: headerFields.senderPostalCode,
                                    Region: headerFields.senderState,
                                })
                        ).catch(() => null),
                        this.s4HanaBP.run(
                            SELECT.one.from('A_BusinessPartnerAddress')
                                .where({
                                    HouseNumber: headerFields.shipToHouseNumber,
                                    CityName: headerFields.shipToCity,
                                    PostalCode: headerFields.shipToPostalCode,
                                    Region: headerFields.shipToState
                                })
                        ).catch(() => null)
                    ]);

                    // Create S4HANA sales order
                    const salesOrderPayload = {
                        SalesOrderType: 'OR',
                        SoldToParty: '1000294',
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

                    const s4Response = await this.s4HanaSales.run(
                        INSERT.into('A_SalesOrder').entries(salesOrderPayload)
                    );

                    console.log('S/4HANA response:', s4Response);

                    const dbUpdatePayload = {
                        s4SalesOrderId: s4Response.SalesOrder,
                        salesOrderType: s4Response.SalesOrderType,
                        soldToParty: s4Response.SoldToParty,
                        transactionCurrency: s4Response.TransactionCurrency,
                        salesOrderDate: s4Response.SalesOrderDate,
                        requestedDeliveryDate: s4Response.RequestedDeliveryDate,
                        lastChangedAt: new Date().toISOString()
                    };

                    // Update HANA DB
                    // const updatedRecord = await UPDATE(salesorder)
                    //     .set(dbUpdatePayload)
                    //     .where({ ID: oSalesorder.ID });
                    const existingDraft = await SELECT.from(salesorder)
                        .where({
                            ID: oSalesorder.ID,
                            IsActiveEntity: false
                        });

                    if (existingDraft.length > 0) {
                        // Update existing draft
                        const updatedRecord = await this.send({
                            query: UPDATE(salesorder)
                                .set(dbUpdatePayload)
                                .where({
                                    ID: oSalesorder.ID,
                                    IsActiveEntity: false
                                }),
                            event: "UPDATE"
                        });
                    } else {
                        // Create new draft
                        const newDraft = {
                            ...dbUpdatePayload,
                            ID: oSalesorder.ID,
                            IsActiveEntity: false,
                            DraftAdministrativeData_DraftUUID: cds.utils.uuid()
                        };

                        const createdDraft = await this.send({
                            query: INSERT.into(salesorder).entries(newDraft),
                            event: "NEW"
                        });
                    }

                    if (updatedRecord === 0) {
                        throw new Error("Update failed: No record found with the specified ID.");
                    }

                    req.notify("Order has been successfully created");
                }

                // throw new Error('Document extraction failed');
            } catch (error) {
                console.error('Error in process:', error);
                req.error(500, `Processing error: ${error.message}`);
            }
        });

        await super.init();
    }
}

module.exports = { SalesCatalogService };