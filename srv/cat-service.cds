using {zsalesorder as persistence} from '../db/schema';
using {API_SALES_ORDER_SRV as so} from './external/API_SALES_ORDER_SRV';

service SalesCatalogService {
    entity salesorder     as projection on persistence.SalesOrderEntity;
    entity SalesOrderItem as projection on persistence.SalesOrderEntity.to_Item;
    // entity Files          as projection on persistence.SalesOrderEntity.to_Files;

    entity ApisalesOrder  as
        projection on so.A_SalesOrder {
            *
        };

    annotate SalesCatalogService.salesorder with @odata.draft.enabled;
}
