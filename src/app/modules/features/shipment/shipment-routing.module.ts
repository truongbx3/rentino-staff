import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShipmentListComponent } from './components/list/shipment-list.component';
import { ShipmentDetailComponent } from './components/detail/shipment-detail.component';

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
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ShipmentRoutingModule { }
