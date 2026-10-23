import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  JobcardTemplate,
  PrintToggles,
  TemplateScope
} from '../../models/jobcard.model';
import { JobcardTemplateService } from '../../services/jobcard-template.service';
import { JobcardRenderService } from '../../services/jobcard-render.service';
import { JobcardThermalService } from '../../services/jobcard-thermal.service';
import { JobcardSheetService } from '../../services/jobcard-sheet.service';
import { SheetLayout } from '../../models/jobcard.model';
import { NzModalService } from 'ng-zorro-antd/modal';

const THERMAL_MODE_KEY = 'jobcard_thermal_mode';
const THERMAL_DPI_KEY = 'jobcard_thermal_dpi';
const PAPER_MODE_KEY = 'jobcard_paper_mode';
const PRINT_TOGGLES_KEY = 'jobcard_print_toggles_v1';

interface SheetCellView {
  index: number;
  state: 'used' | 'print' | 'free';
  order?: number;
}

export interface PrintModalOptions {
  scope: TemplateScope;
  shipmentInfo: any;
  devices: any[];
  singleDevice?: any;
}

@Component({
  selector: 'app-jobcard-print-modal',
  templateUrl: './jobcard-print-modal.component.html',
  styleUrls: ['./jobcard-print-modal.component.scss']
})
export class JobcardPrintModalComponent implements OnInit {
  readonly Math = Math;
  @Input() trackingNumber: string = '';
  @Output() closed = new EventEmitter<void>();

  isVisible = false;
  isPrinting = false;

  scope: TemplateScope = 'device';
  shipmentInfo: any = null;
  devices: any[] = [];
  singleDevice: any = null;
  isAllDevices = false;

  templates: JobcardTemplate[] = [];
  selectedTemplateId = '';
  selectedTemplate: JobcardTemplate | null = null;

  customFields: { key: string; label: string; defaultValue: string }[] = [];
  customFieldValues: Record<string, string> = {};
  deviceCustomFieldValues: Record<string, string>[] = [];

  // For multi-page device preview
  previewPageIndex = 0;
  previewHtml: SafeHtml = '';
  previewImage: string | null = null;
  previewScale = 0.8;

  // In nhiệt sắc nét: raster đen trắng đúng DPI máy in (mặc định bật, nhớ lựa chọn theo trình duyệt)
  thermalMode = this.readPref(THERMAL_MODE_KEY, 'true') === 'true';
  thermalDpi = Number(this.readPref(THERMAL_DPI_KEY, '203')) || 203;

  // Ô tuỳ chọn (printToggleKey) của mẫu đang chọn; mặc định tắt, nhớ theo trình duyệt
  toggleOptions: { key: string; label: string }[] = [];
  printToggles: PrintToggles = this.readToggles();

  // Loại giấy: cuộn tem (in từng tem) hoặc tờ tem dán nhiều ô
  paperMode: 'roll' | 'sheet' = this.readPref(PAPER_MODE_KEY, 'roll') === 'sheet' ? 'sheet' : 'roll';
  sheetLayouts: SheetLayout[] = [];
  sheetLayout: SheetLayout | null = null;
  sheetStartIndex = 0;
  isEditingSheet = false;

  constructor(
    private templateService: JobcardTemplateService,
    private renderService: JobcardRenderService,
    private thermalService: JobcardThermalService,
    public sheetService: JobcardSheetService,
    private message: NzMessageService,
    private modal: NzModalService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  get canUseThermal(): boolean {
    return this.paperMode === 'roll' && this.thermalService.supports(this.selectedTemplate);
  }

  get useThermal(): boolean {
    return this.thermalMode && this.canUseThermal;
  }

  // --- Tờ tem dán ---

  /** Số tem sẽ in ở lần này. */
  get labelCount(): number {
    if (this.scope === 'shipment') return 1;
    return this.singleDevice ? 1 : this.devices.length;
  }

  get sheetCellsPerSheet(): number {
    return this.sheetLayout ? this.sheetService.cellsPerSheet(this.sheetLayout) : 0;
  }

  get sheetsNeeded(): number {
    return this.sheetLayout ? this.sheetService.sheetsNeeded(this.sheetLayout, this.sheetStartIndex, this.labelCount) : 0;
  }

  /**
   * Lưới ô của tờ đầu tiên: ô đã dùng / ô sẽ in lần này / ô trống.
   * Lưu thành field (không dùng getter) – getter trả mảng mới mỗi lần change detection khiến *ngFor
   * dựng lại DOM liên tục, kết hợp sự kiện chuột trên ô thành vòng lặp làm treo UI.
   */
  sheetCells: SheetCellView[] = [];

  trackCell(_: number, c: SheetCellView): number {
    return c.index;
  }

  refreshSheetCells(): void {
    const cells: SheetCellView[] = [];
    for (let i = 0; i < this.sheetCellsPerSheet; i++) {
      if (i < this.sheetStartIndex) {
        cells.push({ index: i, state: 'used' });
      } else if (i < this.sheetStartIndex + this.labelCount) {
        cells.push({ index: i, state: 'print', order: i - this.sheetStartIndex + 1 });
      } else {
        cells.push({ index: i, state: 'free' });
      }
    }
    this.sheetCells = cells;
  }

  onPaperModeChange(): void {
    this.writePref(PAPER_MODE_KEY, this.paperMode);
    this.updatePreview();
  }

  private loadSheetLayouts(selectId?: string | null): void {
    this.sheetLayouts = this.sheetService.getLayouts();
    const wanted = selectId || this.sheetService.getLastUsedId();
    this.sheetLayout = this.sheetLayouts.find(l => l.id === wanted) || this.sheetLayouts[0] || null;
    this.sheetStartIndex = this.sheetLayout ? (this.sheetLayout.nextIndex || 0) % this.sheetService.cellsPerSheet(this.sheetLayout) : 0;
    this.refreshSheetCells();
  }

  onSheetLayoutChange(id: string): void {
    this.isEditingSheet = false;
    this.loadSheetLayouts(id);
    if (this.sheetLayout) this.sheetService.setLastUsedId(this.sheetLayout.id);
  }

  onSheetCellClick(index: number): void {
    this.sheetStartIndex = index;
    this.refreshSheetCells();
  }

  saveSheetLayout(): void {
    if (!this.sheetLayout) return;
    const l = this.sheetLayout;
    if (!l.name?.trim() || l.rows < 1 || l.cols < 1) {
      this.message.warning('Vui lòng nhập tên và số hàng/cột');
      return;
    }
    if (this.sheetLayoutError) {
      this.message.warning(this.sheetLayoutError);
      return;
    }
    l.nextIndex = Math.min(this.sheetStartIndex, this.sheetService.cellsPerSheet(l) - 1);
    this.sheetService.saveLayout(l);
    this.sheetService.setLastUsedId(l.id);
    this.isEditingSheet = false;
    this.loadSheetLayouts(l.id);
    this.message.success('Đã lưu khổ tờ tem');
  }

  addSheetLayout(): void {
    this.sheetLayout = this.sheetService.newLayout(this.sheetLayout || undefined);
    this.sheetStartIndex = 0;
    this.refreshSheetCells();
    this.startEditSheet();
  }

  // --- Form đo khổ tờ: nhập tổng vùng tem + khe, tự chia ô và căn giữa ---

  /** Hình thu nhỏ của tờ trong form (toạ độ theo % khổ tờ). */
  sheetPreviewCells: { left: number; top: number; width: number; height: number }[] = [];
  showSheetManual = false;

  get sheetLayoutError(): string | null {
    const l = this.sheetLayout;
    if (!l) return null;
    if (l.labelWidth <= 0 || l.labelHeight <= 0) return 'Khe hở quá lớn so với tổng vùng tem – ô tem bị âm.';
    if ((l.totalWidth || 0) > l.paperWidth || (l.totalHeight || 0) > l.paperHeight) return 'Vùng tem lớn hơn khổ tờ.';
    return null;
  }

  startEditSheet(): void {
    if (!this.sheetLayout) return;
    this.sheetService.ensureTotals(this.sheetLayout);
    this.showSheetManual = false;
    this.isEditingSheet = true;
    this.refreshSheetPreview();
  }

  /** Nhập tổng/khe/số ô/khổ tờ -> tự tính lại kích thước ô và lề. */
  onSheetDimsChange(): void {
    if (!this.sheetLayout) return;
    this.sheetService.applyAutoLayout(this.sheetLayout);
    this.refreshSheetPreview();
  }

  /** Chỉnh tay kích thước ô/lề -> cập nhật lại tổng vùng tem cho khớp. */
  onSheetManualChange(): void {
    const l = this.sheetLayout;
    if (!l) return;
    l.totalWidth = l.cols * l.labelWidth + (l.cols - 1) * l.gapX;
    l.totalHeight = l.rows * l.labelHeight + (l.rows - 1) * l.gapY;
    this.refreshSheetPreview();
  }

  private refreshSheetPreview(): void {
    const l = this.sheetLayout;
    if (!l || l.paperWidth <= 0 || l.paperHeight <= 0) {
      this.sheetPreviewCells = [];
      return;
    }
    const cells = [];
    const count = Math.min(this.sheetService.cellsPerSheet(l), 400);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / l.cols);
      const col = i % l.cols;
      cells.push({
        left: ((l.marginLeft + col * (l.labelWidth + l.gapX)) / l.paperWidth) * 100,
        top: ((l.marginTop + row * (l.labelHeight + l.gapY)) / l.paperHeight) * 100,
        width: (Math.max(0, l.labelWidth) / l.paperWidth) * 100,
        height: (Math.max(0, l.labelHeight) / l.paperHeight) * 100
      });
    }
    this.sheetPreviewCells = cells;
  }

  deleteSheetLayout(): void {
    if (!this.sheetLayout) return;
    this.sheetService.deleteLayout(this.sheetLayout.id);
    this.isEditingSheet = false;
    this.loadSheetLayouts();
  }

  cancelEditSheet(): void {
    this.isEditingSheet = false;
    this.loadSheetLayouts(this.sheetLayout?.id);
  }

  printSheetTestGrid(): void {
    if (!this.sheetLayout) return;
    this.renderService.printHtmlDocument(this.sheetService.buildTestGridHtml(this.sheetLayout));
  }

  /** Sau khi in tờ tem: hỏi lại rồi mới lưu ô trống tiếp theo (người dùng có thể đã huỷ lệnh in). */
  private confirmSheetAdvance(layout: SheetLayout, printedCount: number): void {
    const perSheet = this.sheetService.cellsPerSheet(layout);
    const next = (this.sheetStartIndex + printedCount) % perSheet;
    this.modal.confirm({
      nzTitle: 'Tem đã in ra đúng chưa?',
      nzContent: `Nếu đã in xong, lần sau sẽ bắt đầu từ ô số ${next + 1} của tờ đang dùng dở.`,
      nzOkText: 'Đã in, lưu vị trí',
      nzCancelText: 'Chưa in / in lỗi',
      nzOnOk: () => {
        layout.nextIndex = next;
        this.sheetService.saveLayout(layout);
        this.sheetService.setLastUsedId(layout.id);
        this.sheetStartIndex = next;
        this.refreshSheetCells();
      }
    });
  }

  onThermalSettingChange(): void {
    this.writePref(THERMAL_MODE_KEY, String(this.thermalMode));
    this.writePref(THERMAL_DPI_KEY, String(this.thermalDpi));
    this.updatePreview();
  }

  onPrintToggleChange(): void {
    this.writePref(PRINT_TOGGLES_KEY, JSON.stringify(this.printToggles));
    this.updatePreview();
  }

  private readToggles(): PrintToggles {
    try {
      const parsed = JSON.parse(this.readPref(PRINT_TOGGLES_KEY, '{}'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private buildToggleOptions(template: JobcardTemplate | null): { key: string; label: string }[] {
    const map = new Map<string, string>();
    (template?.elements || []).forEach(el => {
      if (el.printToggleKey && !map.has(el.printToggleKey)) {
        map.set(el.printToggleKey, 'In ' + (el.label || el.printToggleKey));
      }
    });
    return Array.from(map, ([key, label]) => ({ key, label }));
  }

  private readPref(key: string, fallback: string): string {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private writePref(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // bỏ qua: chế độ riêng tư / chặn storage
    }
  }

  ngOnInit(): void {}

  open(options: PrintModalOptions): void {
    this.scope = options.scope;
    this.shipmentInfo = options.shipmentInfo;
    this.devices = options.devices || [];
    this.singleDevice = options.singleDevice || null;
    this.isAllDevices = !this.singleDevice && this.scope === 'device';
    this.previewPageIndex = 0;

    this.isEditingSheet = false;
    this.loadSheetLayouts();
    this.loadTemplates();
    this.isVisible = true;
  }

  close(): void {
    this.isVisible = false;
    this.closed.emit();
  }

  loadTemplates(): void {
    this.templates = this.templateService.getTemplates(this.scope);

    // Pick last used or default
    const lastUsedId = this.templateService.getLastUsedTemplateId(this.scope);
    const existingLast = this.templates.find(t => t.id === lastUsedId);

    if (existingLast) {
      this.selectedTemplateId = existingLast.id;
    } else {
      const def = this.templates.find(t => t.isDefault) || this.templates[0];
      this.selectedTemplateId = def ? def.id : '';
    }

    this.onTemplateChange(this.selectedTemplateId);
  }

  onTemplateChange(templateId: string): void {
    this.selectedTemplateId = templateId;
    this.selectedTemplate = this.templates.find(t => t.id === templateId) || null;
    this.toggleOptions = this.buildToggleOptions(this.selectedTemplate);

    if (!this.selectedTemplate) {
      this.customFields = [];
      this.deviceCustomFieldValues = [];
      this.previewHtml = '';
      return;
    }

    // Extract custom fields from template
    const fieldsMap = new Map<string, { key: string; label: string; defaultValue: string }>();
    (this.selectedTemplate.elements || []).forEach(el => {
      if (el.type === 'custom_field') {
        const key = el.customKey || el.id;
        if (!fieldsMap.has(key)) {
          fieldsMap.set(key, {
            key,
            label: el.label || 'Trường tùy biến',
            defaultValue: el.defaultValue || ''
          });
        }
      }
    });

    this.customFields = Array.from(fieldsMap.values());
    this.customFieldValues = {};
    this.customFields.forEach(cf => {
      this.customFieldValues[cf.key] = cf.defaultValue;
    });

    this.deviceCustomFieldValues = this.devices.map(() => {
      const row: Record<string, string> = {};
      this.customFields.forEach(cf => {
        row[cf.key] = cf.defaultValue;
      });
      return row;
    });

    this.updatePreview();
  }

  applyToAll(key: string): void {
    if (!this.deviceCustomFieldValues || this.deviceCustomFieldValues.length <= 1) return;
    const firstVal = this.deviceCustomFieldValues[0]?.[key] || '';
    this.deviceCustomFieldValues.forEach(row => {
      row[key] = firstVal;
    });
    this.updatePreview();
  }

  getImeiLast5(imei: any): string {
    if (!imei) return '—';
    const str = String(imei).trim();
    return str.length > 5 ? str.slice(-5) : str;
  }

  onCustomFieldValueChange(): void {
    this.updatePreview();
  }

  buildDevicePageData(device: any, shipment: any): any {
    if (!device) return {};
    return {
      carrierCode: shipment?.carrierCode,
      senderName: shipment?.senderName,
      shipment_status: shipment?.status,
      shipment_createdDate: shipment?.createdDate,
      trackingNumber: device.trackingNumber || shipment?.trackingNumber,
      receiverName: device.receiverName || shipment?.receiverName,
      receiverPhone: device.receiverPhone || shipment?.receiverPhone,
      receiverAddress: device.receiverAddress || shipment?.receiverAddress,
      ...device
    };
  }

  updatePreview(): void {
    if (!this.selectedTemplate) {
      this.previewHtml = '';
      return;
    }

    let dataForPreview: any = null;
    let customValsForPreview: Record<string, string> = this.customFieldValues;

    if (this.scope === 'device') {
      if (this.singleDevice) {
        dataForPreview = this.buildDevicePageData(this.singleDevice, this.shipmentInfo);
        customValsForPreview = this.customFieldValues;
      } else if (this.devices.length > 0) {
        const curDev = this.devices[this.previewPageIndex] || this.devices[0];
        dataForPreview = this.buildDevicePageData(curDev, this.shipmentInfo);
        if (this.isAllDevices && this.devices.length > 1 && this.deviceCustomFieldValues[this.previewPageIndex]) {
          customValsForPreview = this.deviceCustomFieldValues[this.previewPageIndex];
        } else {
          customValsForPreview = this.customFieldValues;
        }
      }
    } else {
      dataForPreview = {
        ...this.shipmentInfo,
        total: this.shipmentInfo?.total ?? this.devices.length
      };
      customValsForPreview = this.customFieldValues;
    }

    if (this.useThermal) {
      // Xem trước đúng ảnh sẽ gửi xuống máy in
      this.previewImage = this.thermalService.renderPage(this.selectedTemplate, dataForPreview, customValsForPreview, this.thermalDpi, this.printToggles);
      this.previewHtml = '';
      return;
    }

    const html = this.renderService.renderSinglePage(
      this.selectedTemplate,
      dataForPreview,
      customValsForPreview,
      this.devices,
      this.printToggles
    );

    this.previewImage = null;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  prevPage(): void {
    if (this.previewPageIndex > 0) {
      this.previewPageIndex--;
      this.updatePreview();
    }
  }

  nextPage(): void {
    if (this.previewPageIndex < this.devices.length - 1) {
      this.previewPageIndex++;
      this.updatePreview();
    }
  }

  get modalTitle(): string {
    if (this.scope === 'shipment') {
      return 'In phiếu vận đơn';
    }
    if (this.isAllDevices) {
      return `In jobcard tất cả thiết bị (${this.devices.length} thiết bị)`;
    }
    return `In jobcard thiết bị: ${this.singleDevice?.deviceName || 'Thiết bị'}`;
  }

  onOpenDesigner(): void {
    this.isVisible = false;
    this.router.navigate(['/shipment/jobcard-designer'], {
      queryParams: {
        scope: this.scope,
        templateId: this.selectedTemplateId,
        trackingNumber: this.trackingNumber
      }
    });
  }

  async onPrint(): Promise<void> {
    if (!this.selectedTemplate) {
      this.message.warning('Vui lòng chọn mẫu in');
      return;
    }

    this.isPrinting = true;
    try {
      this.templateService.setLastUsedTemplateId(this.scope, this.selectedTemplate.id);

      let pagesData: any[] = [];
      let customValsToPrint: Record<string, string> | Record<string, string>[] = this.customFieldValues;

      if (this.scope === 'device') {
        if (this.singleDevice) {
          pagesData = [this.buildDevicePageData(this.singleDevice, this.shipmentInfo)];
          customValsToPrint = this.customFieldValues;
        } else {
          pagesData = this.devices.map(dev => this.buildDevicePageData(dev, this.shipmentInfo));
          customValsToPrint = this.devices.length > 1 ? this.deviceCustomFieldValues : this.customFieldValues;
        }
      } else {
        pagesData = [{
          ...this.shipmentInfo,
          total: this.shipmentInfo?.total ?? this.devices.length
        }];
        customValsToPrint = this.customFieldValues;
      }

      let success: boolean;
      if (this.paperMode === 'sheet') {
        const layout = this.sheetLayout;
        if (!layout) {
          this.message.warning('Vui lòng chọn khổ tờ tem');
          return;
        }
        const html = this.sheetService.buildSheetHtml(layout, this.selectedTemplate, pagesData, customValsToPrint, this.sheetStartIndex, this.printToggles);
        success = await this.renderService.printHtmlDocument(html);
        if (success) {
          this.confirmSheetAdvance(layout, pagesData.length);
        }
      } else if (this.useThermal) {
        const tpl = this.selectedTemplate;
        const dataUrls = pagesData.map((page, i) => {
          const vals = Array.isArray(customValsToPrint) ? (customValsToPrint[i] || {}) : customValsToPrint;
          return this.thermalService.renderPage(tpl, page, vals, this.thermalDpi, this.printToggles);
        });
        success = await this.renderService.printRasterPages(tpl.paper.width, tpl.paper.height, dataUrls, tpl.name);
      } else {
        success = await this.renderService.print(
          this.selectedTemplate,
          pagesData,
          customValsToPrint,
          this.devices,
          this.printToggles
        );
      }

      if (success) {
        this.message.success('Đã gửi lệnh in thành công');
      } else {
        this.message.error('Không thể thực hiện in');
      }
    } catch (e) {
      console.error('Print error', e);
      this.message.error('Có lỗi xảy ra khi in');
    } finally {
      this.isPrinting = false;
    }
  }
}
