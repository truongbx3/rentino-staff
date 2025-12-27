import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MainLayoutComponent } from "./main-layout/main-layout.component";
import { AuthLayoutComponent } from "./auth-layout/auth-layout.component";
import { NzLayoutModule } from 'ng-zorro-antd/layout';
@NgModule({
    declarations: [
        AuthLayoutComponent,
        MainLayoutComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        NzLayoutModule
    ],
    exports: [
        AuthLayoutComponent,
        MainLayoutComponent
    ]
})
export class LayoutModule { }

