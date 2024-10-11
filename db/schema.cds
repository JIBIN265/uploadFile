using {
    cuid,
    managed
} from '@sap/cds/common';
using {Attachments} from '@cap-js/attachments';

namespace zsalesorder;

entity SalesOrderEntity : cuid, managed {
    documentId                : Integer;
    SalesOrder                : String(10);
    SalesOrderType            : String(4);
    SalesOrganization         : String(4);
    DistributionChannel       : String(2);
    OrganizationDivision      : String(2);
    SoldToParty               : String(10);
    PurchaseOrderByCustomer   : String(35);
    SalesOrderDate            : Date;
    TransactionCurrency       : String(3);
    PricingDate               : Date;
    RequestedDeliveryDate     : Date;
    ShippingCondition         : String(2);
    CompleteDeliveryIsDefined : Boolean;
    IncotermsClassification   : String(3);
    IncotermsLocation1        : String(100);
    CustomerPaymentTerms      : String(4);
    to_Item                   : Composition of many SalesOrderItemEntity;
    attachments               : Composition of many Attachments;
}

aspect SalesOrderItemEntity : cuid, managed {
    SalesOrderItem        : String(6);
    Material              : String(40);
    SalesOrderItemText    : String(50);
    RequestedQuantity     : Decimal(13, 3);
    RequestedQuantityUnit : String(3);
    ItemGrossWeight       : Decimal(15, 3);
    ItemNetWeight         : Decimal(15, 3);
    ItemWeightUnit        : String(3);
    NetAmount             : Decimal(23, 2);
    MaterialGroup         : String(9);
    ProductionPlant       : String(4);
    StorageLocation       : String(4);
    DeliveryGroup         : String(3);
    ShippingPoint         : String(4);
}