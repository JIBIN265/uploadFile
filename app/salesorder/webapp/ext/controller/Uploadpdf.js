sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/Button",
    "sap/m/MessageToast"
],
    function (Fragment, Button, MessageToast) {
        "use strict";

        // Function to upload the file
        var uploadFile = function (oEvent, oDialog, oModel) {
            var oFileUploader = Fragment.byId("uploadPdfFragment", "uploadSet");
            var aItems = oFileUploader.getItems();

            if (aItems.length === 0) {
                MessageToast.show("Please choose a file first.");
                return;
            }

            var oFile = aItems[0].getFileObject();

            // Check file size (200KB limit)
            if (oFile.size > 200 * 1024) {
                MessageToast.show("Large file detected. Uploading may take a while. Please wait...", {
                    duration: 5000
                });
            } else {
                MessageToast.show("Uploading file. Please wait...", {
                    duration: 2000
                });
            }

            // Read file as Base64 using FileReader API
            var reader = new FileReader();
            reader.onload = async function (e) {
                var sFileContent = e.target.result; // This will be a base64 string

                try {
                    var oData = {
                        attachments: [{
                            filename: oFile.name,
                            content: sFileContent.split(",")[1], // Only base64 content without prefix
                            mimeType: oFile.type,
                        }]
                    };

                    var sPath = "/salesorder";
                    var oListBinding = oModel.bindList(sPath);
                    await oListBinding.create(oData);


                    MessageToast.show("File uploaded successfully!");
                } catch (oError) {
                    MessageToast.show("Error uploading file: " + oError.message);
                }
            };

            // Read file as base64
            reader.readAsDataURL(oFile);

            // Close the dialog and reset uploader
            oDialog.close();
            oFileUploader.removeAllItems();
        };

        // Return the module with methods
        return {
            // Function to open the upload dialog
            UploadPdf: function (oEvent) {
                var that = this;
                var oModel = this.getModel();

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
                                uploadFile(oEvent, that.oDialog, oModel);
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
