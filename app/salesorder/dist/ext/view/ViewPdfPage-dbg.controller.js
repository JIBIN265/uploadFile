/* eslint-disable no-unused-vars */

/*eslint no-debugger: "off"*/

sap.ui.define(

    [
        'sap/fe/core/PageController'

    ],

    function (PageController) {

        'use strict';

        return PageController.extend('salesorder.ext.view.ViewPdfPage', {

            /**
 
             * Called when a controller is instantiated and its View controls (if available) are already created.
 
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
 
             * @memberOf salesorder.ext.view.ViewPdfPage
 
             */

            onInit: function () {


                PageController.prototype.onInit.apply(this, arguments); // needs to be called to properly initialize the page controller

            },

            /**
 
             * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
 
             * (NOT before the first rendering! onInit() is used for that one!).
 
             * @memberOf salesorder.ext.view.ViewPdfPage
 
             */

            // onBeforeRendering: function () {

            // },

            /**
 
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
 
             * This hook is the same one that SAPUI5 controls get after being rendered.
 
             * @memberOf salesorder.ext.view.ViewPdfPage
 
             */

            // onAfterRendering: async function () {


            // },

            /**
 
             * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
 
             * @memberOf salesorder.ext.view.ViewPdfPage
 
             */

            //  onExit: function() {

            //

            //  }

            // routing: {
            //     onAfterBinding: async function (oBindingContext) {
            //         debugger
            //         if (!oBindingContext) { return; }
            //         const aContext = oModel.bindContext(oBindingContext.getPath());
            //         // Request the Entity
            //         aContext.requestObject().then(data => {
            //             oCloseFullScreen.setVisible(false)
            //         })
            //     }
            // }

            // },
            handleFullScreen: function (oEvent) {
                this.editFlow.getInternalRouting().switchFullScreen()
                this.byId("salesorder::attachmentsViewPdfPagePage--enterFullScreenBtn").setVisible(false)
                this.byId("salesorder::attachmentsViewPdfPagePage--exitFullScreenBtn").setVisible(true)

            },

            handleExitFullScreen: function (oEvent) {
                this.editFlow.getInternalRouting().switchFullScreen()
                this.byId("salesorder::attachmentsViewPdfPagePage--enterFullScreenBtn").setVisible(true)
                this.byId("salesorder::attachmentsViewPdfPagePage--exitFullScreenBtn").setVisible(false)
            },

            handleClose: function (oEvent) {
                this.editFlow.getInternalRouting().closeColumn()
                //   await  this.editFlow.getInternalRouting().navigateToRoute("/")
            },

            onBack: function (oEvent) {
                var oContext = oEvent.getSource().getBindingContext();
                if (oContext) {
                    this.editFlow.getInternalRouting().navigateBackFromContext(oContext);
                    //Also works
                    // const routing = this.getExtensionAPI().getRouting();
                    // routing.navigateToRoute('salesorderObjectPage', {
                    //     "key": "ID=" + oContext.getProperty("up__ID") + ",IsActiveEntity=" + oContext.getProperty("IsActiveEntity")
                    // });
                }

            },

        });

    }

);