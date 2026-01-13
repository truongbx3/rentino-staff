import { Component } from '@angular/core';
import { DeviceCheckModel } from '../../configs/device-check.model';
import { DeviceCheckService } from '../../device-check.service';
import { accessoryOptions, deviceStatusOptions, modelItems } from '../../configs/device.check.constant';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LoadingService } from 'src/app/core/services/loading.service';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { deviceCheckColumns } from '../../configs/device-check.colum';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.scss']
})
export class DeviceListComponent {
  constructor(
    private deviceCheckService: DeviceCheckService,
    private modalService: NzModalService,
    private loading: LoadingService,
    private router: Router
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

  ngOnInit(): void {
    this.getAllList();
  }

  getAllList(payload?: any) {
    if (!payload) {
      payload = this.buildPayload();
    }
    this.loading.show();

    this.deviceCheckService.getAllDevices(payload).pipe((finalize(() => {
      this.loading.hide();
    }))).subscribe(res => {
      this.devices = res.data.content.map((item: any, index: number) => ({
        index: (this.pageIndex - 1) * this.pageSize + index + 1,
        ...item
      })) || [];
      this.total = res.data.totalElements || 0;
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
    // const modalRef = this.modalService.create({
    //   nzTitle: !!id ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới',
    //   nzContent: DeviceAddUpdateAdvancedComponent,
    //   // nzContent: DeviceAddUpdateComponent,
    //   nzWidth: '70vw',
    //   nzComponentParams: {
    //     deviceId: id,
    //     onRefresh: () => this.getAllList()
    //   },
    //   nzFooter: null
    // });
  }

  buildPayload() {
    const conditions: any[] = [];
    return {
      page: this.pageIndex - 1,
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

}
