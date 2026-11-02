/**
 * Tiện ích chuẩn hoá và xác định khu vực (HN / HCM / Khác) từ địa chỉ
 */

/**
 * Chuẩn hoá chuỗi tiếng Việt: chữ thường, bỏ dấu tiếng Việt (NFD + xoá dấu, đ->d), gộp khoảng trắng.
 */
export function normalizeVietnamese(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  return text
    .toString()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Xác định khu vực từ địa chỉ:
 * - rỗng/null -> ''
 * - Chứa "ho chi minh", "hcm", "sai gon" -> 'HCM'
 * - Chứa "ha noi" hoặc token đứng riêng "hn" -> 'HN'
 * - Còn lại -> 'Khác'
 */
export function resolveRegion(address: string | null | undefined): string {
  if (!address || typeof address !== 'string' || address.trim() === '') {
    return '';
  }
  const normalized = normalizeVietnamese(address);
  if (!normalized) {
    return '';
  }

  if (/ho chi minh|hcm|sai ?gon/.test(normalized)) {
    return 'HCM';
  }
  // "hn" chỉ nhận khi đứng riêng, tránh khớp trong từ khác (vd "johnson")
  if (/ha ?noi|(?:^|[^a-z0-9])hn(?:$|[^a-z0-9])/.test(normalized)) {
    return 'HN';
  }
  return 'Khác';
}

/**
 * Lấy giá trị chuỗi văn bản từ một ô ExcelJS
 */
export function getCellText(cell: any): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  const val = cell.value;
  if (typeof val === 'object') {
    if (val.richText && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || '').join('');
    }
    if (val.result !== undefined && val.result !== null) {
      return String(val.result);
    }
    if (val.text !== undefined && val.text !== null) {
      return String(val.text);
    }
  }
  return String(val);
}

/**
 * Tìm dòng header trong 10 dòng đầu:
 * - Ưu tiên dòng có ô tiêu đề cột "Mã vận đơn"/"Tracking"/"Địa chỉ nhận" (bỏ qua dòng tiêu đề báo cáo gộp ô)
 * - Nếu không có: dòng đầu tiên có >= 2 giá trị khác nhau (ô gộp lặp cùng một giá trị nên không tính)
 */
export function findHeaderRowNumber(worksheet: any): number {
  let fallbackRow = -1;
  for (let r = 1; r <= 10; r++) {
    const row = worksheet.getRow(r);
    const distinctTexts = new Set<string>();
    let isHeader = false;
    row.eachCell({ includeEmpty: false }, (cell: any) => {
      const text = getCellText(cell).trim();
      if (text === '') {
        return;
      }
      distinctTexts.add(text);
      const normalized = normalizeVietnamese(text);
      if (
        normalized.includes('ma van don') ||
        normalized.includes('tracking') ||
        (normalized.includes('dia chi') && normalized.includes('nhan'))
      ) {
        isHeader = true;
      }
    });
    if (isHeader) {
      return r;
    }
    if (fallbackRow === -1 && distinctTexts.size >= 2) {
      fallbackRow = r;
    }
  }
  return fallbackRow;
}

export interface ColumnSearchResult {
  addressColNumber: number | null;
  trackingColNumber: number | null;
  lastColNumber: number;
}

/**
 * Quét các cột trong dòng header để tìm cột địa chỉ và cột mã vận đơn, đồng thời tìm cột cuối cùng có dữ liệu
 */
export function findRelevantColumns(headerRow: any): ColumnSearchResult {
  let lastColNumber = 0;
  let addressColNumber: number | null = null;
  let trackingColNumber: number | null = null;

  headerRow.eachCell({ includeEmpty: false }, (cell: any, colNumber: number) => {
    const text = getCellText(cell);
    if (text.trim() !== '') {
      if (colNumber > lastColNumber) {
        lastColNumber = colNumber;
      }
      const normalized = normalizeVietnamese(text);
      // Chỉ nhận cột "Địa chỉ nhận"; tránh nhầm địa chỉ khách hàng/người gửi
      if (normalized.includes('dia chi') && normalized.includes('nhan') && addressColNumber === null) {
        addressColNumber = colNumber;
      }
      if ((normalized.includes('ma van don') || normalized.includes('tracking')) && trackingColNumber === null) {
        trackingColNumber = colNumber;
      }
    }
  });

  return {
    addressColNumber,
    trackingColNumber,
    lastColNumber
  };
}

/**
 * Thêm cột "Khu vực" vào cuối bảng và điền giá trị cho từng dòng dữ liệu
 */
export function appendRegionColumn(
  worksheet: any,
  headerRowNumber: number,
  lastColNumber: number,
  resolveRowRegion: (row: any) => string
): void {
  const newColNumber = lastColNumber + 1;
  const headerRow = worksheet.getRow(headerRowNumber);
  const lastHeaderCell = headerRow.getCell(lastColNumber);
  const newHeaderCell = headerRow.getCell(newColNumber);

  newHeaderCell.value = 'Khu vực';
  worksheet.getColumn(newColNumber).width = 12;

  // Copy style từ ô header cuối cùng (font, fill, border, alignment)
  if (lastHeaderCell.font) {
    newHeaderCell.font = JSON.parse(JSON.stringify(lastHeaderCell.font));
  }
  if (lastHeaderCell.fill) {
    newHeaderCell.fill = JSON.parse(JSON.stringify(lastHeaderCell.fill));
  }
  if (lastHeaderCell.border) {
    newHeaderCell.border = JSON.parse(JSON.stringify(lastHeaderCell.border));
  }
  if (lastHeaderCell.alignment) {
    newHeaderCell.alignment = JSON.parse(JSON.stringify(lastHeaderCell.alignment));
  }

  // Duyệt các dòng dữ liệu sau header
  const totalRows = worksheet.rowCount || 0;
  for (let r = headerRowNumber + 1; r <= totalRows; r++) {
    const row = worksheet.getRow(r);

    // Bỏ qua dòng trống (không có ô nào chứa dữ liệu trong phạm vi 1..lastColNumber)
    let hasData = false;
    for (let c = 1; c <= lastColNumber; c++) {
      if (getCellText(row.getCell(c)).trim() !== '') {
        hasData = true;
        break;
      }
    }
    if (!hasData) {
      continue;
    }

    const region = resolveRowRegion(row);
    const dataCell = row.getCell(newColNumber);
    dataCell.value = region;

    // Copy border/font của ô cuối cùng cùng dòng
    const lastCell = row.getCell(lastColNumber);
    if (lastCell.font) {
      dataCell.font = JSON.parse(JSON.stringify(lastCell.font));
    }
    if (lastCell.border) {
      dataCell.border = JSON.parse(JSON.stringify(lastCell.border));
    }
  }
}
