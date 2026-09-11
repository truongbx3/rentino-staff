import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs/operators';
import { LoadingService } from 'src/app/core/services/loading.service';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { DevicePriceService } from '../../device-price.service';
import { DevicePriceDetailService } from '../../device-price-detail.service';
import { devicePriceColumns } from '../../configs/device-price.column';
import { DevicePriceModel } from '../../configs/device-price.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-device-price-list',
  templateUrl: './device-price-list.component.html',
  styleUrls: ['./device-price-list.component.scss'],
  providers: [DatePipe]
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

  // Date Check Modal properties
  isDateCheckVisible = false;
  checkDate: Date | null = null;
  activeCount: number | null = null;
  expireResult: number | null = null;
  isCheckLoading = false;
  isExpireLoading = false;

  // Import Modal properties
  isImportVisible = false;
  importFromDate: Date | null = null;
  importToDate: Date | null = null;
  importFile: File | null = null;
  importFileName: string = '';
  isValidateLoading = false;
  validateResult: number | null = null;
  isImportLoading = false;
  importResult: any = null;

  // History Modal properties
  isHistoryVisible = false;
  importHistoryList: any[] = [];
  historyTotal = 0;
  historyPageIndex = 1;
  historyPageSize = 10;


  constructor(
    private devicePriceService: DevicePriceService,
    private devicePriceDetailService: DevicePriceDetailService,
    private loading: LoadingService,
    private message: NzMessageService,
    private fb: FormBuilder,
    private router: Router,
    private datePipe: DatePipe
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

  onExport(): void {
    this.loading.show();
    this.devicePriceService.exportDevicePrices().pipe(
      finalize(() => this.loading.hide())
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `device_prices_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.message.success('Xuất Excel thành công!');
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi xảy ra khi xuất Excel.');
      }
    });
  }

  // --- Date Check Modal Logic ---

  openDateCheckModal(): void {
    this.checkDate = null;
    this.activeCount = null;
    this.expireResult = null;
    this.isDateCheckVisible = true;
  }

  closeDateCheckModal(): void {
    this.isDateCheckVisible = false;
  }

  private formatDate(date: Date): string {
    return this.datePipe.transform(date, 'yyyy-MM-dd') || '';
  }

  onCheckDate(): void {
    if (!this.checkDate) {
      this.message.warning('Vui lòng chọn ngày!');
      return;
    }
    const dateStr = this.formatDate(this.checkDate);
    this.isCheckLoading = true;
    this.activeCount = null;
    this.expireResult = null;
    this.devicePriceDetailService.countActiveByDate(dateStr).pipe(
      finalize(() => this.isCheckLoading = false)
    ).subscribe({
      next: (res) => {
        this.activeCount = res.data;
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi khi kiểm tra.');
      }
    });
  }

  onExpireByDate(): void {
    if (!this.checkDate) {
      this.message.warning('Vui lòng chọn ngày!');
      return;
    }
    const dateStr = this.formatDate(this.checkDate);
    this.isExpireLoading = true;
    this.devicePriceDetailService.expireByDate(dateStr).pipe(
      finalize(() => this.isExpireLoading = false)
    ).subscribe({
      next: (res) => {
        this.expireResult = res.data;
        this.message.success(`Đã cập nhật ${res.data} bản ghi thành công!`);
        this.activeCount = null;
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi khi cập nhật.');
      }
    });
  }

  // --- Import Modal Logic ---

  openImportModal(): void {
    this.importFromDate = null;
    this.importToDate = null;
    this.importFile = null;
    this.importFileName = '';
    this.validateResult = null;
    this.importResult = null;
    this.isImportVisible = true;
  }

  closeImportModal(): void {
    this.isImportVisible = false;
  }

  beforeUpload = (file: any): boolean => {
    this.importFile = file;
    this.importFileName = file.name;
    this.validateResult = null;
    this.importResult = null;
    return false; // prevent auto upload
  };

  onValidateImport(): void {
    if (!this.importFromDate || !this.importToDate) {
      this.message.warning('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc!');
      return;
    }
    const fromStr = this.formatDate(this.importFromDate);
    const toStr = this.formatDate(this.importToDate);
    this.isValidateLoading = true;
    this.validateResult = null;
    this.importResult = null;
    this.devicePriceDetailService.validateImport(fromStr, toStr).pipe(
      finalize(() => this.isValidateLoading = false)
    ).subscribe({
      next: (res) => {
        this.validateResult = res.data;
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi khi validate.');
      }
    });
  }

  onImport(): void {
    if (!this.importFile) {
      this.message.warning('Vui lòng chọn file Excel!');
      return;
    }
    if (!this.importFromDate || !this.importToDate) {
      this.message.warning('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc!');
      return;
    }
    const fromStr = this.formatDate(this.importFromDate);
    const toStr = this.formatDate(this.importToDate);
    this.isImportLoading = true;
    this.devicePriceDetailService.importExcel(this.importFile, fromStr, toStr).pipe(
      finalize(() => this.isImportLoading = false)
    ).subscribe({
      next: (res) => {
        this.importResult = res.data;
        this.message.success(`Import thành công: ${res.data.totalInserted} bản ghi!`);
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi khi import.');
      }
    });
  }

  // --- History Modal Logic ---

  openHistoryModal(): void {
    this.isHistoryVisible = true;
    this.historyPageIndex = 1;
    this.loadImportHistory();
  }

  closeHistoryModal(): void {
    this.isHistoryVisible = false;
  }

  loadImportHistory(): void {
    const payload = {
      page: this.historyPageIndex - 1,
      size: this.historyPageSize,
      lsCondition: [],
      sortField: [{ fieldName: 'createdDate', sort: 'DESC' }]
    };
    this.devicePriceDetailService.searchImportHistory(payload).subscribe({
      next: (res) => {
        const content = res.data?.content || res.data || [];
        this.importHistoryList = content.map((item: any, index: number) => ({
          index: (this.historyPageIndex - 1) * this.historyPageSize + index + 1,
          ...item
        }));
        this.historyTotal = res.data?.totalElements || content.length || 0;
      },
      error: (err) => {
        this.message.error(err?.error?.message || err?.message || 'Có lỗi khi tải lịch sử.');
      }
    });
  }

  onHistoryPageChange(page: number): void {
    this.historyPageIndex = page;
    this.loadImportHistory();
  }

  downloadHistoryFile(filePath: string, fileName: string): void {
    const url = `${this.devicePriceDetailService['baseUrl']}/attach-file`;
    // Download directly from MinIO via presigned URL pattern
    // Since filePath is MinIO object path, construct download URL
    window.open(
      `${this.devicePriceDetailService['baseUrl'].replace('/api/v1/rentino', '')}/minio-files/swap/${filePath}`,
      '_blank'
    );
  }
}
