import { Component, OnInit, ViewChild } from '@angular/core';
import { ShipmentModel } from '../../configs/shipment.model';
import { ShipmentService } from '../../shipment.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { finalize } from 'rxjs/operators';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { shipmentColumns } from '../../configs/shipment.column';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { ListStateService } from 'src/app/core/services/list-state.service';
import { TableCustomComponent } from 'src/app/modules/shares/components/table/table.component';

@Component({
  selector: 'app-shipment-list',
  templateUrl: './shipment-list.component.html',
  styleUrls: ['./shipment-list.component.scss']
})
export class ShipmentListComponent implements OnInit {
  @ViewChild(TableCustomComponent) tableComponent?: TableCustomComponent;

  columns: TableColumn[] = shipmentColumns;
  lastSearchPayload: any = null;

  shipments: ShipmentModel[] = [];
  pageIndex: number = 1;
  pageSize: number = 10;
  total = 0;
  defaultSort = { fieldName: 'createdDate', sort: 'DESC' as const };

  dateRange: Date[] = [];
  selectedStatus: string | null = null;
  statusOptions: Array<{ label: string; value: string; color?: string }> = [];
  exporting = false;

  constructor(
    private shipmentService: ShipmentService,
    private loading: LoadingService,
    private message: NzMessageService,
    private router: Router,
    private listStateService: ListStateService
  ) { }

  ngOnInit(): void {
    this.loadStatuses();

    const saved = this.listStateService.get<{
      pageIndex: number;
      pageSize: number;
      lastSearchPayload: any;
      dateRange: Date[];
      selectedStatus: string | null;
    }>('shipment-list');

    if (saved) {
      this.pageIndex = saved.pageIndex ?? 1;
      this.pageSize = saved.pageSize ?? 10;
      this.lastSearchPayload = saved.lastSearchPayload ?? null;
      this.dateRange = saved.dateRange ? saved.dateRange.map((d: any) => new Date(d)) : [];
      this.selectedStatus = saved.selectedStatus ?? null;

      const payload = this.lastSearchPayload
        ? { ...this.lastSearchPayload, page: this.pageIndex, size: this.pageSize }
        : this.buildPayload();
      this.getAllList(payload);
    } else {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      this.dateRange = [oneMonthAgo, today];

      this.triggerTableSearch();
    }
  }

  loadStatuses(): void {
    const colorMap: Record<string, string> = {
      received: 'green',
      sent: 'blue',
      cancel: 'red'
    };
    this.shipmentService.getStatuses().subscribe(res => {
      const statuses: any[] = res.data || res || [];
      const options = statuses.map((s: any) => ({
        label: s.value ?? s,
        value: s.status ?? s.value ?? s,
        color: colorMap[s.status] ?? 'default'
      }));
      this.statusOptions = options;
      const statusCol = this.columns.find(c => c.key === 'status');
      if (statusCol && statusCol.filter) {
        statusCol.filter.options = options;
      }
    });
  }

  private saveState(): void {
    this.listStateService.set('shipment-list', {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      lastSearchPayload: this.lastSearchPayload,
      dateRange: this.dateRange,
      selectedStatus: this.selectedStatus
    });
  }

  buildPayload() {
    return {
      page: this.pageIndex,
      size: this.pageSize,
      lsCondition: [],
      sortField: [
        {
          fieldName: 'createdDate',
          sort: 'DESC'
        }
      ]
    };
  }

  getAllList(payload?: any) {
    if (!payload) {
      payload = this.buildPayload();
    }
    this.saveState();
    this.loading.show();
    this.shipmentService.searchShipments(payload).pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: (res) => {
        this.shipments = (res?.data?.content || []).map((item: any, index: number) => ({
          index: (this.pageIndex - 1) * this.pageSize + index + 1,
          ...item
        }));
        this.total = res?.data?.totalElements || 0;
      },
      error: (err) => {
        this.shipments = [];
        this.total = 0;
        this.notifyError(err?.error?.message, 'Có lỗi khi lấy danh sách vận đơn.');
      }
    });
  }

  /**
   * Interceptor đã hiển thị body.message (HTTP lỗi hoặc code !== '00'),
   * nên chỉ hiện thông báo dự phòng khi body không có message.
   */
  private notifyError(bodyMessage: any, fallback: string): void {
    if (!bodyMessage) {
      this.message.error(fallback);
    }
  }

  onSearch(payload: any) {
    this.pageIndex = 1;
    
    // Combine table filters with our card filters
    const conditions: any[] = payload.lsCondition || [];
    
    if (this.selectedStatus && !conditions.some(c => c.property === 'status')) {
      conditions.push({
        property: 'status',
        operator: 'EQUAL',
        propertyType: 'string',
        value: this.selectedStatus
      });
    }
    
    if (this.dateRange && this.dateRange[0] && !conditions.some(c => c.property === 'createdDate' && c.operator === 'GREATER_EQUAL')) {
      conditions.push({
        property: 'createdDate',
        operator: 'GREATER_EQUAL',
        propertyType: 'date',
        value: this.formatDateForQuery(this.dateRange[0], 'start')
      });
    }
    
    if (this.dateRange && this.dateRange[1] && !conditions.some(c => c.property === 'createdDate' && c.operator === 'LOWER_EQUAL')) {
      conditions.push({
        property: 'createdDate',
        operator: 'LOWER_EQUAL',
        propertyType: 'date',
        value: this.formatDateForQuery(this.dateRange[1], 'end')
      });
    }

    this.lastSearchPayload = {
      ...payload,
      lsCondition: conditions,
      page: 1,
      size: this.pageSize
    };
    this.saveState();
    this.getAllList(this.lastSearchPayload);
  }

  onFilterChange() {
    this.pageIndex = 1;
    this.saveState();
    this.triggerTableSearch();
  }

  formatDateForQuery(date: Date, type: 'start' | 'end'): string {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const time = type === 'start' ? '00:00' : '23:59';
    return `${day}/${month}/${year} ${time}`;
  }

  triggerTableSearch() {
    const conditions: any[] = [];

    if (this.selectedStatus) {
      conditions.push({
        property: 'status',
        operator: 'EQUAL',
        propertyType: 'string',
        value: this.selectedStatus
      });
    }

    if (this.dateRange && this.dateRange[0]) {
      conditions.push({
        property: 'createdDate',
        operator: 'GREATER_EQUAL',
        propertyType: 'date',
        value: this.formatDateForQuery(this.dateRange[0], 'start')
      });
    }

    if (this.dateRange && this.dateRange[1]) {
      conditions.push({
        property: 'createdDate',
        operator: 'LOWER_EQUAL',
        propertyType: 'date',
        value: this.formatDateForQuery(this.dateRange[1], 'end')
      });
    }

    // Merge with table filters if any (e.g. from app-table-custom columns)
    if (this.lastSearchPayload && this.lastSearchPayload.lsCondition) {
      this.lastSearchPayload.lsCondition.forEach((cond: any) => {
        if (cond.property !== 'status' && cond.property !== 'createdDate') {
          conditions.push(cond);
        }
      });
    }

    const payload = {
      page: this.pageIndex,
      size: this.pageSize,
      lsCondition: conditions,
      sortField: [this.defaultSort]
    };

    this.lastSearchPayload = payload;
    this.getAllList(payload);
  }

  resetFilters() {
    this.listStateService.clear('shipment-list');
    this.listStateService.clear('table:shipment-list');
    this.tableComponent?.reset();

    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    this.dateRange = [oneMonthAgo, today];
    this.selectedStatus = null;
    this.pageIndex = 1;
    this.lastSearchPayload = null;
    this.triggerTableSearch();
  }

  exportDevices() {
    const req: any = {};
    if (this.selectedStatus) {
      req.shipmentStatus = this.selectedStatus;
    }
    // Chuẩn hoá giờ theo giờ địa phương để khớp với bộ lọc danh sách (00:00 – 23:59)
    if (this.dateRange && this.dateRange[0]) {
      const fromDate = new Date(this.dateRange[0]);
      fromDate.setHours(0, 0, 0, 0);
      req.fromDate = fromDate;
    }
    if (this.dateRange && this.dateRange[1]) {
      const toDate = new Date(this.dateRange[1]);
      toDate.setHours(23, 59, 59, 999);
      req.toDate = toDate;
    }

    // Merge in conditions from table if they exist
    if (this.lastSearchPayload && this.lastSearchPayload.lsCondition) {
      this.lastSearchPayload.lsCondition.forEach((cond: any) => {
        if (cond.property === 'trackingNumber') req.trackingNumber = cond.value;
        if (cond.property === 'carrierCode') req.carrierCode = cond.value;
        if (cond.property === 'receiverPhone') req.receiverPhone = cond.value;
        if (cond.property === 'status' && !req.shipmentStatus) req.shipmentStatus = cond.value;
      });
    }

    this.exporting = true;
    this.loading.show();
    this.shipmentService.exportDevices(req).pipe(
      finalize(() => {
        this.exporting = false;
        this.loading.hide();
      })
    ).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `device_shipment_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.message.success('Xuất file excel thành công!');
      },
      error: (err) => {
        this.notifyError(err?.error?.message, 'Có lỗi xảy ra khi xuất file!');
      }
    });
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    const payload = this.lastSearchPayload
      ? { ...this.lastSearchPayload, page: page }
      : this.buildPayload();
    this.lastSearchPayload = payload;
    this.saveState();
    this.getAllList(payload);
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 1;
    const payload = this.lastSearchPayload
      ? { ...this.lastSearchPayload, size, page: 1 }
      : this.buildPayload();
    this.lastSearchPayload = payload;
    this.saveState();
    this.getAllList(payload);
  }

  onReceive(row: any): void {
    this.loading.show();
    this.shipmentService.receiveShipment(row.trackingNumber).pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: (res) => {
        if (res?.code !== '00') {
          this.notifyError(res?.message, 'Có lỗi xảy ra, vui lòng thử lại!');
          return;
        }
        this.message.success('Cập nhật trạng thái thành công!');
        this.getAllList(this.lastSearchPayload || this.buildPayload());
      },
      error: (err) => {
        this.notifyError(err?.error?.message, 'Có lỗi xảy ra, vui lòng thử lại!');
      }
    });
  }
  onViewDetail(row: any): void {
    this.router.navigate(['/shipment/detail', row.trackingNumber], {
      queryParams: { id: row.id },
      state: { shipmentInfo: row }
    });
  }
}
