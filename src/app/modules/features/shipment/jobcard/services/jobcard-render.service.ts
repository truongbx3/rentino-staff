import { Injectable } from '@angular/core';
import {
  getDeviceOs,
  getEffectiveWidth,
  getPrintableElements,
  JobcardElement,
  JobcardTemplate,
  PrintToggles,
  resolveDisplayValue,
  TableColumnDef,
  ValueFormat
} from '../models/jobcard.model';
import { accessoryOptions } from '../../../device-check/configs/device.check.constant';

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable({
  providedIn: 'root'
})
export class JobcardRenderService {
  private readonly accessoryMap: Record<string, string> = {
    'LOAI_1': 'Loại 1',
    'LOAI_2': 'Loại 2',
    'LOAI_3': 'Loại 3',
    'LOAI_4': 'Loại 4',
    'LOAI_5': 'Loại 5',
    'LOAI_6': 'Loại 6'
  };

  private readonly deviceStatusMap: Record<string, string> = {
    'processing': 'Đang xử lý',
    'wait_approve': 'Chờ phê duyệt',
    'cust_approve': 'Khách hàng duyệt',
    'approve': 'Đã phê duyệt',
    'vcm_approve': 'VCM duyệt',
    'checking': 'Đang kiểm tra',
    'verified': 'Đã xác thực',
    'sent_vcm': 'Đã gửi VCM',
    'reject': 'Từ chối',
    'cancel': 'Đã hủy',
    'disbursed': 'Đã giải ngân'
  };

  private readonly shipmentStatusMap: Record<string, string> = {
    'sent': 'Đã gửi',
    'received': 'Đã nhận',
    'cancel': 'Đã hủy'
  };

  constructor() {
    // Populate from accessoryOptions if available
    try {
      accessoryOptions.forEach(opt => {
        if (opt.value && opt.label) {
          this.accessoryMap[opt.value] = opt.label;
        }
      });
    } catch (e) {
      // ignore
    }
  }

  formatValue(value: any, format?: ValueFormat): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    switch (format) {
      case 'currency': {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
      }
      case 'datetime': {
        return this.formatDate(value, true);
      }
      case 'date': {
        return this.formatDate(value, false);
      }
      case 'accessory_type': {
        return this.accessoryMap[value] || String(value);
      }
      case 'status': {
        return this.deviceStatusMap[value] || this.shipmentStatusMap[value] || String(value);
      }
      case 'uppercase':
        return String(value).toUpperCase();
      case 'text':
      default:
        return String(value);
    }
  }

  private formatDate(val: any, includeTime: boolean = true): string {
    let date: Date;
    if (val instanceof Date) {
      date = val;
    } else if (typeof val === 'number') {
      date = new Date(val);
    } else if (typeof val === 'string') {
      const num = Number(val);
      date = !isNaN(num) ? new Date(num) : new Date(val);
    } else {
      return '—';
    }

    if (isNaN(date.getTime())) return String(val);

    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();

    if (!includeTime) {
      return `${day}/${month}/${year}`;
    }

    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Generates single page HTML content
   */
  renderSinglePage(
    template: JobcardTemplate,
    data: any,
    customFieldValues: Record<string, string> = {},
    devicesListForTable: any[] = [],
    toggles: PrintToggles = {}
  ): string {
    const os = getDeviceOs(data);
    const sortedElements = getPrintableElements(template.elements, os, toggles)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const elementsHtml = sortedElements.map(el => {
      return this.renderElement(el, template, data, customFieldValues, devicesListForTable, getEffectiveWidth(el, template.elements, os, toggles));
    }).join('\n');

    return `
      <div class="jobcard-page" style="
        position: relative;
        width: ${template.paper.width}mm;
        height: ${template.paper.height}mm;
        box-sizing: border-box;
        overflow: hidden;
        background: #ffffff;
      ">
        ${elementsHtml}
      </div>
    `;
  }

  /** Nhãn nhỏ in hoa nằm trên giá trị (labelPosition = 'top') */
  private renderTopLabel(label: string): string {
    const text = escapeHtml(label.replace(/:\s*$/, ''));
    // In nhiệt: nhãn phải đủ lớn và màu đen tuyền, màu xám sẽ bị nhạt/mất khi in
    return `<div class="field-label" style="font-size: 7pt; font-weight: bold; font-style: normal; color: #000000; text-transform: uppercase; letter-spacing: 0.3pt; line-height: 1.15; margin-bottom: 0.4mm;">${text}</div>`;
  }

  /**
   * Renders an individual element into absolute HTML
   */
  private renderElement(
    el: JobcardElement,
    template: JobcardTemplate,
    data: any,
    customFieldValues: Record<string, string>,
    devicesListForTable: any[],
    width: number = el.width
  ): string {
    const styleParts: string[] = [
      'position: absolute',
      `left: ${el.x}mm`,
      `top: ${el.y}mm`,
      `width: ${width}mm`,
      `height: ${el.height}mm`,
      'box-sizing: border-box',
      'overflow: hidden',
      'word-break: break-word'
    ];

    if (el.zIndex) styleParts.push(`z-index: ${el.zIndex}`);
    if (el.fontSize) styleParts.push(`font-size: ${el.fontSize}pt`);
    if (el.fontWeight) styleParts.push(`font-weight: ${el.fontWeight}`);
    if (el.fontStyle) styleParts.push(`font-style: ${el.fontStyle}`);
    if (el.textDecoration) styleParts.push(`text-decoration: ${el.textDecoration}`);
    if (el.textAlign) styleParts.push(`text-align: ${el.textAlign}`);
    if (el.color) styleParts.push(`color: ${el.color}`);
    if (el.backgroundColor) styleParts.push(`background-color: ${el.backgroundColor}`);

    if (el.border) {
      const bw = el.borderWidth ? `${el.borderWidth}pt` : '1px';
      const bs = el.borderStyle || 'solid';
      const bc = el.borderColor || '#000000';
      styleParts.push(`border: ${bw} ${bs} ${bc}`);
      if (el.borderRadius) styleParts.push(`border-radius: ${el.borderRadius}mm`);
    }

    const inlineStyle = styleParts.join('; ');

    let contentHtml = '';

    switch (el.type) {
      case 'data_field': {
        const formattedVal = resolveDisplayValue(el, data, (v, f) => this.formatValue(v, f));
        if (el.labelPosition === 'top') {
          const topLabel = el.showLabel && el.label ? this.renderTopLabel(el.label) : '';
          contentHtml = `${topLabel}<div class="field-value" style="line-height: 1.2;">${escapeHtml(formattedVal)}</div>`;
          break;
        }
        const labelWidthStyle = el.labelWidth && el.labelWidth > 0
          ? `display: inline-block; width: ${el.labelWidth}mm; min-width: ${el.labelWidth}mm; vertical-align: top;`
          : '';
        const labelHtml = el.showLabel && el.label
          ? `<span class="field-label" style="font-weight: bold; margin-right: 4px; ${labelWidthStyle}">${escapeHtml(el.label)}</span>`
          : '';
        contentHtml = `${labelHtml}<span class="field-value">${escapeHtml(formattedVal)}</span>`;
        break;
      }

      case 'static_text': {
        const text = el.content || '';
        contentHtml = escapeHtml(text).replace(/\n/g, '<br/>');
        break;
      }

      case 'custom_field': {
        const key = el.customKey || el.id;
        const val = customFieldValues[key] !== undefined ? customFieldValues[key] : (el.defaultValue || '');
        if (el.labelPosition === 'top') {
          const topLabel = el.label ? this.renderTopLabel(el.label) : '';
          const valueHtml = val && val.trim().length > 0
            ? `<div style="line-height: 1.2;">${escapeHtml(val)}</div>`
            : `<div style="height: 1.2em; border-bottom: 0.75pt dotted #000;"></div>`;
          contentHtml = `${topLabel}${valueHtml}`;
          break;
        }
        const labelText = el.label ? `${escapeHtml(el.label)} ` : '';
        const labelWidthStyle = el.labelWidth && el.labelWidth > 0
          ? `display: inline-block; width: ${el.labelWidth}mm; min-width: ${el.labelWidth}mm; vertical-align: top;`
          : '';
        const labelHtml = el.label
          ? `<span style="font-weight: bold; margin-right: 4px; ${labelWidthStyle}">${labelText}</span>`
          : '';

        if (val && val.trim().length > 0) {
          contentHtml = `${labelHtml}<span>${escapeHtml(val)}</span>`;
        } else {
          // If empty, print label + blank handwriting line
          // Dòng chấm co giãn lấp phần còn lại của ô (không cố định 50mm để khỏi bị đẩy xuống dòng rồi bị cắt)
          contentHtml = `<div style="display: flex; align-items: flex-end;">${labelHtml.replace('<span style="', '<span style="flex-shrink: 0; ')}<span class="handwriting-line" style="flex: 1; min-width: 8mm; border-bottom: 0.75pt dotted #000; height: 1.15em;"></span></div>`;
        }
        break;
      }

      case 'line': {
        const thickness = el.lineThickness || 1;
        const color = el.color || '#000000';
        const isVert = el.lineOrientation === 'vertical';

        if (isVert) {
          contentHtml = `<div style="width: 0; height: 100%; border-left: ${thickness}pt solid ${color};"></div>`;
        } else {
          contentHtml = `<div style="width: 100%; height: 0; border-top: ${thickness}pt solid ${color}; margin-top: ${Math.max(0, (el.height * 3.78) / 2)}px;"></div>`;
        }
        break;
      }

      case 'box': {
        // Pure container box, border & background handled by styles
        contentHtml = '';
        break;
      }

      case 'table': {
        const cols: TableColumnDef[] = (el.tableColumns || []).filter(c => c.visible !== false);
        const devices = devicesListForTable || [];
        const headerBg = el.tableHeaderBg || '#f2f2f2';
        const rowHeight = el.tableRowHeight ? `${el.tableRowHeight}mm` : 'auto';

        const ths = cols.map(c => {
          const w = c.widthPercent ? `width="${c.widthPercent}%"` : '';
          return `<th ${w} style="border: 1px solid #333; padding: 3px 5px; background-color: ${headerBg}; font-weight: bold; text-align: center;">${escapeHtml(c.title)}</th>`;
        }).join('');

        const trs = devices.map((d, index) => {
          const tds = cols.map(c => {
            let cellVal = '';
            if (c.key === 'index') {
              cellVal = String(index + 1);
            } else {
              cellVal = this.formatValue(d?.[c.key], c.format);
            }
            const align = (c.key === 'index' || c.key === 'finalSummary' || c.key === 'status') ? 'center' : (c.format === 'currency' ? 'right' : 'left');
            return `<td style="border: 1px solid #333; padding: 2px 4px; text-align: ${align};">${escapeHtml(cellVal)}</td>`;
          }).join('');

          return `<tr style="height: ${rowHeight};">${tds}</tr>`;
        }).join('');

        contentHtml = `
          <table class="jobcard-table" style="width: 100%; border-collapse: collapse; font-size: inherit; border: 1px solid #333;">
            <thead><tr>${ths}</tr></thead>
            <tbody>
              ${trs.length > 0 ? trs : `<tr><td colspan="${cols.length}" style="text-align: center; padding: 8px;">Không có thiết bị nào</td></tr>`}
            </tbody>
          </table>
        `;
        break;
      }

      case 'print_date': {
        const now = new Date();
        const dateStr = this.formatDate(now, el.dateFormat !== 'dd/MM/yyyy');
        const label = el.showLabel !== false && el.label ? `${escapeHtml(el.label)} ` : '';
        contentHtml = `${label}${escapeHtml(dateStr)}`;
        break;
      }

      default:
        contentHtml = '';
    }

    return `<div id="${el.id}" style="${inlineStyle}">${contentHtml}</div>`;
  }

  /**
   * Generates the entire standalone HTML document for printing
   */
  generatePrintHtml(
    template: JobcardTemplate,
    pagesData: any[],
    customFieldValues: Record<string, string> | Record<string, string>[] = {},
    devicesListForTable: any[] = [],
    toggles: PrintToggles = {}
  ): string {
    const isArray = Array.isArray(customFieldValues);
    const pagesHtml = pagesData.map((data, index) => {
      const pageCustomVals = isArray
        ? (customFieldValues as Record<string, string>[])[index] || {}
        : (customFieldValues as Record<string, string>);
      return this.renderSinglePage(template, data, pageCustomVals, devicesListForTable, toggles);
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(template.name)}</title>
  <style>
    @page {
      size: ${template.paper.width}mm ${template.paper.height}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    }
    .jobcard-page {
      position: relative;
      width: ${template.paper.width}mm;
      height: ${template.paper.height}mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      box-sizing: border-box;
      background: #ffffff;
    }
    .jobcard-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .handwriting-line {
      display: inline-block;
      border-bottom: 1px dotted #222;
      min-width: 50mm;
      height: 1.2em;
      vertical-align: bottom;
    }
    table.jobcard-table {
      width: 100%;
      border-collapse: collapse;
      font-size: inherit;
    }
    table.jobcard-table th, table.jobcard-table td {
      border: 1px solid #333;
      padding: 2px 4px;
      vertical-align: middle;
      word-break: break-word;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  }

  /**
   * Triggers printing via a hidden iframe
   */
  print(
    template: JobcardTemplate,
    pagesData: any[],
    customFieldValues: Record<string, string> | Record<string, string>[] = {},
    devicesListForTable: any[] = [],
    toggles: PrintToggles = {}
  ): Promise<boolean> {
    return this.printHtmlDocument(this.generatePrintHtml(template, pagesData, customFieldValues, devicesListForTable, toggles));
  }

  /**
   * In các trang đã raster sẵn (ảnh đen trắng đúng DPI máy in nhiệt).
   * Mỗi ảnh được ép đúng kích thước mm của tem, image-rendering: pixelated để driver nhận 1 pixel = 1 điểm in.
   */
  printRasterPages(widthMm: number, heightMm: number, dataUrls: string[], title = 'Jobcard'): Promise<boolean> {
    const pages = dataUrls
      .map(src => `<img class="raster-page" src="${src}" alt="">`)
      .join('\n');
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    .raster-page {
      display: block;
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      page-break-after: always;
      break-after: page;
    }
    .raster-page:last-child { page-break-after: auto; break-after: auto; }
  </style>
</head>
<body>
  ${pages}
</body>
</html>`;
    return this.printHtmlDocument(html);
  }

  printHtmlDocument(html: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Remove existing print iframe if any
        const existingIframe = document.getElementById('jobcard_print_iframe');
        if (existingIframe && existingIframe.parentNode) {
          existingIframe.parentNode.removeChild(existingIframe);
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'jobcard_print_iframe';
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '10px';
        iframe.style.height = '10px';
        iframe.style.border = 'none';

        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!doc) {
          console.error('Failed to get iframe document');
          resolve(false);
          return;
        }

        doc.open();
        doc.write(html);
        doc.close();

        // Chờ style/font và toàn bộ ảnh (trang raster) tải xong, tối đa ~3s
        const startedAt = Date.now();
        const waitReady = (cb: () => void) => {
          const imgs = Array.from(doc.images || []);
          const allLoaded = imgs.every(img => img.complete);
          if (allLoaded || Date.now() - startedAt > 3000) {
            setTimeout(cb, 200);
          } else {
            setTimeout(() => waitReady(cb), 50);
          }
        };
        waitReady(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();

            // Cleanup after print dialog closes or after timeout
            const cleanup = () => {
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            };

            if (iframe.contentWindow) {
              iframe.contentWindow.onafterprint = cleanup;
            }
            setTimeout(cleanup, 60000); // fallback cleanup
            resolve(true);
          } catch (err) {
            console.error('Print execution error', err);
            resolve(false);
          }
        });
      } catch (err) {
        console.error('Failed to trigger print', err);
        resolve(false);
      }
    });
  }
}
