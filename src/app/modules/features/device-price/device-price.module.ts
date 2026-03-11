import { NgModule } from '@angular/core';
import { DevicePriceListComponent } from './components/list/device-price-list.component';
import { DevicePriceRoutingModule } from './device-price-routing.module';
import { SharesModule } from '../../shares/shares.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DevicePriceDetailModalComponent } from './components/detail-modal/device-price-detail-modal.component';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSelectModule } from 'ng-zorro-antd/select';

@NgModule({
  declarations: [
    DevicePriceListComponent,
    DevicePriceDetailModalComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DevicePriceRoutingModule,
    SharesModule,
    NzModalModule,
    NzInputModule,
    NzInputNumberModule,
    NzPopconfirmModule,
    NzButtonModule,
    NzDatePickerModule,
    NzCardModule,
    NzSelectModule,
    FormsModule
  ]
})
export class DevicePriceModule { }
