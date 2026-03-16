import { NgModule } from '@angular/core';
import { ShipmentListComponent } from './components/list/shipment-list.component';
import { ShipmentDetailComponent } from './components/detail/shipment-detail.component';
import { ShipmentRoutingModule } from './shipment-routing.module';
import { SharesModule } from '../../shares/shares.module';

@NgModule({
  declarations: [
    ShipmentListComponent,
    ShipmentDetailComponent
  ],
  imports: [
    ShipmentRoutingModule,
    SharesModule
  ]
})
export class ShipmentModule { }
