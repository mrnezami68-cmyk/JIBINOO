/* ------------------------------------------------------------------ *
 * Formatting helpers — Persian digits, Toman, Jalali dates
 * ------------------------------------------------------------------ */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert Latin digits inside a string to Persian digits. */
export function faDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Grouped number with Persian digits, e.g. 1234567 -> ۱٬۲۳۴٬۵۶۷ */
export function fmt(value: number): string {
  const n = Math.round(Number(value) || 0);
  return faDigits(n.toLocaleString('en-US').replace(/,/g, '٬'));
}

/** Signed format with a visual + / - prefix. */
export function fmtSigned(value: number): string {
  return (value >= 0 ? '+' : '−') + fmt(Math.abs(value));
}

/** Compact human format: میلیارد / میلیون / هزار */
export function compact(value: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e9) return sign + trim(abs / 1e9) + ' میلیارد';
  if (abs >= 1e6) return sign + trim(abs / 1e6) + ' میلیون';
  if (abs >= 1e3) return sign + trim(abs / 1e3) + ' هزار';
  return sign + fmt(abs);
}

function trim(n: number): string {
  const s = n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();
  return faDigits(s);
}

/** Percentage string from a 0..1 ratio. */
export function pct(ratio: number, digits = 0): string {
  return faDigits((Math.round(ratio * 100 * 10 ** digits) / 10 ** digits).toString()) + '٪';
}

/** Percent from an already-scaled number (e.g. 42 -> ۴۲٪) */
export function pctNum(value: number, digits = 0): string {
  return faDigits((Math.round(value * 10 ** digits) / 10 ** digits).toString()) + '٪';
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* --------------------------- Jalali dates --------------------------- */

export const J_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/** Gregorian -> Jalali (Birashk algorithm). */
export function toJalali(date: Date): [number, number, number] {
  let gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const gDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    gDays[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function jYear(date: Date): number {
  return toJalali(date)[0];
}

/** "۱۲ شهریور ۱۴۰۵" style label from an ISO date string. */
export function jDateLabel(iso: string, withYear = true): string {
  const d = new Date(iso + 'T00:00:00');
  const [jy, jm, jd] = toJalali(d);
  return withYear
    ? `${faDigits(jd)} ${J_MONTHS[jm - 1]} ${faDigits(jy)}`
    : `${faDigits(jd)} ${J_MONTHS[jm - 1]}`;
}

/** "شهریور ۱۴۰۵" label for a month index (0-11) within a Jalali year. */
export function jMonthLabel(jm: number, jy: number): string {
  return `${J_MONTHS[jm - 1]} ${faDigits(jy)}`;
}

/** Relative "x روز پیش" label. */
export function relativeDays(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000);
  if (diff <= 0) return 'امروز';
  if (diff === 1) return 'دیروز';
  if (diff < 30) return `${faDigits(diff)} روز پیش`;
  if (diff < 365) return `${faDigits(Math.floor(diff / 30))} ماه پیش`;
  return `${faDigits(Math.floor(diff / 365))} سال پیش`;
}

/** Time label "۱۴:۳۲" from a timestamp. */
export function timeLabel(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${faDigits(String(d.getHours()).padStart(2, '0'))}:${faDigits(
    String(d.getMinutes()).padStart(2, '0')
  )}`;
}

/** "۳ ساعت پیش" freshness label from timestamp. */
export function freshness(ts: number | null): string {
  if (!ts) return 'هرگز';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'همین حالا';
  if (mins < 60) return `${faDigits(mins)} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${faDigits(hours)} ساعت پیش`;
  return `${faDigits(Math.floor(hours / 24))} روز پیش`;
}

/** Parse a user-typed Toman amount (Persian or Latin digits, separators). */
export function parseAmount(raw: string): number {
  const normalized = raw
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٬,\s]/g, '')
    .replace(/[٫.]/g, '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Clamp helper. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthStart(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function monthEnd(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
