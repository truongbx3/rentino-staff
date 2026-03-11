export interface DevicePriceDetailModel {
  id?: number;
  deviceCode: string;
  type: string;
  price: number;
  fromDate: Date | string | null;
  toDate: Date | string | null;
}
