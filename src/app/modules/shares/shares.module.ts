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
import { NzTableModule } from 'ng-zorro-antd/table';

import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { LoadingComponent } from './components/loading/loading.component';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { SwitchCustomComponent } from './components/switch-custom/switch-custom.component';
import { SingleSelectComponent } from './components/single-select/single-select.component';
import { CustomCheckboxComponent } from './components/checkbox-custom/checkbox-custom.component';
import { ThemeToggleComponent } from './theme/theme.component';
import { ThemeService } from 'src/app/core/services/theme.service';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { TableCustomComponent } from './components/table/table.component';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
@NgModule({
  declarations: [
    LoadingComponent,
    SwitchCustomComponent,
    SingleSelectComponent,
    CustomCheckboxComponent,
    ThemeToggleComponent,
    BreadcrumbComponent,
    TableCustomComponent
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
    NzSpinModule,
    NzDescriptionsModule,
    NzBreadCrumbModule,
    NzTableModule,
    NzToolTipModule,
    NzDropDownModule
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
    NzMessageModule,
    NzDividerModule,
    NzTagModule,
    NzCardModule,
    NzPaginationModule,
    NzSpinModule,
    LoadingComponent,
    NzResultModule,
    NzProgressModule,
    NzDescriptionsModule,
    NzIconModule,
    NzToolTipModule,
    NzTableModule,
    NzBreadCrumbModule,
    NzDropDownModule,
    SwitchCustomComponent,
    SingleSelectComponent,
    CustomCheckboxComponent,
    ThemeToggleComponent,
    BreadcrumbComponent,
    TableCustomComponent
  ],
  providers: [
    ThemeService
  ]
})
export class SharesModule { }