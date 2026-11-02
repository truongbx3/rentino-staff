import { findHeaderRowNumber, normalizeVietnamese, resolveRegion } from './shipment-region.util';

describe('shipment-region.util', () => {
  describe('normalizeVietnamese', () => {
    it('should convert to lowercase, remove diacritics and collapse whitespaces', () => {
      expect(normalizeVietnamese('  Hà   Nội  ')).toBe('ha noi');
      expect(normalizeVietnamese('Đà Nẵng')).toBe('da nang');
      expect(normalizeVietnamese('ĐỒNG NAI')).toBe('dong nai');
      expect(normalizeVietnamese('')).toBe('');
      expect(normalizeVietnamese(null)).toBe('');
      expect(normalizeVietnamese(undefined)).toBe('');
    });
  });

  describe('resolveRegion', () => {
    it('should return empty string for empty/null/undefined address', () => {
      expect(resolveRegion('')).toBe('');
      expect(resolveRegion('   ')).toBe('');
      expect(resolveRegion(null)).toBe('');
      expect(resolveRegion(undefined)).toBe('');
    });

    it('should resolve HN correctly for Hanoi variations and word-boundary hn token', () => {
      expect(resolveRegion('123 Cầu Giấy, Hà Nội')).toBe('HN');
      expect(resolveRegion('Hanoi, Vietnam')).toBe('HN');
      expect(resolveRegion('Q. Ba Đình, HN')).toBe('HN');
      expect(resolveRegion('TP.HN')).toBe('HN');
      expect(resolveRegion('hn')).toBe('HN');
      expect(resolveRegion('Số 10 HN')).toBe('HN');
    });

    it('should resolve HCM correctly for Ho Chi Minh variations and Saigon', () => {
      expect(resolveRegion('Q.1, TP.HCM')).toBe('HCM');
      expect(resolveRegion('Quận 3, Thành phố Hồ Chí Minh')).toBe('HCM');
      expect(resolveRegion('Sài Gòn')).toBe('HCM');
      expect(resolveRegion('saigon')).toBe('HCM');
      expect(resolveRegion('TPHCM')).toBe('HCM');
      expect(resolveRegion('Chợ Lớn, Ho Chi Minh')).toBe('HCM');
    });

    it('should return Khác for other places and not falsely match hn inside other words', () => {
      expect(resolveRegion('Đà Nẵng')).toBe('Khác');
      expect(resolveRegion('Johnson, USA')).toBe('Khác');
    });
  });

  describe('findHeaderRowNumber', () => {
    // Giả lập worksheet: mỗi dòng là mảng giá trị ô; ô gộp lặp cùng một giá trị
    const makeSheet = (rows: string[][]) => ({
      getRow: (r: number) => ({
        eachCell: (_opts: any, cb: (cell: any, col: number) => void) => {
          (rows[r - 1] || []).forEach((v, i) => cb({ value: v }, i + 1));
        }
      })
    });

    it('should skip merged title rows and pick the row with "Mã vận đơn"', () => {
      const title = Array(15).fill('DANH SÁCH CHI TIẾT THIẾT BỊ VẬN CHUYỂN');
      const range = Array(15).fill('Từ ngày 01/10/2026 đến ngày 31/10/2026');
      const sheet = makeSheet([title, range, [], ['STT', 'Mã vận đơn', 'Trạng thái vận đơn']]);
      expect(findHeaderRowNumber(sheet)).toBe(4);
    });

    it('should fall back to first row with >= 2 distinct values', () => {
      expect(findHeaderRowNumber(makeSheet([['A', 'B']]))).toBe(1);
      expect(findHeaderRowNumber(makeSheet([['x', 'x', 'x']]))).toBe(-1);
    });
  });
});
