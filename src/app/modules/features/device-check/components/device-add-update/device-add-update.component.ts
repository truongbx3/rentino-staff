import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of } from 'rxjs';
import { catchError, finalize, concatMap } from 'rxjs/operators';
import { DeviceCheckService } from '../../device-check.service';
import { accessoryOptions, additionalItems, modelItems, switchItems } from '../configs/device.check.constant';

@Component({
  selector: 'app-device-add-update',
  templateUrl: './device-add-update.component.html',
  styleUrls: ['./device-add-update.component.scss']
})
export class DeviceAddUpdateComponent implements OnInit {
  @Input() deviceId?: number;

  currentStep = 0;
  deviceForm!: FormGroup;
  isSubmitting = false;
  isLoading = false;

  additionalItems = additionalItems;
  switchItems = switchItems;
  accessoryOptions = accessoryOptions;
  modelItems = modelItems;

  frontCameraFiles: NzUploadFile[] = [];
  backCameraFiles: NzUploadFile[] = [];
  transactionID: string = '';

  constructor(
    private modalRef: NzModalRef,
    private fb: FormBuilder,
    private deviceCheckService: DeviceCheckService,
    private message: NzMessageService
  ) { }

  ngOnInit(): void {
    this.initForm();

    this.deviceCheckService.getTransactionId().subscribe((res: any) => {
      this.transactionID = res.data;
    });

    if (this.deviceId) {
      this.loadDeviceDetail(this.deviceId);
    }
  }

  private initForm(): void {
    this.deviceForm = this.fb.group({
      type: ['mobile', Validators.required],
      deviceName: ['', Validators.required],
      model: ['', Validators.required],
      osVersion: [''],
      storage: [''],
      totalRam: [''],

      wifi: [false],
      bluetooth: [false],
      vibration: [false],
      gps: [false],
      biometrics: [false],
      mic: [false],
      volumeUp: [false],
      volumeDown: [false],
      touchScreen: [false],
      speaker: [false],
      headphone: [false],

      deviceFrame: [''],
      pin: [''],
      dynamicIsland: [''],
      sim: [''],
      lock: ['']
    });
  }

  private loadDeviceDetail(id: number): void {
    this.isLoading = true;

    this.deviceCheckService.getDeviceDetail(id)
      .pipe(
        catchError((error) => {
          this.message.error('Không thể tải thông tin thiết bị');
          return of(null);
        }),
        finalize(() => (this.isLoading = false))
      )
      .subscribe((response) => {
        if (response?.code === '00' && response.data?.length > 0) {
          const device = response.data[0];

          this.deviceForm.patchValue({
            type: device.type || 'mobile',
            deviceName: device.deviceName || '',
            model: device.model || '',
            osVersion: device.osVersion || '',
            storage: device.storage || '',
            totalRam: device.totalRam || ''
          });

          this.loadExistingImages(device.frontCheck, 'front');
          this.loadExistingImages(device.backCheck, 'back');

          if (device.functionCheck) {
            try {
              const checks = JSON.parse(device.functionCheck);
              checks.forEach((c: any) => {
                const key = this.mapApiItemToFormKey(c.item);
                if (this.deviceForm.get(key)) {
                  this.deviceForm.get(key)?.setValue(c.value);
                }
              });
            } catch (e) {
            }
          }

          if (device.additionCheck) {
            try {
              const checks = JSON.parse(device.additionCheck);
              checks.forEach((c: any) => {
                const key = this.mapApiCodeToFormKey(c.code);
                if (key && this.deviceForm.get(key)) {
                  this.deviceForm.get(key)?.setValue(c.value);
                }
              });
            } catch (e) {
            }
          }
        }
      });
  }

  private loadExistingImages(urlString: string | null, type: 'front' | 'back'): void {
    if (!urlString) return;

    const urls = urlString
      .split(';')
      .map((u) => u.trim())
      .filter(Boolean);

    const files: NzUploadFile[] = urls.map((url, index) => ({
      uid: `${type}-${index}-${Date.now()}`,
      name: url.split('/').pop() || 'image.jpg',
      status: 'done',
      url,
      thumbUrl: url
    }));

    if (type === 'front') {
      this.frontCameraFiles = files.slice(0, 5);
    } else {
      this.backCameraFiles = files.slice(0, 5);
    }
  }

  beforeUploadFront = (file: NzUploadFile): boolean => {
    return this.validateImage(file, this.frontCameraFiles);
  };

  beforeUploadBack = (file: NzUploadFile): boolean => {
    return this.validateImage(file, this.backCameraFiles);
  };

  private validateImage(file: NzUploadFile, list: NzUploadFile[]): boolean {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      this.message.error('Chỉ được tải lên file ảnh!');
      return false;
    }

    const isLt5M = (file.size || 0) / 1024 / 1024 < 5;
    if (!isLt5M) {
      this.message.error('Kích thước ảnh phải nhỏ hơn 5MB!');
      return false;
    }

    if (list.length >= 5) {
      this.message.error('Chỉ được tải tối đa 5 ảnh!');
      return false;
    }

    return true;
  }

  uploadFrontCamera = (item: NzUploadXHRArgs): any => {
    return this.uploadImage(item, 'FRONT');
  };

  uploadBackCamera = (item: NzUploadXHRArgs): any => {
    return this.uploadImage(item, 'BACK');
  };

  private uploadImage(item: NzUploadXHRArgs, type: 'FRONT' | 'BACK'): any {
    const file = item.file as NzUploadFile;
    const formData = new FormData();
    formData.append('files', file as any);

    const subscription = this.deviceCheckService.attachFiles(formData).subscribe({
      next: (res) => {
        if (res?.code === '00' && res.data?.length > 0) {
          const uploadedFile = res.data[0];

          file.url = uploadedFile.pathName;
          file.thumbUrl = uploadedFile.pathName;
          file.status = 'done';

          if (item.onSuccess) {
            item.onSuccess(res, file, null);
          }

          this.message.success(`Tải lên ${type === 'FRONT' ? 'camera trước' : 'camera sau'} thành công`);
        } else {
          file.status = 'error';
          this.message.error('Tải lên thất bại');
        }
      },
      error: (err) => {
        console.error('Upload error:', err);
        file.status = 'error';
        this.message.error('Có lỗi xảy ra khi tải lên');
      }
    });

    return subscription;
  }

  private mapApiItemToFormKey(item: string): string {
    const map: Record<string, string> = {
      WIFI: 'wifi',
      BLUE_TOOTH: 'bluetooth',
      VIBRATION: 'vibration',
      GPS: 'gps',
      BIOMETRICS: 'biometrics',
      MIC: 'mic',
      VOLUME_UP: 'volumeUp',
      VOLUME_DOWN: 'volumeDown',
      TOUCH_SCREEN: 'touchScreen',
      SPEAKER: 'speaker',
      HEADPHONE: 'headphone'
    };
    return map[item] || item.toLowerCase();
  }

  private mapApiCodeToFormKey(code: string): string {
    const map: Record<string, string> = {
      DEVICE_FRAME: 'deviceFrame',
      PIN: 'pin',
      DYNAMIC_ISLAND: 'dynamicIsland',
      SIM: 'sim',
      LOCK: 'lock'
    };
    return map[code] || '';
  }

  private mapFormKeyToApiItem(key: string): string {
    const map: Record<string, string> = {
      bluetooth: 'BLUE_TOOTH',
      headphone: 'HEADPHONE',
      mic: 'MIC',
      volumeUp: 'VOLUME_UP',
      volumeDown: 'VOLUME_DOWN',
      touchScreen: 'TOUCH_SCREEN'
    };
    return map[key] || key.toUpperCase();
  }

  private mapFormKeyToApiCode(key: string): string {
    const map: Record<string, string> = {
      deviceFrame: 'DEVICE_FRAME',
      dynamicIsland: 'DYNAMIC_ISLAND'
    };
    return map[key] || key.toUpperCase();
  }

  next(): void {
    if (this.currentStep === 0) {
      if (this.deviceForm.get('deviceName')?.invalid || this.deviceForm.get('model')?.invalid) {
        this.message.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
        Object.values(this.deviceForm.controls).forEach(control => {
          if (control.invalid) {
            control.markAsDirty();
            control.updateValueAndValidity({ onlySelf: true });
          }
        });
        return;
      }
      this.submitInfor();
    }
  }

  prev(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  private submitInfor(): void {
    const payload = {
      id: this.deviceId || null,
      deviceName: this.deviceForm.get('deviceName')?.value,
      model: this.deviceForm.get('model')?.value,
      osVersion: this.deviceForm.get('osVersion')?.value || '',
      storage: this.deviceForm.get('storage')?.value || '',
      totalRam: this.deviceForm.get('totalRam')?.value || '',
      transactionID: this.transactionID,
      type: this.deviceForm.get('type')?.value
    };

    this.isSubmitting = true;
    this.currentStep++;
  }

  submit(): void {
    this.isSubmitting = true;

    const frontUrls = this.frontCameraFiles
      .map((f) => (f.originFileObj as any).url || '')
      .filter(Boolean)
      .join(';');

    const backUrls = this.backCameraFiles
      .map((f) => (f.originFileObj as any).url || '')
      .filter(Boolean)
      .join(';');
    console.log('Front URLs:', this.frontCameraFiles);
    console.log('Back URLs:', this.backCameraFiles);
    const functionChecks = switchItems.map((item) => ({
      item: this.mapFormKeyToApiItem(item.key),
      value: this.deviceForm.get(item.key)?.value ?? false
    }));

    const mirrorChecks = [
      { item: 'FRONT_CAMERA', value: frontUrls },
      { item: 'BACK_CAMERA', value: backUrls }
    ];

    const additionalChecks = additionalItems.map((item) => ({
      code: this.mapFormKeyToApiCode(item.key),
      value: this.deviceForm.get(item.key)?.value || ''
    }));

    const payload = {
      functionChecks,
      mirrorChecks,
      additionalChecks,
      transactionID: this.transactionID
    };

    const devicePayload = {
      id: this.deviceId || null,
      deviceName: this.deviceForm.get('deviceName')?.value,
      model: this.deviceForm.get('model')?.value,
      osVersion: this.deviceForm.get('osVersion')?.value || '',
      storage: this.deviceForm.get('storage')?.value || '',
      totalRam: this.deviceForm.get('totalRam')?.value || '',
      transactionId: this.transactionID,
      type: this.deviceForm.get('type')?.value
    };

    this.deviceCheckService.saveDeviceInfor(devicePayload).pipe(
      concatMap((res) => {
        this.message.success('Lưu thông tin thiết bị thành công');
        return this.deviceCheckService.saveCheckDeviceInfor(payload);
      }),
      concatMap((res2) => {
        this.message.success('Lưu kết quả kiểm tra thành công');
        return this.deviceCheckService.checkDeviceStatus(this.transactionID);
      }),
      finalize(() => (this.isSubmitting = false)),
      catchError((err) => {
        this.message.error(err?.message || 'Có lỗi xảy ra');
        return of(null);
      })
    ).subscribe((finalRes) => {
      if (finalRes?.code === '00') {
        this.message.success('Hoàn tất quy trình kiểm tra thiết bị');
        this.modalRef.close(true);
      }
    });
  }

  cancel(): void {
    this.modalRef.close(false);
  }
}