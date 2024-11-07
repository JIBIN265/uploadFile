using SalesCatalogService as service from '../../srv/cat-service';

annotate service.salesorder with
@(
    UI.LineItem                                           : [
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
    ],
    UI.SelectionPresentationVariant #tableView            : {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.LineItem', ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
        Text               : 'Table View',
    },
    Analytics.AggregatedProperty #documentId_countdistinct: {
        $Type               : 'Analytics.AggregatedPropertyType',
        Name                : 'documentId_countdistinct',
        AggregatableProperty: documentId,
        AggregationMethod   : 'countdistinct',
        ![@Common.Label]    : 'By Number of Documents',
    },
    UI.Chart #chartView                                   : {
        $Type          : 'UI.ChartDefinitionType',
        ChartType      : #Column,
        Dimensions     : [SalesOrganization, ],
        DynamicMeasures: ['@Analytics.AggregatedProperty#documentId_countdistinct', ],
        Title          : 'Orders By Sales Org',
    },
    UI.SelectionPresentationVariant #chartView            : {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.Chart#chartView', ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
        Text               : 'Chart View',
    },
);

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
    PresentationVariant          : {
        Text          : 'Default',
        Visualizations: ['@UI.LineItem'],
        SortOrder     : [{
            $Type     : 'Common.SortOrderType',
            Property  : documentId,
            Descending: true
        }]
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
annotate service.attachments with @(UI.LineItem #tableMacro: []);

annotate service.attachments with @(UI.FieldGroup #AdminData: {
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

    ],
}, );

// annotate service.salesorder with @(
//     Analytics.AggregatedProperty #documentId_countdistinct: {
//         $Type               : 'Analytics.AggregatedPropertyType',
//         Name                : 'documentId_countdistinct',
//         AggregatableProperty: documentId,
//         AggregationMethod   : 'countdistinct',
//         ![@Common.Label]    : '{i18n>DocumentId}',
//     },
//     UI.Chart #alpChart                                 : {
//         $Type          : 'UI.ChartDefinitionType',
//         ChartType      : #Column,
//         Dimensions     : [SalesOrganization, ],
//         DynamicMeasures: ['@Analytics.AggregatedProperty#documentId_countdistinct', ],
//         Title          : '{i18n>SalesOrderBySalesOrganization}',
//     }
// );
annotate service.salesorder with @UI: {
    SelectionVariant #canceled: {
        $Type           : 'UI.SelectionVariantType',
        ID              : 'canceled',
        Text            : 'canceled',
        Parameters      : [

        ],
        FilterExpression: '',
        SelectOptions   : [{
            $Type       : 'UI.SelectOptionType',
            PropertyName: SalesOrganization,
            Ranges      : [{
                $Type : 'UI.SelectionRangeType',
                Sign  : #I,
                Option: #EQ,
                Low   : '5000',
            }, ],
        }, ],
    },
    SelectionVariant #all     : {
        $Type           : 'UI.SelectionVariantType',
        ID              : 'open',
        Text            : 'open',
        Parameters      : [

        ],
        FilterExpression: '',
        SelectOptions   : [{
            $Type       : 'UI.SelectOptionType',
            PropertyName: SalesOrganization,
            Ranges      : [{
                $Type : 'UI.SelectionRangeType',
                Sign  : #I,
                Option: #NE,
                Low   : '5000',
            }, ],
        }, ],
    },
    SelectionVariant #open    : {
        $Type           : 'UI.SelectionVariantType',
        ID              : 'open',
        Text            : 'open',
        Parameters      : [

        ],
        FilterExpression: '',

    },
    SelectionVariant #accepted: {
        $Type           : 'UI.SelectionVariantType',
        ID              : 'accepted',
        Text            : 'accepted',
        Parameters      : [

        ],
        FilterExpression: '',
        SelectOptions   : [{
            $Type       : 'UI.SelectOptionType',
            PropertyName: SalesOrganization,
            Ranges      : [{
                $Type : 'UI.SelectionRangeType',
                Sign  : #I,
                Option: #EQ,
                Low   : '4000',
            }, ],
        }, ],
    }
};

annotate service.salesorder with @Aggregation.ApplySupported: {
    Transformations       : [
        'aggregate',
        'topcount',
        'bottomcount',
        'identity',
        'concat',
        'groupby',
        'filter',
        'expand',
        'search'
    ],
    Rollup                : #None,
    PropertyRestrictions  : true,
    GroupableProperties   : [
        SalesOrder,
        SalesOrderDate,
        SalesOrderType,
        SalesOrganization,
        DistributionChannel,
        createdBy,
    ],
    AggregatableProperties: [{Property: documentId, }],
};

// annotate service.salesorder with @(
//     UI.Chart #visualFilter : {
//         $Type : 'UI.ChartDefinitionType',
//         ChartType : #Bar,
//         Dimensions : [
//             to_Item.SalesOrderItem,
//         ],
//         DynamicMeasures : [
//             '@Analytics.AggregatedProperty#documentId_countdistinct',
//         ],
//     },
//     UI.PresentationVariant #visualFilter : {
//         $Type : 'UI.PresentationVariantType',
//         Visualizations : [
//             '@UI.Chart#visualFilter',
//         ],
//     }
// );
// annotate service.salesorder with {
//     to_Item @Common.ValueList #visualFilter : {
//         $Type : 'Common.ValueListType',
//         CollectionPath : 'salesorder',
//         Parameters : [
//             {
//                 $Type : 'Common.ValueListParameterInOut',
//                 LocalDataProperty : to_Item.SalesOrderItem,
//                 ValueListProperty : 'to_Item.SalesOrderItem',
//             },
//         ],
//         PresentationVariantQualifier : 'visualFilter',
//     }
// };
annotate service.salesorder with {
    SalesOrganization @Common.Label: 'Sales Organization'
};
