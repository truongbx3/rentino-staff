import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MainLayoutComponent } from "./main-layout/main-layout.component";
import { AuthLayoutComponent } from "./auth-layout/auth-layout.component";
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { SharesModule } from "../shares/shares.module";
import { NzIconModule } from "ng-zorro-antd/icon";
@NgModule({
    declarations: [
        AuthLayoutComponent,
        MainLayoutComponent
    ],
    imports: [
        RouterModule,
        NzLayoutModule,
        SharesModule,
        NzIconModule
    ],
    exports: [
        AuthLayoutComponent,
        MainLayoutComponent
    ]
})
export class LayoutModule { }

