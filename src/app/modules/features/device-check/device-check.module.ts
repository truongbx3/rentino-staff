import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// NG-ZORRO Modules cần thiết
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message'; // Tùy chọn: để thông báo

import { DeviceAddUpdateComponent } from './components/device-add-update/device-add-update.component';
import { DeviceListComponent } from './components/list/device-list.component';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardComponent, NzCardModule } from 'ng-zorro-antd/card';
import { DeviceCheckRoutingModule } from './device-check-routing.module';

@NgModule({
  declarations: [
    DeviceAddUpdateComponent,
    DeviceListComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,

    NzModalModule,
    NzStepsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzUploadModule,
    NzButtonModule,
    NzGridModule,
    NzIconModule,
    NzMessageModule,
    NzDividerModule,
    NzTagModule,
    NzCardModule,
    DeviceCheckRoutingModule
  ],
  exports: [
    DeviceAddUpdateComponent
  ]
})
export class DeviceCheckModule { }