sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Fragment, Button, MessageToast, JSONModel) {
    "use strict";

    var handleAddViaUrl = function (pDialog, oEditFlow) {
        var oFileUploader = Fragment.byId("idFileUploadDialogFragmentDefinition", "idFileUploader");
        var oProgressIndicator = Fragment.byId("idFileUploadDialogFragmentDefinition", "idProgressIndicator");

        // Check if a file has been selected
        if (!oFileUploader.getValue()) {
            MessageToast.show("Please select a file first.");
            return;
        }

        // Set dialog busy during upload process
        pDialog.setBusy(true);
        oProgressIndicator.setDisplayValue("0%"); // Reset progress indicator
        oProgressIndicator.setPercentValue(0); // Reset progress value

        // Get the selected file
        var aFiles = oFileUploader.oFileUpload.files;
        if (aFiles.length > 0) {
            var oFile = aFiles[0];

            // Read the file using FileReader
            var reader = new FileReader();

            // Update progress indicator
            reader.onprogress = function (event) {
                if (event.lengthComputable) {
                    var percentComplete = Math.round((event.loaded / event.total) * 100);
                    oProgressIndicator.setDisplayValue(percentComplete + "%");
                    oProgressIndicator.setPercentValue(percentComplete);
                }
            };

            reader.onload = async function (e) {
                try {
                    const fileUrl = URL.createObjectURL(oFile);

                    var oData = {
                        attachments: [{
                            filename: oFile.name,
                            mimeType: oFile.type,
                            url: fileUrl,
                            content: e.target.result.split(',')[1] // Base64 content
                        }]
                        
                    };

                    let sActionName = "processDocument";
                    let mParameters = {
                        model: oEditFlow.getView().getModel(),
                        parameterValues: [{ name: 'salesOrder', value: oData }],
                        invocationGrouping: 'isolated',
                        skipParameterDialog: true
                    };

                    // Invoke action to process the document
                    debugger
                    const oContext = await oEditFlow.invokeAction(sActionName, mParameters);
                } catch (oError) {
                    MessageToast.show("Error uploading file: " + oError.message);
                } finally {
                    pDialog.setBusy(false);
                    oFileUploader.clear(); // Clear the file uploader's data
                    oProgressIndicator.setDisplayValue("0%"); // Reset progress indicator
                    oProgressIndicator.setPercentValue(0); // Reset progress value
                    pDialog.close();
                }
            };

            // Start reading the file as Data URL (for Base64 encoding)
            reader.readAsDataURL(oFile);
        }
    };

    return {
        FileUploadDialog: function () {
            var that = this;
            var oModel = this.getModel();
            var oEditFlow = this.getEditFlow();

            // Check if the dialog is already loaded
            if (!this.pDialog) {
                Fragment.load({
                    id: "idFileUploadDialogFragmentDefinition",
                    name: "salesorder.ext.controller.FileUploadDialog",
                    type: "XML",
                    controller: this
                }).then(function (pDialog) {
                    that.pDialog = pDialog;
                    that.getEditFlow().getView().addDependent(that.pDialog);

                    // Set the "Add" button functionality
                    that.pDialog.setBeginButton(new Button({
                        text: "Upload",
                        press: function () {
                            handleAddViaUrl(that.pDialog, oEditFlow);
                        }
                    }));

                    // Set the "Cancel" button functionality
                    that.pDialog.setEndButton(new Button({
                        text: "Cancel",
                        press: function () {
                            that.pDialog.close();
                        }
                    }));

                    // Open the dialog
                    that.pDialog.open();
                }).catch(function (error) {
                    MessageToast.show("Error loading dialog: " + error.message);
                });
            } else {
                this.pDialog.open();
            }
        },

        closeAddViaUrlFragment: function () {
            this.pDialog.close();
        }
    };
});
