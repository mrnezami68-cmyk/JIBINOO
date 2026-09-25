/* ------------------------------------------------------------------ *
 * Jibino data model
 * ------------------------------------------------------------------ */

export type TxType = 'income' | 'expense' | 'investment' | 'goal' | 'loan' | 'transfer';

export interface Tx {
  id: string;
  type: TxType;
  /**
   * income: fixed | variable ;
   * investment: asset class (buy) | sell ;
   * goal: deposit | withdraw ;
   * loan: payment (پرداخت قسط) | principal (دریافت اصل وام) ;
   * transfer: transfer (انتقال بین حساب‌ها)
   */
  kind: string;
  category: string;
  title: string;
  amount: number;
  /** ISO yyyy-mm-dd */
  date: string;
  note?: string;
  /**
   * حساب مبدأ (برداشت) یا مقصد (واریز) — فاز ۱۵.
   * برای تراکنش‌های قدیمی (پیش از فاز ۱۵) ممکن است undefined باشد؛
   * در آن صورت حساب پیش‌فرض به‌عنوان حساب مؤثر در نظر گرفته می‌شود.
   */
  accountId?: string;
  /**
   * پیوند اختیاری با رکورد مرتبط (وام / هدف / دارایی / حساب مقصد در انتقال).
   * هر تراکنشی که اثر مشترک روی نقد و یک رکورد دارد باید این پیوند را داشته باشد
   * تا هنگام حذف تراکنش، اثر آن روی رکورد مرتبط نیز به‌صورت اتمیک برگردد.
   */
  link?: TxLink;
}

/** Snapshot of an asset lot — enough to restore it when a sell entry is undone. */
export interface AssetSnapshot {
  kind: AssetKind;
  name: string;
  symbol: string;
  unit: string;
  avgBuy: number;
}

export type TxLink =
  | { type: 'loan-payment'; refId: string; subId: string }
  | { type: 'loan-principal'; refId: string }
  | { type: 'goal-transfer'; refId: string; subId: string }
  | { type: 'asset-buy'; refId: string; qty: number; unitPrice: number }
  | { type: 'account-transfer'; toId: string }
  | {
      type: 'asset-sell';
      refId: string;
      qty: number;
      unitPrice: number;
      assetSnapshot: AssetSnapshot;
    };

export type AssetKind = 'gold' | 'currency' | 'crypto' | 'metal' | 'other';

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  /** uppercase ticker, e.g. BTC, GOLD18, USD */
  symbol: string;
  unit: string;
  quantity: number;
  /** average buy price in Toman per unit */
  avgBuy: number;
  note?: string;
  createdAt: string;
  /**
   * قیمت دستی هر واحد (تومان) — برای دارایی‌هایی که قیمت لحظه‌ای ندارند
   * (ملک، خودرو، زمین، مس و…) یا کاربر می‌خواهد قیمت را خودش به‌روز کند.
   */
  manualPrice?: number | null;
  /** تاریخ آخرین به‌روزرسانی قیمت دستی (ISO) */
  manualPriceAt?: string;
  /** اگر true باشد قیمت دستی حتی در حضور قیمت لحظه‌ای هم ملاک ارزش‌گذاری است */
  useManualPrice?: boolean;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
}

export interface Loan {
  id: string;
  title: string;
  lender?: string;
  total: number;
  installmentAmount: number;
  installmentsTotal: number;
  dueDay: number;
  createdAt: string;
  payments: LoanPayment[];
}

export interface GoalTransfer {
  id: string;
  amount: number;
  date: string;
  kind: 'deposit' | 'withdraw';
}

export interface Goal {
  id: string;
  icon: string;
  title: string;
  target: number;
  note?: string;
  createdAt: string;
  transfers: GoalTransfer[];
}

export interface Settings {
  name: string;
  monthlyFixedIncome: number;
  onboarded: boolean;
  pinEnabled: boolean;
  /** 4-digit PIN, stored locally on device only */
  pin: string | null;
  biometric: boolean;
  /** manual overrides for reference rates (Toman) */
  manualUsd: number | null;
  manualGold18: number | null;
}

/* --------------------------- bank accounts -------------------------- */

/**
 * حساب بانکی / کیف پول نقد — فاز ۱۵.
 * «پول نقد» هم یک حساب است (بدون نام بانک). مجموع balance همه حساب‌ها = نقد کل مشتق.
 */
export interface Account {
  id: string;
  /** نام دلخواه کاربر، مثل «سامان — خرج خانه» یا «پول نقد» */
  name: string;
  /** نام بانک (اختیاری) — برای کیف پول نقد خالی می‌ماند */
  bank?: string;
  /** رنگ کارت حساب در UI */
  color?: string;
  /** موجودی فعلی — شمارنده اتمیک (دقیقاً مثل cash قبل از فاز ۱۵، فقط به‌ازای هر حساب) */
  balance: number;
  /**
   * حساب پیش‌فرض — فقط نقش فال‌بک دارد: تراکنش‌های قدیمی بدون accountId
   * به این حساب نسبت داده می‌شوند و مهاجرت v2→v3 موجودی قدیمی را اینجا می‌گذارد.
   * در جریان ثبت، انتخاب حساب همیشه توسط کاربر انجام می‌شود (تصمیم ۲ سند طراحی).
   */
  isDefault?: boolean;
  /** حذف نرم — حساب دارای تاریخچه آرشیو می‌شود تا اسنادش یتیم نمانند (تصمیم ۳) */
  archived?: boolean;
  note?: string;
  createdAt: string;
}

export interface TestDimension {
  key: string;
  label: string;
  score: number;
  note: string;
}

export interface TestResult {
  date: string;
  archetype: string;
  archetypeDesc: string;
  dimensions: TestDimension[];
  strengths: string[];
  risks: string[];
  tips: string[];
}

export interface TestsState {
  finance: TestResult | null;
  personality: TestResult | null;
}

/* ---------------------------- live prices --------------------------- */

export type PriceSource =
  | 'tgju'
  | 'bitpin'
  | 'coingecko'
  | 'metals'
  | 'yahoo'
  | 'erapi'
  | 'live-rate'
  | 'derived'
  | 'manual'
  | 'cache'
  | 'fallback';

export interface LivePrice {
  id: string;
  label: string;
  symbol: string;
  /** واحد قیمت‌گذاری، مثلاً «گرم»، «مثقال»، «عدد»، «کیلوگرم» */
  unit: string;
  usd: number | null;
  toman: number | null;
  change24h: number | null;
  source: PriceSource;
  spark: number[];
}

/** وضعیت سلامت هر منبع قیمت برای نمایش شفاف در UI */
export interface SourceHealth {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
  at?: number;
}

export interface PriceState {
  updatedAt: number | null;
  loading: boolean;
  error: string | null;
  /** effective USD → Toman rate used across the app */
  usdToman: number;
  usdTomanSource: PriceSource;
  /** 18-karat gold, per gram, in Toman */
  gold18Toman: number;
  gold18Source: PriceSource;
  items: Record<string, LivePrice>;
  sources: SourceHealth[];
}

export interface AppState {
  settings: Settings;
  /** نقد کل = مجموع balance حساب‌ها (مشتق — تصمیم ۱ سند طراحی فاز ۱۵) */
  accounts: Account[];
  txs: Tx[];
  assets: Asset[];
  loans: Loan[];
  goals: Goal[];
  tests: TestsState;
}
