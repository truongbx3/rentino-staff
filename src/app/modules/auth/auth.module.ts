import { NgModule } from "@angular/core";
import { LoginComponent } from "./components/login/login.component";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AuthRoutingModule } from "./auth-routing.module";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from "ng-zorro-antd/input";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzMessageModule } from "ng-zorro-antd/message";
import { NzIconModule } from "ng-zorro-antd/icon";

@NgModule({
    declarations: [
        LoginComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        AuthRoutingModule,
        NzCardModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzCheckboxModule,
        NzMessageModule,
        NzIconModule
    ],
    exports: [
    ]
})

export class AuthModule {}