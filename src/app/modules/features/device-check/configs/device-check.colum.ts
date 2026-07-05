import { statusColors } from "ng-zorro-antd/core/color";
import { TableColumn } from "src/app/modules/shares/models/table-column.model";
import { accessoryOptions, deviceStatusOptions } from "./device.check.constant";

export const deviceCheckColumns: TableColumn[] = [
    {
        key: 'index',
        title: 'STT',
        searchable: false,
        width: '58px',
        classes: 'text-center'
    },
    {
        key: 'action',
        title: 'Thao tác',
        type: 'action',
        width: '100px'
    },
    {
        key: 'deviceName',
        title: 'Tên thiết bị',
        searchable: true,
        width: '250px',
        filter: {
            type: 'input'
        }
    },
    {
        key: 'realDeviceName',
        title: 'Tên thực tế',
        searchable: true,
        width: '200px',
        filter: {
            type: 'input'
        }
    },
    {
        key: 'model',
        title: 'Model',
        searchable: true,
        width: '150px',
        filter: {
            type: 'input'
        }
    },
    {
        key: 'osVersion',
        title: 'OS',
        searchable: false,
        width: '70px',
    },
    {
        key: 'totalRam',
        title: 'RAM',
        searchable: true,
        width: '100px',
        filter: {
            type: 'input'
        },
    },
    {
        key: 'storage',
        title: 'Dung lượng',
        searchable: true,
        width: '110px',
        filter: {
            type: 'input'
        },
    },
    {
        key: 'finalSummary',
        title: 'Loại',
        searchable: true,
        width: '150px',
        type: 'tag',
        filter: {
            type: 'select',
            options: accessoryOptions
        }
    },
    {
        key: 'imei',
        title: 'Số IMEI',
        searchable: true,
        width: '150px',
        filter: {
            type: 'input'
        }
    },
    {
        key: 'status',
        title: 'Trạng thái',
        type: 'tag',
        searchable: true,
        width: '200px',
        filter: {
            type: 'select',
            options: deviceStatusOptions
        }
    },
    {
        key: 'price',
        title: 'Giá bán',
        type: 'number',
        width: '150px',
        isSort: true
    },
    {
        key: 'vcmFinalSummary',
        title: 'Loại VCM',
        type: 'tag',
        width: '130px',
        filter: {
            type: 'select',
            options: accessoryOptions
        }
    },
    {
        key: 'vcmPrice',
        title: 'Giá VCM thu mua',
        type: 'number',
        width: '150px',
        isSort: true
    },
    {
        key: 'createdDate',
        title: 'Ngày tạo',
        type: 'date',
        searchable: true,
        width: '200px',
        filter: {
            type: 'date_picker'
        },
        isSort: true
    },
    {
        key: 'updatedDate',
        title: 'Ngày cập nhật',
        type: 'date',
        searchable: true,
        width: '200px',
        filter: {
            type: 'date_picker'
        },
        isSort: true
    }
]