import { NgModule } from '@angular/core';
import { ShipmentListComponent } from './components/list/shipment-list.component';
import { ShipmentDetailComponent } from './components/detail/shipment-detail.component';
import { ShipmentRoutingModule } from './shipment-routing.module';
import { SharesModule } from '../../shares/shares.module';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { JobcardDesignerComponent } from './jobcard/components/jobcard-designer/jobcard-designer.component';
import { JobcardPrintModalComponent } from './jobcard/components/jobcard-print-modal/jobcard-print-modal.component';

@NgModule({
  declarations: [
    ShipmentListComponent,
    ShipmentDetailComponent,
    JobcardDesignerComponent,
    JobcardPrintModalComponent
  ],
  imports: [
    ShipmentRoutingModule,
    SharesModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzCheckboxModule,
    NzRadioModule,
    NzTabsModule,
    NzPopconfirmModule
  ],
  exports: [
    JobcardDesignerComponent,
    JobcardPrintModalComponent
  ]
})
export class ShipmentModule { }
