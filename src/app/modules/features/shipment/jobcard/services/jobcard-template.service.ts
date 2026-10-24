import { Injectable } from '@angular/core';
import {
  JobcardTemplate,
  PaperOrientation,
  PaperPreset,
  PAPER_PRESETS,
  TemplateScope
} from '../models/jobcard.model';

@Injectable({
  providedIn: 'root'
})
export class JobcardTemplateService {
  private readonly STORAGE_KEY = 'jobcard_templates_v1';
  private readonly LAST_USED_KEY = 'jobcard_last_used_template_v1';
  private readonly SEED_VERSION = 9;

  constructor() {
    this.ensureSeedData();
  }

  getTemplates(scope?: TemplateScope): JobcardTemplate[] {
    const all = this.readStorage();
    if (!scope) return all;
    return all.filter(t => t.scope === scope);
  }

  getTemplateById(id: string): JobcardTemplate | undefined {
    return this.readStorage().find(t => t.id === id);
  }

  getDefaultTemplate(scope: TemplateScope): JobcardTemplate {
    const list = this.getTemplates(scope);
    const def = list.find(t => t.isDefault);
    if (def) return def;
    if (list.length > 0) return list[0];
    return this.resetToDefault(scope);
  }

  getLastUsedTemplateId(scope: TemplateScope): string | null {
    try {
      const raw = localStorage.getItem(`${this.LAST_USED_KEY}_${scope}`);
      return raw || null;
    } catch {
      return null;
    }
  }

  setLastUsedTemplateId(scope: TemplateScope, id: string): void {
    try {
      localStorage.setItem(`${this.LAST_USED_KEY}_${scope}`, id);
    } catch (e) {
      console.warn('Failed to save last used template id', e);
    }
  }

  saveTemplate(template: JobcardTemplate): void {
    const list = this.readStorage();
    const idx = list.findIndex(t => t.id === template.id);

    const toSave: JobcardTemplate = {
      ...template,
      updatedAt: Date.now()
    };

    if (toSave.isDefault) {
      list.forEach(t => {
        if (t.scope === toSave.scope && t.id !== toSave.id) {
          t.isDefault = false;
        }
      });
    }

    if (idx >= 0) {
      list[idx] = toSave;
    } else {
      list.push(toSave);
    }

    this.writeStorage(list);
  }

  createTemplate(
    name: string,
    scope: TemplateScope,
    preset: PaperPreset = scope === 'device' ? '50x30' : 'A4',
    orientation?: PaperOrientation
  ): JobcardTemplate {
    const list = this.getTemplates(scope);
    const paperInfo = PAPER_PRESETS[preset] || (scope === 'device' ? PAPER_PRESETS['50x30'] : PAPER_PRESETS['A4']);
    const defaultOrientation: PaperOrientation = orientation || ((preset === 'A7' || preset === '50x30') ? 'landscape' : 'portrait');
    const width = defaultOrientation === 'portrait'
      ? Math.min(paperInfo.width, paperInfo.height)
      : Math.max(paperInfo.width, paperInfo.height);
    const height = defaultOrientation === 'portrait'
      ? Math.max(paperInfo.width, paperInfo.height)
      : Math.min(paperInfo.width, paperInfo.height);
    const margins = preset === '50x30' ? 1 : (preset === 'A7' ? 3 : 8);

    const newTemplate: JobcardTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim() || `Mẫu in ${scope === 'device' ? 'thiết bị' : 'vận đơn'} mới`,
      scope,
      isDefault: list.length === 0,
      paper: {
        preset,
        orientation: defaultOrientation,
        width,
        height,
        marginTop: margins,
        marginRight: margins,
        marginBottom: margins,
        marginLeft: margins
      },
      elements: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.saveTemplate(newTemplate);
    return newTemplate;
  }

  duplicateTemplate(id: string): JobcardTemplate {
    const orig = this.getTemplateById(id);
    if (!orig) {
      throw new Error('Template not found');
    }

    const copy: JobcardTemplate = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${orig.name} (Bản sao)`,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Re-generate element ids
    copy.elements = (copy.elements || []).map((el: any) => ({
      ...el,
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    }));

    this.saveTemplate(copy);
    return copy;
  }

  deleteTemplate(id: string): boolean {
    const list = this.readStorage();
    const target = list.find(t => t.id === id);
    if (!target) return false;

    // Do not allow deleting if it's the only template of its scope
    const sameScope = list.filter(t => t.scope === target.scope);
    if (sameScope.length <= 1) {
      return false;
    }

    const filtered = list.filter(t => t.id !== id);

    // If deleted template was default, make another one default
    if (target.isDefault) {
      const fallback = filtered.find(t => t.scope === target.scope);
      if (fallback) fallback.isDefault = true;
    }

    this.writeStorage(filtered);
    return true;
  }

  setDefaultTemplate(id: string): void {
    const list = this.readStorage();
    const target = list.find(t => t.id === id);
    if (!target) return;

    list.forEach(t => {
      if (t.scope === target.scope) {
        t.isDefault = (t.id === id);
      }
    });

    this.writeStorage(list);
  }

  resetToDefault(scope: TemplateScope): JobcardTemplate {
    const seeded = scope === 'device' ? this.buildDefaultDeviceTemplate() : this.buildDefaultShipmentTemplate();
    const list = this.readStorage();
    const existingIdx = list.findIndex(t => t.id === seeded.id || (t.scope === scope && t.isDefault));

    if (existingIdx >= 0) {
      // Overwrite default
      list[existingIdx] = {
        ...seeded,
        id: list[existingIdx].id,
        name: seeded.name,
        updatedAt: Date.now()
      };
      list.forEach(t => {
        if (t.scope === scope) {
          t.isDefault = (t.id === list[existingIdx].id);
        }
      });
      this.writeStorage(list);
      return list[existingIdx];
    } else {
      this.saveTemplate(seeded);
      return seeded;
    }
  }

  private ensureSeedData(): void {
    try {
      const list = this.readStorage();
      let changed = false;

      const defaultDevIdx = list.findIndex(t => t.id === 'default_device_template');
      if (defaultDevIdx >= 0) {
        const existing = list[defaultDevIdx];
        if (!existing.seedVersion && (existing.paper?.preset === 'A5' || existing.paper?.width === 148)) {
          const notEdited = existing.updatedAt === existing.createdAt;
          if (notEdited) {
            list[defaultDevIdx] = this.buildDefaultDeviceTemplate();
            changed = true;
          } else {
            // Mẫu cũ đã bị sửa: giữ nguyên, đánh dấu đã migrate để không thêm A7 lặp lại mỗi lần load
            existing.seedVersion = this.SEED_VERSION;
            if (!list.some(t => t.id === 'default_device_template_a7')) {
              list.forEach(t => {
                if (t.scope === 'device') t.isDefault = false;
              });
              const newA7 = {
                ...this.buildDefaultDeviceTemplate(),
                id: 'default_device_template_a7',
                isDefault: true
              };
              list.push(newA7);
            }
            changed = true;
          }
        }
      } else {
        const hasDevice = list.some(t => t.scope === 'device');
        if (!hasDevice) {
          list.push(this.buildDefaultDeviceTemplate());
          changed = true;
        }
      }

      // Mẫu A7 hệ thống bản cũ: chưa sửa -> thay bằng bản mới; đã sửa -> giữ nguyên, chỉ chuyển Pin sang nhập tay
      list.forEach((t, idx) => {
        const isSeedDevice = t.id === 'default_device_template' || t.id === 'default_device_template_a7';
        const isOldSeed = isSeedDevice && !!t.seedVersion && t.seedVersion < this.SEED_VERSION;
        if (isOldSeed && t.updatedAt === t.createdAt) {
          list[idx] = { ...this.buildDefaultDeviceTemplate(), id: t.id, isDefault: t.isDefault };
          changed = true;
          return;
        }
        if (this.convertBatteryToCustomField(t)) {
          changed = true;
        }
        if (isOldSeed) {
          t.seedVersion = this.SEED_VERSION;
          changed = true;
        }
      });

      const hasShipment = list.some(t => t.scope === 'shipment');
      if (!hasShipment) {
        list.push(this.buildDefaultShipmentTemplate());
        changed = true;
      }

      if (changed) {
        this.writeStorage(list);
      }
    } catch (e) {
      console.error('Error ensuring seed templates', e);
    }
  }

  private convertBatteryToCustomField(t: JobcardTemplate): boolean {
    let converted = false;
    (t.elements || []).forEach(el => {
      if (el.type === 'data_field' && (el.fieldKey as string) === 'batteryStatus') {
        el.type = 'custom_field';
        el.customKey = 'custom_battery';
        el.label = el.label || 'Pin:';
        el.defaultValue = '';
        delete el.fieldKey;
        delete el.format;
        converted = true;
      }
    });
    return converted;
  }

  private readStorage(): JobcardTemplate[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to read jobcard templates from localStorage', e);
      return [];
    }
  }

  private writeStorage(list: JobcardTemplate[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to write jobcard templates to localStorage', e);
    }
  }

  buildDefaultDeviceTemplate(): JobcardTemplate {
    // Tem nhiệt 50x30mm (203dpi): không lề trái/phải, chữ >= 6pt, toàn bộ màu đen tuyền
    return {
      id: 'default_device_template',
      name: 'Jobcard tem 50x30',
      scope: 'device',
      isDefault: true,
      paper: {
        preset: '50x30',
        orientation: 'landscape',
        width: 50,
        height: 30,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      seedVersion: this.SEED_VERSION,
      elements: [
        // Dải tiêu đề đen + tên máy
        { id: 'el_header_bg', type: 'box', x: 0, y: 0.6, width: 50, height: 5.8, zIndex: 1, backgroundColor: '#000000' },
        { id: 'el_dev_name', type: 'data_field', fieldKey: 'deviceName', label: 'Tên thiết bị', showLabel: false, format: 'uppercase',
          fontWeight: 'bold', fontSize: 8, color: '#ffffff', x: 1.2, y: 1.4, width: 35.6, height: 4.4, zIndex: 2,
          expandWhenHidden: { elementId: 'el_rentino_type', width: 47.6 } },
        // Loại Rentino (góc phải dải đen): chỉ in khi bật trong hộp thoại in, chỉ hiện loại thật khi đã gửi VCM
        { id: 'el_rentino_type', type: 'data_field', fieldKey: 'finalSummary', format: 'accessory_type', label: 'Loại Rentino', showLabel: false,
          fontWeight: 'bold', fontSize: 8, color: '#ffffff', textAlign: 'right', x: 37, y: 1.4, width: 11.8, height: 4.4, zIndex: 2,
          showWhenStatus: 'sent_vcm', placeholderText: 'Loại ....', printToggleKey: 'rentino_type' },
        // IMEI
        { id: 'el_imei', type: 'data_field', fieldKey: 'imei', label: 'IMEI', showLabel: true, labelWidth: 8.5,
          fontWeight: 'bold', fontSize: 8.5, color: '#000000', x: 1.2, y: 7, width: 47.6, height: 4.6, zIndex: 2 },
        { id: 'el_line_1', type: 'line', lineOrientation: 'horizontal', lineThickness: 0.75, color: '#000000', x: 0, y: 11.4, width: 50, height: 1, zIndex: 2 },
        // Lưới 2 cột: ROM | RAM (Android), Màu | Pin, BH | Sạc
        { id: 'el_storage', type: 'data_field', fieldKey: 'storage', label: 'ROM', showLabel: true, labelWidth: 7.5,
          fontWeight: 'bold', fontSize: 7, color: '#000000', x: 1.2, y: 12.6, width: 23, height: 4.2, zIndex: 2 },
        { id: 'el_ram', type: 'data_field', fieldKey: 'totalRam', label: 'RAM', showLabel: true, labelWidth: 7.5,
          visibleWhen: 'android', fontWeight: 'bold', fontSize: 7, color: '#000000', x: 25.6, y: 12.6, width: 23.2, height: 4.2, zIndex: 2 },
        { id: 'el_color', type: 'custom_field', customKey: 'custom_color', label: 'Màu', defaultValue: '', labelWidth: 7.5,
          fontWeight: 'bold', fontSize: 7, color: '#000000', x: 1.2, y: 16.9, width: 23, height: 4.2, zIndex: 2 },
        { id: 'el_battery', type: 'custom_field', customKey: 'custom_battery', label: 'Pin', defaultValue: '', labelWidth: 7.5,
          fontWeight: 'bold', fontSize: 7, color: '#000000', x: 25.6, y: 16.9, width: 23.2, height: 4.2, zIndex: 2 },
        { id: 'el_warranty', type: 'custom_field', customKey: 'custom_warranty', label: 'BH', defaultValue: '', labelWidth: 5,
          fontWeight: 'bold', fontSize: 7, color: '#000000', x: 1.2, y: 21.2, width: 23, height: 4.2, zIndex: 2 },
        { id: 'el_charge', type: 'custom_field', customKey: 'custom_charge', label: 'Sạc', defaultValue: '', labelWidth: 7.5,
          fontWeight: 'bold', fontSize: 7, color: '#000000', x: 25.6, y: 21.2, width: 23.2, height: 4.2, zIndex: 2 },
        { id: 'el_vline_1', type: 'line', lineOrientation: 'vertical', lineThickness: 0.5, color: '#000000',
          x: 24.8, y: 11.9, width: 1, height: 13.8, zIndex: 2 },
        { id: 'el_line_2', type: 'line', lineOrientation: 'horizontal', lineThickness: 0.75, color: '#000000', x: 0, y: 25.2, width: 50, height: 1, zIndex: 2 },
        // Chân tem: mã vận đơn + ngày in
        { id: 'el_tracking', type: 'data_field', fieldKey: 'trackingNumber', label: 'VĐ:', showLabel: true,
          fontSize: 6, color: '#000000', x: 1.2, y: 26.2, width: 31, height: 3.2, zIndex: 2 },
        { id: 'el_print_date', type: 'print_date', label: 'In:', showLabel: false, dateFormat: 'dd/MM/yyyy',
          fontSize: 6, fontWeight: 'bold', color: '#000000', textAlign: 'right', x: 31.5, y: 26.2, width: 17.3, height: 3.2, zIndex: 2 }
      ]
    };
  }

  buildDefaultShipmentTemplate(): JobcardTemplate {
    return {
      id: 'default_shipment_template',
      name: 'Mẫu biên bản vận đơn chuẩn (A4)',
      scope: 'shipment',
      isDefault: true,
      paper: {
        preset: 'A4',
        orientation: 'portrait',
        width: 210,
        height: 297,
        marginTop: 10,
        marginRight: 10,
        marginBottom: 10,
        marginLeft: 10
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      elements: [
        // Title
        {
          id: 'el_s_title',
          type: 'static_text',
          x: 10,
          y: 10,
          width: 190,
          height: 9,
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#1890ff',
          content: 'PHIẾU GIAO NHẬN THIẾT BỊ VẬN ĐƠN'
        },
        // Subtitle
        {
          id: 'el_s_sub',
          type: 'static_text',
          x: 10,
          y: 19,
          width: 190,
          height: 5,
          fontSize: 9,
          fontStyle: 'italic',
          textAlign: 'center',
          color: '#666666',
          content: 'HỆ THỐNG QUẢN LÝ THU ĐỔI RENTINO SWAP - BIÊN BẢN BÀN GIAO'
        },
        // Line top
        {
          id: 'el_s_line1',
          type: 'line',
          x: 10,
          y: 26,
          width: 190,
          height: 1,
          lineOrientation: 'horizontal',
          lineThickness: 1,
          color: '#1890ff'
        },
        // Shipment info box
        {
          id: 'el_s_box_info',
          type: 'box',
          x: 10,
          y: 29,
          width: 190,
          height: 33,
          border: true,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: '#d9d9d9',
          borderRadius: 2,
          backgroundColor: '#fafafa'
        },
        {
          id: 'el_s_hdr_info',
          type: 'static_text',
          x: 15,
          y: 31,
          width: 80,
          height: 5,
          fontSize: 10,
          fontWeight: 'bold',
          color: '#262626',
          content: 'THÔNG TIN VẬN ĐƠN'
        },
        {
          id: 'el_sf_tracking',
          type: 'data_field',
          fieldKey: 'trackingNumber',
          label: 'Mã vận đơn:',
          showLabel: true,
          fontWeight: 'bold',
          fontSize: 10,
          x: 15,
          y: 37,
          width: 60,
          height: 5
        },
        {
          id: 'el_sf_status',
          type: 'data_field',
          fieldKey: 'status',
          label: 'Trạng thái:',
          showLabel: true,
          format: 'status',
          fontSize: 9,
          x: 80,
          y: 37,
          width: 55,
          height: 5
        },
        {
          id: 'el_sf_carrier',
          type: 'data_field',
          fieldKey: 'carrierCode',
          label: 'ĐVVC:',
          showLabel: true,
          fontSize: 9,
          x: 140,
          y: 37,
          width: 55,
          height: 5
        },
        {
          id: 'el_sf_sender',
          type: 'data_field',
          fieldKey: 'senderName',
          label: 'Người gửi:',
          showLabel: true,
          fontSize: 9,
          x: 15,
          y: 44,
          width: 60,
          height: 5
        },
        {
          id: 'el_sf_receiver',
          type: 'data_field',
          fieldKey: 'receiverName',
          label: 'Người nhận:',
          showLabel: true,
          fontSize: 9,
          x: 80,
          y: 44,
          width: 55,
          height: 5
        },
        {
          id: 'el_sf_phone',
          type: 'data_field',
          fieldKey: 'receiverPhone',
          label: 'SĐT nhận:',
          showLabel: true,
          fontSize: 9,
          x: 140,
          y: 44,
          width: 55,
          height: 5
        },
        {
          id: 'el_sf_addr',
          type: 'data_field',
          fieldKey: 'receiverAddress',
          label: 'Địa chỉ nhận:',
          showLabel: true,
          fontSize: 9,
          x: 15,
          y: 51,
          width: 120,
          height: 6
        },
        {
          id: 'el_sf_total',
          type: 'data_field',
          fieldKey: 'total',
          label: 'Tổng thiết bị:',
          showLabel: true,
          fontWeight: 'bold',
          fontSize: 10,
          color: '#cf1322',
          x: 140,
          y: 51,
          width: 55,
          height: 6
        },
        // Table section title
        {
          id: 'el_s_hdr_tbl',
          type: 'static_text',
          x: 10,
          y: 65,
          width: 100,
          height: 5,
          fontSize: 10,
          fontWeight: 'bold',
          content: 'DANH SÁCH THIẾT BỊ BÀN GIAO'
        },
        // Device Table
        {
          id: 'el_s_table',
          type: 'table',
          x: 10,
          y: 71,
          width: 190,
          height: 135,
          fontSize: 8,
          tableRowHeight: 6,
          tableHeaderBg: '#f0f0f0',
          tableColumns: [
            { key: 'index', title: 'STT', widthPercent: 6, visible: true },
            { key: 'deviceName', title: 'Tên thiết bị', widthPercent: 24, format: 'text', visible: true },
            { key: 'imei', title: 'Số IMEI', widthPercent: 18, format: 'text', visible: true },
            { key: 'model', title: 'Model', widthPercent: 12, format: 'text', visible: true },
            { key: 'storage', title: 'Dung lượng', widthPercent: 10, format: 'text', visible: true },
            { key: 'finalSummary', title: 'Loại', widthPercent: 10, format: 'accessory_type', visible: true },
            { key: 'price', title: 'Giá bán', widthPercent: 10, format: 'currency', visible: true },
            { key: 'status', title: 'Trạng thái', widthPercent: 10, format: 'status', visible: true }
          ]
        },
        // Notes & Sign-off box
        {
          id: 'el_s_box_sign',
          type: 'box',
          x: 10,
          y: 210,
          width: 190,
          height: 70,
          border: true,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: '#d9d9d9',
          borderRadius: 2
        },
        {
          id: 'el_sc_notes',
          type: 'custom_field',
          customKey: 'custom_shipment_notes',
          label: 'Ghi chú bàn giao:',
          defaultValue: '',
          fontSize: 9,
          x: 15,
          y: 213,
          width: 180,
          height: 8
        },
        {
          id: 'el_sc_creator',
          type: 'custom_field',
          customKey: 'custom_creator',
          label: 'Người lập phiếu:',
          defaultValue: '',
          fontSize: 9,
          x: 15,
          y: 222,
          width: 85,
          height: 6
        },
        {
          id: 'el_sc_receiver',
          type: 'custom_field',
          customKey: 'custom_receiver',
          label: 'Người nhận hàng:',
          defaultValue: '',
          fontSize: 9,
          x: 105,
          y: 222,
          width: 85,
          height: 6
        },
        {
          id: 'el_ss_sign1',
          type: 'static_text',
          x: 25,
          y: 232,
          width: 65,
          height: 18,
          fontSize: 9,
          textAlign: 'center',
          content: 'Người giao / Lập phiếu\n(Ký và ghi rõ họ tên)'
        },
        {
          id: 'el_ss_sign2',
          type: 'static_text',
          x: 120,
          y: 232,
          width: 65,
          height: 18,
          fontSize: 9,
          textAlign: 'center',
          content: 'Người nhận hàng\n(Ký và ghi rõ họ tên)'
        },
        // Footer print date
        {
          id: 'el_s_date',
          type: 'print_date',
          label: 'Ngày in:',
          showLabel: true,
          dateFormat: 'dd/MM/yyyy HH:mm',
          fontSize: 8,
          fontStyle: 'italic',
          color: '#888888',
          x: 10,
          y: 284,
          width: 190,
          height: 5
        }
      ]
    };
  }
}
