import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Banner } from '../../models/banner.model';
import { BannerService } from '../../services/banner.service';

@Component({
  selector: 'app-banner-list',
  templateUrl: './banner-list.component.html',
  styleUrls: ['./banner-list.component.scss']
})
export class BannerListComponent implements OnInit {
  banners: Banner[] = [];
  filteredBanners: Banner[] = [];
  loading = false;
  selectedStatus: number | null = null; // null = Tất cả, 1 = Hiệu lực, 0 = Không hiệu lực

  // Edit Modal State
  isEditModalVisible = false;
  isSaving = false;
  editForm!: FormGroup;
  selectedBanner: Banner | null = null;

  // Upload Modal State
  isUploadModalVisible = false;
  isUploading = false;
  uploadFiles: File[] = [];
  uploadStatus: number = 1;
  uploadDeeplink: string = '';

  // Preview Lightbox State
  isPreviewVisible = false;
  previewImageUrl = '';
  previewTitle = '';

  constructor(
    private bannerService: BannerService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadBanners();
  }

  initForms(): void {
    this.editForm = this.fb.group({
      id: [null],
      title: ['', [Validators.required]],
      deeplink: [''],
      displayOrder: [1, [Validators.required, Validators.min(1)]],
      status: [1, [Validators.required]]
    });
  }

  loadBanners(): void {
    this.loading = true;
    const fetch$ = (this.selectedStatus !== null)
      ? this.bannerService.getBannersByStatus(this.selectedStatus)
      : this.bannerService.getAllBanners();

    fetch$.subscribe(
      (res: any) => {
        this.loading = false;
        if (res && res.data) {
          this.banners = res.data;
        } else {
          this.banners = [];
        }
        this.applyFilter();
      },
      (err: any) => {
        this.loading = false;
        this.notifyError(err?.error?.message, 'Không thể tải danh sách banner!');
      }
    );
  }

  /**
   * Interceptor đã hiển thị body.message (HTTP lỗi hoặc code !== '00'),
   * nên chỉ hiện thông báo dự phòng khi body không có message.
   */
  private notifyError(bodyMessage: any, fallback: string): void {
    if (!bodyMessage) {
      this.message.error(fallback);
    }
  }

  applyFilter(): void {
    if (this.selectedStatus === null) {
      this.filteredBanners = [...this.banners];
    } else {
      this.filteredBanners = this.banners.filter(b => b.status === this.selectedStatus);
    }
  }

  onFilterStatusChange(status: number | null): void {
    this.selectedStatus = status;
    this.loadBanners();
  }

  // --- Upload Banners Modal ---
  openUploadModal(): void {
    this.uploadFiles = [];
    this.uploadStatus = 1;
    this.uploadDeeplink = '';
    this.isUploadModalVisible = true;
  }

  closeUploadModal(): void {
    this.isUploadModalVisible = false;
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.uploadFiles.push(files.item(i)!);
      }
    }
  }

  removeUploadFile(index: number): void {
    this.uploadFiles.splice(index, 1);
  }

  handleUpload(): void {
    if (this.uploadFiles.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất 1 ảnh banner!');
      return;
    }

    this.isUploading = true;
    this.bannerService.uploadBanners(this.uploadFiles, this.uploadStatus, this.uploadDeeplink).subscribe(
      (res: any) => {
        this.isUploading = false;
        if (res?.code !== '00') {
          this.notifyError(res?.message, 'Tải lên banner thất bại!');
          return;
        }
        this.message.success(`Tải lên thành công ${this.uploadFiles.length} banner!`);
        this.closeUploadModal();
        this.loadBanners();
      },
      (err: any) => {
        this.isUploading = false;
        this.notifyError(err?.error?.message, 'Tải lên banner thất bại!');
      }
    );
  }

  // --- Edit Banner Modal ---
  onEdit(banner: Banner): void {
    this.selectedBanner = banner;
    this.editForm.patchValue({
      id: banner.id,
      title: banner.title || '',
      deeplink: banner.deeplink || '',
      displayOrder: banner.displayOrder || 1,
      status: banner.status ?? 1
    });
    this.isEditModalVisible = true;
  }

  closeEditModal(): void {
    this.isEditModalVisible = false;
    this.selectedBanner = null;
  }

  handleSaveEdit(): void {
    if (this.editForm.invalid) {
      Object.values(this.editForm.controls).forEach((control: any) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.editForm.value;
    const updatedBanner: Banner = {
      ...this.selectedBanner,
      title: formValue.title,
      deeplink: formValue.deeplink,
      displayOrder: formValue.displayOrder,
      status: formValue.status
    };

    this.bannerService.saveBanner(updatedBanner).subscribe(
      (res: any) => {
        this.isSaving = false;
        if (res?.code !== '00') {
          this.notifyError(res?.message, 'Cập nhật thất bại!');
          return;
        }
        this.message.success('Cập nhật thông tin banner thành công!');
        this.closeEditModal();
        this.loadBanners();
      },
      (err: any) => {
        this.isSaving = false;
        this.notifyError(err?.error?.message, 'Cập nhật thất bại!');
      }
    );
  }

  // Status toggle & inline order state
  togglingBannerId: number | null = null;
  savingOrderId: number | null = null;

  // --- Quick Status Toggle ---
  onStatusToggle(banner: Banner, checkedOrStatus: boolean | number): void {
    if (!banner || banner.id === undefined) return;
    if (this.togglingBannerId === banner.id) return;

    let targetStatus: number;
    if (typeof checkedOrStatus === 'boolean') {
      targetStatus = checkedOrStatus ? 1 : 0;
    } else {
      targetStatus = checkedOrStatus;
    }

    if (banner.status === targetStatus) return;

    const oldStatus = banner.status;
    this.togglingBannerId = banner.id;

    const updatedBanner: Banner = {
      ...banner,
      status: targetStatus
    };

    this.bannerService.saveBanner(updatedBanner).subscribe(
      (res: any) => {
        this.togglingBannerId = null;
        if (res?.code !== '00') {
          banner.status = oldStatus;
          this.notifyError(res?.message, 'Đổi trạng thái thất bại!');
          return;
        }
        banner.status = targetStatus;
        const statusText = targetStatus === 1 ? 'Hiệu lực' : 'Không hiệu lực';
        this.message.success(`Đã đổi trạng thái banner "${banner.title || ''}" thành ${statusText}`);
      },
      (err: any) => {
        this.togglingBannerId = null;
        banner.status = oldStatus;
        this.notifyError(err?.error?.message, 'Đổi trạng thái thất bại!');
      }
    );
  }

  // --- Display Order Inline Update ---
  // Giá trị tạm khi người dùng đang gõ / bấm mũi tên; chỉ lưu khi blur hoặc Enter.
  orderDrafts = new Map<number, number | null>();

  getOrderValue(banner: Banner): number | null | undefined {
    if (banner.id !== undefined && this.orderDrafts.has(banner.id)) {
      return this.orderDrafts.get(banner.id);
    }
    return banner.displayOrder;
  }

  onOrderDraftChange(banner: Banner, value: number | null): void {
    if (!banner || banner.id === undefined) return;
    this.orderDrafts.set(banner.id, value);
  }

  onOrderBlur(banner: Banner): void {
    if (!banner || banner.id === undefined) return;
    if (this.savingOrderId === banner.id) return;
    if (!this.orderDrafts.has(banner.id)) return;

    const draft = this.orderDrafts.get(banner.id);
    const newOrder = Number(draft);
    const isValid = draft !== null && draft !== undefined && `${draft}` !== ''
      && Number.isFinite(newOrder) && newOrder >= 1;

    if (!isValid || banner.displayOrder === newOrder) {
      // Giá trị không hợp lệ hoặc không đổi: bỏ giá trị tạm, hiển thị lại thứ tự cũ
      this.orderDrafts.delete(banner.id);
      return;
    }

    const bannerId = banner.id;
    this.savingOrderId = bannerId;

    const updatedBanner: Banner = {
      ...banner,
      displayOrder: newOrder
    };

    this.bannerService.saveBanner(updatedBanner).subscribe(
      (res: any) => {
        this.savingOrderId = null;
        this.orderDrafts.delete(bannerId);
        if (res?.code !== '00') {
          this.notifyError(res?.message, 'Cập nhật thứ tự thất bại!');
          return;
        }
        banner.displayOrder = newOrder;
        this.message.success('Cập nhật thứ tự hiển thị thành công!');
        this.loadBanners();
      },
      (err: any) => {
        this.savingOrderId = null;
        this.orderDrafts.delete(bannerId);
        this.notifyError(err?.error?.message, 'Cập nhật thứ tự thất bại!');
      }
    );
  }

  // --- Delete Banner ---
  onDelete(banner: Banner): void {
    if (!banner.id) return;
    this.bannerService.deleteBanners([banner.id]).subscribe(
      (res: any) => {
        if (res?.code !== '00') {
          this.notifyError(res?.message, 'Xóa banner thất bại!');
          return;
        }
        this.message.success('Xóa banner thành công!');
        this.loadBanners();
      },
      (err: any) => {
        this.notifyError(err?.error?.message, 'Xóa banner thất bại!');
      }
    );
  }

  // --- Lightbox Preview ---
  onPreview(banner: Banner): void {
    this.previewImageUrl = banner.imageUrl || '';
    this.previewTitle = banner.title || 'Ảnh Banner';
    this.isPreviewVisible = true;
  }

  closePreview(): void {
    this.isPreviewVisible = false;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/placeholder.png';
    }
  }
}
