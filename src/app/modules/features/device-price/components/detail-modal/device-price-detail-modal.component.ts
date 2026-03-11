import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs/operators';
import { LoadingService } from 'src/app/core/services/loading.service';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { DevicePriceDetailService } from '../../device-price-detail.service';
import { devicePriceDetailColumns } from '../../configs/device-price-detail.column';
import { DevicePriceDetailModel } from '../../configs/device-price-detail.model';

@Component({
  selector: 'app-device-price-detail-modal',
  templateUrl: './device-price-detail-modal.component.html',
  styleUrls: ['./device-price-detail-modal.component.scss']
})
export class DevicePriceDetailModalComponent implements OnInit {
  deviceCode = '';

  columns: TableColumn[] = devicePriceDetailColumns;
  devicePriceDetails: DevicePriceDetailModel[] = [];
  pageIndex = 1;
  pageSize = 10;
  total = 0;

  isFormVisible = false;
  isEditing = false;
  isConfirmLoading = false;
  form!: FormGroup;
  availableTypes = ['LOAI_1', 'LOAI_2', 'LOAI_3', 'LOAI_4', 'LOAI_5'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private devicePriceDetailService: DevicePriceDetailService,
    private loading: LoadingService,
    private message: NzMessageService,
    private fb: FormBuilder
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.deviceCode = this.route.snapshot.params['deviceCode'] || '';
    if (this.deviceCode) {
      this.getAllList();
    }
  }

  createForm(): void {
    this.form = this.fb.group({
      id: [null],
      type: [null, [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      fromDate: [null],
      toDate: [null]
    });
  }

  goBack(): void {
    this.router.navigate(['/device-price']);
  }

  buildPayload() {
    return {
      page: this.pageIndex - 1,
      size: this.pageSize,
      lsCondition: [
        { operator: 'EQUAL', property: 'deviceCode', propertyType: 'string', value: this.deviceCode }
      ],
      sortField: [{ fieldName: 'fromDate', sort: 'DESC' }]
    };
  }

  getAllList() {
    this.loading.show();
    this.devicePriceDetailService.searchDevicePriceDetails(this.buildPayload()).pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: (res) => {
        const content = res.data?.content || res.data || [];
        this.devicePriceDetails = content.map((item: any, index: number) => ({
          index: (this.pageIndex - 1) * this.pageSize + index + 1,
          ...item
        }));
        this.total = res.data?.totalElements || content.length || 0;
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi khi lấy danh sách cấu hình giá.');
      }
    });
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    this.getAllList();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 1;
    this.getAllList();
  }

  // --- Form Logic ---
  onAdd(): void {
    this.isEditing = false;
    this.form.reset({ price: 0 });
    this.isFormVisible = true;
  }

  onEdit(row: DevicePriceDetailModel): void {
    this.isEditing = true;
    this.form.patchValue(row);
    this.isFormVisible = true;
  }

  onDelete(row: DevicePriceDetailModel): void {
    if (!row.id) return;
    this.loading.show();
    this.devicePriceDetailService.deleteDevicePriceDetail([row.id]).pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: () => {
        this.message.success('Xóa cấu hình giá thành công!');
        this.getAllList();
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Xóa thất bại');
      }
    });
  }

  handleFormCancel(): void {
    this.isFormVisible = false;
  }

  handleFormOk(): void {
    Object.values(this.form.controls).forEach(control => {
      if (control.invalid) {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      }
    });

    if (this.form.invalid) {
      return;
    }

    const payload = {
      ...this.form.value,
      deviceCode: this.deviceCode
    };

    this.isConfirmLoading = true;
    this.devicePriceDetailService.saveDevicePriceDetail(payload).pipe(
      finalize(() => this.isConfirmLoading = false)
    ).subscribe({
      next: () => {
        this.message.success(this.isEditing ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        this.isFormVisible = false;
        this.getAllList();
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi xảy ra!');
      }
    });
  }
}
