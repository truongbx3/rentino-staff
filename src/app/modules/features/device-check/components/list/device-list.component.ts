import { Component, OnInit } from '@angular/core';
import { DeviceCheckModel } from '../../configs/device-check.model';
import { DeviceCheckService } from '../../device-check.service';
import { accessoryOptions, deviceStatusOptions, modelItems } from '../../configs/device.check.constant';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LoadingService } from 'src/app/core/services/loading.service';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { deviceCheckColumns } from '../../configs/device-check.colum';
import { ListStateService } from 'src/app/core/services/list-state.service';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.scss']
})
export class DeviceListComponent implements OnInit {
  constructor(
    private deviceCheckService: DeviceCheckService,
    private modalService: NzModalService,
    private loading: LoadingService,
    private router: Router,
    private listStateService: ListStateService
  ) { }

  columns: TableColumn[] = deviceCheckColumns;
  lastSearchPayload: any = null;

  devices: DeviceCheckModel[] = [];
  deviceNameSearch!: string;
  pageIndex: number = 1;
  pageSize: number = 10;
  total = 0;

  modelItems = modelItems;
  viewMode: 'grid' | 'list' = 'grid';

  // Color map for each status code (API does not return color)
  private readonly statusColorMap: Record<string, string> = {
    'processing': 'blue',
    'wait_approve': 'orange',
    'cust_approve': 'cyan',
    'approve': 'green',
    'vcm_approve': 'purple',
    'checking': 'gold',
    'verified': 'lime',
    'sent_vcm': 'geekblue',
  };

  ngOnInit(): void {
    this.loadStatusOptions();

    const saved = this.listStateService.get<{
      pageIndex: number;
      pageSize: number;
      lastSearchPayload: any;
    }>('device-list');

    if (saved) {
      this.pageIndex = saved.pageIndex ?? 1;
      this.pageSize = saved.pageSize ?? 10;
      this.lastSearchPayload = saved.lastSearchPayload ?? null;

      const payload = this.lastSearchPayload
        ? { ...this.lastSearchPayload, page: this.pageIndex, size: this.pageSize }
        : this.buildPayload();
      this.getAllList(payload);
    } else {
      this.getAllList();
    }
  }

  private saveState(): void {
    this.listStateService.set('device-list', {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      lastSearchPayload: this.lastSearchPayload
    });
  }

  private loadStatusOptions(): void {
    this.deviceCheckService.getDeviceStatuses().subscribe({
      next: (res: any) => {
        if (res?.data?.length) {
          const options = res.data.map((item: any) => ({
            label: item.value,
            value: item.status,
            color: this.statusColorMap[item.status] || 'default'
          }));
          // Update the status column's filter options dynamically
          const statusCol = this.columns.find(c => c.key === 'status');
          if (statusCol?.filter) {
            statusCol.filter.options = options;
          }
        }
      },
      error: () => { /* keep existing static options as fallback */ }
    });
  }

  getAllList(payload?: any) {
    if (!payload) {
      payload = this.buildPayload();
    }
    this.saveState();
    this.loading.show();

    this.deviceCheckService.getAllDevices(payload).pipe((finalize(() => {
      this.loading.hide();
    }))).subscribe({
      next: (res: any) => {
        const content = res?.data?.content || [];
        this.devices = content.map((item: any, index: number) => ({
          index: (this.pageIndex - 1) * this.pageSize + index + 1,
          ...item
        }));
        this.total = res?.data?.totalElements || 0;
      },
      error: () => {
        this.devices = [];
        this.total = 0;
      }
    });
  }

  formatDate(ms: number): string {
    const d = new Date(ms);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')
      }/${d.getFullYear()}
      ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')
      }:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  setView(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  getLabelModel(value: string): string {
    return this.modelItems.find((item) => item.value === value)?.label || 'Chưa cập nhật'
  }

  getDeviceStatusLabel(value: string): string {
    return deviceStatusOptions.find(option => option.value === value)?.label || '';
  }

  getDeviceStatusColor(value: string): string {
    return deviceStatusOptions.find(option => option.value === value)?.color || 'Chưa cập nhật';
  }

  getSummary(device: DeviceCheckModel): string {
    return (
      device.finalSummary ||
      device.summary ||
      'Chưa có kết luận'
    );
  }

  getPrice(price: number | null): string {
    return price ? price.toLocaleString('vi-VN') + ' ₫' : 'Chưa định giá';
  }

  onAddUpdate(id?: number): void {
    this.router.navigateByUrl(id ? `/device-check/edit/${id}` : '/device-check/add');
  }

  buildPayload() {
    const conditions: any[] = [];
    return {
      page: this.pageIndex,
      size: this.pageSize,
      lsCondition: conditions,
      sortField: [
        {
          fieldName: 'updatedDate',
          sort: 'DESC'
        }
      ]
    };
  }

  onSearch(payload: any) {
    this.pageIndex = 1;

    this.lastSearchPayload = {
      ...payload,
      page: 1,
      size: this.pageSize
    };
    this.saveState();
    this.getAllList(this.lastSearchPayload);
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

}
