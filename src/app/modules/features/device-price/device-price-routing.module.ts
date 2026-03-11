import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DevicePriceListComponent } from './components/list/device-price-list.component';
import { DevicePriceDetailModalComponent } from './components/detail-modal/device-price-detail-modal.component';

const routes: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'Danh mục thiết bị',
      breadcrumbIcon: 'bi-phone'
    },
    children: [
      {
        path: '',
        component: DevicePriceListComponent
      },
      {
        path: 'detail/:deviceCode',
        component: DevicePriceDetailModalComponent,
        data: {
          breadcrumb: 'Cấu hình chi tiết giá'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DevicePriceRoutingModule { }
