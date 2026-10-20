import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NzMessageService } from 'ng-zorro-antd/message';
import { EMPTY, iif, Observable, of, throwError, timer } from 'rxjs';
import { catchError, concatMap, finalize, tap } from 'rxjs/operators';
import { DeviceCheckService } from '../../device-check.service';
import { accessoryOptions, modelItems, switchItems } from '../../configs/device.check.constant';
import { LoadingService } from 'src/app/core/services/loading.service';
import { DeviceEnumType } from '../../configs/device-check.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { NzModalService } from 'ng-zorro-antd/modal';
import { BreadcrumbService } from 'src/app/core/services/breadcrumb.service';
import { ShipmentService } from '../../../shipment/shipment.service';

const SHIPMENT_BREADCRUMB_KEY = 'shipmentBreadcrumb';

@Component({
    selector: 'app-device-add-update-advanced',
    templateUrl: './device-add-update-advanced.component.html',
    styleUrls: ['./device-add-update-advanced.component.scss']
})
export class DeviceAddUpdateAdvancedComponent implements OnInit, OnDestroy {
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
    fromShipmentDetail = false;
    deviceCurrentStatus: string = '';
    shipmentDetailUrl: string = '';
    functionCheckResult: string | null = null;
    deviceFinalSummary: string | null = null;
    vcmPrice: number | null = null;
    vcmFinalSummary: string | null = null;
    private suppressDeviceReload = false; // ngăn reload câu hỏi khi set giá trị ban đầu
    private shipmentState: any = null; // state vận đơn đã xác định cho thiết bị hiện tại
    private videoObjectUrl: string | null = null; // object URL của video local, cần revoke khi bỏ

    get isMobile2g(): boolean {
        const model = this.deviceForm?.get('model')?.value;
        return model?.toUpperCase() === 'MOBILE_2G';
    }

    fileList: NzUploadFile[] = [];
    videoSrc: string | SafeUrl | null = null;

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
    modelOptions: any[] = [];

    rejectedQuestionIndex: number | null = null;
    rejectedQuestionKey: string | null = null;

    constructor(
        private fb: FormBuilder,
        private deviceCheckService: DeviceCheckService,
        private message: NzMessageService,
        private loading: LoadingService,
        private router: Router,
        private modal: NzModalService,
        private breadcrumbService: BreadcrumbService,
        private route: ActivatedRoute,
        private shipmentService: ShipmentService,
        private sanitizer: DomSanitizer
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

        // Dùng object URL thay vì đọc cả file vào RAM dạng base64
        this.revokeVideoObjectUrl();
        this.videoObjectUrl = URL.createObjectURL(file);
        // Angular sanitizer chặn blob: trong [src], cần bypass cho URL do chính app tạo
        this.videoSrc = this.sanitizer.bypassSecurityTrustUrl(this.videoObjectUrl);

        return false;
    };

    handleRemove(): boolean {
        this.revokeVideoObjectUrl();
        this.fileList = [];
        this.videoSrc = null;
        return true;
    }

    private revokeVideoObjectUrl(): void {
        if (this.videoObjectUrl) {
            URL.revokeObjectURL(this.videoObjectUrl);
            this.videoObjectUrl = null;
        }
    }

    ngOnDestroy(): void {
        this.revokeVideoObjectUrl();
        // ngOnDestroy không chạy khi F5 (trang bị unload), nên rời màn hình trong app thì xóa state vận đơn
        this.clearShipmentState();
    }

    get visibleSteps(): number {
        return Math.max(1, (this.totalSteps || 0) - 1);
    }

    getStepSummaryKeys(): number[] {
        return Object.keys(this.stepSummaries).map(Number).sort((a, b) => a - b);
    }
    ngOnInit(): void {
        // Must be set BEFORE loadApis() so iif(isEditMode) works correctly
        const routeId = this.route.snapshot.paramMap.get('id');
        if (routeId) {
            this.deviceId = Number(routeId);
            this.isEditMode = true;
        }

        // Lấy state vận đơn từ history.state hoặc sessionStorage (fallback khi refresh)
        this.shipmentState = this.resolveShipmentState();
        this.fromShipmentDetail = !!this.shipmentState?.fromShipmentDetail;
        if (this.fromShipmentDetail) {
            const trackingNumber = this.shipmentState.trackingNumber;
            const shipmentId = this.shipmentState.shipmentInfoId;
            this.shipmentDetailUrl = shipmentId
                ? `/shipment/detail/${trackingNumber}?id=${shipmentId}`
                : `/shipment/detail/${trackingNumber}`;
            const detailUrl = this.shipmentDetailUrl;
            // Tăng delay để đảm bảo breadcrumb route đã render xong
            setTimeout(() => {
                this.breadcrumbService.setBreadcrumbs([
                    { label: 'Danh sách vận chuyển', url: '/shipment' },
                    { label: 'Chi tiết vận đơn', url: detailUrl },
                    { label: 'Chỉnh sửa thiết bị', url: '' }
                ]);
            }, 100);
        }

        this.initForm();
        this.loadApis();
    }

    /**
     * Xác định thiết bị có được mở từ màn chi tiết vận đơn hay không.
     * - Có history.state.fromShipmentDetail: lưu vào sessionStorage kèm deviceId.
     * - Không có: chỉ dùng bản đã lưu nếu đúng thiết bị đang mở (trường hợp F5), ngược lại xóa đi.
     */
    private resolveShipmentState(): any {
        const currentDeviceId = this.deviceId ?? null;

        if (history.state?.fromShipmentDetail) {
            const state = {
                fromShipmentDetail: true,
                trackingNumber: history.state.trackingNumber,
                shipmentInfoId: history.state.shipmentInfoId,
                deviceId: currentDeviceId
            };
            sessionStorage.setItem(SHIPMENT_BREADCRUMB_KEY, JSON.stringify(state));
            return state;
        }

        let saved: any = null;
        try {
            saved = JSON.parse(sessionStorage.getItem(SHIPMENT_BREADCRUMB_KEY) || 'null');
        } catch (e) {
            saved = null;
        }

        if (saved?.fromShipmentDetail && (saved.deviceId ?? null) === currentDeviceId) {
            return saved;
        }

        this.clearShipmentState();
        return null;
    }

    private clearShipmentState(): void {
        sessionStorage.removeItem(SHIPMENT_BREADCRUMB_KEY);
    }


    private loadApis(): void {
        iif(
            () => !this.isEditMode,
            this.deviceCheckService.getTransactionId().pipe(
                tap((res: any) => {
                    this.transactionID = res.data;
                })
            ),
            of(null)
        ).pipe(
            concatMap(() =>
                this.deviceCheckService.getModelOptions()
            ),
            tap(res => {
                this.modelOptions = (res?.data || res?.data?.content || []).map((item: any) => ({
                    label: item,
                    value: item
                }));
            }),
            // If edit mode: load device detail first to get its transactionId
            concatMap(() => {
                if (this.deviceId) {
                    this.loading.show();
                    return this.deviceCheckService.getDeviceDetail(this.deviceId).pipe(
                        tap((response) => {
                            if (response?.code === '00' && response.data?.length > 0) {
                                const data = response.data[0];
                                const device = { ...data, model: (data.model || '').toUpperCase() };
                                // Use the device's existing transactionId
                                if (device.transactionId) {
                                    this.transactionID = device.transactionId;
                                }
                                // Save current status for conditional API selection
                                this.deviceCurrentStatus = device.status || '';
                                this.functionCheckResult = device.functionCheck || null;
                                this.deviceFinalSummary = data.finalSummary || null;
                                this.deviceForm.patchValue(device);
                                this.videoSrc = device.videoUrl || null;

                                // For Mobile_2g: map finalSummary to osVersion display
                                if (device.model?.toUpperCase() === 'MOBILE_2G' && this.deviceFinalSummary) {
                                    const powerStatus = this.deviceFinalSummary === 'LOAI_1' ? 'Có lên nguồn' : 'Không lên nguồn';
                                    this.deviceForm.patchValue({ osVersion: powerStatus });
                                }

                                // Load dropdown options cho model này, rồi re-patch deviceCode để dropdown hiển thị đúng
                                if (device.model) {
                                    this.onModelChange(device.model, () => {
                                        // Tắt reload để patchValue không trigger reloadQuestionsByDeviceCode
                                        this.suppressDeviceReload = true;
                                        this.deviceForm.patchValue({ deviceCode: device.deviceCode });
                                        // Bật lại sau 1 microtask
                                        setTimeout(() => this.suppressDeviceReload = false, 0);
                                    });
                                }

                                // Load VCM approve info nếu vào từ vận đơn
                                if (this.fromShipmentDetail && device.transactionId) {
                                    const trackingNumber = this.shipmentState?.trackingNumber || null;
                                    if (trackingNumber) {
                                        this.shipmentService.getDevicesByShipment(trackingNumber).subscribe((shipRes: any) => {
                                            const matched = (shipRes?.data || []).find((item: any) =>
                                                item.deviceInfoShipment?.transactionId === device.transactionId
                                            );
                                            if (matched?.approveDeviceInfoLog) {
                                                this.vcmPrice = matched.approveDeviceInfoLog.price;
                                                this.vcmFinalSummary = matched.approveDeviceInfoLog.finalSummary;
                                            }
                                        });
                                    }
                                }
                            }
                        }),
                        finalize(() => this.loading.hide())
                    );
                }
                return of(null);
            }),
            // getAllQuestions now uses the transactionId from findByIds (edit) or getTransaction (add)
            // Skip questions for Mobile_2g model
            concatMap(() => {
                if (this.isMobile2g) {
                    return of({ data: [] });
                }
                return this.deviceCheckService.getAllQuestions('MOBILE', this.transactionID);
            }),
            tap(res => {
                this.questions = res?.data || res?.data?.content || [];
                this.totalSteps = this.questions.length + 2;
                this.calcPercent();
                this.mappedQuestions();
                this.initAdditionalChecksForm();
                // Load check detail after form has been initialized
                if (this.isEditMode && this.transactionID) {
                    this.loadDeviceCheckDetail(this.transactionID);
                }
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
            realDeviceName: [''],
            deviceCode: [null, Validators.required],
            model: ['', Validators.required],
            osVersion: [''],
            imei: [''],
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
                    const data = response.data[0];
                    const device = {
                        ...data,
                        model: (data.model || '').toUpperCase()
                    };

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

        this.deviceCheckService.getDeviceCheckDetail(transId)
            .pipe(finalize(() => this.loading.hide()))
            .subscribe({
                next: (res: any) => {
                    if (res?.code === '00' && Array.isArray(res.data)) {
                        // Lọc bỏ bản ghi đã xóa mềm, rồi dedup: mỗi item chỉ giữ bản ghi mới nhất
                        const latestPerItem = new Map<string, any>();
                        res.data
                            .filter((check: any) => check.isDeleted === 0)
                            .forEach((check: any) => {
                                const key = check.item;
                                const existing = latestPerItem.get(key);
                                if (!existing || check.createdDate > existing.createdDate) {
                                    latestPerItem.set(key, check);
                                }
                            });

                        latestPerItem.forEach((check) => {
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

                        this.generateAllStepSummaries();
                    }
                },
                error: (err: any) => console.error('Lỗi tải kết quả kiểm tra:', err)
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

    onModelChange(value: string, callback?: () => void): void {
        if (value) {
            const payload = {
                page: 1,
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
                .subscribe({
                    next: (res: any) => {
                        this.devicesOptions = (res?.data?.content || []).map((item: any) => ({
                            label: [item.deviceName, item.totalRam, item.storage].filter(v => v != null && v !== '').join(' - '),
                            value: item.deviceCode,
                            infor: {
                                totalRam: item.totalRam,
                                storage: item.storage,
                                deviceName: item.deviceName
                            }
                        }));
                        // Gọi callback sau khi options đã load xong (dùng cho edit mode)
                        if (callback) callback();
                    },
                    error: (err: any) => {
                        console.error('Lỗi tải danh sách thiết bị:', err);
                        this.devicesOptions = [];
                        if (callback) callback();
                    }
                });
        }
    }

    onDeviceChange(deviceCode: string): void {
        const selected = this.devicesOptions.find(d => d.value === deviceCode);
        if (!selected) return;

        this.deviceForm.patchValue({
            totalRam: selected.infor?.totalRam || '',
            storage: selected.infor?.storage || '',
            deviceName: selected.infor?.deviceName || ''
        });

        // Reload câu hỏi theo deviceCode mới (bỏ qua nếu đang set giá trị ban đầu)
        if (!this.suppressDeviceReload) {
            this.reloadQuestionsByDeviceCode(deviceCode);
        }
    }

    private reloadQuestionsByDeviceCode(deviceCode: string): void {
        // Skip reload questions for Mobile_2g
        if (this.isMobile2g) {
            this.questions = [];
            this.totalSteps = 2;
            this.calcPercent();
            this.initAdditionalChecksForm();
            // Xóa tóm tắt của các bước cũ trước khi dựng lại
            this.stepSummaries = {};
            this.generateAllStepSummaries();
            return;
        }
        this.loading.show('Đang tải câu hỏi...');
        this.deviceCheckService.getQuestionsByDeviceCode('MOBILE', deviceCode)
            .pipe(finalize(() => this.loading.hide()))
            .subscribe({
                next: (res: any) => {
                    const list = Array.isArray(res?.data) ? res.data : (res?.data?.content || []);
                    this.questions = list.sort((a: any, b: any) => a.order - b.order);
                    this.totalSteps = this.questions.length + 2;
                    this.calcPercent();

                    // Giữ lại đáp án cũ cho các câu hỏi vẫn tồn tại trong danh sách mới
                    const oldValues = this.additionalChecksForms?.value || {};
                    const newGroup: { [key: string]: any } = {};
                    this.questions.forEach((q: any) => {
                        // Nếu câu hỏi đã có đáp án trước đó → giữ lại, nếu không → null
                        newGroup[q.code] = [oldValues[q.code] ?? null];
                    });
                    this.additionalChecksForms = this.fb.group(newGroup);

                    // Rebuild left panel với câu hỏi mới + đáp án cũ (nếu có), xóa tóm tắt bước cũ trước
                    this.stepSummaries = {};
                    this.generateAllStepSummaries();

                    // Reset về bước 1 (thông tin thiết bị)
                    this.current = 1;
                    this.calcPercent();
                },
                error: (err: any) => console.error('Lỗi tải câu hỏi:', err)
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
            value: this.additionalChecksForms.get(item.code)?.value ?? ''
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
                // Có upload file mà backend báo lỗi -> dừng chuỗi
                if (fileResp && fileResp.code !== '00') {
                    return this.apiCodeError(fileResp);
                }
                const formValue = this.deviceForm.value;
                const devicePayload: any = {
                    ...formValue,
                    transactionId: this.transactionID,
                    typeCheck: "STAFF_CHECK",
                    videoUrl: fileResp?.data?.[0]?.pathName || formValue.videoUrl
                };

                // For MOBILE_2G: map power status to finalSummary, clear osVersion
                if (this.isMobile2g) {
                    devicePayload.finalSummary = formValue.osVersion === 'Có lên nguồn' ? 'LOAI_1' : 'LOAI_2';
                    devicePayload.osVersion = null;
                }
                // Dùng staffSaveWithShipment khi đến từ màn vận đơn (fromShipmentDetail được giữ qua sessionStorage)
                const useStaffSave = this.fromShipmentDetail;
                return useStaffSave
                    ? this.deviceCheckService.staffSaveWithShipment(devicePayload)
                    : this.deviceCheckService.saveDeviceInfor(devicePayload);
            }),
            concatMap((res: any) => {
                if (res?.code !== '00') {
                    return this.apiCodeError(res);
                }
                // Chỉ ghi đè khi backend trả id, tránh mất id cũ ở edit mode
                if (res.data?.id) {
                    this.deviceId = res.data.id;
                }
                this.loading.show('Đang kiểm tra thiết bị...');
                return this.deviceCheckService.saveCheckDeviceInfor(payload);
            }),
            concatMap((res: any) => {
                if (res?.code !== '00') {
                    return this.apiCodeError(res);
                }
                this.message.success('Lưu kết quả kiểm tra thành công');
                return this.isMobile2g
                    ? this.deviceCheckService.checkDevice2G(this.transactionID)
                    : this.deviceCheckService.checkDeviceStatus(this.transactionID);
            }),
            concatMap((finalRes: any) =>
                finalRes?.code === '00' ? of(finalRes) : this.apiCodeError(finalRes)
            ),
            finalize(() => this.loading.hide())
        ).subscribe({
            next: (finalRes: any) => {
                this.message.success('Hoàn tất quy trình kiểm tra thiết bị');
                this.resultCheck = finalRes.data;
                this.deviceFinalSummary = finalRes.data?.finalSummary || null;

                // Chỉ chuyển sang bước kết quả khi toàn bộ chuỗi thành công
                if (this.current < this.totalSteps && !this.isRejected) {
                    this.generateStepSummary(this.current);

                    this.current++;
                    this.calcPercent();
                }
            },
            error: (err: any) => this.handleSubmitError(err)
        });
    }

    /** Lỗi nghiệp vụ: HTTP 200 nhưng code !== '00' */
    private apiCodeError(response: any): Observable<never> {
        return throwError({ apiCodeError: true, response });
    }

    private handleSubmitError(err: any): void {
        // Interceptor dùng throwError(() => err) (cú pháp rxjs 7) trong khi dự án dùng rxjs 6,
        // nên lỗi HTTP có thể đến dưới dạng function trả về lỗi gốc
        const error = typeof err === 'function' ? err() : err;

        if (error?.apiCodeError) {
            // Interceptor đã toast body.message; chỉ toast mặc định khi backend không trả message
            if (!error.response?.message) {
                this.message.error('Có lỗi xảy ra');
            }
            return;
        }

        // Lỗi HTTP: interceptor đã toast nếu có body.message
        if (!error?.error?.message) {
            this.message.error('Có lỗi xảy ra');
        }
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
            this.functionCheckResult = 'LOAI_3';
        } else {
            this.additionalChecksForms.get('FUNCTION_WEB')?.setValue('LOAI_1');
            this.functionCheckResult = 'LOAI_1';
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
                // FUNCTION_WEB: ưu tiên lấy từ functionCheckResult (API) nếu có
                const answerValue = (questionCode === 'FUNCTION_WEB' && this.functionCheckResult)
                    ? this.functionCheckResult
                    : this.additionalChecksForms.get(questionCode)?.value;

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
        this.clearShipmentState();
        if (this.fromShipmentDetail && this.shipmentDetailUrl) {
            this.router.navigateByUrl(this.shipmentDetailUrl);
        } else {
            this.router.navigateByUrl('/device-check');
        }
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
            nzOnOk: (): boolean | Promise<boolean> => {
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
                // Trả Promise để modal hiện loading và chỉ đóng khi API thành công (resolve false = giữ modal mở)
                return new Promise<boolean>((resolve) => {
                    this.deviceCheckService.updateBankingInfor({
                        id: this.deviceId,
                        ...this.bankingInforForm.value,
                    }).subscribe({
                        next: (res: any) => {
                            if (res?.code === '00') {
                                this.message.success('Cập nhật thông tin thanh lý thành công');
                                resolve(true);
                                this.router.navigateByUrl('/device-check');
                            } else {
                                // Interceptor đã toast body.message nếu có
                                if (!res?.message) {
                                    this.message.error('Cập nhật thông tin thanh lý thất bại');
                                }
                                resolve(false);
                            }
                        },
                        error: (err: any) => {
                            const error = typeof err === 'function' ? err() : err;
                            if (!error?.error?.message) {
                                this.message.error('Cập nhật thông tin thanh lý thất bại');
                            }
                            resolve(false);
                        }
                    });
                });
            },
        })
    }

    onApproveRevaluate(): void {
        if (!this.transactionID) {
            this.message.warning('Không tìm thấy mã giao dịch');
            return;
        }
        this.loading.show();
        this.deviceCheckService.approveRevaluate(this.transactionID)
            .pipe(finalize(() => this.loading.hide()))
            .subscribe({
                next: (res: any) => {
                    if (res?.code === '00') {
                        this.message.success('Gửi xác nhận thành công');
                        this.clearShipmentState();
                        if (this.fromShipmentDetail && this.shipmentDetailUrl) {
                            this.router.navigateByUrl(this.shipmentDetailUrl);
                        } else {
                            this.router.navigateByUrl('/device-check');
                        }
                    } else {
                        this.message.error(res?.message || 'Có lỗi xảy ra');
                    }
                },
                error: () => this.message.error('Gửi xác nhận thất bại')
            });
    }
}
