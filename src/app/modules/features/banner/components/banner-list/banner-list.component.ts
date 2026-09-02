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
        this.message.error('Không thể tải danh sách banner!');
      }
    );
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
        this.message.success(`Tải lên thành công ${this.uploadFiles.length} banner!`);
        this.closeUploadModal();
        this.loadBanners();
      },
      (err: any) => {
        this.isUploading = false;
        this.message.error('Tải lên banner thất bại!');
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
        this.message.success('Cập nhật thông tin banner thành công!');
        this.closeEditModal();
        this.loadBanners();
      },
      (err: any) => {
        this.isSaving = false;
        this.message.error('Cập nhật thất bại!');
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
      () => {
        this.togglingBannerId = null;
        banner.status = targetStatus;
        const statusText = targetStatus === 1 ? 'Hiệu lực' : 'Không hiệu lực';
        this.message.success(`Đã đổi trạng thái banner "${banner.title || ''}" thành ${statusText}`);
      },
      () => {
        this.togglingBannerId = null;
        banner.status = oldStatus;
        this.message.error('Đổi trạng thái thất bại!');
      }
    );
  }

  // --- Display Order Inline Update ---
  onOrderBlur(banner: Banner, newOrder: number): void {
    if (!banner || banner.id === undefined || banner.displayOrder === newOrder) return;
    const oldOrder = banner.displayOrder;
    this.savingOrderId = banner.id;

    const updatedBanner: Banner = {
      ...banner,
      displayOrder: newOrder
    };

    this.bannerService.saveBanner(updatedBanner).subscribe(
      () => {
        this.savingOrderId = null;
        banner.displayOrder = newOrder;
        this.message.success('Cập nhật thứ tự hiển thị thành công!');
        this.loadBanners();
      },
      () => {
        this.savingOrderId = null;
        banner.displayOrder = oldOrder;
        this.message.error('Cập nhật thứ tự thất bại!');
      }
    );
  }

  // --- Delete Banner ---
  onDelete(banner: Banner): void {
    if (!banner.id) return;
    this.bannerService.deleteBanners([banner.id]).subscribe(
      () => {
        this.message.success('Xóa banner thành công!');
        this.loadBanners();
      },
      () => {
        this.message.error('Xóa banner thất bại!');
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
