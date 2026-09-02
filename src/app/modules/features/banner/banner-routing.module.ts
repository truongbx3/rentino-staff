import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BannerListComponent } from './components/banner-list/banner-list.component';

const routes: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'Quản lý Banner',
      breadcrumbIcon: 'bi-images'
    },
    children: [
      {
        path: '',
        component: BannerListComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BannerRoutingModule { }
