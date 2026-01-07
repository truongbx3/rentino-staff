import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { EMPTY, iif, Observable, of, timer } from 'rxjs';
import { catchError, concatMap, finalize, tap } from 'rxjs/operators';
import { DeviceCheckService } from '../../device-check.service';
import { accessoryOptions, modelItems, switchItems } from '../../configs/device.check.constant';
import { LoadingService } from 'src/app/core/services/loading.service';
import { DeviceEnumType } from '../../configs/device-check.enum';
import { Router } from '@angular/router';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { NzModalService } from 'ng-zorro-antd/modal';

@Component({
    selector: 'app-device-add-update-advanced',
    templateUrl: './device-add-update-advanced.component.html',
    styleUrls: ['./device-add-update-advanced.component.scss']
})
export class DeviceAddUpdateAdvancedComponent {
    @ViewChild('liquidationContent') liquidationContent!: TemplateRef<any>;

    deviceId?: number;
    current = 1;
    totalSteps!: number;
    percent = 0;
    isRejected = false;
    transactionID: string = '';
    questions: any = [];
    resultCheck: any = null;
    isEditMode = false;

    fileList: NzUploadFile[] = [];
    videoSrc: string | null = null;

    // Forms
    deviceForm!: FormGroup;
    additionalChecksForms!: FormGroup;
    functionChecksForms!: FormGroup;
    bankingInforForm!: FormGroup;

    // Options
    switchItems = switchItems;
    accessoryOptions = accessoryOptions;
    modelItems = modelItems;
    devicesOptions: any[] = [];

    rejectedQuestionIndex: number | null = null;
    rejectedQuestionKey: string | null = null;

    constructor(
        private fb: FormBuilder,
        private deviceCheckService: DeviceCheckService,
        private message: NzMessageService,
        private loading: LoadingService,
        private router: Router,
        private modal: NzModalService
    ) { }


    beforeUpload = (file: any): boolean => {
        const isVideo = file.type.startsWith('video/');
        const isLimit = file.size! / 1024 / 1024 <= 100;

        if (!isVideo) {
            alert('Chỉ hỗ trợ video!');
            return false;
        }
        if (!isLimit) {
            alert('Video quá lớn! Giới hạn 100MB.');
            return false;
        }

        this.fileList = [file];

        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.videoSrc = e.target.result;
        };
        reader.readAsDataURL(file as any);

        return false;
    };

    handleRemove(): boolean {
        this.fileList = [];
        this.videoSrc = null;
        return true;
    }

    get visibleSteps(): number {
        return Math.max(1, (this.totalSteps || 0) - 1);
    }

    getStepSummaryKeys(): number[] {
        return Object.keys(this.stepSummaries).map(Number).sort((a, b) => a - b);
    }
    ngOnInit(): void {
        this.initForm();
        this.loadApis();

        if (this.router.url.includes('/edit/')) {
            this.deviceId = Number(this.router.url.split('/edit/')[1]);
            this.isEditMode = true;
        }
    }

    private async loadApis(): Promise<any> {
        this.deviceCheckService.getTransactionId().pipe(
            tap((res: any) => {
                this.transactionID = res.data;
            }),
            concatMap(() =>
                this.deviceCheckService.getAllQuestions('MOBILE_WEB')
            ),
            tap(res => {
                this.questions = res?.data || res?.data?.content || [];
                this.totalSteps = this.questions.length + 2;

                this.calcPercent();
                this.mappedQuestions();
                this.initAdditionalChecksForm();
            }),
            concatMap(() => {
                if (this.deviceId) {
                    return this.loadDeviceDetail(this.deviceId);
                }

                return EMPTY;
            })
        ).subscribe({
            error: err => console.error(err)
        });
    }

    private mappedQuestions(): void {
        this.questions = this.questions.sort(
            (a: any, b: any) => a.order - b.order
        );
    }

    private initForm(): void {
        this.deviceForm = this.fb.group({
            id: [null],
            type: ['mobile', Validators.required],
            deviceName: [''],
            deviceCode: [null, Validators.required],
            model: ['', Validators.required],
            osVersion: [''],
            storage: [''],
            totalRam: [''],
            videoUrl: [null]
        });

        this.initFunctionChecksForms();
        this.initBankingInforForm();
    }

    private initBankingInforForm(): void {
        this.bankingInforForm = this.fb.group({
            imei: ['', [Validators.required]],
            bankingNumber: [null, Validators.required],
            bankingName: [null, Validators.required],
            bankingUser: [null, Validators.required]
        });
    }

    private initFunctionChecksForms(): void {
        this.functionChecksForms = this.fb.group({
            wifi: [null], bluetooth: [null],
            vibration: [null], gps: [null],
            biometrics: [null], mic: [null],
            volumeUp: [null], volumeDown: [null],
            touchScreen: [null], speaker: [null],
            headphone: [null]
        })
    }

    private initAdditionalChecksForm(): void {
        const group: { [key: string]: any } = {};

        this.questions.forEach((q: any) => {
            group[q.code] = [null];
        });

        this.additionalChecksForms = this.fb.group(group);
    }

    canShowSwitch(index: number): boolean {
        if (index === 0) return true;
        const prevKey = this.switchItems[index - 1].key;
        const prevValue = this.functionChecksForms.get(prevKey)?.value;

        return prevValue !== null && prevValue !== undefined;
    }

    private loadDeviceDetail(id: number): Observable<any> {
        this.loading.show();

        return this.deviceCheckService.getDeviceDetail(id).pipe(
            catchError((error) => {
                this.message.error('Không thể tải thông tin thiết bị');
                return of(null);
            }),
            tap((response) => {
                if (response?.code === '00' && response.data?.length > 0) {
                    const device = response.data[0];

                    this.loadDeviceCheckDetail(device.transactionId);

                    this.deviceForm.patchValue(device);
                    this.videoSrc = device.videoUrl || null;
                }
            }),
            finalize(() => this.loading.hide())
        );
    }


    private loadDeviceCheckDetail(transId: string) {
        this.loading.show();

        this.deviceCheckService.getDeviceCheckDetail(transId).subscribe((res: any) => {
            if (res?.code === '00' && Array.isArray(res.data)) {
                res.data.forEach((check: any) => {
                    const key = check.item;
                    const value = check.value;

                    const functionKey = this.mapApiItemToFormKey(key);
                    if (this.functionChecksForms.get(functionKey)) {
                        this.functionChecksForms
                            .get(functionKey)
                            ?.setValue(value === '1');
                        return;
                    }

                    if (this.additionalChecksForms?.get(key)) {
                        this.additionalChecksForms.get(key)?.setValue(value);
                    }
                });

                this.generateAllStepSummaries()
            }
            this.loading.hide();
        });
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
            HEADPHONE: 'headphone',
        };
        return map[item] || item.toLowerCase();
    }

    private mapFormKeyToApiItem(key: string): string {
        const map: Record<string, string> = {
            bluetooth: 'BLUE_TOOTH',
            headphone: 'HEADPHONE',
            volumeUp: 'VOLUME_UP',
            volumeDown: 'VOLUME_DOWN',
            touchScreen: 'TOUCH_SCREEN'
        };
        return map[key] || key.toUpperCase();
    }

    onModelChange(value: string): void {
        if (value) {
            const payload = {
                page: 0,
                size: 1000,
                lsCondition: [
                    {
                        operator: 'EQUAL',
                        property: 'model',
                        propertyType: 'string',
                        value: value
                    }
                ],
                sortField: []
            };

            this.loading.show();
            this.deviceCheckService.getAllDevicePrice(payload)
                .pipe(finalize(() => {
                    this.loading.hide();
                }))
                .subscribe(res => {
                    this.devicesOptions = res.data.content.map((item: any) => ({
                        label: `${item.deviceName} - ${item.totalRam} - ${item.storage}`,
                        value: item.deviceCode,
                        infor: {
                            totalRam: item.totalRam,
                            storage: item.storage,
                            deviceName: item.deviceName
                        }
                    })) || [];
                });
        }
    }

    onDeviceChange(deviceName: string): void {
        const selected = this.devicesOptions.find(d => d.value === deviceName);
        if (!selected) return;

        this.deviceForm.patchValue({
            totalRam: selected.infor?.totalRam || '',
            storage: selected.infor?.storage || '',
            deviceName: selected.infor?.deviceName || ''
        });
    }

    private createFormData(file: any): FormData {
        const formData = new FormData();
        formData.append('files', file);
        return formData;
    }

    submit(): void {
        const functionChecks = switchItems.map((item) => ({
            item: this.mapFormKeyToApiItem(item.key),
            value: this.functionChecksForms.get(item.key)?.value ?? false
        }));

        const additionalChecks = this.questions.map((item: any) => ({
            code: item.code,
            value: this.additionalChecksForms.get(item.code)?.value || ''
        }));


        const payload = {
            functionChecks,
            additionalChecks,
            mirrorChecks: [],
            transactionID: this.transactionID
        };

        this.loading.show('Đang tải thông tin thiết bị...');

        iif(
            () => this.fileList.length > 0,
            this.deviceCheckService.attachFiles(this.createFormData(this.fileList[0])),
            of(null),
        ).pipe(
            concatMap((fileResp: any) => {
                const devicePayload = {
                    ...this.deviceForm.value,
                    transactionId: this.transactionID,
                    typeCheck: "STAFF_CHECK",
                    videoUrl: fileResp?.data?.[0]?.pathName || this.deviceForm.value.videoUrl
                };
                return this.deviceCheckService.saveDeviceInfor(devicePayload);
            }),
            concatMap((res) => {
                this.deviceId = res.data?.id;
                this.loading.show('Đang kiểm tra thiết bị...');;
                return this.deviceCheckService.saveCheckDeviceInfor(payload);
            }),
            concatMap((res) => {
                this.message.success('Lưu kết quả kiểm tra thành công');
                return this.deviceCheckService.checkDeviceStatus(this.transactionID);
            }),
            finalize(() => {
                this.loading.hide();

                if (this.current < this.totalSteps && !this.isRejected) {
                    this.generateStepSummary(this.current);

                    this.current++;
                    this.calcPercent();
                }
            }),
            catchError((res) => {
                this.message.error(res?.error?.message || 'Có lỗi xảy ra');
                return of(null);
            })
        ).subscribe((finalRes: any) => {
            if (finalRes?.code === '00') {
                this.message.success('Hoàn tất quy trình kiểm tra thiết bị');
                this.resultCheck = finalRes.data;
            }
        });
    }

    calcPercent(): void {
        if (!this.totalSteps || this.totalSteps <= 1) {
            this.percent = 0;
            return;
        }

        const visible = this.visibleSteps;

        if (this.current >= this.totalSteps) {
            this.percent = 100;
            return;
        }

        const raw = Math.ceil((this.current / visible) * 100);
        this.percent = Math.min(100, Math.max(1, raw));
    }

    formatStep = (): string => {
        const visible = this.visibleSteps;
        const displayCurrent = Math.min(this.current, visible);
        return `${displayCurrent} / ${visible}`;
    };

    edit(): void {
        this.isRejected = false;

        if (
            this.rejectedQuestionIndex !== null &&
            this.rejectedQuestionKey
        ) {
            this.current = this.rejectedQuestionIndex + 1;
            this.calcPercent();

            this.additionalChecksForms
                .get(this.rejectedQuestionKey)
                ?.reset();
        }
    }

    startOver(): void {
        if (
            this.rejectedQuestionIndex === null ||
            !this.rejectedQuestionKey
        ) return;

        this.isRejected = false;
        this.current = this.rejectedQuestionIndex + 1;
        this.calcPercent();

        this.additionalChecksForms
            .get(this.rejectedQuestionKey)
            ?.reset();
    }

    checkRejected(): void {
        this.isRejected = false;
        this.rejectedQuestionIndex = null;
        this.rejectedQuestionKey = null;

        this.questions.some((q: any, index: number) => {
            const value = this.additionalChecksForms.get(q.code)?.value;

            const isReject =
                value === false || value === 'STOP' || value === 0;

            if (isReject) {
                this.isRejected = true;
                this.rejectedQuestionIndex = index + 1;

                this.rejectedQuestionKey = q.code;
                return true;
            }

            return false;
        });
    }

    next(): void {
        if (this.deviceForm.invalid) {
            this.message.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
            Object.values(this.deviceForm.controls).forEach(control => {
                if (control.invalid) {
                    control.markAsDirty();
                    control.updateValueAndValidity({ onlySelf: true });
                }
            });
            return;
        }

        const functionChecks = switchItems.map((item) => ({
            item: this.mapFormKeyToApiItem(item.key),
            value: this.functionChecksForms.get(item.key)?.value ?? false
        }));

        const hasFunctionError = functionChecks.some(fc => fc.value === false);
        if (hasFunctionError) {
            this.additionalChecksForms.get('FUNCTION_WEB')?.setValue('LOAI_3');
        } else {
            this.additionalChecksForms.get('FUNCTION_WEB')?.setValue('LOAI_1');
        }

        this.checkRejected();

        if (this.current < this.totalSteps && !this.isRejected) {
            this.generateStepSummary(this.current);

            this.current++;
            this.calcPercent();
        }
    }

    private generateStepSummary(step: number): void {
        let summary = '';
        const deviceForm = this.deviceForm;

        if (step === 1) {
            summary = `
            <div class="d-flex gap-2 justify-content-between mb-2">
                <span class="text-muted">Model</span>
                <span class="fw-bold">${deviceForm.get('deviceName')?.value || 'N/A'}</span>
            </div>
            <div class="d-flex gap-2 justify-content-between mb-2">
                <span class="text-muted">RAM</span>
                <span class="fw-bold">${deviceForm.get('totalRam')?.value || 'N/A'}</span>
            </div>
            <div class="d-flex gap-2 justify-content-between mb-2">
                <span class="text-muted">Dung lượng</span>
                <span class="fw-bold">${deviceForm.get('storage')?.value || 'N/A'}</span>
            </div>
            <div class="d-flex gap-2 justify-content-between mb-2">
                <span class="text-muted">Phiên bản OS</span>
                <span class="fw-bold">${deviceForm.get('osVersion')?.value || 'N/A'}</span>
            </div>
        `;
        }
        else {
            const questionIndex = step - 2;

            if (questionIndex >= 0 && questionIndex < this.questions.length) {
                const question = this.questions[questionIndex];
                const questionCode = question.code;
                const questionTitle = question.title || questionCode;
                const answerValue = this.additionalChecksForms.get(questionCode)?.value;

                let displayValue = '';
                let statusClass = '';

                if (answerValue === null || answerValue === undefined || answerValue === '') {
                    displayValue = 'Chưa trả lời';
                    statusClass = 'text-muted';
                } else if (answerValue === true || answerValue === 'PASS' || answerValue === 1) {
                    displayValue = 'Đạt';
                    statusClass = 'text-success';
                } else if (answerValue === false || answerValue === 'STOP' || answerValue === 0) {
                    displayValue = 'Không đạt';
                    statusClass = 'text-danger';
                } else if (answerValue === 'LOAI_1') {
                    displayValue = DeviceEnumType.LOAI_1;
                    statusClass = 'text-success';
                } else if (answerValue === 'LOAI_2') {
                    displayValue = DeviceEnumType.LOAI_2;
                    statusClass = 'text-warning';
                } else if (answerValue === 'LOAI_3') {
                    displayValue = DeviceEnumType.LOAI_3;
                    statusClass = 'text-danger';
                } else if (answerValue === 'LOAI_4') {
                    displayValue = DeviceEnumType.LOAI_4;
                    statusClass = 'text-info';
                } else if (answerValue === 'LOAI_5') {
                    displayValue = DeviceEnumType.LOAI_5;
                    statusClass = 'text-secondary';
                } else if (answerValue === 'LOAI_6') {
                    displayValue = DeviceEnumType.LOAI_6;
                    statusClass = 'text-dark';
                } else {
                    displayValue = String(answerValue);
                    statusClass = 'text-primary';
                }

                summary = `
                <div class="d-flex gap-2 justify-content-between mb-2">
                    <span class="text-muted">${questionTitle}</span>
                    <span class="fw-bold ${statusClass}">${displayValue}</span>
                </div>
            `;

                if (question.options && Array.isArray(question.options)) {
                    const selectedOption = question.options.find((opt: any) =>
                        opt.value === answerValue || opt.code === answerValue
                    );

                    if (selectedOption) {
                        summary += `
                        <div class="d-flex gap-2 justify-content-between mb-2">
                            <span class="text-muted fst-italic">Chi tiết</span>
                            <span class="fw-normal">${selectedOption.label || selectedOption.title}</span>
                        </div>
                    `;
                    }
                }
            }
        }

        this.stepSummaries[step] = summary;
    }

    private generateAllStepSummaries(): void {
        this.generateStepSummary(1);

        for (let i = 0; i < this.questions.length; i++) {
            const step = i + 2;
            this.generateStepSummary(step);
        }
    }

    isCurrentStepValid(): boolean {
        if (this.current === 1) {
            return this.deviceForm.valid;
        } else {
            const questionIndex = this.current - 2;

            if (questionIndex >= 0 && questionIndex < this.questions.length) {
                const question = this.questions[questionIndex];
                const questionCode = question.code;

                if (questionCode === 'FUNCTION_WEB') {
                    return this.switchItems.every(item => {
                        const value = this.functionChecksForms.get(item.key)?.value;
                        return value !== null && value !== undefined;
                    });
                }

                const value = this.additionalChecksForms.get(questionCode)?.value;
                return value !== null && value !== undefined && value !== '';
            }
        }

        return false;
    }

    prev(): void {
        if (this.current > 1) {
            this.current--;
            this.calcPercent();
        }
    }

    cancel(): void {
        this.router.navigateByUrl('/device-check');
    }

    stepSummaries: { [key: number]: string } = {};

    getTypeColor(type: string | null): string {
        return accessoryOptions.find(item => item.value === type)?.color || 'gray';
    }

    getLabelModel(value: string): string {
        return this.modelItems.find((item) => item.value === value)?.label || 'Chưa cập nhật'
    }

    getTypeLabel(type: string | null): string {
        return accessoryOptions.find(item => item.value === type)?.label || 'Chưa cập nhật';
    }



    imeiValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;

        if (!value) return null;

        if (!/^\d{15}$/.test(value)) {
            return { imeiFormat: true };
        }

        const digits = value.split('').map(Number);
        let sum = 0;

        for (let i = 0; i < 14; i++) {
            let num = digits[i];

            if (i % 2 === 1) {
                num *= 2;
                if (num > 9) num -= 9;
            }
            sum += num;
        }

        const checkDigit = (10 - (sum % 10)) % 10;

        return checkDigit === digits[14] ? null : { imeiInvalid: true };
    }

    openBankingInfor(): void {
        this.modal.create({
            nzTitle: 'Thanh lý thiết bị',
            nzContent: this.liquidationContent,
            nzOkText: 'Xác nhận',
            nzCancelText: 'Hủy',
            nzOnOk: (): any => {
                if (this.bankingInforForm.invalid) {
                    this.message.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
                    Object.values(this.bankingInforForm.controls).forEach(control => {
                        if (control.invalid) {
                            control.markAsDirty();
                            control.updateValueAndValidity({ onlySelf: true });
                        }
                    });
                    return false;
                }
                console.log('Device ID for liquidation:', this.deviceId);
                this.deviceCheckService.updateBankingInfor({
                    id: this.deviceId,
                    ...this.bankingInforForm.value,
                }).subscribe({
                    next: () => {
                        this.message.success('Cập nhật thông tin thanh lý thành công');
                        this.router.navigateByUrl('/device-check');
                    }
                });
            },
        })
    }
}
