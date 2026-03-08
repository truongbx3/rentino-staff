import { NgModule } from '@angular/core';
import { ShipmentListComponent } from './components/list/shipment-list.component';
import { ShipmentRoutingModule } from './shipment-routing.module';
import { SharesModule } from '../../shares/shares.module';

@NgModule({
  declarations: [
    ShipmentListComponent
  ],
  imports: [
    ShipmentRoutingModule,
    SharesModule
  ]
})
export class ShipmentModule {}
