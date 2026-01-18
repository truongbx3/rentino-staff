export interface TableColumn {
    key: string;
    title: string;
    searchable?: boolean;
    width?: string;
    type?: string;
    classes?: string;
    filter?: {
        type?: string;
        name?: string;
        options?: any[]
        format?: string;
    },
    isSort?: boolean;
}

export interface SearchCondition {
    operator: 'EQUAL' | 'LIKE' | 'START_WITH';
    property: string;
    propertyType: 'string' | 'number' | 'date';
    value: any;
}