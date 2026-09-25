/* تست‌های اجرایی — تاریخ/قالب‌بندی (فاز ۱۴)
 * منطقه زمانی تست: تهران (UTC+۳:۳۰) — دقیقاً همان جایی که باگ UTC خودش را نشان می‌داد.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  toISODate,
  todayISO,
  monthStart,
  monthEnd,
  monthKey,
  daysAgoISO,
  addMonthsISO,
  parseAmount,
  faDigits,
  fmt,
  compact,
  toJalali,
  jDateLabel,
} from '../format';

describe('توابع تاریخ — بدون خطای منطقه زمانی (باگ P0 شماره ۱)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('todayISO در ساعت ۰۲:۰۰ بامداد تهران همان روز را می‌دهد (نه یک روز عقب)', () => {
    // ۰۲:۰۰ بامداد ۲۵ سپتامبر به وقت تهران = ۲۴ سپتامبر ۲۲:۳۰ UTC
    vi.setSystemTime(new Date('2026-09-25T02:00:00+03:30'));
    expect(todayISO()).toBe('2026-09-25'); // با toISOString قبلی: 2026-09-24 ❌
  });

  it('todayISO ظهر تهران درست است', () => {
    vi.setSystemTime(new Date('2026-09-25T14:20:00+03:30'));
    expect(todayISO()).toBe('2026-09-25');
  });

  it('monthStart اولِ همان ماه را می‌دهد (نه آخر ماه قبل)', () => {
    expect(monthStart(new Date('2026-09-15T12:00:00+03:30'))).toBe('2026-09-01');
    // با باگ UTC: 2026-08-31 ❌
  });

  it('monthEnd آخرِ همان ماه را می‌دهد', () => {
    expect(monthEnd(new Date('2026-09-15T12:00:00+03:30'))).toBe('2026-09-30');
    expect(monthEnd(new Date(2026, 1, 10))).toBe('2026-02-28'); // سال غیر کبیسه
    expect(monthEnd(new Date(2026, 11, 10))).toBe('2026-12-31');
  });

  it('daysAgoISO دقیقاً n روز محلی کم می‌کند', () => {
    vi.setSystemTime(new Date('2026-09-25T02:00:00+03:30'));
    expect(daysAgoISO(1)).toBe('2026-09-24');
    expect(daysAgoISO(0)).toBe('2026-09-25');
  });

  it('toISODate اجزای تاریخ محلی را نگه می‌دارد', () => {
    expect(toISODate(new Date(2026, 8, 5))).toBe('2026-09-05');
    expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('addMonthsISO با تقویم محلی کار می‌کند', () => {
    expect(addMonthsISO('2026-08-15', 1)).toBe('2026-09-15');
    expect(addMonthsISO('2026-12-31', 2)).toBe('2027-02-28');
  });

  it('monthKey پیشوند yyyy-mm را می‌دهد', () => {
    expect(monthKey('2026-09-25')).toBe('2026-09');
  });
});

describe('تاریخ جلالی', () => {
  it('۲۵ سپتامبر ۲۰۲۶ = ۳ مهر ۱۴۰۵ (مرجع CHANGELOG)', () => {
    expect(toJalali(new Date('2026-09-25T12:00:00+03:30'))).toEqual([1405, 7, 3]);
  });

  it('برچسب جلالی شامل ماه درست است', () => {
    expect(jDateLabel('2026-09-25')).toContain('مهر');
    expect(jDateLabel('2026-09-25')).toContain('۱۴۰۵');
  });
});

describe('پارس و قالب‌بندی اعداد فارسی', () => {
  it('parseAmount ارقام فارسی و جداکننده را می‌فهمد', () => {
    expect(parseAmount('۱٬۲۳۴٬۵۶۷')).toBe(1234567);
    expect(parseAmount('12,500')).toBe(12500);
    expect(parseAmount('۲.۵')).toBe(2.5);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('٣٤٥')).toBe(345); // ارقام عربی
  });

  it('faDigits و fmt و compact', () => {
    expect(faDigits('123')).toBe('۱۲۳');
    expect(fmt(1234567)).toBe('۱٬۲۳۴٬۵۶۷');
    expect(compact(1_500_000_000)).toContain('۱.۵');
    expect(compact(1_500_000_000)).toContain('میلیارد');
    expect(compact(2_400_000)).toContain('میلیون');
  });
});
