import { Component, OnInit } from '@angular/core';
import { ShipmentModel } from '../../configs/shipment.model';
import { ShipmentService } from '../../shipment.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { finalize } from 'rxjs/operators';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { shipmentColumns } from '../../configs/shipment.column';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shipment-list',
  templateUrl: './shipment-list.component.html',
  styleUrls: ['./shipment-list.component.scss']
})
export class ShipmentListComponent implements OnInit {
  columns: TableColumn[] = shipmentColumns;
  lastSearchPayload: any = null;

  shipments: ShipmentModel[] = [];
  pageIndex: number = 1;
  pageSize: number = 10;
  total = 0;
  defaultSort = { fieldName: 'createdDate', sort: 'DESC' as const };

  constructor(
    private shipmentService: ShipmentService,
    private loading: LoadingService,
    private message: NzMessageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadStatuses();
    this.getAllList();
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
      const statusCol = this.columns.find(c => c.key === 'status');
      if (statusCol && statusCol.filter) {
        statusCol.filter.options = options;
      }
    });
  }

  buildPayload() {
    return {
      page: this.pageIndex - 1,
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
    this.loading.show();
    this.shipmentService.searchShipments(payload).pipe(
      finalize(() => this.loading.hide())
    ).subscribe(res => {
      this.shipments = res.data.content.map((item: any, index: number) => ({
        index: (this.pageIndex - 1) * this.pageSize + index + 1,
        ...item
      })) || [];
      this.total = res.data.totalElements || 0;
    });
  }

  onSearch(payload: any) {
    this.pageIndex = 1;
    this.lastSearchPayload = {
      ...payload,
      page: 0,
      size: this.pageSize
    };
    this.getAllList(this.lastSearchPayload);
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    const payload = this.lastSearchPayload
      ? { ...this.lastSearchPayload, page: page - 1 }
      : this.buildPayload();
    this.getAllList(payload);
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 1;
    const payload = this.lastSearchPayload
      ? { ...this.lastSearchPayload, size, page: 0 }
      : this.buildPayload();
    this.getAllList(payload);
  }

  onReceive(row: any): void {
    this.loading.show();
    this.shipmentService.receiveShipment(row.trackingNumber).pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: () => {
        this.message.success('Cập nhật trạng thái thành công!');
        this.getAllList(this.lastSearchPayload || this.buildPayload());
      },
      error: (err) => {
        const errMsg = err?.error?.message || err?.message || 'Có lỗi xảy ra, vui lòng thử lại!';
        this.message.error(errMsg);
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
