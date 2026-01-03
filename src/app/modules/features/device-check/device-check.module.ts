import { NgModule } from '@angular/core';
import { DeviceListComponent } from './components/list/device-list.component';
import { DeviceCheckRoutingModule } from './device-check-routing.module';
import { SharesModule } from '../../shares/shares.module';
import { DeviceAddUpdateAdvancedComponent } from './components/device-add-update-advanced/device-add-update-advanced.component';

@NgModule({
  declarations: [
    DeviceListComponent,
    DeviceAddUpdateAdvancedComponent
  ],
  imports: [
    DeviceCheckRoutingModule,
    SharesModule
  ],
  exports: [
    
  ]
})
export class DeviceCheckModule { }