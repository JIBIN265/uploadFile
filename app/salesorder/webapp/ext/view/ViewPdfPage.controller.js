sap.ui.define(
    [
        'sap/fe/core/PageController',
        "sap/ui/model/json/JSONModel"
    ],
    function (PageController, JSONModel) {
        'use strict';

        return PageController.extend('salesorder.ext.view.ViewPdfPage', {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf salesorder.ext.view.ViewPdfPage
             */
             onInit: function () {
            //     debugger
                PageController.prototype.onInit.apply(this, arguments); // needs to be called to properly initialize the page controller
            //     this._sValidPath = sap.ui.require.toUrl("sap/m/sample/PDFViewerEmbedded/sample.pdf");
            //     this._sInvalidPath = sap.ui.require.toUrl("sap/m/sample/PDFViewerEmbedded/sample_nonexisting.pdf");
            //     this._oModel = new JSONModel({
            //         Source: this._sValidPath,
            //         Title: "My Custom Title",
            //         Height: "600px"
            //     });
            //     this.getView().setModel(this._oModel);
            },

            /**
             * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
             * (NOT before the first rendering! onInit() is used for that one!).
             * @memberOf salesorder.ext.view.ViewPdfPage
             */
            //  onBeforeRendering: function() {
            //
            //  },

            /**
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
             * This hook is the same one that SAPUI5 controls get after being rendered.
             * @memberOf salesorder.ext.view.ViewPdfPage
             */
            onAfterRendering: async function (oBindingContext, osecondarycontext) {
                debugger
                var oExtensionAPI = this.getExtensionAPI();
                //Get Geo Map Controller. Full id: "zgeomovingobjectlistv4::MovingObjectObjectPage--fe::CustomSubSection::Geomap--GeoMapControl"
                var oGeomapController = oExtensionAPI.byId("salesorder::attachmentsViewPdfPagePage--_IDGenPDFViewer");
                debugger
                //salesorder::attachmentsViewPdfPagePage--_IDGenPDFViewer
            },

            /**
             * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
             * @memberOf salesorder.ext.view.ViewPdfPage
             */
            //  onExit: function() {
            //
            //  }


            onBack: function () {
                this.getExtensionAPI().getRouting().navigateToRoute("/");
            },
        });
    }
);
