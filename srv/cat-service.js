const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

class SalesCatalogService extends cds.ApplicationService {
    async init() {
        const { salesorder, attachments, SalesOrderItem, ApisalesOrder } = this.entities;
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


            //add of 13

            try {

                const FormData = require('form-data');
                const axios = require('axios');
                const DocumentExtraction_Dest = await cds.connect.to('DocumentExtraction_Dest');

                const tokenResponse = await axios.post('https://yk2lt6xsylvfx4dz.authentication.us10.hana.ondemand.com/oauth/token',
                    new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: 'sb-85d7253d-72f6-496a-9a3f-d7a30d0831cf!b220961|dox-xsuaa-std-production!b9505',
                        client_secret: 'ae70b6b9-804a-4d38-9f6d-af5043dd7256$uywq7WnT8c7sYcnNtFP6PMR3oksIwhctDuVnw_QQxYQ='
                    }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                const accessToken = tokenResponse.data.access_token;

                // Prepare the form data
                const form = new FormData();

                // Add the file to the form data
                if (req.data.attachments && req.data.attachments.length > 0) {
                    const attachment = req.data.attachments[0];
                    const fileBuffer = Buffer.from(attachment.content, 'base64');

                    // Append the file to form-data
                    form.append('file', fileBuffer, {
                        filename: attachment.filename,
                        contentType: attachment.mimeType
                    });
                }
                const currentDate = new Date().toISOString().slice(0, 10);
                const options = {
                    schemaName: 'SAP_purchaseOrder_schema',
                    clientId: 'default',
                    documentType: 'Purchase Order',
                    receivedDate: currentDate, // You can dynamically change the date if needed
                    enrichment: {
                        sender: {
                            top: 5,
                            type: "businessEntity",
                            subtype: "supplier"
                        },
                        employee: {
                            type: "employee"
                        }
                    }
                };

                // Add the options as a single JSON string in form-data
                form.append('options', JSON.stringify(options));

                const postResponse = await axios.post('https://aiservices-dox.cfapps.us10.hana.ondemand.com/document-information-extraction/v1/document/jobs',
                    form, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        ...form.getHeaders()
                    }
                });
                // const postResponse = await DocumentExtraction_Dest.post('/document/jobs', form, {
                //     headers: {
                //         // 'Authorization': `Bearer ${accessToken}`,
                //         ...form.getHeaders() // Ensure form-data headers are added
                //     }
                // });

                console.log('POST Response:', postResponse);

                const jobId = postResponse.data.id;

                let retries = 0;
                const maxRetries = 10;  // Maximum number of retries
                const delayMs = 2000;   // 2 seconds delay between retries
                let getResponse;

                // Helper function to wait for a given number of milliseconds
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

                // Start a loop to keep checking the status until it becomes "READY"
                while (retries < maxRetries) {
                    getResponse = await DocumentExtraction_Dest.get(`/document/jobs/${jobId}`);

                    // Check the status field
                    const jobStatus = getResponse.status;

                    console.log(`Attempt ${retries + 1}: Current job status is '${jobStatus}'`);

                    if (jobStatus === "DONE") {
                        console.log("Job is ready!");
                        break;  // Exit the loop when the status is "READY"
                    }

                    // Wait for a few seconds before the next retry
                    await delay(delayMs);
                    retries++;
                }

                // If the status is not ready after max retries, throw an error
                if (retries === maxRetries && getResponse.status !== "DONE") {
                    throw new Error(`Job did not reach 'DONE' status within ${maxRetries * delayMs / 1000} seconds`);
                }

                // Process the final result after the job is DONE
                console.log('GET Response:', getResponse);

                // You can now use both POST and GET response data as needed
            } catch (error) {
                console.error('Error in Document Extraction process:', error.response ? error.response.data : error.message);
                req.error(500, 'Error in Document Extraction process');
            }
            //end of 13

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


        this.on('getS3File', async (req) => {
            // Extract parameters from the request
            const { fileName, accessKeyId, secretAccessKey } = req.data;

            // Validate the inputs
            if (!fileName || !accessKeyId || !secretAccessKey) {
                return req.error(400, 'File name, access key ID, and secret access key are required');
            }

            // Configure S3 client with dynamic accessKeyId and secretAccessKey
            const s3Client = new S3Client({
                region: "us-east-1",  // assuming the region is fixed
                credentials: {
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey
                }
            });

            try {
                // Define parameters for S3 object retrieval
                const params = {
                    Bucket: "hcp-28765fe3-bcf6-46d5-abdc-35a089911ca4",
                    Key: fileName,
                };

                // Send command to S3 to retrieve the object
                const command = new GetObjectCommand(params);
                const response = await s3Client.send(command);

                // Helper function to convert stream to string
                const streamToString = (stream) =>
                    new Promise((resolve, reject) => {
                        const chunks = [];
                        stream.on("data", (chunk) => chunks.push(chunk));
                        stream.on("error", reject);
                        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
                    });

                // Convert the response body (ReadableStream) to string
                const fileContent = await streamToString(response.Body);

                // Return the file content, accessKeyId, and secretAccessKey
                return {
                    content: fileContent,
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey
                };
            } catch (error) {
                // Handle any errors during file retrieval
                return req.error(500, `Failed to retrieve file from S3: ${error.message}`);
            }
        });

        await super.init();
    }
}
module.exports = { SalesCatalogService };