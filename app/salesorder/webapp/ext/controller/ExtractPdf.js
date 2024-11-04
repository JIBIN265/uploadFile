sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/Button"
], function (MessageToast, Button) {
    'use strict';

    return {
        ExtractPdf: async function (oEvent) {
            var that = this;
            var oModel = this.getModel();

            // Create an object to hold necessary references
            var contextData = {
                oEditFlow: this.getEditFlow(),
                oModel: oModel,
                oContext: null // to hold context after creation
            };

            // Create a new root entity record
            var sPath = "/salesorder";
            var oListBinding = contextData.oModel.bindList(sPath);
            contextData.oContext = oListBinding.create(); // Store context here
            await contextData.oContext.created();
            contextData.oEditFlow.getInternalRouting().navigateToContext(contextData.oContext);

            if (!this.fragmentTwo) {
                this.fragmentTwo = this.loadFragment({
                    id: "fragmentTwo",
                    name: "salesorder.ext.controller.ExtractPdf",
                    controller: this
                });
            }

            this.fragmentTwo.then(function (dialog) {
                dialog.setBindingContext(contextData.oContext);
                dialog.setModel(contextData.oModel);

                // Cancel button with contextData.oEditFlow
                dialog.setEndButton(new Button({
                    text: "Cancel",
                    press: async function (oEvent) {
                        debugger;
                        await contextData.oEditFlow.getInternalRouting().navigateBackFromContext(contextData.oContext);
                        contextData.oContext.delete();
                        oEvent.getSource().getParent().getParent().getContent()[0].getContent().refresh();
                        contextData.oEditFlow.getView().getModel("ui").setProperty("/isEditable", false);
                        dialog.close();

                    }
                }));

                // Continue button with contextData.oEditFlow
                dialog.setBeginButton(new Button({
                    text: "Continue",
                    press: async function (oEvent) {
                        debugger;
                        await contextData.oEditFlow.saveDocument(contextData.oContext);
                        oEvent.getSource().getParent().getParent().getContent()[0].getContent().refresh();
                        dialog.close();
                    }
                }));

                var oAttachmentsContext = contextData.oContext.getPath() + "/attachments";
                var oTable = dialog.getContent()[0];
                dialog.getModel("ui").setProperty("/isEditable", true);

                dialog.open();
            });
        },

        closeDialog: function (oEvent) {
            oEvent.getSource().getParent().close();
        }
    };
});
