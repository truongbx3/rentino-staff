import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShipmentListComponent } from './components/list/shipment-list.component';
import { ShipmentDetailComponent } from './components/detail/shipment-detail.component';
import { JobcardDesignerComponent } from './jobcard/components/jobcard-designer/jobcard-designer.component';
import { JobcardDesignerCanDeactivateGuard } from './jobcard/guards/jobcard-designer-can-deactivate.guard';

const routes: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'Danh sách vận chuyển',
      breadcrumbIcon: 'bi-truck'
    },
    children: [
      {
        path: '',
        component: ShipmentListComponent
      },
      {
        path: 'detail/:trackingNumber',
        component: ShipmentDetailComponent,
        data: { breadcrumb: 'Chi tiết vận đơn' }
      },
      {
        path: 'jobcard-designer',
        component: JobcardDesignerComponent,
        canDeactivate: [JobcardDesignerCanDeactivateGuard],
        data: { breadcrumb: 'Thiết kế mẫu in' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ShipmentRoutingModule { }
