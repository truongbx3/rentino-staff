import { Component } from '@angular/core';
import { DeviceCheckModel } from '../configs/device-check.model';
import { DeviceCheckService } from '../../device-check.service';
import { accessoryOptions } from '../configs/device.check.constant';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DeviceAddUpdateComponent } from '../device-add-update/device-add-update.component';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.scss']
})
export class DeviceListComponent {
  constructor(
    private deviceCheckService: DeviceCheckService,
    private modalService: NzModalService
  ) {}

  devices: DeviceCheckModel[] = [];

  ngOnInit(): void {
    this.deviceCheckService.getAllDevices().subscribe((res: any) => {
      this.devices = res.data.content;
    });
  }

  formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString('vi-VN');
  }

  getTypeLabel(type: string | null): string {
    return accessoryOptions.find(item => item.value === type)?.label || 'Chưa cập nhật';
  }

  getTypeColor(type: string | null): string {
    return accessoryOptions.find(item => item.value === type)?.color || 'gray';
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
    console.log('Update device with id:', id);

    const modalRef = this.modalService.create({
      nzTitle: !!id ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới',
      nzContent: DeviceAddUpdateComponent,
      nzWidth: '70vw',
      nzComponentParams: {
        deviceId: id
      },
      nzFooter: null
    });
  }
}
