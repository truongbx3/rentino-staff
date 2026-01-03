import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DeviceListComponent } from "./components/list/device-list.component";
import { DeviceAddUpdateAdvancedComponent } from "./components/device-add-update-advanced/device-add-update-advanced.component";

const routes: Routes = [
    {
        path: '',
        data: {
            breadcrumb: 'Quản lý thiết bị',
            breadcrumbIcon: 'bi-phone'
        },
        children: [
            {
                path: '',
                component: DeviceListComponent,
                data: {
                    breadcrumb: 'Danh sách thiết bị',
                    breadcrumbIcon: 'bi-list-ul'
                }
            },
            {
                path: 'add',
                component: DeviceAddUpdateAdvancedComponent,
                data: {
                    breadcrumb: 'Thêm thiết bị mới',
                    breadcrumbIcon: 'bi-plus-circle'
                }
            },
            {
                path: 'edit/:id',
                component: DeviceAddUpdateAdvancedComponent,
                data: {
                    breadcrumb: 'Chỉnh sửa thiết bị',
                    breadcrumbIcon: 'bi-pencil-square'
                }
            }
        ]
    }
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DeviceCheckRoutingModule { }