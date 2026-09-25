/* ------------------------------------------------------------------ *
 * Jibino data model
 * ------------------------------------------------------------------ */

export type TxType = 'income' | 'expense' | 'investment' | 'goal' | 'loan';

export interface Tx {
  id: string;
  type: TxType;
  /**
   * income: fixed | variable ;
   * investment: asset class (buy) | sell ;
   * goal: deposit | withdraw ;
   * loan: payment (پرداخت قسط) | principal (دریافت اصل وام)
   */
  kind: string;
  category: string;
  title: string;
  amount: number;
  /** ISO yyyy-mm-dd */
  date: string;
  note?: string;
  /**
   * پیوند اختیاری با رکورد مرتبط (وام / هدف / دارایی).
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
  cash: number;
  txs: Tx[];
  assets: Asset[];
  loans: Loan[];
  goals: Goal[];
  tests: TestsState;
}
