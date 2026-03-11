export interface DevicePriceModel {
  id?: number;
  deviceCode: string;
  type: string;
  model: string;
  deviceName: string;
  totalRam: string;
  storage: string;
  price: number;
  bonus: number;
  questionType: string;
}
