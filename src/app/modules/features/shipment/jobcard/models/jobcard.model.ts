export type TemplateScope = 'device' | 'shipment';

export type PaperPreset = 'A4' | 'A5' | 'A6' | 'A7' | '50x30' | '80mm' | '100x150' | 'custom';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PaperConfig {
  preset: PaperPreset;
  orientation: PaperOrientation;
  width: number; // in mm
  height: number; // in mm
  marginTop: number; // in mm
  marginRight: number; // in mm
  marginBottom: number; // in mm
  marginLeft: number; // in mm
}

export type ElementType =
  | 'data_field'
  | 'static_text'
  | 'custom_field'
  | 'line'
  | 'box'
  | 'table'
  | 'print_date';

export type ValueFormat =
  | 'text'
  | 'currency'
  | 'datetime'
  | 'date'
  | 'accessory_type'
  | 'status';

export interface TableColumnDef {
  key: string;
  title: string;
  widthPercent: number;
  format?: ValueFormat;
  visible: boolean;
}

export interface JobcardElement {
  id: string;
  type: ElementType;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  zIndex?: number;

  // Visibility condition
  visibleWhen?: 'always' | 'android' | 'ios';

  // Typography & common style
  fontSize?: number; // pt (default 10)
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  color?: string; // hex
  backgroundColor?: string;

  // Border
  border?: boolean;
  borderWidth?: number; // pt or mm
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
  borderRadius?: number; // mm

  // (a) Data field
  fieldKey?: string;
  label?: string;
  showLabel?: boolean;
  format?: ValueFormat;
  labelWidth?: number; // mm (optional: if > 0, label has fixed width)
  labelPosition?: 'inline' | 'top'; // 'top' = nhãn nhỏ nằm trên giá trị (kiểu ô thông tin)

  // (b) Static text
  content?: string;

  // (c) Custom field
  customKey?: string;
  defaultValue?: string;

  // (d) Line
  lineOrientation?: 'horizontal' | 'vertical';
  lineThickness?: number; // pt

  // (f) Table (device list for shipment scope)
  tableColumns?: TableColumnDef[];
  tableHeaderBg?: string;
  tableRowHeight?: number; // mm

  // (g) Print date
  dateFormat?: string; // 'dd/MM/yyyy HH:mm' or 'dd/MM/yyyy'

  // UX overhaul properties
  locked?: boolean; // When true, element cannot be moved/resized on canvas
}

export interface JobcardTemplate {
  id: string;
  name: string;
  scope: TemplateScope;
  isDefault: boolean;
  paper: PaperConfig;
  elements: JobcardElement[];
  createdAt: number;
  updatedAt: number;
  seedVersion?: number;
}

export interface FieldDefinition {
  key: string;
  label: string;
  format: ValueFormat;
}

export const MM_TO_PX = 3.779527559;

export const PAPER_PRESETS: Record<PaperPreset, { width: number; height: number; name: string }> = {
  'A4': { width: 210, height: 297, name: 'A4 (210 x 297 mm)' },
  'A5': { width: 148, height: 210, name: 'A5 (148 x 210 mm)' },
  'A6': { width: 105, height: 148, name: 'A6 (105 x 148 mm)' },
  'A7': { width: 74, height: 105, name: 'A7 (74 x 105 mm)' },
  '50x30': { width: 50, height: 30, name: 'Tem nhiệt 50 x 30 mm' },
  '80mm': { width: 80, height: 150, name: 'Cuộn nhiệt 80mm (80 x 150 mm)' },
  '100x150': { width: 100, height: 150, name: 'Tem nhãn 100x150 mm' },
  'custom': { width: 148, height: 210, name: 'Tùy chỉnh' }
};

export const DEVICE_FIELDS: FieldDefinition[] = [
  { key: 'deviceName', label: 'Tên thiết bị', format: 'text' },
  { key: 'realDeviceName', label: 'Tên thực tế', format: 'text' },
  { key: 'deviceCode', label: 'Mã thiết bị', format: 'text' },
  { key: 'model', label: 'Model', format: 'text' },
  { key: 'imei', label: 'Số IMEI', format: 'text' },
  { key: 'storage', label: 'Dung lượng', format: 'text' },
  { key: 'totalRam', label: 'RAM', format: 'text' },
  { key: 'osVersion', label: 'Hệ điều hành', format: 'text' },
  { key: 'type', label: 'Loại máy', format: 'text' },
  { key: 'finalSummary', label: 'Loại thẩm định', format: 'accessory_type' },
  { key: 'price', label: 'Giá bán', format: 'currency' },
  { key: 'vcmFinalSummary', label: 'Loại VCM', format: 'accessory_type' },
  { key: 'vcmPrice', label: 'Giá VCM thu mua', format: 'currency' },
  { key: 'status', label: 'Trạng thái', format: 'status' },
  { key: 'transactionId', label: 'Mã giao dịch', format: 'text' },
  { key: 'trackingNumber', label: 'Mã vận đơn', format: 'text' },
  { key: 'receiverName', label: 'Người nhận', format: 'text' },
  { key: 'receiverPhone', label: 'SĐT người nhận', format: 'text' },
  { key: 'receiverAddress', label: 'Địa chỉ nhận', format: 'text' },
  { key: 'createdDate', label: 'Ngày tạo thiết bị', format: 'datetime' },
  { key: 'updatedDate', label: 'Ngày cập nhật', format: 'datetime' },
  { key: 'shipment_status', label: 'Trạng thái vận đơn', format: 'status' },
  { key: 'shipment_createdDate', label: 'Ngày nhận vận đơn', format: 'datetime' },
  { key: 'carrierCode', label: 'Đơn vị vận chuyển', format: 'text' },
  { key: 'senderName', label: 'Người gửi', format: 'text' }
];

export const SHIPMENT_FIELDS: FieldDefinition[] = [
  { key: 'trackingNumber', label: 'Mã vận đơn', format: 'text' },
  { key: 'status', label: 'Trạng thái vận đơn', format: 'status' },
  { key: 'carrierCode', label: 'Đơn vị vận chuyển', format: 'text' },
  { key: 'senderName', label: 'Người gửi', format: 'text' },
  { key: 'receiverName', label: 'Người nhận', format: 'text' },
  { key: 'receiverPhone', label: 'SĐT người nhận', format: 'text' },
  { key: 'receiverAddress', label: 'Địa chỉ nhận', format: 'text' },
  { key: 'createdDate', label: 'Ngày tạo đơn', format: 'datetime' },
  { key: 'total', label: 'Tổng số thiết bị', format: 'text' }
];

export const DEFAULT_TABLE_COLUMNS: TableColumnDef[] = [
  { key: 'index', title: 'STT', widthPercent: 8, visible: true },
  { key: 'deviceName', title: 'Tên thiết bị', widthPercent: 24, format: 'text', visible: true },
  { key: 'imei', title: 'Số IMEI', widthPercent: 18, format: 'text', visible: true },
  { key: 'model', title: 'Model', widthPercent: 10, format: 'text', visible: true },
  { key: 'storage', title: 'Bộ nhớ', widthPercent: 10, format: 'text', visible: true },
  { key: 'finalSummary', title: 'Loại', widthPercent: 10, format: 'accessory_type', visible: true },
  { key: 'price', title: 'Giá bán', widthPercent: 10, format: 'currency', visible: true },
  { key: 'status', title: 'Trạng thái', widthPercent: 10, format: 'status', visible: true }
];

/** Tờ tem dán nhiều ô (in bằng máy in văn phòng). Đơn vị mm. */
export interface SheetLayout {
  id: string;
  name: string;
  paperWidth: number;
  paperHeight: number;
  rows: number;
  cols: number;
  labelWidth: number;
  labelHeight: number;
  marginTop: number;   // từ mép trên tờ tới mép trên ô đầu tiên
  marginLeft: number;  // từ mép trái tờ tới mép trái ô đầu tiên
  gapX: number;        // khoảng cách ngang giữa 2 ô
  gapY: number;        // khoảng cách dọc giữa 2 ô
  offsetX: number;     // bù lệch máy in (+ sang phải)
  offsetY: number;     // bù lệch máy in (+ xuống dưới)
  nextIndex: number;   // ô trống tiếp theo (0-based) – tự nhảy sau mỗi lần in
  totalWidth?: number;  // tổng chiều ngang vùng tem (mép trái ô đầu -> mép phải ô cuối)
  totalHeight?: number; // tổng chiều dọc vùng tem (mép trên hàng đầu -> mép dưới hàng cuối)
}

export function getDeviceOs(data: any): 'ios' | 'android' | 'other' {
  if (!data) return 'android';
  const model = String(data.model || '').trim();
  const deviceName = String(data.deviceName || '').trim();
  const lower = `${model} ${deviceName}`.toLowerCase();

  if (lower.includes('iphone') || lower.includes('ipad')) {
    return 'ios';
  }
  if (model === 'MOBILE_2G') {
    return 'other';
  }
  return 'android';
}

