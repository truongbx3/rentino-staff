import { Component } from '@angular/core';
import { DeviceCheckModel } from '../../configs/device-check.model';
import { DeviceCheckService } from '../../device-check.service';
import { accessoryOptions, modelItems } from '../../configs/device.check.constant';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DeviceAddUpdateComponent } from '../device-add-update/device-add-update.component';
import { LoadingService } from 'src/app/core/services/loading.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.scss']
})
export class DeviceListComponent {
  constructor(
    private deviceCheckService: DeviceCheckService,
    private modalService: NzModalService,
    private loading: LoadingService
  ) { }

  devices: DeviceCheckModel[] = [];
  deviceNameSearch!: string;
  pageIndex: number = 1;
  pageSize: number = 10;
  total = 0;

  modelItems = modelItems;

  ngOnInit(): void {
    this.getAllList();
  }

  getAllList() {
    const payload = this.buildPayload();
    this.loading.show();

    this.deviceCheckService.getAllDevices(payload).pipe((finalize(() => {
      this.loading.hide();
    }))).subscribe(res => {
      this.devices = res.data.content || [];
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


  getTypeLabel(type: string | null): string {
    return accessoryOptions.find(item => item.value === type)?.label || 'Chưa cập nhật';
  }

  getTypeColor(type: string | null): string {
    return accessoryOptions.find(item => item.value === type)?.color || 'gray';
  }

  getLabelModel(value: string): string {
    return this.modelItems.find((item) => item.value === value)?.label || 'Chưa cập nhật'
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
    const modalRef = this.modalService.create({
      nzTitle: !!id ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới',
      nzContent: DeviceAddUpdateComponent,
      nzWidth: '70vw',
      nzComponentParams: {
        deviceId: id,
        onRefresh: () => this.getAllList()
      },
      nzFooter: null
    });
  }

  buildPayload() {
    const conditions: any[] = [];

    if (this.deviceNameSearch?.trim()) {
      conditions.push({
        operator: 'LIKE',
        property: 'deviceName',
        propertyType: 'string',
        value: this.deviceNameSearch.trim()
      });
    }

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


  onSearch(): void {
    this.getAllList();
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    this.getAllList();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 1;
    this.getAllList();
  }
}
