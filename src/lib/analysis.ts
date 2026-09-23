/* ------------------------------------------------------------------ *
 * Analysis engine — net worth, cash flow, health scores, insights
 * ------------------------------------------------------------------ */

import type { AppState, Asset, PriceState, Tx } from './types';
import { compact, monthKey, monthStart, pct, daysAgoISO, fmt } from './format';
import { priceForAsset } from './prices';

export interface ValuedAsset extends Asset {
  livePrice: number | null;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  live: boolean;
}

export function valueAssets(assets: Asset[], prices: PriceState): ValuedAsset[] {
  return assets.map((a) => {
    const { toman } = priceForAsset(prices, a.kind, a.symbol);
    const livePrice = toman;
    const unitPrice = livePrice ?? a.avgBuy;
    const value = a.quantity * unitPrice;
    const cost = a.quantity * a.avgBuy;
    return {
      ...a,
      livePrice,
      value,
      cost,
      pnl: value - cost,
      pnlPct: cost > 0 ? (value - cost) / cost : 0,
      live: livePrice !== null,
    };
  });
}

export interface NetWorth {
  cash: number;
  investments: number;
  goals: number;
  debts: number;
  net: number;
  investedCost: number;
  pnl: number;
  pnlPct: number;
  byClass: { key: string; label: string; value: number; color: string }[];
}

export function computeNetWorth(state: AppState, prices: PriceState): NetWorth {
  const valued = valueAssets(state.assets, prices);
  const investments = valued.reduce((s, a) => s + a.value, 0);
  const investedCost = valued.reduce((s, a) => s + a.cost, 0);
  const goals = state.goals.reduce(
    (s, g) =>
      s + g.transfers.reduce((t, x) => t + (x.kind === 'deposit' ? x.amount : -x.amount), 0),
    0
  );
  const debts = state.loans.reduce((s, l) => {
    const paid = l.payments.reduce((t, p) => t + p.amount, 0);
    return s + Math.max(0, l.total - paid);
  }, 0);

  const classValue = (kind: string) =>
    valued.filter((a) => a.kind === kind).reduce((s, a) => s + a.value, 0);

  return {
    cash: state.cash,
    investments,
    goals,
    debts,
    net: state.cash + investments + goals - debts,
    investedCost,
    pnl: investments - investedCost,
    pnlPct: investedCost > 0 ? (investments - investedCost) / investedCost : 0,
    byClass: [
      { key: 'cash', label: 'نقد', value: state.cash, color: '#2f9c78' },
      { key: 'gold', label: 'طلا', value: classValue('gold'), color: '#c08d2c' },
      { key: 'currency', label: 'ارز', value: classValue('currency'), color: '#4a86b4' },
      { key: 'crypto', label: 'رمزارز', value: classValue('crypto'), color: '#7161c4' },
      { key: 'other', label: 'سایر', value: classValue('other'), color: '#9a8fb8' },
      { key: 'goals', label: 'پس‌انداز اهداف', value: goals, color: '#cd6a58' },
    ].filter((c) => c.value > 0),
  };
}

export interface PeriodSummary {
  income: number;
  fixedIncome: number;
  variableIncome: number;
  expense: number;
  investment: number;
  goalDeposit: number;
  goalWithdraw: number;
  loanPaid: number;
  assetSell: number;
  netFlow: number;
  savingsRate: number;
  investRate: number;
  count: number;
}

export function summarize(txs: Tx[], from?: string, to?: string): PeriodSummary {
  const inRange = txs.filter((t) => (!from || t.date >= from) && (!to || t.date <= to));
  const sum = (fn: (t: Tx) => number) => inRange.reduce((s, t) => s + fn(t), 0);

  const income = sum((t) => (t.type === 'income' ? t.amount : 0));
  const fixedIncome = sum((t) => (t.type === 'income' && t.kind === 'fixed' ? t.amount : 0));
  const expense = sum((t) => (t.type === 'expense' ? t.amount : 0));
  const investment = sum((t) => (t.type === 'investment' && t.kind !== 'sell' ? t.amount : 0));
  const goalDeposit = sum((t) => (t.type === 'goal' && t.kind === 'deposit' ? t.amount : 0));
  const loanPaid = sum((t) => (t.type === 'loan' ? t.amount : 0));
  const assetSell = sum((t) => (t.type === 'investment' && t.kind === 'sell' ? t.amount : 0));
  const goalWithdraw = sum((t) => (t.type === 'goal' && t.kind === 'withdraw' ? t.amount : 0));

  return {
    income,
    fixedIncome,
    variableIncome: income - fixedIncome,
    expense,
    investment,
    goalDeposit,
    goalWithdraw,
    loanPaid,
    assetSell,
    // Investments & goal transfers are NOT expenses — they are allocation of cash.
    netFlow: income - expense,
    savingsRate: income > 0 ? Math.max(0, income - expense) / income : 0,
    investRate: income > 0 ? (investment + goalDeposit) / income : 0,
    count: inRange.length,
  };
}

export interface MonthPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  investment: number;
  net: number;
}

export function lastMonths(txs: Tx[], count = 6): MonthPoint[] {
  const out: MonthPoint[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d.toISOString().slice(0, 10));
    const monthTxs = txs.filter((t) => t.date.startsWith(key));
    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const investment = monthTxs
      .filter((t) => t.type === 'investment' && t.kind !== 'sell')
      .reduce((s, t) => s + t.amount, 0);
    out.push({
      key,
      label: monthLabel(d),
      income,
      expense,
      investment,
      net: income - expense,
    });
  }
  return out;
}

const G_MONTHS = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر',
];
function monthLabel(d: Date): string {
  return G_MONTHS[d.getMonth()] ?? '';
}

export interface CategorySlice {
  key: string;
  label: string;
  value: number;
  color: string;
  share: number;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  food: { label: 'خوراک', color: '#2f9c78' },
  transport: { label: 'حمل‌ونقل', color: '#4a86b4' },
  housing: { label: 'مسکن', color: '#c08d2c' },
  bills: { label: 'قبوض', color: '#cd6a58' },
  health: { label: 'سلامت', color: '#7161c4' },
  clothing: { label: 'پوشاک', color: '#d98ba1' },
  fun: { label: 'تفریح', color: '#59a5c9' },
  education: { label: 'آموزش', color: '#7bab6b' },
  shopping: { label: 'خرید', color: '#e0a35c' },
  other: { label: 'سایر', color: '#9a8fb8' },
};

export const EXPENSE_CATEGORIES = Object.entries(CATEGORY_META).map(([key, v]) => ({
  key,
  ...v,
}));

export function categoryLabel(key: string): string {
  return CATEGORY_META[key]?.label ?? key;
}

export function categoryColor(key: string): string {
  return CATEGORY_META[key]?.color ?? '#9a8fb8';
}

export function expenseByCategory(txs: Tx[], from?: string, to?: string): CategorySlice[] {
  const map = new Map<string, number>();
  txs
    .filter((t) => t.type === 'expense' && (!from || t.date >= from) && (!to || t.date <= to))
    .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));
  const total = [...map.values()].reduce((s, v) => s + v, 0) || 1;
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      label: categoryLabel(key),
      value,
      color: categoryColor(key),
      share: value / total,
    }))
    .sort((a, b) => b.value - a.value);
}

export function investmentByType(assets: Asset[], prices: PriceState): CategorySlice[] {
  const valued = valueAssets(assets, prices);
  const map = new Map<string, { label: string; value: number; color: string }>();
  const meta: Record<string, { label: string; color: string }> = {
    gold: { label: 'طلا و سکه', color: '#c08d2c' },
    currency: { label: 'ارز', color: '#4a86b4' },
    crypto: { label: 'رمزارز', color: '#7161c4' },
    other: { label: 'سایر دارایی‌ها', color: '#9a8fb8' },
  };
  valued.forEach((a) => {
    const m = meta[a.kind] ?? meta.other;
    const prev = map.get(a.kind);
    map.set(a.kind, {
      label: m.label,
      value: (prev?.value ?? 0) + a.value,
      color: m.color,
    });
  });
  const total = [...map.values()].reduce((s, v) => s + v.value, 0) || 1;
  return [...map.entries()]
    .map(([key, v]) => ({ key, ...v, share: v.value / total }))
    .sort((a, b) => b.value - a.value);
}

/* --------------------------- health scores -------------------------- */

export interface HealthMetric {
  key: string;
  label: string;
  value: string;
  score: number;
  hint: string;
  good: boolean | null;
}

export interface HealthReport {
  score: number;
  label: string;
  metrics: HealthMetric[];
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'عالی';
  if (score >= 70) return 'خوب';
  if (score >= 50) return 'متوسط';
  if (score >= 30) return 'نیازمند توجه';
  return 'ضعیف';
}

export function financialHealth(state: AppState, prices: PriceState): HealthReport {
  const threeMonthsAgo = daysAgoISO(90);
  const recent = summarize(state.txs, threeMonthsAgo);
  const nw = computeNetWorth(state, prices);

  const avgMonthlyExpense = recent.expense > 0 ? recent.expense / 3 : 0;
  const emergencyMonths = avgMonthlyExpense > 0 ? state.cash / avgMonthlyExpense : 6;
  const monthlyIncome = recent.income / 3;
  const debtRatio = monthlyIncome > 0 ? recent.loanPaid / 3 / monthlyIncome : 0;
  const goalProgress =
    state.goals.length > 0
      ? state.goals.reduce((s, g) => {
          const saved = g.transfers.reduce(
            (t, x) => t + (x.kind === 'deposit' ? x.amount : -x.amount),
            0
          );
          return s + Math.min(1, g.target > 0 ? saved / g.target : 0);
        }, 0) / state.goals.length
      : 0;
  const expenseValues = lastMonths(state.txs, 4).map((m) => m.expense);
  const expenseMean = expenseValues.reduce((s, v) => s + v, 0) / (expenseValues.length || 1);
  const expenseVariance =
    expenseValues.reduce((s, v) => s + (v - expenseMean) ** 2, 0) / (expenseValues.length || 1);
  const stability =
    expenseMean > 0 ? Math.min(1, 1 - Math.sqrt(expenseVariance) / expenseMean) : 0.6;
  const investShare = nw.net > 0 ? nw.investments / nw.net : 0;

  const metrics: HealthMetric[] = [
    {
      key: 'savings',
      label: 'نرخ پس‌انداز',
      value: recent.income > 0 ? pct(Math.max(0, recent.savingsRate)) : '—',
      score: Math.min(100, Math.max(0, recent.savingsRate * 250)),
      hint: 'هدف طلایی: حداقل ۲۰٪ درآمد پیش از خرج کنار گذاشته شود.',
      good: recent.savingsRate >= 0.2,
    },
    {
      key: 'emergency',
      label: 'صندوق اضطراری',
      value: `${compact(Math.round(emergencyMonths * 10) / 10)} ماه هزینه`,
      score: Math.min(100, (emergencyMonths / 6) * 100),
      hint: 'معادل ۳ تا ۶ ماه هزینه، نقد یا شبه‌نقد نگه دارید.',
      good: emergencyMonths >= 3,
    },
    {
      key: 'debt',
      label: 'فشار بدهی',
      value: monthlyIncome > 0 ? pct(debtRatio) : '—',
      score: Math.max(0, 100 - debtRatio * 220),
      hint: 'نسبت اقساط به درآمد بالای ۳۰٪ پرریسک است.',
      good: debtRatio <= 0.3,
    },
    {
      key: 'goals',
      label: 'تعهد به اهداف',
      value: state.goals.length ? pct(goalProgress) : '—',
      score: state.goals.length ? goalProgress * 100 : 35,
      hint: 'انتقال منظم و کوچک به هدف، مؤثرتر از مبالغ بزرگ است.',
      good: goalProgress >= 0.5,
    },
    {
      key: 'stability',
      label: 'ثبات هزینه‌ها',
      value: pct(stability),
      score: stability * 100,
      hint: 'هزینه‌های قابل‌پیش‌بینی، برنامه‌ریزی مالی را آسان می‌کند.',
      good: stability >= 0.6,
    },
    {
      key: 'invest',
      label: 'سهم سرمایه‌گذاری',
      value: nw.net > 0 ? pct(investShare) : '—',
      score: Math.min(100, investShare * 160),
      hint: 'بخشی از دارایی خالص باید در برابر تورم سرمایه‌گذاری شود.',
      good: investShare >= 0.25,
    },
  ];

  const weights: Record<string, number> = {
    savings: 1.25,
    emergency: 1.15,
    debt: 1.1,
    goals: 0.85,
    stability: 0.8,
    invest: 1.1,
  };
  const totalWeight = metrics.reduce((s, m) => s + (weights[m.key] ?? 1), 0);
  const score = Math.round(
    metrics.reduce((s, m) => s + m.score * (weights[m.key] ?? 1), 0) / totalWeight
  );

  return { score, label: scoreLabel(score), metrics };
}

export function investmentHealth(state: AppState, prices: PriceState): HealthReport {
  const valued = valueAssets(state.assets, prices);
  const nw = computeNetWorth(state, prices);
  const total = valued.reduce((s, a) => s + a.value, 0);

  const classes = new Set(valued.filter((a) => a.value > 0).map((a) => a.kind));
  const diversification = Math.min(1, classes.size / 4);
  const cryptoShare =
    total > 0
      ? valued.filter((a) => a.kind === 'crypto').reduce((s, a) => s + a.value, 0) / total
      : 0;
  const performance = nw.pnlPct;
  const liveShare =
    total > 0 ? valued.filter((a) => a.live).reduce((s, a) => s + a.value, 0) / total : 1;
  const liquidShare = nw.net > 0 ? state.cash / nw.net : 1;

  const metrics: HealthMetric[] = [
    {
      key: 'diversity',
      label: 'تنوع سبد',
      value: `${classes.size} طبقه دارایی`,
      score: diversification * 100,
      hint: 'تنوع بیشتر، نوسان کمتر و آرامش بیشتر در ریزش بازار.',
      good: classes.size >= 2,
    },
    {
      key: 'crypto',
      label: 'تمرکز رمزارز',
      value: total > 0 ? pct(cryptoShare) : '—',
      score:
        cryptoShare <= 0.35
          ? 100 - cryptoShare * 60
          : Math.max(10, 70 - (cryptoShare - 0.35) * 160),
      hint: 'سهم رمزارز بالای ۳۵٪ سبد، نوسان پرتفوی را شدیداً بالا می‌برد.',
      good: cryptoShare <= 0.35,
    },
    {
      key: 'perf',
      label: 'بازده سبد',
      value: valued.length ? pct(performance) : '—',
      score: valued.length ? Math.max(0, Math.min(100, 55 + performance * 120)) : 30,
      hint: 'بازده نسبت به قیمت تمام‌شده خرید محاسبه می‌شود.',
      good: performance >= 0,
    },
    {
      key: 'fresh',
      label: 'به‌روز بودن قیمت‌ها',
      value: total > 0 ? pct(liveShare) : '—',
      score: total > 0 ? liveShare * 100 : 60,
      hint: 'قیمت لحظه‌ای دارایی‌ها، دقت تحلیل‌ها را بالا می‌برد.',
      good: liveShare >= 0.8,
    },
    {
      key: 'liquidity',
      label: 'نقدینگی',
      value: nw.net > 0 ? pct(liquidShare) : '—',
      score:
        liquidShare >= 0.1 && liquidShare <= 0.6 ? 90 : liquidShare > 0.6 ? 62 : 45,
      hint: 'نه آن‌قدر نقد که تورم از بین ببرد، نه آن‌قدر سرمایه‌گذاری که نیاز فوری گیر کند.',
      good: liquidShare >= 0.1 && liquidShare <= 0.6,
    },
  ];

  const score = Math.round(metrics.reduce((s, m) => s + m.score, 0) / (metrics.length || 1));
  return { score, label: scoreLabel(score), metrics };
}

/* ----------------------------- insights ----------------------------- */

export interface Insight {
  id: string;
  tone: 'good' | 'warn' | 'info';
  text: string;
}

export function buildInsights(state: AppState, prices: PriceState): Insight[] {
  const out: Insight[] = [];
  const threeMonthsAgo = daysAgoISO(90);
  const recent = summarize(state.txs, threeMonthsAgo);
  const nw = computeNetWorth(state, prices);

  if (recent.income > 0) {
    const variableShare = recent.variableIncome / recent.income;
    if (variableShare > 0.4) {
      out.push({
        id: 'variable-income',
        tone: 'info',
        text: `حدود ${pct(variableShare)} درآمد سه ماه اخیر شما متغیر است؛ برای درآمد نامنظم، صندوق اضطراری بزرگ‌تر (۶ ماه) توصیه می‌شود.`,
      });
    } else if (recent.fixedIncome > 0) {
      out.push({
        id: 'fixed-income',
        tone: 'good',
        text: 'درآمد شما عمدتاً ثابت و قابل‌پیش‌بینی است؛ بهترین شرایط برای پس‌انداز خودکار ابتدای ماه.',
      });
    }
    if (recent.savingsRate >= 0.2) {
      out.push({
        id: 'savings-good',
        tone: 'good',
        text: `نرخ پس‌انداز ${pct(recent.savingsRate)} فوق‌العاده است؛ همین روند را حفظ کنید.`,
      });
    } else if (recent.savingsRate < 0.1) {
      out.push({
        id: 'savings-low',
        tone: 'warn',
        text: 'نرخ پس‌انداز سه ماه اخیر زیر ۱۰٪ است؛ سه دسته پرهزینه را در گزارش‌ها بررسی و یکی را ۲۰٪ کوچک کنید.',
      });
    }
  } else {
    out.push({
      id: 'no-income',
      tone: 'info',
      text: 'درآمدی در سه ماه اخیر ثبت نشده است؛ درآمدهای ثابت و متغیر خود را ثبت کنید تا تحلیل دقیق‌تر شود.',
    });
  }

  const topCat = expenseByCategory(state.txs, threeMonthsAgo)[0];
  if (topCat && topCat.share > 0.28) {
    out.push({
      id: 'top-category',
      tone: 'warn',
      text: `حدود ${pct(topCat.share)} هزینه‌های سه ماه اخیر در دسته «${topCat.label}» بوده است؛ این دسته بهترین جا برای بهینه‌سازی است.`,
    });
  }

  if (state.assets.length > 0 && nw.investments > 0) {
    const crypto = nw.byClass.find((c) => c.key === 'crypto')?.value ?? 0;
    const cryptoShare = crypto / nw.investments;
    if (cryptoShare > 0.45) {
      out.push({
        id: 'crypto-heavy',
        tone: 'warn',
        text: `${pct(cryptoShare)} سبد سرمایه‌گذاری شما رمزارز است؛ برای کاهش نوسان، بخشی را به طلا یا ارز منتقل کنید.`,
      });
    }
    if (nw.pnl > 0) {
      out.push({
        id: 'pnl-good',
        tone: 'good',
        text: `ارزش فعلی سبد سرمایه‌گذاری شما ${compact(nw.pnl)} تومان بالاتر از قیمت تمام‌شده خرید است.`,
      });
    }
  } else {
    out.push({
      id: 'no-invest',
      tone: 'info',
      text: 'هنوز دارایی ثبت نکرده‌اید؛ از بخش دارایی‌ها، طلا، ارز یا رمزارز خود را اضافه کنید تا ارزش لحظه‌ای آن محاسبه شود.',
    });
  }

  const activeLoans = state.loans.filter((l) => {
    const paid = l.payments.reduce((s, p) => s + p.amount, 0);
    return paid < l.total;
  });
  if (activeLoans.length > 0 && recent.income > 0) {
    const monthlyInstallment = activeLoans.reduce((s, l) => s + l.installmentAmount, 0);
    const ratio = monthlyInstallment / (recent.income / 3);
    if (ratio > 0.3) {
      out.push({
        id: 'debt-high',
        tone: 'warn',
        text: `اقساط ماهانه حدود ${pct(ratio)} درآمد شماست؛ از گرفتن وام جدید پرهیز کنید.`,
      });
    }
  }

  if (!state.goals.length) {
    out.push({
      id: 'no-goals',
      tone: 'info',
      text: 'یک هدف مالی مشخص (مثلاً خرید لپ‌تاپ یا پس‌انداز اضطراری) با مبلغ معین بسازید؛ انتقال منظم به هدف، انگیزه پس‌انداز را چند برابر می‌کند.',
    });
  }

  return out.slice(0, 6);
}

/** Format a big number for chart tooltips / axis labels. */
export function axisLabel(value: number): string {
  if (Math.abs(value) >= 1e6) return compact(value);
  return fmt(value);
}

/** Month-start ISO for a number of months ago. */
export function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return monthStart(d);
}
