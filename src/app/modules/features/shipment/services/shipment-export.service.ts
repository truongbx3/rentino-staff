import { Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ShipmentService } from '../shipment.service';
import {
  findHeaderRowNumber,
  findRelevantColumns,
  appendRegionColumn,
  getCellText,
  resolveRegion
} from '../configs/shipment-region.util';

export interface ShipmentExportProcessOptions {
  lastSearchPayload?: any;
  selectedStatus?: string | null;
  dateRange?: Date[];
  // Request đã gửi lên backend khi xuất file (fromDate/toDate/shipmentStatus/...), dùng để dựng bộ lọc tương đương
  exportRequest?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ShipmentExportService {
  constructor(
    private shipmentService: ShipmentService,
    private message: NzMessageService
  ) { }

  /**
   * Xử lý Blob Excel tải về từ backend: thêm cột "Khu vực" ở cuối bảng dữ liệu
   */
  async processExportBlob(
    originalBlob: Blob,
    options: ShipmentExportProcessOptions
  ): Promise<Blob> {
    try {
      // Dynamic import exceljs khi xuất file để tối ưu bundle
      const ExcelJS = await import('exceljs');
      const WorkbookClass = (ExcelJS as any).Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
      const workbook = new WorkbookClass();

      const arrayBuffer = await this.blobToArrayBuffer(originalBlob);
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return originalBlob;
      }

      // Tìm dòng header: dòng đầu tiên trong 10 dòng đầu có >= 2 ô không rỗng
      const headerRowNumber = findHeaderRowNumber(worksheet);
      if (headerRowNumber === -1) {
        this.message.warning('Không xác định được cột để tính khu vực, đã xuất file gốc.');
        return originalBlob;
      }

      const headerRow = worksheet.getRow(headerRowNumber);
      const { addressColNumber, trackingColNumber, lastColNumber } = findRelevantColumns(headerRow);

      if (addressColNumber === null && trackingColNumber === null) {
        this.message.warning('Không xác định được cột để tính khu vực, đã xuất file gốc.');
        return originalBlob;
      }

      if (trackingColNumber !== null) {
        // Ưu tiên lấy "Địa chỉ nhận" của danh sách vận chuyển theo mã vận đơn
        const trackingMap = await this.buildTrackingAddressMap(options);
        let missingCount = 0;
        appendRegionColumn(worksheet, headerRowNumber, lastColNumber, (row: any) => {
          const rawTracking = getCellText(row.getCell(trackingColNumber)).trim();
          const address = trackingMap.get(rawTracking);
          // Có mã vận đơn nhưng không tra được địa chỉ -> ô khu vực bị trống
          if (rawTracking && address === undefined) {
            missingCount++;
          }
          return resolveRegion(address);
        });
        if (missingCount > 0) {
          this.message.warning(`${missingCount} dòng không xác định được khu vực`);
        }
      } else if (addressColNumber !== null) {
        // Không có cột mã vận đơn -> tính từ cột địa chỉ nhận trong file
        appendRegionColumn(worksheet, headerRowNumber, lastColNumber, (row: any) => {
          const rawAddress = getCellText(row.getCell(addressColNumber));
          return resolveRegion(rawAddress);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return new Blob([buffer], {
        type: originalBlob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    } catch (error) {
      console.error('Lỗi khi xử lý file Excel xuất:', error);
      this.message.warning(`Không thêm được cột Khu vực, đã xuất file gốc. Lỗi: ${(error as any)?.message || error}`, { nzDuration: 15000 });
      return originalBlob;
    }
  }

  /**
   * Dựng Map trackingNumber -> receiverAddress bằng cách lặp searchShipments với size 500
   */
  private async buildTrackingAddressMap(
    options: ShipmentExportProcessOptions
  ): Promise<Map<string, string>> {
    let lsCondition: any[] = [];
    let sortField: any[] = [{ fieldName: 'createdDate', sort: 'DESC' }];

    if (options.exportRequest) {
      // Dựng điều kiện tương đương request xuất file để map khớp với dữ liệu trong file
      const req = options.exportRequest;
      if (options.lastSearchPayload && options.lastSearchPayload.lsCondition) {
        // Giữ nguyên các điều kiện cột (trackingNumber, carrierCode, receiverPhone...), status/ngày lấy từ req
        lsCondition = options.lastSearchPayload.lsCondition.filter(
          (cond: any) => cond.property !== 'status' && cond.property !== 'createdDate'
        );
        if (options.lastSearchPayload.sortField) {
          sortField = options.lastSearchPayload.sortField;
        }
      }
      if (req.shipmentStatus) {
        lsCondition.push({
          property: 'status',
          operator: 'EQUAL',
          propertyType: 'string',
          value: req.shipmentStatus
        });
      }
      if (req.fromDate) {
        lsCondition.push({
          property: 'createdDate',
          operator: 'GREATER_EQUAL',
          propertyType: 'date',
          value: this.formatDateForQuery(req.fromDate, 'start')
        });
      }
      if (req.toDate) {
        lsCondition.push({
          property: 'createdDate',
          operator: 'LOWER_EQUAL',
          propertyType: 'date',
          value: this.formatDateForQuery(req.toDate, 'end')
        });
      }
    } else if (options.lastSearchPayload && options.lastSearchPayload.lsCondition) {
      lsCondition = options.lastSearchPayload.lsCondition;
      if (options.lastSearchPayload.sortField) {
        sortField = options.lastSearchPayload.sortField;
      }
    } else {
      // Dùng điều kiện status + createdDate giống triggerTableSearch
      if (options.selectedStatus) {
        lsCondition.push({
          property: 'status',
          operator: 'EQUAL',
          propertyType: 'string',
          value: options.selectedStatus
        });
      }
      if (options.dateRange && options.dateRange[0]) {
        lsCondition.push({
          property: 'createdDate',
          operator: 'GREATER_EQUAL',
          propertyType: 'date',
          value: this.formatDateForQuery(options.dateRange[0], 'start')
        });
      }
      if (options.dateRange && options.dateRange[1]) {
        lsCondition.push({
          property: 'createdDate',
          operator: 'LOWER_EQUAL',
          propertyType: 'date',
          value: this.formatDateForQuery(options.dateRange[1], 'end')
        });
      }
    }

    const trackingMap = new Map<string, string>();
    let page = 1;
    const pageSize = 500;
    let totalElements = 0;
    let fetched = 0;

    while (true) {
      const payload = {
        page,
        size: pageSize,
        lsCondition,
        sortField
      };

      const res: any = await this.shipmentService.searchShipments(payload).toPromise();
      const data = res?.data || res || {};
      const content: any[] = data?.content || [];
      totalElements = data?.totalElements ?? content.length;

      for (const item of content) {
        if (item && item.trackingNumber) {
          trackingMap.set(String(item.trackingNumber).trim(), item.receiverAddress || '');
        }
      }

      fetched += content.length;
      if (content.length === 0 || fetched >= totalElements || page >= 1000) {
        break;
      }
      page++;
    }

    return trackingMap;
  }

  private formatDateForQuery(date: Date, type: 'start' | 'end'): string {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const time = type === 'start' ? '00:00' : '23:59';
    return `${day}/${month}/${year} ${time}`;
  }

  private blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }
}
