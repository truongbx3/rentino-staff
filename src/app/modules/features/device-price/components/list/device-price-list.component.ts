import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs/operators';
import { LoadingService } from 'src/app/core/services/loading.service';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { DevicePriceService } from '../../device-price.service';
import { devicePriceColumns } from '../../configs/device-price.column';
import { DevicePriceModel } from '../../configs/device-price.model';

@Component({
  selector: 'app-device-price-list',
  templateUrl: './device-price-list.component.html',
  styleUrls: ['./device-price-list.component.scss']
})
export class DevicePriceListComponent implements OnInit {
  columns: TableColumn[] = devicePriceColumns;
  devicePrices: DevicePriceModel[] = [];
  pageIndex: number = 1;
  pageSize: number = 10;
  total = 0;
  defaultSort = { fieldName: 'deviceCode', sort: 'ASC' as const };
  lastSearchPayload: any = null;

  // Modal properties
  isVisible = false;
  isConfirmLoading = false;
  isEditing = false;
  form!: FormGroup;



  constructor(
    private devicePriceService: DevicePriceService,
    private loading: LoadingService,
    private message: NzMessageService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.getAllList();
  }

  createForm(): void {
    this.form = this.fb.group({
      id: [null],
      deviceCode: [null, [Validators.required]],
      type: [null, [Validators.required]],
      model: [null, [Validators.required]],
      deviceName: [null, [Validators.required]],
      totalRam: [null, [Validators.required]],
      storage: [null, [Validators.required]],
      questionType: [null]
    });
  }

  buildPayload() {
    return {
      page: this.pageIndex - 1,
      size: this.pageSize,
      lsCondition: [],
      sortField: [
        {
          fieldName: this.defaultSort.fieldName,
          sort: this.defaultSort.sort
        }
      ]
    };
  }

  getAllList(payload?: any) {
    if (!payload) {
      payload = this.buildPayload();
    }
    this.loading.show();
    this.devicePriceService.searchDevicePrices(payload).pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: (res) => {
        const content = res.data?.content || res.data || [];
        this.devicePrices = content.map((item: any, index: number) => ({
          index: (this.pageIndex - 1) * this.pageSize + index + 1,
          ...item
        }));
        this.total = res.data?.totalElements || content.length || 0;
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi khi lấy danh sách.');
      }
    });
  }

  onSearch(payload: any) {
    this.pageIndex = 1;
    this.lastSearchPayload = {
      ...payload,
      page: 0,
      size: this.pageSize
    };
    this.getAllList(this.lastSearchPayload);
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    const payload = this.lastSearchPayload
      ? { ...this.lastSearchPayload, page: page - 1 }
      : this.buildPayload();
    this.getAllList(payload);
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 1;
    const payload = this.lastSearchPayload
      ? { ...this.lastSearchPayload, size, page: 0 }
      : this.buildPayload();
    this.getAllList(payload);
  }

  // --- Modal Logic ---

  onAdd(): void {
    this.isEditing = false;
    this.form.reset();
    this.isVisible = true;
  }

  onEdit(row: DevicePriceModel): void {
    this.isEditing = true;
    this.form.patchValue(row);
    this.isVisible = true;
  }

  onConfig(row: DevicePriceModel): void {
    this.router.navigate(['/device-price/detail', row.deviceCode]);
  }

  onDelete(row: DevicePriceModel): void {
    if (!row.id) return;
    this.loading.show();
    this.devicePriceService.deleteDevicePrice([row.id]).pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: () => {
        this.message.success('Xóa thiết bị thành công!');
        this.getAllList(this.lastSearchPayload || this.buildPayload());
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Xóa thất bại');
      }
    });
  }

  handleCancel(): void {
    this.isVisible = false;
  }

  handleOk(): void {
    Object.values(this.form.controls).forEach(control => {
      if (control.invalid) {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      }
    });

    if (this.form.invalid) {
      return;
    }

    const payload = this.form.value;

    this.isConfirmLoading = true;
    this.devicePriceService.saveDevicePrice(payload).pipe(
      finalize(() => this.isConfirmLoading = false)
    ).subscribe({
      next: () => {
        this.message.success(this.isEditing ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        this.isVisible = false;
        this.getAllList(this.lastSearchPayload || this.buildPayload());
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại!');
      }
    });
  }
}
