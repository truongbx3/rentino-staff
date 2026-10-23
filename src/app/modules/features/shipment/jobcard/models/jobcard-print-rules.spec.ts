import {
  getEffectiveWidth,
  getPrintableElements,
  isElementPrintable,
  JobcardElement,
  resolveDisplayValue
} from './jobcard.model';
import { JobcardTemplateService } from '../services/jobcard-template.service';
import { JobcardRenderService } from '../services/jobcard-render.service';

describe('Jobcard print rules', () => {
  const elements = new JobcardTemplateService().buildDefaultDeviceTemplate().elements;
  const byId = (id: string) => elements.find(e => e.id === id) as JobcardElement;
  const render = new JobcardRenderService();
  const fmt = (v: any, f?: any) => render.formatValue(v, f);

  it('toggle tắt -> không in, bật -> in', () => {
    const el = byId('el_rentino_type');
    expect(isElementPrintable(el, 'android', {})).toBe(false);
    expect(isElementPrintable(el, 'android', { rentino_type: false })).toBe(false);
    expect(isElementPrintable(el, 'android', { rentino_type: true })).toBe(true);
  });

  it('visibleWhen android/ios vẫn đúng', () => {
    const ram = byId('el_ram');
    expect(isElementPrintable(ram, 'android')).toBe(true);
    expect(isElementPrintable(ram, 'ios')).toBe(false);
    const iosEl: JobcardElement = { id: 'x', type: 'box', x: 0, y: 0, width: 1, height: 1, visibleWhen: 'ios' };
    expect(isElementPrintable(iosEl, 'ios')).toBe(true);
    expect(isElementPrintable(iosEl, 'android')).toBe(false);
    expect(getPrintableElements(elements, 'ios', {}).some(e => e.id === 'el_ram')).toBe(false);
  });

  it('width hiệu lực theo expandWhenHidden', () => {
    const name = byId('el_dev_name');
    expect(getEffectiveWidth(name, elements, 'android', {})).toBe(47.6);
    expect(getEffectiveWidth(name, elements, 'android', { rentino_type: true })).toBe(35.6);
    expect(getEffectiveWidth(byId('el_imei'), elements, 'android', {})).toBe(47.6);
  });

  it('showWhenStatus: sent_vcm -> Loại 2, khác -> placeholder', () => {
    const el = byId('el_rentino_type');
    expect(resolveDisplayValue(el, { status: 'sent_vcm', finalSummary: 'LOAI_2' }, fmt)).toBe('Loại 2');
    expect(resolveDisplayValue(el, { status: 'approve', finalSummary: 'LOAI_2' }, fmt)).toBe('Loại ....');
    expect(resolveDisplayValue(byId('el_imei'), { imei: '123' }, fmt)).toBe('123');
  });
});
