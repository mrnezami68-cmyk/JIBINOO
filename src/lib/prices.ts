/* ------------------------------------------------------------------ *
 * Phase 8/9 — multi-source live market data engine («راهکار قیمت»)
 * معماری الهام‌گرفته از «دیدبان هوشمند بازار»: چند منبع مستقل،
 * نرمال‌سازی واحدها (ریال/تومان)، قیمت‌های مشتق و کش آخرین قیمت واقعی.
 *
 * منابع (همه موازی و مستقل — خرابی هرکدام بقیه را از کار نمی‌اندازد):
 *  1) طلایار / TGJU  : دلار/یورو/درهم/لیر، طلای ۱۸ و ۲۴، مثقال (آب‌شده)،
 *                      سکه امامی/بهار/نیم/ربع/گرمی — JSON استاتیک روی GitHub Pages (CORS باز)
 *                      داده TGJU است؛ «سکه و ارز» به ریال و «گرم طلا» به تومان است
 *                      (کشف و تأیید شده با تطبیق داخلی: طلای ۱۸ ← اونس جهانی)
 *  2) بیت‌پین         : بازارهای تومانی (USDT_IRT, BTC_IRT, …) → نرخ مشتق دلار + رمزارزها
 *  3) کوین‌گکس        : قیمت دلاری رمزارزها + PAXG برای اونس طلا
 *  4) Gold-API        : اونس XAU / XAG / XPT (نقره و پلاتین)
 *  5) یاهو/COMEX      : مس آتی (HG=F) دلار بر پوند
 *  6) er-api          : نرخ رسمی دلار (فقط پشتیبان آخر)
 *
 * زنجیره انتخاب برای هر قیمت: دستی (تنظیمات) ← منبع مستقیم ← مشتق ← کش ← مقدار ثابت.
 * مشتق‌های کلیدی:
 *  • نرخ دلار بازار   ≈ USDT_IRT بیت‌پین (تتر جایگزین دلار)
 *  • طلای ۱۸ مشتق     = (اونس ÷ ۳۱٫۱۰۳۵) × ۰٫۷۵ × نرخ دلار
 *  • آب‌شده مثقال      ≈ طلای ۱۸ × ۴٫۶۰۸ × (۷۰۵÷۷۵۰)   [مثقال آب‌شده ۱۷ عیار]
 *  • نقره/پلاتین گرم  = (اونس فلز ÷ ۳۱٫۱۰۳۵) × نرخ دلار
 *  • مس کیلوگرم        = مس COMEX ($/lb) × ۲٫۲۰۴۶۲ × نرخ دلار
 *  • رمزارز تومان      = قیمت دلاری × نرخ دلار   (یا مستقیم بازار تومانی بیت‌پین)
 * ------------------------------------------------------------------ */

import type { LivePrice, PriceSource, PriceState, SourceHealth } from './types';

/* ------------------------------ cache ------------------------------ */

const PRICE_CACHE_KEY = 'jibino.prices.v1';

interface CachedPrices {
  updatedAt: number;
  usdToman: number;
  usdTomanSource: PriceSource;
  gold18Toman: number;
  gold18Source: PriceSource;
  items: Record<string, Pick<LivePrice, 'id' | 'toman' | 'usd' | 'change24h' | 'source'>>;
}

export function loadPriceCache(): CachedPrices | null {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPrices;
    if (!parsed || typeof parsed.updatedAt !== 'number' || !parsed.items) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePriceCache(state: PriceState): void {
  try {
    const items: CachedPrices['items'] = {};
    for (const [id, p] of Object.entries(state.items)) {
      items[id] = { id: p.id, toman: p.toman, usd: p.usd, change24h: p.change24h, source: p.source };
    }
    const snapshot: CachedPrices = {
      updatedAt: state.updatedAt ?? Date.now(),
      usdToman: state.usdToman,
      usdTomanSource: state.usdTomanSource,
      gold18Toman: state.gold18Toman,
      gold18Source: state.gold18Source,
      items,
    };
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage full / private mode */
  }
}

/* --------------------------- row registry -------------------------- */

export interface RowMeta {
  id: string;
  label: string;
  symbol: string;
  unit: string;
}

/** همه ردیف‌های قیمتی که اپ نمایش می‌دهد (به‌جز رمزارزها — جداگانه در COIN_ROWS) */
export const MARKET_ROWS: RowMeta[] = [
  { id: 'usd', label: 'دلار آمریکا (بازار)', symbol: 'USD', unit: 'دلار' },
  { id: 'eur', label: 'یورو', symbol: 'EUR', unit: 'یورو' },
  { id: 'aed', label: 'درهم امارات', symbol: 'AED', unit: 'درهم' },
  { id: 'try', label: 'لیر ترکیه', symbol: 'TRY', unit: 'لیر' },
  { id: 'gold18', label: 'طلای ۱۸ عیار', symbol: 'GOLD18', unit: 'گرم' },
  { id: 'gold24', label: 'طلای ۲۴ عیار', symbol: 'GOLD24', unit: 'گرم' },
  { id: 'abshode', label: 'طلای آب‌شده', symbol: 'ABSHODE', unit: 'مثقال' },
  { id: 'coin_emami', label: 'سکه امامی', symbol: 'IMAMI', unit: 'عدد' },
  { id: 'coin_bahar', label: 'سکه بهار آزادی', symbol: 'BAHAR', unit: 'عدد' },
  { id: 'coin_nim', label: 'نیم‌سکه', symbol: 'NIM', unit: 'عدد' },
  { id: 'coin_rob', label: 'ربع‌سکه', symbol: 'ROB', unit: 'عدد' },
  { id: 'coin_germi', label: 'سکه گرمی', symbol: 'GERMI', unit: 'عدد' },
  { id: 'silver', label: 'نقره', symbol: 'SILVER', unit: 'گرم' },
  { id: 'platin', label: 'پلاتین', symbol: 'PLATIN', unit: 'گرم' },
  { id: 'copper', label: 'مس', symbol: 'COPPER', unit: 'کیلوگرم' },
];

export interface CoinRow {
  id: string;
  label: string;
  symbol: string;
  /** نماد جفت‌ارز تومانی بیت‌پین (در صورت وجود) */
  bitpin?: string;
}

export const COIN_ROWS: CoinRow[] = [
  { id: 'bitcoin', label: 'بیت‌کوین', symbol: 'BTC', bitpin: 'BTC_IRT' },
  { id: 'ethereum', label: 'اتریوم', symbol: 'ETH', bitpin: 'ETH_IRT' },
  { id: 'tether', label: 'تتر', symbol: 'USDT', bitpin: 'USDT_IRT' },
  { id: 'solana', label: 'سولانا', symbol: 'SOL', bitpin: 'SOL_IRT' },
  { id: 'ripple', label: 'ریپل', symbol: 'XRP', bitpin: 'XRP_IRT' },
  { id: 'dogecoin', label: 'دوج‌کوین', symbol: 'DOGE', bitpin: 'DOGE_IRT' },
  { id: 'cardano', label: 'کاردانو', symbol: 'ADA', bitpin: 'ADA_IRT' },
  { id: 'tron', label: 'ترون', symbol: 'TRX', bitpin: 'TRX_IRT' },
  { id: 'binancecoin', label: 'بایننس‌کوین', symbol: 'BNB', bitpin: 'BNB_IRT' },
  { id: 'toncoin', label: 'تون‌کوین', symbol: 'TON', bitpin: 'TON_IRT' },
  { id: 'chainlink', label: 'چین‌لینک', symbol: 'LINK', bitpin: 'LINK_IRT' },
  { id: 'avalanche-2', label: 'آوالانچ', symbol: 'AVAX', bitpin: 'AVAX_IRT' },
];

/** نگاشت نماد دارایی (Asset.symbol) به شناسه قیمت */
const SYMBOL_TO_ID: Record<string, string> = {
  USD: 'usd',
  EUR: 'eur',
  AED: 'aed',
  TRY: 'try',
  GOLD18: 'gold18',
  GOLD24: 'gold24',
  ABSHODE: 'abshode',
  IMAMI: 'coin_emami',
  BAHAR: 'coin_bahar',
  NIM: 'coin_nim',
  ROB: 'coin_rob',
  GERMI: 'coin_germi',
  SILVER: 'silver',
  PLATIN: 'platin',
  COPPER: 'copper',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  TRX: 'tron',
  BNB: 'binancecoin',
  TON: 'toncoin',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
};

/* ------------------------- offline fallback ------------------------ */

/** آخرین چاره — فقط برای اولین اجرای کاملاً آفلاین؛ همیشه با برچسب «آفلاین» */
export const FALLBACK = {
  usdToman: 234000,
  goldUsdOz: 4275,
  coins: {
    bitcoin: 83900,
    ethereum: 2670,
    tether: 1,
    solana: 116,
    ripple: 1.54,
    dogecoin: 0.095,
    cardano: 0.247,
    tron: 0.339,
    binancecoin: 773,
    toncoin: 2.2,
    chainlink: 13.5,
    'avalanche-2': 10.2,
  } as Record<string, number>,
};

/* ------------------------------ helpers ---------------------------- */

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * لایه محافظ واحد ریال/تومان (فاز ۱۳):
 * قیمت منبع را با یک مرجع مستقل (مثلاً اونس جهانی × نرخ دلار یا نرخ تتر بیت‌پین)
 * مقایسه می‌کند؛ اگر حدوداً ۱۰ برابر ناسازگار بود واحد را اصلاح می‌کند.
 * آستانه ۵ برابر است تا نوسان عادی بازار (حتی ۵۰٪) هرگز تداخل ایجاد نکند.
 */
export function fixUnit(raw: number, expected: number): number {
  if (!Number.isFinite(raw) || raw <= 0 || !Number.isFinite(expected) || expected <= 0) {
    return raw;
  }
  if (raw > expected * 5) return raw / 10; // منبع ریالی است → تومان
  if (raw < expected / 5) return raw * 10; // منبع از قبل تومانی است (آینده‌نگرانه)
  return raw;
}

/** Deterministic decorative sparkline seeded from the 24h change. */
function makeSpark(change: number, seed: number, points = 24): number[] {
  const out: number[] = [];
  let v = 50;
  let s = seed * 9301 + 49297;
  for (let i = 0; i < points; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280 - 0.5) * 7;
    v += noise + (change / points) * 1.6;
    out.push(v);
  }
  return out;
}

/* ---------------------------- source: TGJU ------------------------- *
 * دروازه استاتیک «طلایار» (JSON عمومی روی GitHub Pages از داده TGJU).
 * ⚠️ کشف مهم (فاز ۱۳): برچسب «currency: TOMAN» فید معتبر نیست — بررسی داده زنده
 * نشان داد «تمام» ردیف‌های TGJU (از جمله طلای گرمی ۱۸ و ۲۴ عیار) عملاً به ریال‌اند.
 * مثال تأییدشده: GOLD_18K = ۲۴۱٬۲۴۶٬۰۰۰ ریال = ۲۴٬۱۲۴٬۶۰۰ تومان در حالی که فید
 * آن را TOMAN معرفی می‌کرد و اپ ۱۰ برابر خطا نشان می‌داد.
 * همه ردیف‌ها ÷ ۱۰ می‌شوند + لایه محافظ fixUnit (تطبیق با مرجع مستقل) روی
 * دلار، طلای ۱۸/۲۴ و مثقال اعمال می‌شود تا اگر فید روزی واحد را عوض کند،
 * قیمت‌ها خودکار درست بمانند.
 * ------------------------------------------------------------------ */

const GATEWAY_BASE = 'https://javadisaloo1111.github.io/Currency-App/api/v1/market';

const GATEWAY_RIAL = new Set([
  'USD', 'EUR', 'GBP', 'AED', 'TRY', 'CNY', 'CHF', 'USDT', 'BTC',
  'COIN_EMAMI', 'COIN_BAHAR', 'COIN_NIM', 'COIN_ROB', 'COIN_GERAMI',
  'GOLD_MESGHAL', 'GOLD_OUNCE_TM',
  'GOLD_18K', 'GOLD_24K', // ← فاز ۱۳: برچسب فید TOMAN است ولی مقدار ریالی است
]);

interface GatewayRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

interface GatewayData {
  rows: Map<string, GatewayRow>;
}

async function fetchGateway(): Promise<GatewayData> {
  const json = (await fetchJson(`${GATEWAY_BASE}/prices.json`)) as {
    data?: GatewayRow[];
  };
  const rows = new Map<string, GatewayRow>();
  for (const row of json?.data ?? []) {
    if (row && typeof row.symbol === 'string' && num(row.price)) rows.set(row.symbol, row);
  }
  if (!rows.size) throw new Error('empty feed');
  return { rows };
}

/** قیمت دروازه را به تومان تبدیل می‌کند (ریال ÷ ۱۰) */
function gatewayToman(rows: Map<string, GatewayRow>, symbol: string): number | null {
  const row = rows.get(symbol);
  const price = num(row?.price);
  if (price === null) return null;
  return GATEWAY_RIAL.has(symbol) ? price / 10 : price;
}

/* ---------------------------- source: BitPin ----------------------- */

interface BitPinTicker {
  symbol: string;
  price: string | number;
  daily_change_price?: number;
}

interface BitPinData {
  tickers: Map<string, BitPinTicker>;
}

async function fetchBitPin(): Promise<BitPinData> {
  const json = (await fetchJson('https://api.bitpin.org/api/v1/mkt/tickers/')) as BitPinTicker[];
  if (!Array.isArray(json)) throw new Error('bad tickers');
  const tickers = new Map<string, BitPinTicker>();
  for (const t of json) {
    if (t && typeof t.symbol === 'string') tickers.set(t.symbol, t);
  }
  if (!tickers.size) throw new Error('empty tickers');
  return { tickers };
}

/** جفت‌ارزهای تومانی بیت‌پین به تومان (تأییدشده با تطبیق USDT/BTC با دروازه) */
function bitpinToman(bp: BitPinData, pair: string): { price: number; change: number | null } | null {
  const t = bp.tickers.get(pair);
  const price = num(t?.price);
  if (price === null) return null;
  const change = Number(t?.daily_change_price);
  return { price, change: Number.isFinite(change) ? change : null };
}

/* -------------------------- source: CoinGecko ---------------------- */

interface CoinGeckoData {
  usd: Record<string, number>;
  change: Record<string, number>;
  goldOz: number | null;
  /** تغییر ۲۴ ساعته اونس طلا (PAXG) — fallback تغییر طلای ۱۸ وقتی دروازه خراب است */
  goldOzChange: number | null;
}

async function fetchCoinGecko(): Promise<CoinGeckoData> {
  const ids = [...COIN_ROWS.map((c) => c.id), 'pax-gold'].join(',');
  const json = (await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  )) as Record<string, { usd?: number; usd_24h_change?: number }>;
  const usd: Record<string, number> = {};
  const change: Record<string, number> = {};
  for (const row of COIN_ROWS) {
    const v = num(json?.[row.id]?.usd);
    if (v !== null) usd[row.id] = v;
    const c = Number(json?.[row.id]?.usd_24h_change);
    if (Number.isFinite(c)) change[row.id] = c;
  }
  const goldOz = num(json?.['pax-gold']?.usd);
  const goldOzChange = Number(json?.['pax-gold']?.usd_24h_change);
  if (!Object.keys(usd).length && goldOz === null) throw new Error('empty coingecko');
  return {
    usd,
    change,
    goldOz,
    goldOzChange: Number.isFinite(goldOzChange) ? goldOzChange : null,
  };
}

/* --------------------------- source: Gold-API ---------------------- */

interface MetalsData {
  xau: number | null;
  xag: number | null;
  xpt: number | null;
}

async function fetchMetals(): Promise<MetalsData> {
  const [xau, xag, xpt] = await Promise.all([
    fetchJson('https://api.gold-api.com/price/XAU').catch(() => null),
    fetchJson('https://api.gold-api.com/price/XAG').catch(() => null),
    fetchJson('https://api.gold-api.com/price/XPT').catch(() => null),
  ]);
  const data: MetalsData = {
    xau: num((xau as { price?: number } | null)?.price),
    xag: num((xag as { price?: number } | null)?.price),
    xpt: num((xpt as { price?: number } | null)?.price),
  };
  if (data.xau === null && data.xag === null && data.xpt === null) throw new Error('empty metals');
  return data;
}

/* --------------------------- source: Yahoo/COMEX ------------------- *
 * مس آتی COMEX (HG=F) — دلار بر پوند؛ برای هر کیلوگرم × ۲٫۲۰۴۶۲
 * ------------------------------------------------------------------ */

async function fetchCopper(): Promise<number> {
  const json = (await fetchJson(
    'https://query1.finance.yahoo.com/v8/finance/chart/HG%3DF'
  )) as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
  const price = num(json?.chart?.result?.[0]?.meta?.regularMarketPrice);
  if (price === null) throw new Error('no copper');
  return price;
}

/* ---------------------------- source: er-api ----------------------- */

async function fetchErApi(): Promise<number> {
  const json = (await fetchJson('https://open.er-api.com/v6/latest/USD')) as {
    rates?: { IRR?: number };
  };
  const irr = num(json?.rates?.IRR);
  if (irr === null) throw new Error('no IRR');
  return irr / 10; // ریال → تومان
}

/* ------------------------------ builder ---------------------------- */

export async function fetchLivePrices(
  manualUsd: number | null,
  manualGold18: number | null
): Promise<PriceState> {
  const sources: SourceHealth[] = [];
  const note = (id: string, label: string, ok: boolean, detail?: string) => {
    sources.push({ id, label, ok, detail, at: Date.now() });
  };

  // همه منابع موازی — خطاها ایزوله می‌شوند
  const [gw, bp, cg, metals, copperLb, erapi] = await Promise.all([
    fetchGateway().then(
      (v) => v,
      (e: Error) => ({ error: e.message } as const)
    ),
    fetchBitPin().then(
      (v) => v,
      (e: Error) => ({ error: e.message } as const)
    ),
    fetchCoinGecko().then(
      (v) => v,
      (e: Error) => ({ error: e.message } as const)
    ),
    fetchMetals().then(
      (v) => v,
      (e: Error) => ({ error: e.message } as const)
    ),
    fetchCopper().then(
      (v) => v,
      (e: Error) => ({ error: e.message } as const)
    ),
    fetchErApi().then(
      (v) => v,
      (e: Error) => ({ error: e.message } as const)
    ),
  ]);

  const gwOk = 'rows' in gw;
  const bpOk = 'tickers' in bp;
  const cgOk = 'usd' in cg;
  const metalsOk = 'xau' in metals;
  const copperOk = typeof copperLb === 'number';
  const erOk = typeof erapi === 'number';

  note('tgju', 'طلایار / TGJU', gwOk, gwOk ? `${gw.rows.size} نماد` : (gw as { error?: string }).error);
  note('bitpin', 'بیت‌پین', bpOk, bpOk ? `${bp.tickers.size} جفت‌ارز` : (bp as { error?: string }).error);
  note('coingecko', 'CoinGecko', cgOk, cgOk ? undefined : (cg as { error?: string }).error);
  note('metals', 'Gold-API (فلزات)', metalsOk, metalsOk ? undefined : (metals as { error?: string }).error);
  note('yahoo', 'COMEX (مس)', copperOk, copperOk ? undefined : (copperLb as { error?: string }).error);
  note('erapi', 'نرخ رسمی (er-api)', erOk, erOk ? undefined : (erapi as { error?: string }).error);

  const cache = loadPriceCache();
  const cachedItem = (id: string) => cache?.items[id] ?? null;

  /* ---------- نرخ دلار (بازار) ---------- */
  const usdtPair = bpOk ? bitpinToman(bp, 'USDT_IRT') : null; // مشتق: تتر ≈ دلار بازار
  // تطبیق واحد با مرجع مستقل (تتر بیت‌پین یا نرخ رسمی) — فاز ۱۳
  const usdGatewayRaw = gwOk ? gatewayToman(gw.rows, 'USD') : null;
  const usdAnchor = usdtPair?.price ?? (erOk ? (erapi as number) : 0);
  const usdGateway =
    usdGatewayRaw !== null && usdAnchor > 0 ? fixUnit(usdGatewayRaw, usdAnchor) : usdGatewayRaw;
  const usdCandidates: { value: number; source: PriceSource; detail: string }[] = [];
  if (usdGateway !== null) usdCandidates.push({ value: usdGateway, source: 'tgju', detail: `TGJU ${Math.round(usdGateway)}` });
  if (usdtPair) usdCandidates.push({ value: usdtPair.price, source: 'bitpin', detail: `مشتق از تتر ${Math.round(usdtPair.price)}` });
  if (erOk) usdCandidates.push({ value: erapi as number, source: 'erapi', detail: `رسمی ${Math.round(erapi as number)}` });
  if (cache && !usdCandidates.length) usdCandidates.push({ value: cache.usdToman, source: 'cache', detail: 'کش' });

  const usdPick = manualUsd && manualUsd > 0
    ? { value: manualUsd as number, source: 'manual' as PriceSource, detail: 'دستی (تنظیمات)' }
    : usdCandidates[0] ?? { value: FALLBACK.usdToman, source: 'fallback' as PriceSource, detail: 'ثابت آفلاین' };
  const usdToman = usdPick.value;
  const usdTomanSource = usdPick.source;
  if (usdCandidates.length > 1 && usdPick.source !== 'manual') {
    usdPick.detail += ` ← انتخاب شد (گزینه بعدی: ${usdCandidates[1].detail})`;
  }

  /* ---------- اونس جهانی طلا ---------- */
  const ozGateway = gwOk ? gatewayToman(gw.rows, 'GOLD_OUNCE_TM') : null;
  const goldOzUsd =
    metalsOk && metals.xau !== null
      ? metals.xau
      : cgOk && cg.goldOz !== null
        ? cg.goldOz
        : ozGateway !== null
          ? ozGateway / usdToman
          : FALLBACK.goldUsdOz;

  /* ---------- طلای ۱۸ عیار (گرم) ---------- */
  const gold18GatewayRaw = gwOk ? gatewayToman(gw.rows, 'GOLD_18K') : null;
  const gold18Derived = (goldOzUsd / 31.1035) * 0.75 * usdToman;
  // فاز ۱۳: تطبیق واحد طلای ۱۸ با مرجع مستقل (اونس جهانی × نرخ دلار)
  const gold18Gateway =
    gold18GatewayRaw !== null && gold18Derived > 0 ? fixUnit(gold18GatewayRaw, gold18Derived) : gold18GatewayRaw;
  const gold18Pick =
    manualGold18 && manualGold18 > 0
      ? { value: manualGold18 as number, source: 'manual' as PriceSource }
      : gold18Gateway !== null
        ? { value: gold18Gateway, source: 'tgju' as PriceSource }
        : cache && !cgOk && !metalsOk
          ? { value: cache.gold18Toman, source: 'cache' as PriceSource }
          : { value: gold18Derived, source: (gwOk ? 'derived' : cache ? 'cache' : 'fallback') as PriceSource };
  const gold18Toman = gold18Pick.value;
  const gold18Source = gold18Pick.source;

  /* ---------- ساخت items ---------- */
  const items: Record<string, LivePrice> = {};
  const put = (
    id: string,
    label: string,
    symbol: string,
    unit: string,
    toman: number | null,
    change24h: number | null,
    source: PriceSource
  ) => {
    items[id] = {
      id,
      label,
      symbol,
      unit,
      usd: toman !== null ? toman / usdToman : null,
      toman,
      change24h,
      source,
      spark: makeSpark(change24h ?? 0, id.length * 13 + 1),
    };
  };

  // ارزها
  for (const [id, gsym, label, symbol, unit] of [
    ['usd', 'USD', 'دلار آمریکا (بازار)', 'USD', 'دلار'],
    ['eur', 'EUR', 'یورو', 'EUR', 'یورو'],
    ['aed', 'AED', 'درهم امارات', 'AED', 'درهم'],
    ['try', 'TRY', 'لیر ترکیه', 'TRY', 'لیر'],
  ] as const) {
    const v = id === 'usd' ? usdToman : gwOk ? gatewayToman(gw.rows, gsym) : null;
    const c = gwOk ? Number(gw.rows.get(gsym)?.change_percent) : NaN;
    const src: PriceSource =
      id === 'usd'
        ? usdTomanSource
        : v !== null
          ? 'tgju'
          : cachedItem(id)
            ? 'cache'
            : 'fallback';
    put(id, label, symbol, unit, v ?? cachedItem(id)?.toman ?? null, Number.isFinite(c) ? c : cachedItem(id)?.change24h ?? 0, src);
  }

  // طلا و آب‌شده
  const gold24GatewayRaw = gwOk ? gatewayToman(gw.rows, 'GOLD_24K') : null;
  // فاز ۱۳: تطبیق واحد طلای ۲۴ با طلای ۱۸ (نسبت ثابت ۲۴/۱۸)
  const gold24Gateway =
    gold24GatewayRaw !== null && gold18Toman > 0
      ? fixUnit(gold24GatewayRaw, gold18Toman * (24 / 18))
      : gold24GatewayRaw;
  const gold18Change =
    (gwOk ? Number(gw.rows.get('GOLD_18K')?.change_percent) : NaN) ||
    (cgOk ? cg.change['pax-gold'] ?? 0 : 0);
  put(
    'gold18', 'طلای ۱۸ عیار', 'GOLD18', 'گرم', gold18Toman,
    Number.isFinite(gold18Change) ? gold18Change : 0,
    gold18Source
  );
  put(
    'gold24', 'طلای ۲۴ عیار', 'GOLD24', 'گرم',
    gold24Gateway ?? gold18Toman * (24 / 18),
    gwOk ? Number(gw.rows.get('GOLD_24K')?.change_percent) || 0 : 0,
    gold24Gateway !== null ? 'tgju' : 'derived'
  );
  const mesghalRaw = gwOk ? gatewayToman(gw.rows, 'GOLD_MESGHAL') : null;
  // فاز ۱۳: تطبیق واحد مثقال با مقدار مشتق از طلای ۱۸
  const mesghal =
    mesghalRaw !== null && gold18Toman > 0
      ? fixUnit(mesghalRaw, gold18Toman * 4.608 * (705 / 750))
      : mesghalRaw;
  put(
    'abshode', 'طلای آب‌شده', 'ABSHODE', 'مثقال',
    mesghal ?? gold18Toman * 4.608 * (705 / 750),
    gwOk ? Number(gw.rows.get('GOLD_MESGHAL')?.change_percent) || 0 : 0,
    mesghal !== null ? 'tgju' : 'derived'
  );

  // سکه‌ها
  const coinDefs = [
    ['coin_emami', 'COIN_EMAMI', 'سکه امامی', 'IMAMI'],
    ['coin_bahar', 'COIN_BAHAR', 'سکه بهار آزادی', 'BAHAR'],
    ['coin_nim', 'COIN_NIM', 'نیم‌سکه', 'NIM'],
    ['coin_rob', 'COIN_ROB', 'ربع‌سکه', 'ROB'],
    ['coin_germi', 'COIN_GERMI', 'سکه گرمی', 'GERMI'],
  ] as const;
  for (const [id, gsym, label, symbol] of coinDefs) {
    const v = gwOk ? gatewayToman(gw.rows, gsym) : null;
    const cached = cachedItem(id);
    const c = gwOk ? Number(gw.rows.get(gsym)?.change_percent) : NaN;
    put(
      id, label, symbol, 'عدد',
      v ?? cached?.toman ?? null,
      Number.isFinite(c) ? c : cached?.change24h ?? 0,
      v !== null ? 'tgju' : cached ? 'cache' : 'fallback'
    );
  }

  // نقره و پلاتین (گرم) — مشتق از اونس جهانی × نرخ دلار
  const silverOz = metalsOk ? metals.xag : null;
  put(
    'silver', 'نقره', 'SILVER', 'گرم',
    silverOz !== null ? (silverOz / 31.1035) * usdToman : cachedItem('silver')?.toman ?? null,
    0,
    silverOz !== null ? 'derived' : cachedItem('silver') ? 'cache' : 'fallback'
  );
  const platinOz = metalsOk ? metals.xpt : null;
  put(
    'platin', 'پلاتین', 'PLATIN', 'گرم',
    platinOz !== null ? (platinOz / 31.1035) * usdToman : cachedItem('platin')?.toman ?? null,
    0,
    platinOz !== null ? 'derived' : cachedItem('platin') ? 'cache' : 'fallback'
  );

  // مس (کیلوگرم) — مشتق از آتی COMEX ($/lb) × ۲٫۲۰۴۶۲ × نرخ دلار
  const copper = copperOk ? (copperLb as number) * 2.20462 * usdToman : null;
  put(
    'copper', 'مس', 'COPPER', 'کیلوگرم',
    copper ?? cachedItem('copper')?.toman ?? null,
    0,
    copper !== null ? 'derived' : cachedItem('copper') ? 'cache' : 'fallback'
  );

  // رمزارزها: بازار تومانی بیت‌پین ← مشتق دلاری × نرخ ← کش
  COIN_ROWS.forEach((row) => {
    const pair = bpOk && row.bitpin ? bitpinToman(bp, row.bitpin) : null;
    const cgUsd = cgOk ? cg.usd[row.id] ?? null : null;
    const toman = pair?.price ?? (cgUsd !== null ? cgUsd * usdToman : cachedItem(row.id)?.toman ?? null);
    const change =
      pair?.change ?? (cgOk ? cg.change[row.id] ?? 0 : cachedItem(row.id)?.change24h ?? 0);
    const source: PriceSource =
      pair
        ? 'bitpin'
        : cgUsd !== null
          ? cgUsd * usdToman === toman && usdTomanSource !== 'fallback'
            ? 'derived'
            : 'coingecko'
          : cachedItem(row.id)
            ? 'cache'
            : 'fallback';
    put(row.id, row.label, row.symbol, row.symbol, toman, change, source);
    // برای منبع coingecko، usd واقعی را نگه دار
    if (cgUsd !== null) items[row.id].usd = cgUsd;
  });

  const state: PriceState = {
    updatedAt: Date.now(),
    loading: false,
    error: usdTomanSource === 'fallback' ? 'ارتباط با منابع قیمت برقرار نشد؛ مقادیر آفلاین' : null,
    usdToman,
    usdTomanSource,
    gold18Toman,
    gold18Source,
    items,
    sources,
  };

  // کش آخرین قیمت واقعی — فقط وقتی حداقل یک منبع زنده جواب داده باشد
  if (gwOk || bpOk || cgOk || metalsOk || copperOk || erOk) {
    savePriceCache(state);
  }
  return state;
}

/** پیش‌بارگذاری: کش واقعی ← مقادیر ثابت آفلاین (UI هرگز خالی نمی‌ماند) */
export function initialPrices(): PriceState {
  const cache = loadPriceCache();
  if (cache) {
    const items: Record<string, LivePrice> = {};
    const meta = new Map<string, RowMeta | CoinRow>();
    for (const r of MARKET_ROWS) meta.set(r.id, r);
    for (const c of COIN_ROWS) meta.set(c.id, c);
    let i = 0;
    for (const [id, p] of Object.entries(cache.items)) {
      const m = meta.get(id);
      items[id] = {
        id,
        label: m && 'label' in m ? m.label : id,
        symbol: m && 'symbol' in m ? m.symbol : id.toUpperCase(),
        unit: m && 'unit' in m ? (m as RowMeta).unit : '',
        usd: p.usd ?? null,
        toman: p.toman ?? null,
        change24h: p.change24h ?? 0,
        source: 'cache',
        spark: makeSpark(p.change24h ?? 0, i++ * 7 + 3),
      };
    }
    return {
      updatedAt: cache.updatedAt,
      loading: true,
      error: null,
      usdToman: cache.usdToman,
      usdTomanSource: 'cache',
      gold18Toman: cache.gold18Toman,
      gold18Source: 'cache',
      items,
      sources: [{ id: 'cache', label: 'کش آخرین قیمت', ok: true }],
    };
  }
  return {
    updatedAt: null,
    loading: true,
    error: null,
    usdToman: FALLBACK.usdToman,
    usdTomanSource: 'fallback',
    gold18Toman: (FALLBACK.goldUsdOz / 31.1035) * 0.75 * FALLBACK.usdToman,
    gold18Source: 'fallback',
    items: {},
    sources: [],
  };
}

/** Map an asset ticker to its live price entry (if any). */
export function priceForAsset(
  prices: PriceState,
  kind: string,
  symbol: string
): { toman: number | null; source: PriceSource } {
  const sym = symbol.toUpperCase();
  const id = SYMBOL_TO_ID[sym];
  if (id && prices.items[id]) {
    const item = prices.items[id];
    return { toman: item.toman, source: item.source };
  }
  if (kind === 'currency' && prices.items.usd) {
    return { toman: prices.items.usd.toman, source: prices.items.usd.source };
  }
  return { toman: null, source: 'manual' };
}

