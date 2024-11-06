sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/Button",
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType"
], function (MessageToast, Button, Message, MessageType) {
    'use strict';

    return {
        onPress: async function (oEvent) {
            debugger;
            oEvent.getSource().getParent().getParent().getParent().getAggregation('items')
            // Access the table in the dialog
            // var oTable = dialog.getAggregation("content")[0].getAggregation("items")[1];
            // Create a new root entity record
            // var sPath = contextData.oContext.sPath + "/attachments";
            // var oListBinding = await contextData.oModel.bindList(sPath, contextData.oContext);
            // await oListBinding.refresh()
            // var aContexts = await oListBinding.getContexts();
            // if (aContexts.length === 0) {
            //     MessageToast.show("Add at least one item to the table before submitting.");
            //     return;
            // }
            // await contextData.oEditFlow.saveDocument(contextData.oContext);
            // oEvent.getSource().getParent().getParent().getContent()[0].getContent().refresh();
            // dialog.close();
        },
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
            await contextData.oEditFlow.getInternalRouting().navigateToContext(contextData.oContext);

            if (!this.fragmentTwo) {
                this.fragmentTwo = this.loadFragment({
                    id: "fragmentTwo",
                    name: "salesorder.ext.controller.ExtractPdf",
                    controller: this
                });
            }

            this.fragmentTwo.then(async function (dialog) {
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
                    text: "Submit",
                    enabled: "({= ${salesorder>/attachments}.length})",
                    press: async function (oEvent) {
                        debugger;
                        // Access the table in the dialog
                        var oTable = dialog.getAggregation("content")[0].getAggregation("items")[1];
                        // Create a new root entity record
                        var sPath = contextData.oContext.sPath + "/attachments";
                        var oListBinding = await contextData.oModel.bindList(sPath, contextData.oContext);
                        await oListBinding.refresh()
                        var aContexts = await oListBinding.getContexts();
                        if (aContexts.length === 0) {
                            MessageToast.show("Add at least one item to the table before submitting.");
                            return;
                        }
                        await contextData.oEditFlow.saveDocument(contextData.oContext);
                        oEvent.getSource().getParent().getParent().getContent()[0].getContent().refresh();
                        dialog.close();
                    }
                }));
                // var oInfoMessage = new Message({
                //     type: MessageType.Info,
                //     message: await contextData.oEditFlow.getView().getModel("i18n").getResourceBundle().getText("attachmentMessage")
                //     // message: 'The first file will be extracted, and any additional files will be added as attachments.'
                // });
                // var oAttachmentsContext = contextData.oContext.getPath() + "/attachments";
                debugger;
                var oTable = dialog.getContent()[0].getItems()[1]
                // if (oTable) {
                //     oTable.addMessage(oInfoMessage);
                // }
                // oTable.addAction({
                //     text: "Submit2",
                //     press:  function (oEvent,oSelectedContexts) {
                //         debugger
                //         // Get selected contexts or items
                //         var aSelectedContexts = oTable.getSelectedContexts();

                //         // Check if any items are selected, and show a message if not
                //         if (!aSelectedContexts.length) {
                //             sap.m.MessageToast.show("Please add at least one item to the table before submitting.");
                //             return;
                //         }

                //         // Execute action on each selected item or any other logic you need
                //         aSelectedContexts.forEach(function (oContext) {
                //             // Custom submit logic for each selected context
                //         });

                //         // Show a confirmation message
                //         sap.m.MessageToast.show("Items submitted successfully.");
                //     }
                // });
                await dialog.getModel("ui").setProperty("/isEditable", true);

                dialog.open();
            });
        },

        closeDialog: function (oEvent) {
            oEvent.getSource().getParent().close();
        }
    };
});
