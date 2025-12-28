import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message'; 

import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { LoadingComponent } from './components/loading/loading.component';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzResultModule } from 'ng-zorro-antd/result';
@NgModule({
  declarations: [
    LoadingComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzModalModule,
    NzStepsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzUploadModule,
    NzButtonModule,
    NzGridModule,
    NzIconModule,
    NzMessageModule,
    NzDividerModule,
    NzTagModule,
    NzCardModule,
    NzPaginationModule,
    NzSpinModule
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzModalModule,
    NzStepsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzUploadModule,
    NzButtonModule,
    NzGridModule,
    NzIconModule,
    NzMessageModule,
    NzDividerModule,
    NzTagModule,
    NzCardModule,
    NzPaginationModule,
    NzSpinModule,
    LoadingComponent,
    NzResultModule
  ]
})
export class SharesModule { }