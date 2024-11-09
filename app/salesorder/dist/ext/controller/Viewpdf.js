sap.ui.define(["sap/m/MessageToast","sap/ui/core/Fragment","sap/m/Button"],function(o,e,t){"use strict";return{viewpdf:function(n,i){o.show("Custom handler invoked.");debugger;const s=i[0];if(!s){o.show("No context found.");return}var a=s.getProperty("content");var r=this;if(!this.oDialog){e.load({id:"pdfDialog",name:"salesorder.ext.controller.Viewpdf",type:"XML",controller:this}).then(function(o){r.oDialog=o;var n=e.byId("pdfDialog","pdfViewer");n.setSource(a);var i=new t({text:"Close",icon:"sap-icon://cancel",type:"Reject",press:function(){r.oDialog.close()}});o.addButton(i);r.oDialog.open()}).catch(function(e){o.show("Error loading PDF Viewer: "+e.message)})}else{var l=e.byId("pdfDialog","pdfViewer");l.setSource(a);this.oDialog.open()}},onClose:function(){this.oDialog.close();o.show("Dialog closed via End button.")},onDialogClose:function(){o.show("Dialog closed.")}}});
//# sourceMappingURL=Viewpdf.js.map