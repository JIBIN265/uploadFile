sap.ui.define(['sap/ui/core/mvc/ControllerExtension'], function (ControllerExtension) {
	'use strict';

	return ControllerExtension.extend('salesorder.ext.controller.SalesorderObjectPageCustom', {
		
			onTableInitialized: function (oEvent) {
				debugger;
				const oTable = oEvent.getSource(); // Access the table instance
				const oUploadButton = oTable.getAggregation("_uploadButton"); // Access the upload button directly
			
				if (oUploadButton) {
					// You can now work with oUploadButton
					oUploadButton.setEnabled(true); // Example: enabling the button
					sap.m.MessageToast.show("Upload button is initialized and available!");
				} else {
					sap.m.MessageToast.show("Upload button is not yet available.");
				}
			},
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf salesorder.ext.controller.SalesorderObjectPageCustom
			 */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
			},
			
			routing: {
				onAfterBinding: async function (oBindingContext) {

					if (!oBindingContext) { return; }
					const oExtensionAPI = this.base.getExtensionAPI();
					const oModel = oExtensionAPI.getModel();

					const oTable = oExtensionAPI.byId("salesorder::salesorderObjectPage--fe::table::attachments::LineItem::Table")
					const oUploadButton = oExtensionAPI.byId("salesorder::salesorderObjectPage--fe::table::attachments::LineItem::Table-uploadButton")
				
					if (oTable) {
						// Attach the onTableInitialized handler
						oTable.attachEventOnce("onActivated", this.onTableInitialized.bind(this));
					}
				
				}
			}
		}
	});
});
