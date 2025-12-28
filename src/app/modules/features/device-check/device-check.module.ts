import { NgModule } from '@angular/core';
import { DeviceAddUpdateComponent } from './components/device-add-update/device-add-update.component';
import { DeviceListComponent } from './components/list/device-list.component';
import { DeviceCheckRoutingModule } from './device-check-routing.module';
import { SharesModule } from '../../shares/shares.module';

@NgModule({
  declarations: [
    DeviceAddUpdateComponent,
    DeviceListComponent,
  ],
  imports: [
    DeviceCheckRoutingModule,
    SharesModule
  ],
  exports: [
    DeviceAddUpdateComponent
  ]
})
export class DeviceCheckModule { }