import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import {
  DEFAULT_TABLE_COLUMNS,
  DEVICE_FIELDS,
  ElementType,
  FieldDefinition,
  JobcardElement,
  JobcardTemplate,
  MM_TO_PX,
  PaperConfig,
  PaperOrientation,
  PaperPreset,
  PAPER_PRESETS,
  SHIPMENT_FIELDS,
  TemplateScope,
} from '../../models/jobcard.model';
import { JobcardTemplateService } from '../../services/jobcard-template.service';
import { JobcardRenderService } from '../../services/jobcard-render.service';

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface HistorySnapshot {
  paper: PaperConfig;
  elements: JobcardElement[];
}

interface SmartGuide {
  orientation: 'vertical' | 'horizontal';
  position: number; // in mm
}

@Component({
  selector: 'app-jobcard-designer',
  templateUrl: './jobcard-designer.component.html',
  styleUrls: ['./jobcard-designer.component.scss']
})
export class JobcardDesignerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('paperSheet') paperSheetRef?: ElementRef<HTMLDivElement>;

  readonly Math = Math;
  readonly MM_TO_PX = MM_TO_PX;
  readonly paperPresets = PAPER_PRESETS;

  scope: TemplateScope = 'device';
  templateId: string = '';
  trackingNumber: string = '';
  shipmentId: string = '';

  templates: JobcardTemplate[] = [];
  currentTemplate!: JobcardTemplate;

  // Multi-selection state
  selectedElements: JobcardElement[] = [];

  get selectedElement(): JobcardElement | null {
    if (this.selectedElements.length === 1) {
      const el = this.selectedElements[0];
      if (!el.visibleWhen) {
        el.visibleWhen = 'always';
      }
      return el;
    }
    return null;
  }

  set selectedElement(el: JobcardElement | null) {
    if (el && !el.visibleWhen) {
      el.visibleWhen = 'always';
    }
    this.selectedElements = el ? [el] : [];
  }

  isDirty = false;
  zoom = 1.0;
  snapToGrid = true;
  showGrid = true;

  // Panel collapse states
  leftCollapsed = false;
  rightCollapsed = false;

  // History (Undo / Redo)
  private committed: HistorySnapshot | null = null;
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private readonly MAX_HISTORY = 50;
  private propertyChangeTimer: any = null;

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Palette search & batch add
  fieldSearchText = '';
  selectedFieldKeys = new Set<string>();

  // Modals
  isRenameModalVisible = false;
  renameTemplateName = '';

  isNewModalVisible = false;
  newTemplateName = '';
  newTemplatePreset: PaperPreset = '50x30';

  isPaperModalVisible = false;
  isPreviewModalVisible = false;

  previewDeviceData: any = {};
  previewShipmentData: any = {};
  previewDevicesList: any[] = [];

  // Dragging & Resizing tracking
  private isDragging = false;
  private isResizing = false;
  private activeResizeDir: ResizeDirection | null = null;
  private startMouseX = 0;
  private startMouseY = 0;
  private elementStartPositions = new Map<string, { x: number; y: number }>();
  private resizeStartEl = { x: 0, y: 0, w: 0, h: 0 };

  // Smart guides
  activeGuides: SmartGuide[] = [];

  // Marquee selection
  isMarqueeSelecting = false;
  marqueeStart = { x: 0, y: 0 };
  marqueeBox = { left: 0, top: 0, width: 0, height: 0 };

  // Clipboard for copy-paste
  private clipboardElements: JobcardElement[] = [];

  // Multi-select batch properties
  multiFontSize = 10;
  multiTextAlign: 'left' | 'center' | 'right' = 'left';
  multiColor = '#000000';
  multiLabelWidth = 30;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private templateService: JobcardTemplateService,
    private renderService: JobcardRenderService,
    private message: NzMessageService,
    private modal: NzModalService,
    private sanitizer: DomSanitizer
  ) {}

  colWidthFormatter = (val: number): string => `${val}%`;

  getPreviewHtml(): SafeHtml {
    if (!this.currentTemplate) return '';
    const data = this.scope === 'device' ? this.previewDeviceData : this.previewShipmentData;
    const html = this.renderService.renderSinglePage(
      this.currentTemplate,
      data,
      {},
      this.previewDevicesList
    );
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const scopeParam = params.get('scope') as TemplateScope;
      if (scopeParam === 'device' || scopeParam === 'shipment') {
        this.scope = scopeParam;
      }
      this.templateId = params.get('templateId') || '';
      this.trackingNumber = params.get('trackingNumber') || '';
      this.shipmentId = params.get('id') || '';

      this.initSampleData();
      this.loadTemplates();
    });
  }

  ngAfterViewInit(): void {
    const el = this.canvasContainerRef?.nativeElement;
    if (el) {
      el.addEventListener('wheel', this.onCanvasWheel, { passive: false });
    }
    setTimeout(() => {
      this.fitToWidth();
    }, 250);
  }

  ngOnDestroy(): void {
    const el = this.canvasContainerRef?.nativeElement;
    if (el) {
      el.removeEventListener('wheel', this.onCanvasWheel);
    }
    this.removeGlobalMouseListeners();
    clearTimeout(this.propertyChangeTimer);
  }

  private onCanvasWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.05 : -0.05;
      const newZoom = Math.round((this.zoom + delta) * 100) / 100;
      this.zoom = Math.max(0.3, Math.min(2.5, newZoom));
    }
  };

  // --- ZOOM / FIT CONTROLS ---

  fitToWidth(): void {
    if (!this.currentTemplate || !this.canvasContainerRef) return;
    const container = this.canvasContainerRef.nativeElement;
    const availableW = container.clientWidth - 48; // padding margin
    const paperW = this.currentTemplate.paper.width * MM_TO_PX;
    if (paperW > 0 && availableW > 0) {
      const ratio = Math.floor((availableW / paperW) * 100) / 100;
      this.zoom = Math.max(0.3, Math.min(2.0, ratio));
    }
  }

  fitToFrame(): void {
    if (!this.currentTemplate || !this.canvasContainerRef) return;
    const container = this.canvasContainerRef.nativeElement;
    const availableW = container.clientWidth - 48;
    const availableH = container.clientHeight - 48;
    const paperW = this.currentTemplate.paper.width * MM_TO_PX;
    const paperH = this.currentTemplate.paper.height * MM_TO_PX;
    if (paperW > 0 && paperH > 0 && availableW > 0 && availableH > 0) {
      const ratioW = availableW / paperW;
      const ratioH = availableH / paperH;
      const ratio = Math.floor(Math.min(ratioW, ratioH) * 100) / 100;
      this.zoom = Math.max(0.3, Math.min(2.0, ratio));
    }
  }

  // --- COLLAPSE PANELS ---

  toggleLeftPanel(): void {
    this.leftCollapsed = !this.leftCollapsed;
    setTimeout(() => this.fitToWidth(), 200);
  }

  toggleRightPanel(): void {
    this.rightCollapsed = !this.rightCollapsed;
    setTimeout(() => this.fitToWidth(), 200);
  }

  // --- HISTORY (UNDO / REDO) ---

  private takeSnapshot(): HistorySnapshot {
    return {
      paper: JSON.parse(JSON.stringify(this.currentTemplate.paper)),
      elements: JSON.parse(JSON.stringify(this.currentTemplate.elements))
    };
  }

  commitHistory(): void {
    if (!this.currentTemplate) return;
    const current = this.takeSnapshot();
    if (this.committed && JSON.stringify(current) === JSON.stringify(this.committed)) {
      return; // No mutation, avoid empty snapshots (e.g. click without drag)
    }
    if (this.committed) {
      this.undoStack.push(this.committed);
      if (this.undoStack.length > this.MAX_HISTORY) {
        this.undoStack.shift();
      }
    }
    this.redoStack = [];
    this.committed = current;
    this.markDirty();
  }

  pushSnapshot(): void {
    this.commitHistory();
  }

  undo(): void {
    // If a debounced property change is pending, flush it first!
    if (this.propertyChangeTimer) {
      clearTimeout(this.propertyChangeTimer);
      this.propertyChangeTimer = null;
      this.commitHistory();
    }

    if (!this.canUndo || !this.currentTemplate) return;

    const current = this.takeSnapshot();
    this.redoStack.push(current);

    const prev = this.undoStack.pop()!;
    this.currentTemplate.paper = JSON.parse(JSON.stringify(prev.paper));
    this.currentTemplate.elements = JSON.parse(JSON.stringify(prev.elements));
    this.committed = this.takeSnapshot();

    // Reconcile selected elements
    const validIds = new Set(this.currentTemplate.elements.map(e => e.id));
    this.selectedElements = this.selectedElements
      .filter(e => validIds.has(e.id))
      .map(e => this.currentTemplate.elements.find(el => el.id === e.id)!);

    this.markDirty();
  }

  redo(): void {
    // If a debounced property change is pending, flush it first!
    if (this.propertyChangeTimer) {
      clearTimeout(this.propertyChangeTimer);
      this.propertyChangeTimer = null;
      this.commitHistory();
    }

    if (!this.canRedo || !this.currentTemplate) return;

    const current = this.takeSnapshot();
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.currentTemplate.paper = JSON.parse(JSON.stringify(next.paper));
    this.currentTemplate.elements = JSON.parse(JSON.stringify(next.elements));
    this.committed = this.takeSnapshot();

    const validIds = new Set(this.currentTemplate.elements.map(e => e.id));
    this.selectedElements = this.selectedElements
      .filter(e => validIds.has(e.id))
      .map(e => this.currentTemplate.elements.find(el => el.id === e.id)!);

    this.markDirty();
  }

  onPropertyChange(): void {
    this.markDirty();
    clearTimeout(this.propertyChangeTimer);
    this.propertyChangeTimer = setTimeout(() => {
      this.propertyChangeTimer = null;
      this.commitHistory();
    }, 400);
  }

  private initSampleData(): void {
    this.previewDeviceData = {
      deviceName: 'iPhone 13 Pro Max',
      realDeviceName: 'iPhone 13 Pro Max 128GB VN/A',
      deviceCode: 'DEV-88921',
      model: 'A2643',
      imei: '354892109823412',
      storage: '128GB',
      totalRam: '6GB',
      osVersion: 'iOS 16.5',
      type: 'Phone',
      finalSummary: 'LOAI_1',
      price: 15500000,
      vcmFinalSummary: 'LOAI_1',
      vcmPrice: 14800000,
      status: 'approve',
      transactionId: 'TX-20231019-01',
      trackingNumber: this.trackingNumber || 'SPX109283741',
      receiverName: 'Nguyễn Văn A',
      receiverPhone: '0901234567',
      receiverAddress: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      createdDate: 1700000000000,
      updatedDate: 1700005000000,
      shipment_status: 'received',
      shipment_createdDate: 1700000000000,
      carrierCode: 'SPX Express',
      senderName: 'Kho Tổng Rentino'
    };

    this.previewShipmentData = {
      trackingNumber: this.trackingNumber || 'SPX109283741',
      status: 'received',
      carrierCode: 'SPX Express',
      senderName: 'Kho Tổng Rentino',
      receiverName: 'Nguyễn Văn A',
      receiverPhone: '0901234567',
      receiverAddress: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      createdDate: 1700000000000,
      total: 3
    };

    this.previewDevicesList = [
      {
        index: 1,
        deviceName: 'iPhone 13 Pro Max 128GB',
        imei: '354892109823412',
        model: 'A2643',
        storage: '128GB',
        finalSummary: 'LOAI_1',
        price: 15500000,
        status: 'approve'
      },
      {
        index: 2,
        deviceName: 'Samsung Galaxy S22 Ultra',
        imei: '359871234908123',
        model: 'SM-S908E',
        storage: '256GB',
        finalSummary: 'LOAI_2',
        price: 12000000,
        status: 'verified'
      },
      {
        index: 3,
        deviceName: 'Xiaomi 13 Pro',
        imei: '864239012349812',
        model: '2210132G',
        storage: '256GB',
        finalSummary: 'LOAI_1',
        price: 9800000,
        status: 'checking'
      }
    ];
  }

  loadTemplates(): void {
    this.templates = this.templateService.getTemplates(this.scope);
    if (this.templates.length === 0) {
      this.templateService.resetToDefault(this.scope);
      this.templates = this.templateService.getTemplates(this.scope);
    }

    let target: JobcardTemplate | undefined;
    if (this.templateId) {
      target = this.templates.find(t => t.id === this.templateId);
    }
    if (!target) {
      target = this.templates.find(t => t.isDefault) || this.templates[0];
    }

    this.selectTemplate(target);
  }

  selectTemplate(tpl: JobcardTemplate): void {
    if (this.isDirty) {
      this.modal.confirm({
        nzTitle: 'Thay đổi chưa lưu',
        nzContent: 'Bạn có các chỉnh sửa chưa lưu trên mẫu hiện tại. Bạn có muốn tiếp tục mà không lưu?',
        nzOkText: 'Chuyển mẫu',
        nzCancelText: 'Hủy',
        nzOnOk: () => {
          this.doSelectTemplate(tpl);
        }
      });
      return;
    }
    this.doSelectTemplate(tpl);
  }

  private doSelectTemplate(tpl: JobcardTemplate): void {
    this.currentTemplate = JSON.parse(JSON.stringify(tpl));
    this.templateId = this.currentTemplate.id;
    this.selectedElements = [];
    this.isDirty = false;
    this.undoStack = [];
    this.redoStack = [];
    this.committed = this.takeSnapshot();
    setTimeout(() => this.fitToWidth(), 100);
  }

  onScopeChange(newScope: TemplateScope): void {
    if (newScope === this.scope) return;
    if (this.isDirty) {
      this.modal.confirm({
        nzTitle: 'Thay đổi chưa lưu',
        nzContent: 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn đổi phạm vi mẫu in?',
        nzOkText: 'Đồng ý',
        nzCancelText: 'Hủy',
        nzOnOk: () => {
          this.scope = newScope;
          this.templateId = '';
          this.loadTemplates();
        }
      });
      return;
    }
    this.scope = newScope;
    this.templateId = '';
    this.loadTemplates();
  }

  markDirty(): void {
    this.isDirty = true;
  }

  // --- TEMPLATE CRUD ACTIONS ---

  openNewTemplateModal(): void {
    this.newTemplateName = `Mẫu ${this.scope === 'device' ? 'thiết bị' : 'vận đơn'} mới ${this.templates.length + 1}`;
    this.newTemplatePreset = this.scope === 'device' ? '50x30' : 'A4';
    this.isNewModalVisible = true;
  }

  createNewTemplate(): void {
    if (!this.newTemplateName.trim()) {
      this.message.warning('Vui lòng nhập tên mẫu in');
      return;
    }
    const defaultOrientation: PaperOrientation = (this.newTemplatePreset === 'A7' || this.newTemplatePreset === '50x30') ? 'landscape' : 'portrait';
    const created = this.templateService.createTemplate(
      this.newTemplateName,
      this.scope,
      this.newTemplatePreset,
      defaultOrientation
    );
    this.isNewModalVisible = false;
    this.message.success('Đã tạo mẫu in mới thành công');
    this.loadTemplates();
    this.doSelectTemplate(created);
    this.isDirty = false;
  }

  duplicateCurrentTemplate(): void {
    if (!this.currentTemplate) return;
    try {
      const copy = this.templateService.duplicateTemplate(this.currentTemplate.id);
      this.message.success('Đã nhân bản mẫu in thành công');
      this.loadTemplates();
      this.doSelectTemplate(copy);
      this.isDirty = false;
    } catch (e) {
      this.message.error('Không thể nhân bản mẫu in');
    }
  }

  openRenameModal(): void {
    if (!this.currentTemplate) return;
    this.renameTemplateName = this.currentTemplate.name;
    this.isRenameModalVisible = true;
  }

  saveRename(): void {
    if (!this.renameTemplateName.trim()) {
      this.message.warning('Tên mẫu không được để trống');
      return;
    }
    this.currentTemplate.name = this.renameTemplateName.trim();
    this.templateService.saveTemplate(this.currentTemplate);
    this.isRenameModalVisible = false;
    this.message.success('Đã đổi tên mẫu in thành công');
    this.loadTemplates();
  }

  deleteCurrentTemplate(): void {
    if (!this.currentTemplate) return;
    const ok = this.templateService.deleteTemplate(this.currentTemplate.id);
    if (ok) {
      this.message.success('Đã xóa mẫu in thành công');
      this.isDirty = false;
      this.templateId = '';
      this.loadTemplates();
    } else {
      this.message.warning('Không thể xóa mẫu in duy nhất của loại này');
    }
  }

  setAsDefaultTemplate(): void {
    if (!this.currentTemplate) return;
    this.currentTemplate.isDefault = true;
    this.templateService.setDefaultTemplate(this.currentTemplate.id);
    this.message.success('Đã đặt làm mẫu mặc định');
    this.loadTemplates();
  }

  resetCurrentToDefault(): void {
    this.modal.confirm({
      nzTitle: 'Khôi phục mẫu mặc định',
      nzContent: 'Thao tác này sẽ tải lại bố cục mẫu in chuẩn của hệ thống cho phạm vi này. Các chỉnh sửa hiện tại sẽ bị ghi đè. Bạn có chắc không?',
      nzOkText: 'Khôi phục',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        const def = this.templateService.resetToDefault(this.scope);
        this.message.success('Đã khôi phục mẫu mặc định thành công');
        this.loadTemplates();
        this.doSelectTemplate(def);
        this.isDirty = false;
      }
    });
  }

  saveTemplate(): void {
    if (!this.currentTemplate) return;
    this.templateService.saveTemplate(this.currentTemplate);
    this.isDirty = false;
    this.message.success('Đã lưu mẫu in thành công');
    this.loadTemplates();
  }

  // --- PAPER SETTINGS ---

  openPaperModal(): void {
    this.isPaperModalVisible = true;
  }

  onPresetChange(preset: PaperPreset): void {
    if (!this.currentTemplate) return;
    this.currentTemplate.paper.preset = preset;
    if (preset === 'A7' || preset === '50x30') {
      this.currentTemplate.paper.orientation = 'landscape';
    }
    if (preset !== 'custom') {
      const info = PAPER_PRESETS[preset];
      if (this.currentTemplate.paper.orientation === 'portrait') {
        this.currentTemplate.paper.width = Math.min(info.width, info.height);
        this.currentTemplate.paper.height = Math.max(info.width, info.height);
      } else {
        this.currentTemplate.paper.width = Math.max(info.width, info.height);
        this.currentTemplate.paper.height = Math.min(info.width, info.height);
      }
    }
    this.pushSnapshot();
    setTimeout(() => this.fitToWidth(), 100);
  }

  onOrientationChange(orientation: PaperOrientation): void {
    if (!this.currentTemplate) return;
    this.currentTemplate.paper.orientation = orientation;
    const w = this.currentTemplate.paper.width;
    const h = this.currentTemplate.paper.height;
    if (orientation === 'portrait' && w > h) {
      this.currentTemplate.paper.width = h;
      this.currentTemplate.paper.height = w;
    } else if (orientation === 'landscape' && w < h) {
      this.currentTemplate.paper.width = h;
      this.currentTemplate.paper.height = w;
    }
    this.pushSnapshot();
    setTimeout(() => this.fitToWidth(), 100);
  }

  // --- PALETTE: FIELDS & BLOCKS ---

  get availableFields(): FieldDefinition[] {
    return this.scope === 'device' ? DEVICE_FIELDS : SHIPMENT_FIELDS;
  }

  get filteredFields(): FieldDefinition[] {
    const q = (this.fieldSearchText || '').trim().toLowerCase();
    if (!q) return this.availableFields;
    return this.availableFields.filter(
      f => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)
    );
  }

  isFieldInTemplate(fieldKey: string): boolean {
    return (
      this.currentTemplate?.elements.some(
        e => e.type === 'data_field' && e.fieldKey === fieldKey
      ) ?? false
    );
  }

  toggleFieldKey(key: string, checked: boolean): void {
    if (checked) {
      this.selectedFieldKeys.add(key);
    } else {
      this.selectedFieldKeys.delete(key);
    }
  }

  getFirstEmptyPosition(width: number, height: number): { x: number; y: number } {
    if (!this.currentTemplate) return { x: 10, y: 10 };
    const paper = this.currentTemplate.paper;
    const mL = paper.marginLeft || 8;
    const mT = paper.marginTop || 8;
    const mR = paper.marginRight || 8;
    const mB = paper.marginBottom || 8;
    const maxW = paper.width - mR;
    const maxH = paper.height - mB;

    let lowestY = mT;
    for (const el of this.currentTemplate.elements) {
      const bottom = el.y + el.height;
      if (bottom > lowestY) {
        lowestY = bottom;
      }
    }

    let x = mL;
    let y = this.currentTemplate.elements.length > 0 ? lowestY + 2 : mT;

    // Wrap if exceeding paper bottom margin
    if (y + height > maxH) {
      y = mT;
      x = Math.min(mL + 10, maxW - width);
    }

    x = Math.max(mL, Math.min(x, maxW - width));
    y = Math.max(mT, Math.min(y, maxH - height));
    return { x: Math.round(x), y: Math.round(y) };
  }

  addDataField(fieldKey: string, customPos?: { x: number; y: number }): void {
    const fDef = this.availableFields.find(f => f.key === fieldKey);
    if (!fDef || !this.currentTemplate) return;

    const width = 65;
    const height = 6;
    const pos = customPos || this.getFirstEmptyPosition(width, height);

    const newEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'data_field',
      fieldKey: fDef.key,
      label: fDef.label + ':',
      showLabel: true,
      format: fDef.format,
      labelWidth: 0,
      x: pos.x,
      y: pos.y,
      width,
      height,
      fontSize: 9,
      color: '#000000',
      textAlign: 'left'
    };

    this.addElementToCanvas(newEl);
  }

  addSelectedFieldsBatch(): void {
    if (this.selectedFieldKeys.size === 0 || !this.currentTemplate) return;

    const fieldsToAdd = this.availableFields.filter(f => this.selectedFieldKeys.has(f.key));
    if (fieldsToAdd.length === 0) return;

    const width = 70;
    const height = 6;
    const startPos = this.getFirstEmptyPosition(width, height);
    let currentY = startPos.y;
    const paper = this.currentTemplate.paper;
    const maxH = paper.height - (paper.marginBottom || 8);

    const newElements: JobcardElement[] = [];

    fieldsToAdd.forEach(fDef => {
      if (currentY + height > maxH) {
        currentY = paper.marginTop || 8;
      }
      const newEl: JobcardElement = {
        id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'data_field',
        fieldKey: fDef.key,
        label: fDef.label + ':',
        showLabel: true,
        labelWidth: 30, // Aligned label width for batch
        format: fDef.format,
        x: startPos.x,
        y: Math.round(currentY),
        width,
        height,
        fontSize: 9,
        color: '#000000',
        textAlign: 'left'
      };
      newElements.push(newEl);
      this.currentTemplate.elements.push(newEl);
      currentY += height + 1.5;
    });

    this.selectedFieldKeys.clear();
    this.selectedElements = newElements;
    this.pushSnapshot();
  }

  onFieldDragStart(event: DragEvent, field: FieldDefinition): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'palette_field', key: field.key }));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onPaperDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onPaperDrop(event: DragEvent): void {
    event.preventDefault();
    if (!this.currentTemplate || !this.paperSheetRef) return;

    const rawData = event.dataTransfer?.getData('text/plain');
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      if (data.type === 'palette_field' && data.key) {
        const sheetRect = this.paperSheetRef.nativeElement.getBoundingClientRect();
        const dropX_px = event.clientX - sheetRect.left;
        const dropY_px = event.clientY - sheetRect.top;
        let dropX_mm = dropX_px / (MM_TO_PX * this.zoom);
        let dropY_mm = dropY_px / (MM_TO_PX * this.zoom);

        if (this.snapToGrid) {
          dropX_mm = Math.round(dropX_mm);
          dropY_mm = Math.round(dropY_mm);
        } else {
          dropX_mm = Math.round(dropX_mm * 10) / 10;
        }

        const width = 65;
        const height = 6;
        dropX_mm = Math.max(0, Math.min(dropX_mm, this.currentTemplate.paper.width - width));
        dropY_mm = Math.max(0, Math.min(dropY_mm, this.currentTemplate.paper.height - height));

        this.addDataField(data.key, { x: dropX_mm, y: dropY_mm });
      }
    } catch {
      // not JSON or not our drag
    }
  }

  addStaticText(): void {
    if (!this.currentTemplate) return;
    const width = 70;
    const height = 8;
    const pos = this.getFirstEmptyPosition(width, height);
    const newEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'static_text',
      content: 'Nhập nội dung văn bản...',
      x: pos.x,
      y: pos.y,
      width,
      height,
      fontSize: 10,
      color: '#000000',
      textAlign: 'left'
    };
    this.addElementToCanvas(newEl);
  }

  addCustomField(): void {
    if (!this.currentTemplate) return;
    const count = this.currentTemplate.elements.filter(e => e.type === 'custom_field').length + 1;
    const width = 70;
    const height = 6;
    const pos = this.getFirstEmptyPosition(width, height);
    const newEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'custom_field',
      customKey: `custom_field_${count}`,
      label: `Trường tùy biến ${count}:`,
      defaultValue: '',
      labelWidth: 0,
      x: pos.x,
      y: pos.y,
      width,
      height,
      fontSize: 9,
      color: '#000000',
      textAlign: 'left'
    };
    this.addElementToCanvas(newEl);
  }

  addLine(orientation: 'horizontal' | 'vertical' = 'horizontal'): void {
    if (!this.currentTemplate) return;
    const isH = orientation === 'horizontal';
    const paper = this.currentTemplate.paper;
    const width = isH ? Math.max(40, paper.width - (paper.marginLeft || 8) - (paper.marginRight || 8)) : 2;
    const height = isH ? 2 : 40;
    const pos = this.getFirstEmptyPosition(width, height);

    const newEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'line',
      lineOrientation: orientation,
      lineThickness: 1,
      color: '#000000',
      x: pos.x,
      y: pos.y,
      width,
      height
    };
    this.addElementToCanvas(newEl);
  }

  addBox(): void {
    if (!this.currentTemplate) return;
    const width = 80;
    const height = 35;
    const pos = this.getFirstEmptyPosition(width, height);
    const newEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'box',
      border: true,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#d9d9d9',
      borderRadius: 1,
      backgroundColor: 'transparent',
      x: pos.x,
      y: pos.y,
      width,
      height
    };
    this.addElementToCanvas(newEl);
  }

  addTable(): void {
    if (!this.currentTemplate || this.scope !== 'shipment') return;
    const paper = this.currentTemplate.paper;
    const width = Math.max(60, paper.width - (paper.marginLeft || 8) - (paper.marginRight || 8));
    const height = 70;
    const pos = this.getFirstEmptyPosition(width, height);

    const newEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'table',
      x: pos.x,
      y: pos.y,
      width,
      height,
      fontSize: 8,
      tableRowHeight: 6,
      tableHeaderBg: '#f2f2f2',
      tableColumns: JSON.parse(JSON.stringify(DEFAULT_TABLE_COLUMNS))
    };
    this.addElementToCanvas(newEl);
  }

  addPrintDate(): void {
    if (!this.currentTemplate) return;
    const width = 60;
    const height = 5;
    const pos = this.getFirstEmptyPosition(width, height);
    const newEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'print_date',
      label: 'Ngày in:',
      showLabel: true,
      dateFormat: 'dd/MM/yyyy HH:mm',
      x: pos.x,
      y: pos.y,
      width,
      height,
      fontSize: 8,
      fontStyle: 'italic',
      color: '#666666'
    };
    this.addElementToCanvas(newEl);
  }

  // Ready-made blocks
  addHeaderBlock(): void {
    if (!this.currentTemplate) return;
    const paper = this.currentTemplate.paper;
    const mL = paper.marginLeft || 8;
    const mR = paper.marginRight || 8;
    const width = Math.max(60, paper.width - mL - mR);
    const pos = this.getFirstEmptyPosition(width, 14);

    const titleEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'static_text',
      content: 'PHIẾU THÔNG TIN XÁC NHẬN',
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1890ff',
      x: pos.x,
      y: pos.y,
      width,
      height: 8
    };

    const lineEl: JobcardElement = {
      id: `el_${Date.now() + 1}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'line',
      lineOrientation: 'horizontal',
      lineThickness: 1,
      color: '#1890ff',
      x: pos.x,
      y: pos.y + 10,
      width,
      height: 2
    };

    this.currentTemplate.elements.push(titleEl, lineEl);
    this.selectedElements = [titleEl, lineEl];
    this.pushSnapshot();
  }

  addSignatureBlock(): void {
    if (!this.currentTemplate) return;
    const paper = this.currentTemplate.paper;
    const mL = paper.marginLeft || 8;
    const mR = paper.marginRight || 8;
    const colW = 55;
    const colH = 22;
    const totalW = Math.max(60, paper.width - mL - mR);
    const pos = this.getFirstEmptyPosition(totalW, colH);

    const senderEl: JobcardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'static_text',
      content: 'NGƯỜI GIAO\n(Ký, ghi rõ họ tên)',
      fontSize: 9,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#262626',
      x: mL + 4,
      y: pos.y,
      width: colW,
      height: colH
    };

    const receiverEl: JobcardElement = {
      id: `el_${Date.now() + 1}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'static_text',
      content: 'NGƯỜI NHẬN\n(Ký, ghi rõ họ tên)',
      fontSize: 9,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#262626',
      x: Math.max(mL + colW + 10, paper.width - mR - colW - 4),
      y: pos.y,
      width: colW,
      height: colH
    };

    this.currentTemplate.elements.push(senderEl, receiverEl);
    this.selectedElements = [senderEl, receiverEl];
    this.pushSnapshot();
  }

  private addElementToCanvas(el: JobcardElement): void {
    if (!this.currentTemplate) return;
    this.currentTemplate.elements.push(el);
    this.selectedElements = [el];
    this.pushSnapshot();
  }

  // --- SELECTION & MULTI-SELECT ---

  isElementSelected(el: JobcardElement): boolean {
    return this.selectedElements.some(e => e.id === el.id);
  }

  selectElement(event: MouseEvent, el: JobcardElement): void {
    event.stopPropagation();
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      if (this.isElementSelected(el)) {
        this.selectedElements = this.selectedElements.filter(e => e.id !== el.id);
      } else {
        this.selectedElements = [...this.selectedElements, el];
      }
    } else {
      if (!this.isElementSelected(el)) {
        this.selectedElements = [el];
      }
    }
  }

  selectAll(): void {
    if (!this.currentTemplate) return;
    this.selectedElements = [...this.currentTemplate.elements];
  }

  deselectAll(): void {
    this.selectedElements = [];
  }

  duplicateSelectedElements(): void {
    if (this.selectedElements.length === 0 || !this.currentTemplate) return;

    const paper = this.currentTemplate.paper;
    const copies: JobcardElement[] = [];

    this.selectedElements.forEach(el => {
      const copy: JobcardElement = {
        ...JSON.parse(JSON.stringify(el)),
        id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        x: Math.min(el.x + 4, paper.width - el.width),
        y: Math.min(el.y + 4, paper.height - el.height)
      };
      this.currentTemplate.elements.push(copy);
      copies.push(copy);
    });

    this.selectedElements = copies;
    this.pushSnapshot();
  }

  deleteSelectedElements(): void {
    if (this.selectedElements.length === 0 || !this.currentTemplate) return;
    const idsToDelete = new Set(
      this.selectedElements.filter(e => !e.locked).map(e => e.id)
    );
    if (idsToDelete.size === 0) return;

    this.currentTemplate.elements = this.currentTemplate.elements.filter(
      e => !idsToDelete.has(e.id)
    );
    this.selectedElements = this.selectedElements.filter(e => !idsToDelete.has(e.id));
    this.pushSnapshot();
  }

  copySelectedElements(): void {
    if (this.selectedElements.length === 0) return;
    this.clipboardElements = JSON.parse(JSON.stringify(this.selectedElements));
  }

  pasteElements(): void {
    if (this.clipboardElements.length === 0 || !this.currentTemplate) return;
    const paper = this.currentTemplate.paper;
    const pasted: JobcardElement[] = [];

    this.clipboardElements.forEach(el => {
      const copy: JobcardElement = {
        ...JSON.parse(JSON.stringify(el)),
        id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        x: Math.min(el.x + 4, paper.width - el.width),
        y: Math.min(el.y + 4, paper.height - el.height),
        locked: false
      };
      this.currentTemplate.elements.push(copy);
      pasted.push(copy);
    });

    this.selectedElements = pasted;
    this.pushSnapshot();
  }

  // --- LAYERS & REORDERING ---

  getLayerTitle(el: JobcardElement): string {
    switch (el.type) {
      case 'data_field':
        return `Trường: ${el.label || el.fieldKey || 'Dữ liệu'}`;
      case 'static_text':
        return `Văn bản: ${(el.content || '').substring(0, 20) || '(Trống)'}`;
      case 'custom_field':
        return `Trường tùy biến: ${el.label || el.customKey || ''}`;
      case 'line':
        return el.lineOrientation === 'vertical' ? 'Đường kẻ dọc' : 'Đường kẻ ngang';
      case 'box':
        return 'Khung bao / Hộp';
      case 'table':
        return 'Bảng thiết bị';
      case 'print_date':
        return 'Ngày giờ in';
      default:
        return el.type;
    }
  }

  getElementTypeLabel(type: ElementType): string {
    switch (type) {
      case 'data_field':
        return 'Trường dữ liệu';
      case 'static_text':
        return 'Văn bản tĩnh';
      case 'custom_field':
        return 'Trường tùy biến';
      case 'line':
        return 'Đường kẻ';
      case 'box':
        return 'Khung bao / Hộp';
      case 'table':
        return 'Bảng thiết bị';
      case 'print_date':
        return 'Ngày giờ in';
      default:
        return type;
    }
  }

  toggleLock(el: JobcardElement, event?: Event): void {
    if (event) event.stopPropagation();
    el.locked = !el.locked;
    this.pushSnapshot();
  }

  moveLayerUp(el: JobcardElement, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.currentTemplate) return;
    const elements = this.currentTemplate.elements;
    const idx = elements.findIndex(e => e.id === el.id);
    if (idx < elements.length - 1) {
      const temp = elements[idx];
      elements[idx] = elements[idx + 1];
      elements[idx + 1] = temp;
      this.syncZIndices();
      this.pushSnapshot();
    }
  }

  moveLayerDown(el: JobcardElement, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.currentTemplate) return;
    const elements = this.currentTemplate.elements;
    const idx = elements.findIndex(e => e.id === el.id);
    if (idx > 0) {
      const temp = elements[idx];
      elements[idx] = elements[idx - 1];
      elements[idx - 1] = temp;
      this.syncZIndices();
      this.pushSnapshot();
    }
  }

  bringToFront(): void {
    if (this.selectedElements.length === 0 || !this.currentTemplate) return;
    const elements = this.currentTemplate.elements;
    const selectedIds = new Set(this.selectedElements.map(e => e.id));
    const nonSelected = elements.filter(e => !selectedIds.has(e.id));
    const selected = elements.filter(e => selectedIds.has(e.id));
    this.currentTemplate.elements = [...nonSelected, ...selected];
    this.syncZIndices();
    this.pushSnapshot();
  }

  sendToBack(): void {
    if (this.selectedElements.length === 0 || !this.currentTemplate) return;
    const elements = this.currentTemplate.elements;
    const selectedIds = new Set(this.selectedElements.map(e => e.id));
    const nonSelected = elements.filter(e => !selectedIds.has(e.id));
    const selected = elements.filter(e => selectedIds.has(e.id));
    this.currentTemplate.elements = [...selected, ...nonSelected];
    this.syncZIndices();
    this.pushSnapshot();
  }

  private syncZIndices(): void {
    this.currentTemplate.elements.forEach((el, index) => {
      el.zIndex = (index + 1) * 5;
    });
  }

  // --- ALIGNMENT COMMANDS ---

  alignLeft(): void {
    if (this.selectedElements.length < 2) return;
    const minX = Math.min(...this.selectedElements.map(e => e.x));
    this.selectedElements.forEach(e => {
      if (!e.locked) e.x = minX;
    });
    this.pushSnapshot();
  }

  alignCenter(): void {
    if (this.selectedElements.length < 2) return;
    const minX = Math.min(...this.selectedElements.map(e => e.x));
    const maxR = Math.max(...this.selectedElements.map(e => e.x + e.width));
    const midX = minX + (maxR - minX) / 2;
    this.selectedElements.forEach(e => {
      if (!e.locked) e.x = Math.round((midX - e.width / 2) * 10) / 10;
    });
    this.pushSnapshot();
  }

  alignRight(): void {
    if (this.selectedElements.length < 2) return;
    const maxR = Math.max(...this.selectedElements.map(e => e.x + e.width));
    this.selectedElements.forEach(e => {
      if (!e.locked) e.x = maxR - e.width;
    });
    this.pushSnapshot();
  }

  alignTop(): void {
    if (this.selectedElements.length < 2) return;
    const minY = Math.min(...this.selectedElements.map(e => e.y));
    this.selectedElements.forEach(e => {
      if (!e.locked) e.y = minY;
    });
    this.pushSnapshot();
  }

  alignMiddle(): void {
    if (this.selectedElements.length < 2) return;
    const minY = Math.min(...this.selectedElements.map(e => e.y));
    const maxB = Math.max(...this.selectedElements.map(e => e.y + e.height));
    const midY = minY + (maxB - minY) / 2;
    this.selectedElements.forEach(e => {
      if (!e.locked) e.y = Math.round((midY - e.height / 2) * 10) / 10;
    });
    this.pushSnapshot();
  }

  alignBottom(): void {
    if (this.selectedElements.length < 2) return;
    const maxB = Math.max(...this.selectedElements.map(e => e.y + e.height));
    this.selectedElements.forEach(e => {
      if (!e.locked) e.y = maxB - e.height;
    });
    this.pushSnapshot();
  }

  distributeHorizontally(): void {
    if (this.selectedElements.length < 3) return;
    const sorted = [...this.selectedElements].sort((a, b) => a.x - b.x);
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x;
    const totalW = sorted.slice(0, -1).reduce((sum, el) => sum + el.width, 0);
    const gap = (maxX - minX - totalW + sorted[sorted.length - 1].width) / (sorted.length - 1);

    let curX = minX;
    sorted.forEach((el, i) => {
      if (i > 0 && !el.locked) {
        el.x = Math.round(curX * 10) / 10;
      }
      curX += el.width + gap;
    });
    this.pushSnapshot();
  }

  distributeVertically(): void {
    if (this.selectedElements.length < 3) return;
    const sorted = [...this.selectedElements].sort((a, b) => a.y - b.y);
    const minY = sorted[0].y;
    const maxY = sorted[sorted.length - 1].y;
    const totalH = sorted.slice(0, -1).reduce((sum, el) => sum + el.height, 0);
    const gap = (maxY - minY - totalH + sorted[sorted.length - 1].height) / (sorted.length - 1);

    let curY = minY;
    sorted.forEach((el, i) => {
      if (i > 0 && !el.locked) {
        el.y = Math.round(curY * 10) / 10;
      }
      curY += el.height + gap;
    });
    this.pushSnapshot();
  }

  sameWidth(): void {
    if (this.selectedElements.length < 2) return;
    const targetW = this.selectedElements[0].width;
    this.selectedElements.forEach(e => {
      if (!e.locked) e.width = targetW;
    });
    this.pushSnapshot();
  }

  // Multi-select property apply
  applyMultiFontSize(size: number): void {
    this.selectedElements.forEach(e => {
      if (e.type !== 'line' && e.type !== 'box') e.fontSize = size;
    });
    this.pushSnapshot();
  }

  toggleMultiStyle(prop: 'bold' | 'italic' | 'underline'): void {
    if (prop === 'bold') {
      const anyNonBold = this.selectedElements.some(e => e.fontWeight !== 'bold');
      this.selectedElements.forEach(e => (e.fontWeight = anyNonBold ? 'bold' : 'normal'));
    } else if (prop === 'italic') {
      const anyNonItalic = this.selectedElements.some(e => e.fontStyle !== 'italic');
      this.selectedElements.forEach(e => (e.fontStyle = anyNonItalic ? 'italic' : 'normal'));
    } else if (prop === 'underline') {
      const anyNonUnder = this.selectedElements.some(e => e.textDecoration !== 'underline');
      this.selectedElements.forEach(e => (e.textDecoration = anyNonUnder ? 'underline' : 'none'));
    }
    this.pushSnapshot();
  }

  applyMultiTextAlign(align: 'left' | 'center' | 'right'): void {
    this.selectedElements.forEach(e => (e.textAlign = align));
    this.pushSnapshot();
  }

  applyMultiColor(color: string): void {
    this.selectedElements.forEach(e => (e.color = color));
    this.pushSnapshot();
  }

  applyMultiLabelWidth(): void {
    const val = Number(this.multiLabelWidth);
    if (isNaN(val)) return;
    this.selectedElements.forEach(e => {
      if (e.type === 'data_field' || e.type === 'custom_field') {
        e.labelWidth = val;
      }
    });
    this.pushSnapshot();
  }

  // --- DOUBLE CLICK TO FOCUS ---

  onElementDoubleClick(el: JobcardElement): void {
    this.selectedElements = [el];
    if (this.rightCollapsed) {
      this.rightCollapsed = false;
    }
    setTimeout(() => {
      if (el.type === 'static_text') {
        const input = document.getElementById('staticContentInput') as HTMLTextAreaElement;
        input?.focus();
        input?.select();
      } else if (el.type === 'custom_field') {
        const input = document.getElementById('customLabelInput') as HTMLInputElement;
        input?.focus();
        input?.select();
      }
    }, 60);
  }

  // --- MOUSE DRAG, SMART GUIDES & RESIZE ---

  onElementMouseDown(event: MouseEvent, el: JobcardElement): void {
    if (event.button !== 0) return; // left click only
    event.stopPropagation();

    if (el.locked) {
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        this.selectedElements = [el];
      }
      return;
    }

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      this.selectElement(event, el);
      return;
    }

    if (!this.isElementSelected(el)) {
      this.selectedElements = [el];
    }

    this.isDragging = true;
    this.startMouseX = event.clientX;
    this.startMouseY = event.clientY;

    this.elementStartPositions.clear();
    this.selectedElements.forEach(item => {
      this.elementStartPositions.set(item.id, { x: item.x, y: item.y });
    });

    this.addGlobalMouseListeners();
  }

  onResizeHandleMouseDown(event: MouseEvent, dir: ResizeDirection, el: JobcardElement): void {
    if (event.button !== 0 || el.locked) return;
    event.stopPropagation();

    this.selectedElements = [el];
    this.isResizing = true;
    this.activeResizeDir = dir;
    this.startMouseX = event.clientX;
    this.startMouseY = event.clientY;
    this.resizeStartEl = { x: el.x, y: el.y, w: el.width, h: el.height };

    this.addGlobalMouseListeners();
  }

  onPaperMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    // Marquee drag-to-select
    this.isMarqueeSelecting = true;
    this.marqueeStart = { x: event.clientX, y: event.clientY };
    this.marqueeBox = { left: event.clientX, top: event.clientY, width: 0, height: 0 };
    if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
      this.deselectAll();
    }
    this.addGlobalMouseListeners();
  }

  private addGlobalMouseListeners(): void {
    window.addEventListener('mousemove', this.onGlobalMouseMove);
    window.addEventListener('mouseup', this.onGlobalMouseUp);
  }

  private removeGlobalMouseListeners(): void {
    window.removeEventListener('mousemove', this.onGlobalMouseMove);
    window.removeEventListener('mouseup', this.onGlobalMouseUp);
  }

  private onGlobalMouseMove = (event: MouseEvent): void => {
    if (this.isMarqueeSelecting) {
      const curX = event.clientX;
      const curY = event.clientY;
      const left = Math.min(this.marqueeStart.x, curX);
      const top = Math.min(this.marqueeStart.y, curY);
      const width = Math.abs(curX - this.marqueeStart.x);
      const height = Math.abs(curY - this.marqueeStart.y);

      this.marqueeBox = { left, top, width, height };

      // Convert marquee viewport rect to paper coordinates
      if (this.paperSheetRef && this.currentTemplate) {
        const sheetRect = this.paperSheetRef.nativeElement.getBoundingClientRect();
        const mLeft_mm = (left - sheetRect.left) / (MM_TO_PX * this.zoom);
        const mTop_mm = (top - sheetRect.top) / (MM_TO_PX * this.zoom);
        const mRight_mm = mLeft_mm + width / (MM_TO_PX * this.zoom);
        const mBottom_mm = mTop_mm + height / (MM_TO_PX * this.zoom);

        const intersecting = this.currentTemplate.elements.filter(el => {
          const elRight = el.x + el.width;
          const elBottom = el.y + el.height;
          return !(el.x > mRight_mm || elRight < mLeft_mm || el.y > mBottom_mm || elBottom < mTop_mm);
        });

        this.selectedElements = intersecting;
      }
      return;
    }

    if (!this.currentTemplate) return;

    const deltaX_px = event.clientX - this.startMouseX;
    const deltaY_px = event.clientY - this.startMouseY;
    let deltaX_mm = deltaX_px / (MM_TO_PX * this.zoom);
    let deltaY_mm = deltaY_px / (MM_TO_PX * this.zoom);

    if (this.isDragging && this.selectedElements.length > 0) {
      this.activeGuides = [];

      // Determine bounding box of selected elements
      const primaryEl = this.selectedElement || this.selectedElements[0];
      const startPos = this.elementStartPositions.get(primaryEl.id);
      if (!startPos) return;

      let candidateX = startPos.x + deltaX_mm;
      let candidateY = startPos.y + deltaY_mm;

      const altDisabled = event.altKey;

      if (!altDisabled) {
        // Smart guides snap (~1.5mm threshold)
        const snapThreshold = 1.5;
        const paper = this.currentTemplate.paper;
        const otherElements = this.currentTemplate.elements.filter(
          e => !this.selectedElements.some(s => s.id === e.id)
        );

        // Vertical reference targets (x coords)
        const vTargets = [
          paper.marginLeft || 8,
          paper.width - (paper.marginRight || 8),
          paper.width / 2
        ];
        otherElements.forEach(e => {
          vTargets.push(e.x, e.x + e.width / 2, e.x + e.width);
        });

        // Horizontal reference targets (y coords)
        const hTargets = [
          paper.marginTop || 8,
          paper.height - (paper.marginBottom || 8),
          paper.height / 2
        ];
        otherElements.forEach(e => {
          hTargets.push(e.y, e.y + e.height / 2, e.y + e.height);
        });

        // Thử bám theo trục X
        const myLeft = candidateX;
        const myCenter = candidateX + primaryEl.width / 2;
        const myRight = candidateX + primaryEl.width;

        let snappedX = false;
        for (const target of vTargets) {
          if (Math.abs(myLeft - target) <= snapThreshold) {
            candidateX = target;
            this.activeGuides.push({ orientation: 'vertical', position: target });
            snappedX = true;
            break;
          }
          if (Math.abs(myCenter - target) <= snapThreshold) {
            candidateX = target - primaryEl.width / 2;
            this.activeGuides.push({ orientation: 'vertical', position: target });
            snappedX = true;
            break;
          }
          if (Math.abs(myRight - target) <= snapThreshold) {
            candidateX = target - primaryEl.width;
            this.activeGuides.push({ orientation: 'vertical', position: target });
            snappedX = true;
            break;
          }
        }

        if (!snappedX && this.snapToGrid) {
          candidateX = Math.round(candidateX);
        } else if (!snappedX) {
          candidateX = Math.round(candidateX * 10) / 10;
        }

        // Thử bám theo trục Y
        const myTop = candidateY;
        const myMiddle = candidateY + primaryEl.height / 2;
        const myBottom = candidateY + primaryEl.height;

        let snappedY = false;
        for (const target of hTargets) {
          if (Math.abs(myTop - target) <= snapThreshold) {
            candidateY = target;
            this.activeGuides.push({ orientation: 'horizontal', position: target });
            snappedY = true;
            break;
          }
          if (Math.abs(myMiddle - target) <= snapThreshold) {
            candidateY = target - primaryEl.height / 2;
            this.activeGuides.push({ orientation: 'horizontal', position: target });
            snappedY = true;
            break;
          }
          if (Math.abs(myBottom - target) <= snapThreshold) {
            candidateY = target - primaryEl.height;
            this.activeGuides.push({ orientation: 'horizontal', position: target });
            snappedY = true;
            break;
          }
        }

        if (!snappedY && this.snapToGrid) {
          candidateY = Math.round(candidateY);
        } else if (!snappedY) {
          candidateY = Math.round(candidateY * 10) / 10;
        }
      } else {
        if (this.snapToGrid) {
          candidateX = Math.round(candidateX);
          candidateY = Math.round(candidateY);
        } else {
          candidateX = Math.round(candidateX * 10) / 10;
          candidateY = Math.round(candidateY * 10) / 10;
        }
      }

      const appliedDeltaX = candidateX - startPos.x;
      const appliedDeltaY = candidateY - startPos.y;

      // Apply to all selected elements (if not locked)
      this.selectedElements.forEach(item => {
        if (item.locked) return;
        const orig = this.elementStartPositions.get(item.id);
        if (!orig) return;

        let nx = orig.x + appliedDeltaX;
        let ny = orig.y + appliedDeltaY;

        nx = Math.max(0, Math.min(nx, this.currentTemplate.paper.width - item.width));
        ny = Math.max(0, Math.min(ny, this.currentTemplate.paper.height - item.height));

        item.x = Math.round(nx * 10) / 10;
        item.y = Math.round(ny * 10) / 10;
      });

      this.markDirty();
    } else if (this.isResizing && this.activeResizeDir && this.selectedElement) {
      const el = this.selectedElement;
      let newX = this.resizeStartEl.x;
      let newY = this.resizeStartEl.y;
      let newW = this.resizeStartEl.w;
      let newH = this.resizeStartEl.h;
      const dir = this.activeResizeDir;

      if (dir.includes('e')) {
        newW = this.resizeStartEl.w + deltaX_mm;
      } else if (dir.includes('w')) {
        newW = this.resizeStartEl.w - deltaX_mm;
        newX = this.resizeStartEl.x + deltaX_mm;
      }

      if (dir.includes('s')) {
        newH = this.resizeStartEl.h + deltaY_mm;
      } else if (dir.includes('n')) {
        newH = this.resizeStartEl.h - deltaY_mm;
        newY = this.resizeStartEl.y + deltaY_mm;
      }

      if (this.snapToGrid && !event.altKey) {
        newX = Math.round(newX);
        newY = Math.round(newY);
        newW = Math.round(newW);
        newH = Math.round(newH);
      } else {
        newX = Math.round(newX * 10) / 10;
        newY = Math.round(newY * 10) / 10;
        newW = Math.round(newW * 10) / 10;
        newH = Math.round(newH * 10) / 10;
      }

      const minW = el.type === 'line' && el.lineOrientation === 'vertical' ? 1 : 4;
      const minH = el.type === 'line' && el.lineOrientation === 'horizontal' ? 1 : 3;

      if (newW < minW) {
        newW = minW;
        if (dir.includes('w')) newX = this.resizeStartEl.x + this.resizeStartEl.w - minW;
      }
      if (newH < minH) {
        newH = minH;
        if (dir.includes('n')) newY = this.resizeStartEl.y + this.resizeStartEl.h - minH;
      }

      // Constrain inside paper
      if (newX < 0) {
        newW += newX;
        newX = 0;
      }
      if (newY < 0) {
        newH += newY;
        newY = 0;
      }
      if (newX + newW > this.currentTemplate.paper.width) {
        newW = this.currentTemplate.paper.width - newX;
      }
      if (newY + newH > this.currentTemplate.paper.height) {
        newH = this.currentTemplate.paper.height - newY;
      }

      el.x = newX;
      el.y = newY;
      el.width = newW;
      el.height = newH;
      this.markDirty();
    }
  };

  private onGlobalMouseUp = (): void => {
    const wasDraggingOrResizing = this.isDragging || this.isResizing;
    this.isDragging = false;
    this.isResizing = false;
    this.isMarqueeSelecting = false;
    this.activeResizeDir = null;
    this.activeGuides = [];
    this.removeGlobalMouseListeners();

    if (wasDraggingOrResizing) {
      this.pushSnapshot();
    }
  };

  // --- KEYBOARD SHORTCUTS ---

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const activeTagName = (document.activeElement?.tagName || '').toLowerCase();
    if (activeTagName === 'input' || activeTagName === 'textarea' || activeTagName === 'select') {
      return; // Do not intercept typing in inputs
    }

    const isCtrl = event.ctrlKey || event.metaKey;

    // Undo: Ctrl+Z
    if (isCtrl && (event.key === 'z' || event.key === 'Z') && !event.shiftKey) {
      event.preventDefault();
      this.undo();
      return;
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (
      (isCtrl && (event.key === 'y' || event.key === 'Y')) ||
      (isCtrl && event.shiftKey && (event.key === 'z' || event.key === 'Z'))
    ) {
      event.preventDefault();
      this.redo();
      return;
    }

    const hasTextSelection = (window.getSelection()?.toString() || '').trim().length > 0;
    const isTargetOnCanvas = !!(
      this.canvasContainerRef?.nativeElement.contains(event.target as Node) ||
      document.activeElement === document.body ||
      this.canvasContainerRef?.nativeElement === document.activeElement
    );

    // Select All: Ctrl+A
    if (isCtrl && (event.key === 'a' || event.key === 'A')) {
      if (!hasTextSelection && isTargetOnCanvas) {
        event.preventDefault();
        this.selectAll();
      }
      return;
    }

    // Copy: Ctrl+C
    if (isCtrl && (event.key === 'c' || event.key === 'C')) {
      if (!hasTextSelection && this.selectedElements.length > 0) {
        event.preventDefault();
        this.copySelectedElements();
      }
      return;
    }

    // Paste: Ctrl+V
    if (isCtrl && (event.key === 'v' || event.key === 'V')) {
      if (this.clipboardElements.length > 0 && isTargetOnCanvas) {
        event.preventDefault();
        this.pasteElements();
      }
      return;
    }

    // Duplicate: Ctrl+D
    if (isCtrl && (event.key === 'd' || event.key === 'D')) {
      event.preventDefault();
      this.duplicateSelectedElements();
      return;
    }

    // Save: Ctrl+S
    if (isCtrl && (event.key === 's' || event.key === 'S')) {
      event.preventDefault();
      this.saveTemplate();
      return;
    }

    // Delete / Backspace
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedElements.length > 0) {
        event.preventDefault();
        this.deleteSelectedElements();
      }
      return;
    }

    // Arrow keys movement
    if (this.selectedElements.length > 0) {
      const step = event.shiftKey ? 5 : 1;
      let moved = false;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.selectedElements.forEach(e => {
            if (!e.locked) e.x = Math.max(0, e.x - step);
          });
          moved = true;
          break;

        case 'ArrowRight':
          event.preventDefault();
          this.selectedElements.forEach(e => {
            if (!e.locked) {
              e.x = Math.min(this.currentTemplate.paper.width - e.width, e.x + step);
            }
          });
          moved = true;
          break;

        case 'ArrowUp':
          event.preventDefault();
          this.selectedElements.forEach(e => {
            if (!e.locked) e.y = Math.max(0, e.y - step);
          });
          moved = true;
          break;

        case 'ArrowDown':
          event.preventDefault();
          this.selectedElements.forEach(e => {
            if (!e.locked) {
              e.y = Math.min(this.currentTemplate.paper.height - e.height, e.y + step);
            }
          });
          moved = true;
          break;
      }

      if (moved) {
        this.pushSnapshot();
      }
    }
  }

  // --- ELEMENT VALUE HELPERS FOR CANVAS RENDERING ---

  getTopLabelText(label: string): string {
    return (label || '').replace(/:\s*$/, '');
  }

  getElementDisplayValue(el: JobcardElement): string {
    if (el.type === 'data_field') {
      const data = this.scope === 'device' ? this.previewDeviceData : this.previewShipmentData;
      const raw = el.fieldKey ? data?.[el.fieldKey] : '';
      return this.renderService.formatValue(raw, el.format);
    }
    if (el.type === 'custom_field') {
      return el.defaultValue ? el.defaultValue : '____________________';
    }
    if (el.type === 'static_text') {
      return el.content || '';
    }
    if (el.type === 'print_date') {
      return '19/10/2026 14:30';
    }
    return '';
  }

  // --- NAVIGATION & PREVIEW ---

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty) {
      event.preventDefault();
      event.returnValue = true;
    }
  }

  confirmLeave(): Promise<boolean> {
    if (!this.isDirty) {
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      this.modal.confirm({
        nzTitle: 'Xác nhận rời đi',
        nzContent:
          'Bạn có các thay đổi chưa được lưu trên mẫu in. Bạn có chắc muốn rời khỏi trang thiết kế?',
        nzOkText: 'Rời đi',
        nzOkDanger: true,
        nzCancelText: 'Ở lại',
        nzOnOk: () => {
          this.isDirty = false;
          resolve(true);
        },
        nzOnCancel: () => {
          resolve(false);
        }
      });
    });
  }

  openPreviewModal(): void {
    this.isPreviewModalVisible = true;
  }

  async goBack(): Promise<void> {
    if (this.isDirty) {
      const canLeave = await this.confirmLeave();
      if (canLeave) {
        this.navigateBack();
      }
    } else {
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    if (this.trackingNumber) {
      const qp: any = {};
      if (this.shipmentId) qp.id = this.shipmentId;
      this.router.navigate(['/shipment/detail', this.trackingNumber], { queryParams: qp });
    } else {
      this.location.back();
    }
  }
}
