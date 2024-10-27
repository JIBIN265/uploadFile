sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/Button",
    "sap/m/MessageToast"
], function (Fragment, Button, MessageToast) {
    "use strict";
    var isUploading = false;

    // Function to upload the file
    var uploadFile = function (oEvent, oDialog, oModel, oEditFlow) {
        var oFileUploader = Fragment.byId("uploadPdfFragment", "uploadSet");
        var aItems = oFileUploader.getAggregation("incompleteItems");

        if (aItems.length === 0) {
            MessageToast.show("Please choose a file first.");
            return;
        }

        var oFile = aItems[0].getFileObject();

        // Check file size (200KB limit)
        if (oFile.size > 200 * 1024) {
            MessageToast.show("Large file detected. Uploading may take a while. Please wait...", { duration: 5000 });
        } else {
            MessageToast.show("Uploading file. Please wait...", { duration: 2000 });
        }

        oDialog.setBusy(true);

        // Read file as Base64 using FileReader API
        var reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const fileUrl = URL.createObjectURL(oFile);

                var oData = {
                    attachments: [{
                        filename: oFile.name,
                        mimeType: oFile.type,
                        url: fileUrl,
                        content: e.target.result.split(',')[1]
                    }]
                };

                var sPath = "/salesorder";
                var oListBinding = oModel.bindList(sPath);

                debugger
                let sActionName = "processDocument";
                let mParameters = {
                    // contexts: oEvent.getSource().getBindingContext(),
                    model: oEditFlow.getView().getModel(),
                    // label: 'Confirm',
                    parameterValues: [{name:'salesOrder', value: oData}],
                    invocationGrouping: 'isolated',
                    skipParameterDialog: true
                };

                oEditFlow.invokeAction(sActionName, mParameters).then(function (response) {
                    debugger
                    MessageToast.show('successfully created FE');
                });

                // Await the create operation and refresh binding
                // var oContext = await oListBinding.create(oData);
                // await oContext.created();
                // debugger
                // const documentId = oContext.getProperty("documentId");

                MessageToast.show("File processed successfully!");

            } catch (oError) {
                MessageToast.show("Error uploading file: " + oError.message);
            } finally {
                // Reset dialog state
                oDialog.setBusy(false);
                isUploading = false;

                // Close the dialog and reset uploader
                oDialog.close();
                oFileUploader.removeAllItems();
            }
        };

        // Read file as base64
        reader.readAsDataURL(oFile);
    };

    // Return the module with methods
    return {
        // Function to open the upload dialog
        UploadPdf: function (oActualEvent) {
            var that = this;
            var oModel = this.getModel();
            debugger
            var oEditFlow = this.getEditFlow();


            isUploading = true;

            // Check if the dialog is already loaded
            if (!this.oDialog) {
                Fragment.load({
                    id: "uploadPdfFragment",
                    name: "salesorder.ext.controller.Uploadpdf",
                    type: "XML",
                    controller: this,
                }).then(function (oDialog) {
                    that.oDialog = oDialog;

                    // Set the "Upload" button functionality
                    that.oDialog.setBeginButton(new Button({
                        text: "Upload",
                        press: function (oEvent) {
                            uploadFile(oEvent, that.oDialog, oModel, oEditFlow);
                        }
                    }));

                    // Set the "Close" button functionality
                    that.oDialog.setEndButton(new Button({
                        text: "Close",
                        press: function () {
                            that.oDialog.close();
                        }
                    }));

                    // Open the dialog
                    that.oDialog.open();
                }).catch(function (error) {
                    MessageToast.show("Error loading PDF Upload Dialog: " + error.message);
                });
            } else {
                // Open the dialog if already loaded
                this.oDialog.open();
            }
        }
    };
});
