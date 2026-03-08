export interface ShipmentModel {
  id: number;
  trackingNumber: string;
  carrierCode: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  senderName: string;
  total: number;
  transactionIds: any[];
  status: string | null;
  isDeleted: number;
}
