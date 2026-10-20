import { Injectable } from '@angular/core';
import { JobcardTemplate, SheetLayout } from '../models/jobcard.model';
import { escapeHtml, JobcardRenderService } from './jobcard-render.service';

/**
 * In jobcard lên tờ tem dán nhiều ô (Tomy...) bằng máy in văn phòng.
 * - Chọn ô bắt đầu để in tiếp lên tờ đã dùng dở; sau khi in tự nhớ ô trống tiếp theo.
 * - Bù lệch X/Y + in khung thử để căn khớp với từng máy in.
 */
@Injectable({
  providedIn: 'root'
})
export class JobcardSheetService {
  private readonly STORAGE_KEY = 'jobcard_sheet_layouts_v1';
  private readonly LAST_USED_KEY = 'jobcard_sheet_last_used_v1';

  constructor(private renderService: JobcardRenderService) {}

  getLayouts(): SheetLayout[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // bỏ qua, dùng mặc định
    }
    const seed = [this.buildDefaultLayout()];
    this.writeLayouts(seed);
    return seed;
  }

  saveLayout(layout: SheetLayout): void {
    const list = this.getLayouts();
    const idx = list.findIndex(l => l.id === layout.id);
    if (idx >= 0) list[idx] = { ...layout };
    else list.push({ ...layout });
    this.writeLayouts(list);
  }

  deleteLayout(id: string): void {
    const list = this.getLayouts().filter(l => l.id !== id);
    this.writeLayouts(list.length ? list : [this.buildDefaultLayout()]);
  }

  newLayout(base?: SheetLayout): SheetLayout {
    return {
      ...(base || this.buildDefaultLayout()),
      id: `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: base ? `${base.name} (bản sao)` : 'Tờ tem mới',
      nextIndex: 0
    };
  }

  getLastUsedId(): string | null {
    try {
      return localStorage.getItem(this.LAST_USED_KEY);
    } catch {
      return null;
    }
  }

  setLastUsedId(id: string): void {
    try {
      localStorage.setItem(this.LAST_USED_KEY, id);
    } catch {
      // bỏ qua
    }
  }

  /**
   * Tự tính kích thước ô + lề từ: tổng chiều ngang/dọc vùng tem, số cột/hàng, khe giữa các miếng.
   * Ô chia đều, vùng tem căn giữa tờ (lệch thật của tờ/máy in thì chỉnh bằng offset).
   */
  applyAutoLayout(l: SheetLayout): void {
    this.ensureTotals(l);
    const cols = Math.max(1, l.cols || 1);
    const rows = Math.max(1, l.rows || 1);
    const round = (v: number) => Math.round(v * 100) / 100;
    l.labelWidth = round(((l.totalWidth || 0) - (cols - 1) * (l.gapX || 0)) / cols);
    l.labelHeight = round(((l.totalHeight || 0) - (rows - 1) * (l.gapY || 0)) / rows);
    l.marginLeft = round(Math.max(0, ((l.paperWidth || 0) - (l.totalWidth || 0)) / 2));
    l.marginTop = round(Math.max(0, ((l.paperHeight || 0) - (l.totalHeight || 0)) / 2));
  }

  /** Khổ cũ chưa có tổng vùng tem -> suy ra từ kích thước ô hiện có. */
  ensureTotals(l: SheetLayout): void {
    const cols = Math.max(1, l.cols || 1);
    const rows = Math.max(1, l.rows || 1);
    if (!l.totalWidth) l.totalWidth = cols * (l.labelWidth || 0) + (cols - 1) * (l.gapX || 0);
    if (!l.totalHeight) l.totalHeight = rows * (l.labelHeight || 0) + (rows - 1) * (l.gapY || 0);
  }

  cellsPerSheet(layout: SheetLayout): number {
    return Math.max(1, (layout.rows || 1) * (layout.cols || 1));
  }

  /** Toạ độ mép trên-trái của ô (đã cộng bù lệch). */
  cellPosition(layout: SheetLayout, cellIndex: number): { x: number; y: number } {
    const perSheet = this.cellsPerSheet(layout);
    const pos = cellIndex % perSheet;
    const row = Math.floor(pos / layout.cols);
    const col = pos % layout.cols;
    return {
      x: layout.marginLeft + col * (layout.labelWidth + layout.gapX) + (layout.offsetX || 0),
      y: layout.marginTop + row * (layout.labelHeight + layout.gapY) + (layout.offsetY || 0)
    };
  }

  /** Số tờ cần dùng khi in `count` tem bắt đầu từ ô `startIndex`. */
  sheetsNeeded(layout: SheetLayout, startIndex: number, count: number): number {
    if (count <= 0) return 0;
    return Math.floor((startIndex + count - 1) / this.cellsPerSheet(layout)) + 1;
  }

  /**
   * HTML in các tem lên tờ: tem thứ i nằm ở ô (startIndex + i), tràn sang tờ sau nếu hết ô.
   * Mẫu tem được thu/phóng giữ tỉ lệ để vừa ô và căn giữa trong ô.
   */
  buildSheetHtml(
    layout: SheetLayout,
    template: JobcardTemplate,
    pagesData: any[],
    customFieldValues: Record<string, string> | Record<string, string>[],
    startIndex: number
  ): string {
    const perSheet = this.cellsPerSheet(layout);
    const sheets = this.sheetsNeeded(layout, startIndex, pagesData.length);
    const scale = Math.min(layout.labelWidth / template.paper.width, layout.labelHeight / template.paper.height);
    const scaledW = template.paper.width * scale;
    const scaledH = template.paper.height * scale;
    const padX = (layout.labelWidth - scaledW) / 2;
    const padY = (layout.labelHeight - scaledH) / 2;

    const sheetBodies: string[] = Array.from({ length: sheets }, () => '');
    pagesData.forEach((data, i) => {
      const cell = startIndex + i;
      const sheetNo = Math.floor(cell / perSheet);
      const { x, y } = this.cellPosition(layout, cell);
      const vals = Array.isArray(customFieldValues) ? (customFieldValues[i] || {}) : customFieldValues;
      const labelHtml = this.renderService.renderSinglePage(template, data, vals, []);
      sheetBodies[sheetNo] += `
        <div style="position: absolute; left: ${x + padX}mm; top: ${y + padY}mm; width: ${scaledW}mm; height: ${scaledH}mm; overflow: hidden;">
          <div style="width: ${template.paper.width}mm; height: ${template.paper.height}mm; transform: scale(${scale}); transform-origin: top left;">
            ${labelHtml}
          </div>
        </div>`;
    });

    return this.wrapSheets(layout, sheetBodies, template.name);
  }

  /** Tờ in thử: viền mọi ô + số thứ tự, để đặt chồng lên tờ tem thật kiểm tra độ khớp. */
  buildTestGridHtml(layout: SheetLayout): string {
    const perSheet = this.cellsPerSheet(layout);
    let body = '';
    for (let i = 0; i < perSheet; i++) {
      const { x, y } = this.cellPosition(layout, i);
      body += `
        <div style="position: absolute; left: ${x}mm; top: ${y}mm; width: ${layout.labelWidth}mm; height: ${layout.labelHeight}mm;
          border: 0.3mm solid #000; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          font: bold 10pt Arial, sans-serif;">
          ${i + 1}
          <div style="position: absolute; left: 50%; top: 0; bottom: 0; border-left: 0.2mm dashed #000;"></div>
          <div style="position: absolute; top: 50%; left: 0; right: 0; border-top: 0.2mm dashed #000;"></div>
        </div>`;
    }
    return this.wrapSheets(layout, [body], `In thử - ${layout.name}`);
  }

  private wrapSheets(layout: SheetLayout, bodies: string[], title: string): string {
    const pages = bodies
      .map(b => `<div class="sheet-page">${b}</div>`)
      .join('\n');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${layout.paperWidth}mm ${layout.paperHeight}mm; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .sheet-page { position: relative; width: ${layout.paperWidth}mm; height: ${layout.paperHeight}mm; overflow: hidden;
      page-break-after: always; break-after: page; }
    .sheet-page:last-child { page-break-after: auto; break-after: auto; }
  </style>
</head>
<body>
  ${pages}
</body>
</html>`;
  }

  private writeLayouts(list: SheetLayout[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch {
      // bỏ qua
    }
  }

  private buildDefaultLayout(): SheetLayout {
    // Giá trị khởi tạo – cần đo lại theo tờ tem thật rồi bấm "In khung thử" để căn
    return {
      id: 'sheet_default',
      name: 'Tờ tem Tomy',
      paperWidth: 148,
      paperHeight: 210,
      rows: 5,
      cols: 3,
      labelWidth: 44,
      labelHeight: 30,
      marginTop: 15,
      marginLeft: 6,
      gapX: 3,
      gapY: 6,
      offsetX: 0,
      offsetY: 0,
      nextIndex: 0,
      totalWidth: 138,  // 3 x 44 + 2 x 3
      totalHeight: 174  // 5 x 30 + 4 x 6
    };
  }
}
