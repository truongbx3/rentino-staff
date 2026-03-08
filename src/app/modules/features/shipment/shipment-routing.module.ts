import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShipmentListComponent } from './components/list/shipment-list.component';

const routes: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'Quản lý Shipment',
      breadcrumbIcon: 'bi-truck'
    },
    children: [
      {
        path: '',
        component: ShipmentListComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ShipmentRoutingModule {}
