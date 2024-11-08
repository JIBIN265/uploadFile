using {zsalesorder as persistence} from '../db/schema';
using {API_SALES_ORDER_SRV as so} from './external/API_SALES_ORDER_SRV';
using {API_BUSINESS_PARTNER as bp} from './external/API_BUSINESS_PARTNER';

service SalesCatalogService {
    entity salesorder             as projection on persistence.SalesOrderEntity;
    entity SalesOrderItem         as projection on persistence.SalesOrderEntity.to_Item;
    entity attachments            as projection on persistence.SalesOrderEntity.attachments;

    entity ApisalesOrder          as
        projection on so.A_SalesOrder {
            *
        };

    entity BusinessPartnerAddress as
        projection on bp.A_BusinessPartnerAddress {
            *
        };

    entity BusinessPartner        as
        projection on bp.A_BusinessPartner {
            *
        };

    annotate SalesCatalogService.salesorder with @odata.draft.enabled;

    action postSalesWorkflow(currencyCode : String,
                             documentDate : String,
                             documentNumber : String,
                             netAmount : String,
                             paymentTerms : String,
                             receiverId : String,
                             senderAddress : String,
                             senderCity : String,
                             senderCountryCode : String,
                             senderEmail : String,
                             senderFax : String,
                             senderHouseNumber : String,
                             senderName : String,
                             senderPhone : String,
                             senderPostalCode : String,
                             senderState : String,
                             senderStreet : String,
                             shipToAddress : String,
                             shipToCity : String,
                             shipToCountryCode : String,
                             shipToHouseNumber : String,
                             shipToName : String,
                             shipToPostalCode : String,
                             shipToState : String,
                             shipToStreet : String,
                             to_Item : many {
        customerMaterialNumber : String;
        description : String;
        documentDate : String;
        itemNumber : String;
        netAmount : String;
        quantity : String;
        unitOfMeasure : String;
        unitPrice : String;
    })                                              returns {
        message : String;
        indicator: String;
        salesorder : String;

    };

    // @Common.SideEffects #salesorder    : {TargetEntities: ['/SalesCatalogService.EntityContainer/salesorder']}
    // @Common.SideEffects #salesorderItem: {TargetEntities: ['/SalesCatalogService.EntityContainer/SalesOrderItem']}
    // action processDocument(salesOrder : salesorder) returns salesorder;
}
