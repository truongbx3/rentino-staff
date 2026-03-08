import { TableColumn } from 'src/app/modules/shares/models/table-column.model';

export const shipmentColumns: TableColumn[] = [
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
    key: 'trackingNumber',
    title: 'Mã vận đơn',
    searchable: true,
    width: '180px',
    filter: {
      type: 'input'
    }
  },
  {
    key: 'carrierCode',
    title: 'Carrier',
    searchable: true,
    width: '120px',
    filter: {
      type: 'input'
    }
  },
  {
    key: 'senderName',
    title: 'Người gửi',
    searchable: true,
    width: '180px',
    filter: {
      type: 'input'
    }
  },
  {
    key: 'receiverName',
    title: 'Người nhận',
    searchable: true,
    width: '180px',
    filter: {
      type: 'input'
    }
  },
  {
    key: 'receiverPhone',
    title: 'SĐT người nhận',
    searchable: true,
    width: '160px',
    filter: {
      type: 'input'
    }
  },
  {
    key: 'receiverAddress',
    title: 'Địa chỉ nhận',
    searchable: true,
    width: '280px',
    filter: {
      type: 'input'
    }
  },
  {
    key: 'total',
    title: 'Tổng',
    type: 'number',
    width: '100px'
  },
  {
    key: 'status',
    title: 'Trạng thái',
    type: 'tag',
    searchable: true,
    width: '150px',
    filter: {
      type: 'select',
      options: []
    }
  }
];
