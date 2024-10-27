using SalesCatalogService as service from '../../srv/cat-service';

annotate service.salesorder with
@(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Label: '{i18n>DocumentId}',
        Value: documentId,
    },
    {
        $Type: 'UI.DataField',
        Label: '{i18n>SalesOrder}',
        Value: SalesOrder,
    },
    {
        $Type: 'UI.DataField',
        Value: SoldToParty,
        Label: '{i18n>SoldToParty}',
    },
    {
        $Type: 'UI.DataField',
        Label: 'SalesOrderType',
        Value: SalesOrderType,
    },
    {
        $Type: 'UI.DataField',
        Label: '{i18n>SalesOrganization}',
        Value: SalesOrganization,
    },
    {
        $Type: 'UI.DataField',
        Value: Status,
        Label: '{i18n>Status}',
    },
    {
        $Type: 'UI.DataField',
        Label: '{i18n>DistributionChannel}',
        Value: DistributionChannel,
    },
    {
        $Type: 'UI.DataField',
        Value: CustomerPaymentTerms,
        Label: '{i18n>CustomerPaymentTerms}',
    },
    {
        $Type: 'UI.DataField',
        Value: RequestedDeliveryDate,
        Label: '{i18n>RequestedDeliveryDate}',
    },
    {
        $Type: 'UI.DataField',
        Value: PricingDate,
        Label: '{i18n>PricingDate}',
    },
    {
        $Type: 'UI.DataField',
        Value: TransactionCurrency,
        Label: '{i18n>TransactionCurrency}',
    },
]);

annotate service.salesorder with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: '{i18n>SalesOrderType}',
                Value: SalesOrderType,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>SalesOrganization}',
                Value: SalesOrganization,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>DistributionChannel}',
                Value: DistributionChannel,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Organization Division',
                Value: OrganizationDivision,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Sold To Party',
                Value: SoldToParty,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>PurchaseOrderByCustomer1}',
                Value: PurchaseOrderByCustomer,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>SalesOrderDate}',
                Value: SalesOrderDate,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>TransactionCurrency}',
                Value: TransactionCurrency,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>PricingDate}',
                Value: PricingDate,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>RequestedDeliveryDate}',
                Value: RequestedDeliveryDate,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>ShippingCondition}',
                Value: ShippingCondition,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>CompleteDeliveryIsDefined}',
                Value: CompleteDeliveryIsDefined,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>IncotermsClassification}',
                Value: IncotermsClassification,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>IncotermsLocation1}',
                Value: IncotermsLocation1,
            },
            {
                $Type: 'UI.DataField',
                Label: '{i18n>CustomerPaymentTerms}',
                Value: CustomerPaymentTerms,
            },
        ],
    },
    UI.Facets                    : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'GeneratedFacet1',
            Label : '{i18n>GeneralInformation}',
            Target: '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>ItemDetails}',
            ID    : 'i18nItemDetails',
            Target: 'to_Item/@UI.LineItem#i18nItemDetails',
        },
    ],

    UI.SelectionFields           : [
        documentId,
        SalesOrder,
        SalesOrderDate,
        DistributionChannel,
        PurchaseOrderByCustomer,
    ],
    UI.HeaderInfo                : {
        Title         : {
            $Type: 'UI.DataField',
            Value: documentId,
        },
        TypeName      : '',
        TypeNamePlural: '',
        Description   : {
            $Type: 'UI.DataField',
            Value: SalesOrder,
        },
    },
    UI.HeaderFacets              : [{
        $Type : 'UI.ReferenceFacet',
        Label : '{i18n>AdminData}',
        ID    : 'AadminData',
        Target: '@UI.FieldGroup#AadminData',
    }, ],
    UI.FieldGroup #AadminData    : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: createdBy,
            },
            {
                $Type: 'UI.DataField',
                Value: createdAt,
            },
            {
                $Type: 'UI.DataField',
                Value: SalesOrder,
            },
        ],
    },
    UI.FieldGroup #ItemDetails   : {
        $Type: 'UI.FieldGroupType',
        Data : [],
    },
);

annotate service.salesorder with {
    documentId @Common.Label: '{i18n>DocumentId}'
};

// annotate service.salesorder with {
//     SalesOrder @Common.Label : '{i18n>SalesOrder}'
// };

// annotate service.salesorder with {
//     SalesOrderDate @Common.Label : '{i18n>SalesOrderDate}'
// };

// annotate service.salesorder with {
//     DistributionChannel @Common.Label : '{i18n>DistributionChannel}'
// };

// annotate service.salesorder with {
//     PurchaseOrderByCustomer @Common.Label : '{i18n>PurchaseOrderByCustomer}'
// };

annotate service.SalesOrderItem with @(UI.LineItem #i18nItemDetails: [
    {
        $Type: 'UI.DataField',
        Value: SalesOrderItem,
        Label: '{i18n>SalesOrderItem}',
    },
    {
        $Type: 'UI.DataField',
        Value: Material,
        Label: 'Material',
    },
    {
        $Type: 'UI.DataField',
        Value: SalesOrderItemText,
        Label: '{i18n>SalesOrderItemText}',
    },
    {
        $Type: 'UI.DataField',
        Value: RequestedQuantity,
        Label: '{i18n>RequestedQuantity}',
    },
    {
        $Type: 'UI.DataField',
        Value: RequestedQuantityUnit,
        Label: '{i18n>RequestedQuantityUnit}',
    },
    {
        $Type: 'UI.DataField',
        Value: ItemGrossWeight,
        Label: '{i18n>ItemGrossWeight}',
    },
    {
        $Type: 'UI.DataField',
        Value: ItemNetWeight,
        Label: '{i18n>ItemNetWeight}',
    },
    {
        $Type: 'UI.DataField',
        Value: ItemWeightUnit,
        Label: '{i18n>ItemWeightUnit}',
    },
    {
        $Type: 'UI.DataField',
        Value: NetAmount,
        Label: '{i18n>NetAmount}',
    },
    {
        $Type: 'UI.DataField',
        Value: MaterialGroup,
        Label: '{i18n>MaterialGroup}',
    },
    {
        $Type: 'UI.DataField',
        Value: ProductionPlant,
        Label: '{i18n>ProductionPlant}',
    },
    {
        $Type: 'UI.DataField',
        Value: StorageLocation,
        Label: '{i18n>StorageLocation}',
    },
    {
        $Type: 'UI.DataField',
        Value: DeliveryGroup,
        Label: '{i18n>DeliveryGroup}',
    },
    {
        $Type: 'UI.DataField',
        Value: ShippingPoint,
        Label: '{i18n>ShippingPoint}',
    },
]);

// annotate service.salesorder @(Common: {SideEffects #pr_enabled2Changed: {
//     SourceProperties: [ID],
//     TargetEntities  : ['']
// }});
