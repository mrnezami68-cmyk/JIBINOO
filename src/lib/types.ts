/* ------------------------------------------------------------------ *
 * Jibino data model
 * ------------------------------------------------------------------ */

export type TxType = 'income' | 'expense' | 'investment' | 'goal' | 'loan';

export interface Tx {
  id: string;
  type: TxType;
  /** income: fixed | variable ; investment: asset class ; goal: deposit | withdraw */
  kind: string;
  category: string;
  title: string;
  amount: number;
  /** ISO yyyy-mm-dd */
  date: string;
  note?: string;
}

export type AssetKind = 'gold' | 'currency' | 'crypto' | 'other';

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

export type PriceSource = 'coingecko' | 'live-rate' | 'manual' | 'fallback';

export interface LivePrice {
  id: string;
  label: string;
  symbol: string;
  usd: number | null;
  toman: number | null;
  change24h: number | null;
  source: PriceSource;
  spark: number[];
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
