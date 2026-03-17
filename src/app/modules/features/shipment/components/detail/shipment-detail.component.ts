import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShipmentService } from '../../shipment.service';
import { DeviceCheckService } from 'src/app/modules/features/device-check/device-check.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { finalize } from 'rxjs/operators';
import { TableColumn } from 'src/app/modules/shares/models/table-column.model';
import { deviceCheckColumns } from 'src/app/modules/features/device-check/configs/device-check.colum';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
    selector: 'app-shipment-detail',
    templateUrl: './shipment-detail.component.html',
    styleUrls: ['./shipment-detail.component.scss']
})
export class ShipmentDetailComponent implements OnInit {
    trackingNumber = '';
    // Received from list page via router navigation state — no API call needed
    shipmentInfo: any = history.state?.shipmentInfo || null;

    devices: any[] = [];

    // Clone columns: only 'status' is searchable
    columns: TableColumn[] = deviceCheckColumns.map(col => ({
        ...col,
        searchable: col.key === 'status' ? true : false,
        filter: col.key === 'status' ? { ...col.filter } : undefined
    }));

    pageIndex = 1;
    pageSize = 10;
    total = 0;

    private readonly statusColorMap: Record<string, string> = {
        'processing': 'blue',
        'wait_approve': 'orange',
        'cust_approve': 'cyan',
        'approve': 'green',
        'vcm_approve': 'purple',
        'checking': 'gold',
        'verified': 'lime',
        'sent_vcm': 'geekblue',
    };

    readonly shipmentStatusColorMap: Record<string, string> = {
        sent: 'blue',
        received: 'green',
        cancel: 'red',
    };

    shipmentStatusLabelMap: Record<string, string> = {};

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private shipmentService: ShipmentService,
        private deviceCheckService: DeviceCheckService,
        private loading: LoadingService,
        private message: NzMessageService
    ) { }

    ngOnInit(): void {
        this.trackingNumber = this.route.snapshot.paramMap.get('trackingNumber') || '';
        this.loadShipmentStatuses();
        this.loadStatusOptions();
        if (this.trackingNumber) {
            // If navigated directly (e.g. F5), state is lost — fall back to API
            if (!this.shipmentInfo) {
                const id = this.route.snapshot.queryParamMap.get('id');
                if (id) {
                    this.shipmentService.findShipmentById(+id).subscribe({
                        next: (res: any) => {
                            const data = res?.data;
                            // findByIds returns array — take first element
                            this.shipmentInfo = Array.isArray(data) ? data[0] : data || null;
                        },
                        error: () => { this.shipmentInfo = null; }
                    });
                }
            }
            this.loadDevices();
        }
    }

    private loadStatusOptions(): void {
        this.deviceCheckService.getDeviceStatuses().subscribe({
            next: (res: any) => {
                if (res?.data?.length) {
                    const options = res.data.map((item: any) => ({
                        label: item.value,
                        value: item.status,
                        color: this.statusColorMap[item.status] || 'default'
                    }));
                    const statusCol = this.columns.find(c => c.key === 'status');
                    if (statusCol?.filter) {
                        statusCol.filter.options = options;
                    }
                }
            },
            error: () => { }
        });
    }

    loadDevices(deviceStatus?: string): void {
        this.loading.show();
        this.shipmentService.getDevicesByShipment(this.trackingNumber, deviceStatus)
            .pipe(finalize(() => this.loading.hide()))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data || [];
                    this.devices = data.map((item: any, index: number) => ({
                        index: index + 1,
                        ...item.deviceInfoShipment,
                        approveDeviceInfoLogs: item.approveDeviceInfoLogs || []
                    }));
                    this.total = this.devices.length;
                },
                error: () => {
                    this.devices = [];
                    this.total = 0;
                }
            });
    }

    private lastDeviceStatus?: string;

    onSearch(payload: any): void {
        const statusCondition = payload?.lsCondition?.find((c: any) => c.property === 'status');
        this.lastDeviceStatus = statusCondition?.value || undefined;
        this.pageIndex = 1;
        this.loadDevices(this.lastDeviceStatus);
    }

    onPageIndexChange(page: number): void {
        this.pageIndex = page;
        this.loadDevices(this.lastDeviceStatus);
    }

    onPageSizeChange(size: number): void {
        this.pageSize = size;
        this.pageIndex = 1;
        this.loadDevices(this.lastDeviceStatus);
    }

    private loadShipmentStatuses(): void {
        this.shipmentService.getStatuses().subscribe({
            next: (res: any) => {
                if (res?.data?.length) {
                    this.shipmentStatusLabelMap = res.data.reduce((acc: Record<string, string>, item: any) => {
                        acc[item.status] = item.value;
                        return acc;
                    }, {});
                }
            },
            error: () => { }
        });
    }

    getStatusLabel(status: string): string {
        return this.shipmentStatusLabelMap[status] || status;
    }

    getStatusColor(status: string): string {
        return this.shipmentStatusColorMap[status] || 'default';
    }

    onAddUpdate(id?: number): void {
        const extras = id ? {
            state: {
                fromShipmentDetail: true,
                trackingNumber: this.trackingNumber,
                shipmentInfoId: this.shipmentInfo?.id
            }
        } : {};
        this.router.navigate(
            id ? ['/device-check/edit', id] : ['/device-check/add'],
            extras
        );
    }

    onApproveRevaluate(transactionId: string): void {
        if (!transactionId) {
            this.message.warning('Không tìm thấy mã giao dịch');
            return;
        }
        this.loading.show();
        this.deviceCheckService.approveRevaluate(transactionId)
            .pipe(finalize(() => this.loading.hide()))
            .subscribe({
                next: (res: any) => {
                    if (res?.code === '00') {
                        this.message.success('Gửi xác nhận thành công');
                        this.loadDevices(this.lastDeviceStatus);
                    } else {
                        this.message.error(res?.message || 'Có lỗi xảy ra');
                    }
                },
                error: () => { }
            });
    }
}
