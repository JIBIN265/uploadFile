using {zsalesorder as persistence} from '../db/schema';
using {API_SALES_ORDER_SRV as so} from './external/API_SALES_ORDER_SRV';
using {API_BUSINESS_PARTNER as bp} from './external/API_BUSINESS_PARTNER';

service SalesCatalogService {
    entity salesorder     as projection on persistence.SalesOrderEntity;
    entity SalesOrderItem as projection on persistence.SalesOrderEntity.to_Item;
    entity attachments    as projection on persistence.SalesOrderEntity.attachments;

    entity ApisalesOrder  as
        projection on so.A_SalesOrder {
            *
        };
        entity BusinessPartnerAddress as 
        projection on bp.A_BusinessPartnerAddress {
            *
        };
    
    entity BusinessPartner as
        projection on bp.A_BusinessPartner {
            *
        };

    annotate SalesCatalogService.salesorder with @odata.draft.enabled;

    action getS3File(fileName : String, accessKeyId : String, secretAccessKey : String) returns {
        content : String;
        accessKeyId : String;
        secretAccessKey : String
    };

}
