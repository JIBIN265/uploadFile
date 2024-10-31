sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/Button"
], function (MessageToast, Fragment, Button) {
    'use strict';

    return {
        viewpdf: function ( oControlContext, oAttachmentContexts) {
            MessageToast.show("Custom handler invoked.");
            debugger
            const oContext = oAttachmentContexts[0]; // Get the first attachment context

            if (!oContext) {
                MessageToast.show("No context found.");
                return;
            }

            // Assuming `content` is the property holding the PDF URL
            var sPdfContentUrl = oContext.getProperty("content");

            // Reference to the current controller
            var that = this;

            // Check if the PDF viewer dialog fragment is already loaded
            if (!this.oDialog) {
                Fragment.load({
                    id: "pdfDialog",  // Fragment ID
                    name: "salesorder.ext.controller.Viewpdf",
                    type: "XML",
                    controller: this,
                }).then(function (oDialog) {
                    that.oDialog = oDialog; // Store the dialog reference

                    // Set the URL into the PDFViewer control
                    var oPdfViewer = Fragment.byId("pdfDialog", "pdfViewer");
                    oPdfViewer.setSource(sPdfContentUrl);

                    // Add "End" button programmatically
                    var oEndButton = new Button({
                        text: "Close",
                        icon: "sap-icon://cancel",
                        type: "Reject" ,
                        press: function () {
                            that.oDialog.close(); // Call the onClose handler
                        }
                    });
                    oDialog.addButton(oEndButton);

                    // Open the dialog
                    that.oDialog.open();
                }).catch(function (error) {
                    MessageToast.show("Error loading PDF Viewer: " + error.message);
                });
            } else {
                // If already loaded, just update the PDF source and open the dialog
                var oPdfViewer = Fragment.byId("pdfDialog", "pdfViewer");
                oPdfViewer.setSource(sPdfContentUrl);
                this.oDialog.open();
            }
        },

        onClose: function () {
            // Close the dialog
            this.oDialog.close();
            MessageToast.show("Dialog closed via End button.");
        },

        onDialogClose: function () {
            // Optional: Perform cleanup actions here if needed after the dialog is closed
            MessageToast.show("Dialog closed.");
        }
    };
});