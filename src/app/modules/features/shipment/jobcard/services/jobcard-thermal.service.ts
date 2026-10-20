import { Injectable } from '@angular/core';
import { getDeviceOs, JobcardElement, JobcardTemplate } from '../models/jobcard.model';
import { JobcardRenderService } from './jobcard-render.service';

/**
 * Vẽ jobcard thành ảnh đen trắng thuần (1-bit) đúng độ phân giải của máy in nhiệt.
 *
 * Lý do: in HTML trực tiếp thì trình duyệt khử răng cưa chữ (viền xám), driver máy in nhiệt
 * 203dpi phải dither các pixel xám đó -> chữ nhỏ bị nhoè/vỡ, mảng đen bị sọc.
 * Vẽ sẵn ở đúng DPI rồi ngưỡng hoá đen/trắng thì mỗi pixel = 1 điểm in -> nét nhất có thể.
 */
@Injectable({
  providedIn: 'root'
})
export class JobcardThermalService {
  private readonly FONT_FAMILY = 'Arial, "Segoe UI", Helvetica, sans-serif';
  private readonly LABEL_GAP_MM = 1.06; // khớp margin-right: 4px của nhãn bản HTML
  private readonly THRESHOLD = 150;     // luminance < ngưỡng -> đen

  constructor(private renderService: JobcardRenderService) {}

  /** Bảng (danh sách thiết bị) chưa hỗ trợ raster -> mẫu có bảng dùng chế độ in HTML. */
  supports(template: JobcardTemplate | null): boolean {
    return !!template && !(template.elements || []).some(el => el.type === 'table');
  }

  renderPage(
    template: JobcardTemplate,
    data: any,
    customFieldValues: Record<string, string> = {},
    dpi = 203
  ): string {
    const dotsPerMm = dpi / 25.4;
    const widthDots = Math.round(template.paper.width * dotsPerMm);
    const heightDots = Math.round(template.paper.height * dotsPerMm);

    const canvas = document.createElement('canvas');
    canvas.width = widthDots;
    canvas.height = heightDots;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthDots, heightDots);

    const os = getDeviceOs(data);
    const elements = [...(template.elements || [])]
      .filter(el => !el.visibleWhen || el.visibleWhen === 'always' || el.visibleWhen === os)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const px = (mm: number) => mm * dotsPerMm;
    const ptToDots = (pt: number) => (pt * dpi) / 72;

    elements.forEach(el => {
      ctx.save();
      const x = Math.round(px(el.x));
      const y = Math.round(px(el.y));
      const w = Math.round(px(el.width));
      const h = Math.round(px(el.height));

      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      this.drawBackgroundAndBorder(ctx, el, x, y, w, h, ptToDots, px);

      switch (el.type) {
        case 'box':
          break;
        case 'line':
          this.drawLine(ctx, el, x, y, w, h, ptToDots);
          break;
        case 'data_field': {
          const raw = el.fieldKey ? data?.[el.fieldKey] : '';
          const value = this.renderService.formatValue(raw, el.format);
          const label = el.showLabel && el.label ? el.label : '';
          this.drawField(ctx, el, label, value, false, x, y, w, ptToDots, px);
          break;
        }
        case 'custom_field': {
          const key = el.customKey || el.id;
          const val = customFieldValues[key] !== undefined ? customFieldValues[key] : (el.defaultValue || '');
          const isEmpty = !val || !val.trim();
          this.drawField(ctx, el, el.label || '', isEmpty ? '' : val, isEmpty, x, y, w, ptToDots, px);
          break;
        }
        case 'static_text':
          this.drawParagraph(ctx, el, el.content || '', x, y, w, ptToDots);
          break;
        case 'print_date': {
          const label = el.showLabel !== false && el.label ? `${el.label} ` : '';
          const text = label + this.formatNow(el.dateFormat !== 'dd/MM/yyyy');
          this.drawParagraph(ctx, el, text, x, y, w, ptToDots);
          break;
        }
      }
      ctx.restore();
    });

    this.binarize(ctx, widthDots, heightDots);
    return canvas.toDataURL('image/png');
  }

  // ---------------------------------------------------------------------------

  private drawBackgroundAndBorder(
    ctx: CanvasRenderingContext2D, el: JobcardElement,
    x: number, y: number, w: number, h: number,
    ptToDots: (pt: number) => number, px: (mm: number) => number
  ): void {
    const radius = el.borderRadius ? Math.round(px(el.borderRadius)) : 0;
    if (el.backgroundColor && el.backgroundColor !== 'transparent') {
      ctx.fillStyle = el.backgroundColor;
      this.roundRectPath(ctx, x, y, w, h, radius);
      ctx.fill();
    }
    if (el.border) {
      const bw = Math.max(1, Math.round(el.borderWidth ? ptToDots(el.borderWidth) : 1));
      ctx.strokeStyle = el.borderColor || '#000000';
      ctx.lineWidth = bw;
      ctx.setLineDash(el.borderStyle === 'dashed' ? [bw * 3, bw * 2] : el.borderStyle === 'dotted' ? [bw, bw * 1.5] : []);
      // box-sizing: border-box -> viền nằm bên trong khung
      this.roundRectPath(ctx, x + bw / 2, y + bw / 2, w - bw, h - bw, radius);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawLine(
    ctx: CanvasRenderingContext2D, el: JobcardElement,
    x: number, y: number, w: number, h: number, ptToDots: (pt: number) => number
  ): void {
    const t = Math.max(1, Math.round(ptToDots(el.lineThickness || 1)));
    ctx.fillStyle = el.color || '#000000';
    if (el.lineOrientation === 'vertical') {
      ctx.fillRect(x, y, t, h);
    } else {
      // bản HTML đặt đường kẻ ngang ở giữa chiều cao phần tử
      ctx.fillRect(x, Math.round(y + h / 2), w, t);
    }
  }

  /** Trường có nhãn: inline (cùng dòng, có labelWidth) hoặc top (nhãn nhỏ in hoa nằm trên). */
  private drawField(
    ctx: CanvasRenderingContext2D, el: JobcardElement,
    label: string, value: string, handwriting: boolean,
    x: number, y: number, w: number,
    ptToDots: (pt: number) => number, px: (mm: number) => number
  ): void {
    const fontPx = ptToDots(el.fontSize || 10);
    const valueFont = this.font(el.fontWeight === 'bold', el.fontStyle === 'italic', fontPx);
    const color = el.color || '#000000';
    ctx.textBaseline = 'alphabetic';

    if (el.labelPosition === 'top') {
      let cursorY = y;
      if (label) {
        const labelPx = ptToDots(7);
        ctx.font = this.font(true, false, labelPx);
        ctx.fillStyle = '#000000';
        const labelLineH = labelPx * 1.15;
        ctx.fillText(label.replace(/:\s*$/, '').toUpperCase(), x, Math.round(cursorY + labelPx * 0.95));
        cursorY += labelLineH + px(0.4);
      }
      const lineH = fontPx * 1.2;
      if (handwriting) {
        this.drawDottedLine(ctx, x, Math.round(cursorY + lineH), w, ptToDots);
        return;
      }
      ctx.font = valueFont;
      ctx.fillStyle = color;
      this.wrap(ctx, value, w).forEach((line, i) => {
        this.fillAligned(ctx, line, el, x, w, Math.round(cursorY + fontPx * 0.95 + i * lineH));
      });
      return;
    }

    // Inline: nhãn đậm, rồi giá trị (cột giá trị bắt đầu sau labelWidth nếu có)
    const lineH = fontPx * 1.2;
    const baseline = Math.round(y + fontPx * 0.95);
    let valueX = x;
    if (label) {
      ctx.font = this.font(true, el.fontStyle === 'italic', fontPx);
      ctx.fillStyle = color;
      ctx.fillText(label, x, baseline);
      const labelW = el.labelWidth && el.labelWidth > 0 ? px(el.labelWidth) : ctx.measureText(label).width;
      valueX = Math.round(x + labelW + px(this.LABEL_GAP_MM));
    }
    const valueW = Math.max(1, x + w - valueX);
    if (handwriting) {
      this.drawDottedLine(ctx, valueX, Math.round(y + lineH), valueW, ptToDots);
      return;
    }
    ctx.font = valueFont;
    ctx.fillStyle = color;
    this.wrap(ctx, value, valueW).forEach((line, i) => {
      this.fillAligned(ctx, line, el, valueX, valueW, baseline + Math.round(i * lineH));
    });
  }

  private drawParagraph(
    ctx: CanvasRenderingContext2D, el: JobcardElement, text: string,
    x: number, y: number, w: number, ptToDots: (pt: number) => number
  ): void {
    const fontPx = ptToDots(el.fontSize || 10);
    ctx.font = this.font(el.fontWeight === 'bold', el.fontStyle === 'italic', fontPx);
    ctx.fillStyle = el.color || '#000000';
    ctx.textBaseline = 'alphabetic';
    const lineH = fontPx * 1.2;
    const lines: string[] = [];
    text.split('\n').forEach(p => lines.push(...this.wrap(ctx, p, w)));
    lines.forEach((line, i) => {
      this.fillAligned(ctx, line, el, x, w, Math.round(y + fontPx * 0.95 + i * lineH));
    });
  }

  private fillAligned(ctx: CanvasRenderingContext2D, text: string, el: JobcardElement, x: number, w: number, baseline: number): void {
    const tw = ctx.measureText(text).width;
    let tx = x;
    if (el.textAlign === 'center') tx = x + (w - tw) / 2;
    else if (el.textAlign === 'right') tx = x + w - tw;
    ctx.fillText(text, Math.round(tx), baseline);
    if (el.textDecoration === 'underline') {
      const t = Math.max(1, Math.round(parseFloat(ctx.font) / 14));
      ctx.fillRect(Math.round(tx), baseline + t, Math.round(tw), t);
    }
  }

  private drawDottedLine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ptToDots: (pt: number) => number): void {
    const t = Math.max(1, Math.round(ptToDots(0.75)));
    ctx.fillStyle = '#000000';
    for (let dx = 0; dx < w; dx += t * 2.5) {
      ctx.fillRect(Math.round(x + dx), y - t, t, t);
    }
  }

  /** Xuống dòng theo từ, từ quá dài thì bẻ theo ký tự (giống word-break: break-word). */
  private wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    if (!text) return [''];
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    const pushWord = (word: string) => {
      if (ctx.measureText(word).width <= maxW) return [word];
      const parts: string[] = [];
      let chunk = '';
      for (const ch of word) {
        if (ctx.measureText(chunk + ch).width > maxW && chunk) {
          parts.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      if (chunk) parts.push(chunk);
      return parts;
    };
    words.forEach(word => {
      const candidate = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxW) {
        cur = candidate;
        return;
      }
      if (cur) lines.push(cur);
      const parts = pushWord(word);
      cur = parts.pop() || '';
      lines.push(...parts);
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  /** Ngưỡng hoá: mọi pixel thành đen tuyền hoặc trắng tuyền (không còn xám để driver dither). */
  private binarize(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * a + 255 * (1 - a);
      const v = lum < this.THRESHOLD ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  private roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    if (!r) {
      ctx.rect(x, y, w, h);
      return;
    }
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private font(bold: boolean, italic: boolean, sizePx: number): string {
    return `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${sizePx.toFixed(1)}px ${this.FONT_FAMILY}`;
  }

  private formatNow(includeTime: boolean): string {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return includeTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
  }
}
