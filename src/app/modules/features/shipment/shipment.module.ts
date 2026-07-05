import { NgModule } from '@angular/core';
import { ShipmentListComponent } from './components/list/shipment-list.component';
import { ShipmentDetailComponent } from './components/detail/shipment-detail.component';
import { ShipmentRoutingModule } from './shipment-routing.module';
import { SharesModule } from '../../shares/shares.module';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

@NgModule({
  declarations: [
    ShipmentListComponent,
    ShipmentDetailComponent
  ],
  imports: [
    ShipmentRoutingModule,
    SharesModule,
    NzDatePickerModule
  ]
})
export class ShipmentModule { }
