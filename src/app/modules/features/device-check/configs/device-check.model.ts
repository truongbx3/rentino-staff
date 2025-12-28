export interface DeviceCheckModel {
    id: number;
    createdDate: number;
    updatedDate: number;
    type: 'mobile' | 'tablet';
    deviceName: string;
    deviceCode: string;
    model: string;
    osVersion: string;
    transactionId: string;
    totalRam: string;
    storage: string;
    userId: number;
    price: number | null;
    frontCheck: string | null;
    backCheck: string | null;
    summary: string | null;
    functionCheck: string | null;
    finalSummary: string | null;
    additionCheck: string | null;
}