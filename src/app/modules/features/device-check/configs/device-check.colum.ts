import { statusColors } from "ng-zorro-antd/core/color";
import { TableColumn } from "src/app/modules/shares/models/table-column.model";
import { accessoryOptions, deviceStatusOptions } from "./device.check.constant";

export const deviceCheckColumns: TableColumn[] = [
    {
        key: 'index',
        title: 'STT',
        searchable: false,
        width: '58px'
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
        title: 'Phiên bản OS',
        searchable: true,
        width: '180px',
        filter: {
            type: 'input'
        }
    },
    {
        key: 'totalRam',
        title: 'RAM',
        searchable: true,
        width: '150px',
        filter: {
            type: 'input'
        }
    },
    {
        key: 'storage',
        title: 'Dung lượng',
        searchable: true,
        width: '150px',
        filter: {
            type: 'input'
        }
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
        width: '200px',
        filter: {
            type: 'input'
        }
    },
    {
        key: 'status',
        title: 'Trạng thái',
        type: 'tag',
        searchable: true,
        width: '150px',
        filter: {
            type: 'select',
            options: deviceStatusOptions
        }
    },
    {
        key: 'createdDate',
        title: 'Ngày tạo',
        type: 'date',
        searchable: true,
        width: '250px',
        filter: {
            type: 'date_picker'
        }
    },
    {
        key: 'updatedDate',
        title: 'Ngày cập nhật',
        type: 'date',
        searchable: true,
        width: '250px',
        filter: {
            type: 'date_picker'
        }
    }
]