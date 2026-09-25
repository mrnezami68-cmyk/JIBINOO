/* تست‌های اجرایی — موتور تحلیل (فاز ۱۴): summarize / valueAssets / computeNetWorth */
import { describe, expect, it } from 'vitest';
import type { AppState, PriceState, Tx } from '../types';
import { summarize, valueAssets, computeNetWorth, lastMonths } from '../analysis';

function tx(partial: Partial<Tx> & { type: Tx['type'] }): Tx {
  return {
    id: Math.random().toString(36).slice(2),
    kind: 'other',
    category: 'other',
    title: 'تست',
    amount: 0,
    date: '2026-09-25',
    ...partial,
  } as Tx;
}

describe('summarize — تفکیک درست انواع تراکنش', () => {
  const txs: Tx[] = [
    tx({ type: 'income', kind: 'fixed', amount: 10_000_000, date: '2026-09-01' }),
    tx({ type: 'income', kind: 'variable', amount: 5_000_000, date: '2026-09-02' }),
    tx({ type: 'expense', amount: 4_000_000, date: '2026-09-03' }),
    tx({ type: 'investment', kind: 'gold', amount: 2_000_000, date: '2026-09-04' }),
    tx({ type: 'investment', kind: 'sell', amount: 3_000_000, date: '2026-09-05' }),
    tx({ type: 'goal', kind: 'deposit', amount: 1_000_000, date: '2026-09-06' }),
    tx({ type: 'goal', kind: 'withdraw', amount: 500_000, date: '2026-09-07' }),
    tx({ type: 'loan', kind: 'payment', amount: 1_500_000, date: '2026-09-08' }),
    tx({ type: 'loan', kind: 'principal', amount: 50_000_000, date: '2026-09-09' }),
  ];

  it('اقساط و اصل وام از هم جدا می‌شوند (اصلاح فاز ۲)', () => {
    const s = summarize(txs);
    expect(s.income).toBe(15_000_000);
    expect(s.expense).toBe(4_000_000);
    // اصل وام دریافتی هرگز «قسط پرداختی» حساب نمی‌شود
    expect(s.loanPaid).toBe(1_500_000);
    expect(s.loanReceived).toBe(50_000_000);
  });

  it('سرمایه‌گذاری و انتقال هدف هزینه محسوب نمی‌شوند', () => {
    const s = summarize(txs);
    expect(s.investment).toBe(2_000_000); // فقط خرید؛ فروش جدا حساب می‌شود
    expect(s.assetSell).toBe(3_000_000);
    expect(s.goalDeposit).toBe(1_000_000);
    expect(s.goalWithdraw).toBe(500_000);
    expect(s.netFlow).toBe(15_000_000 - 4_000_000);
    expect(s.savingsRate).toBeCloseTo(11_000_000 / 15_000_000, 5);
  });

  it('فیلتر بازه تاریخ رعایت می‌شود', () => {
    const s = summarize(txs, '2026-09-03', '2026-09-05');
    expect(s.count).toBe(3);
    expect(s.expense).toBe(4_000_000);
  });
});

describe('valueAssets — اولویت قیمت: دستی فعال ← لحظه‌ای ← قیمت خرید (فاز ۱۳)', () => {
  const prices = {
    usdToman: 234_615,
    usdTomanSource: 'tgju',
    gold18Toman: 24_124_600,
    gold18Source: 'tgju',
    items: {
      gold18: { id: 'gold18', toman: 24_124_600, source: 'tgju' },
    },
    updatedAt: 1,
    loading: false,
    error: null,
    sources: [],
  } as unknown as PriceState;

  it('دارایی با قیمت لحظه‌ای → مبنای live', () => {
    const [a] = valueAssets(
      [
        {
          id: 'g1',
          kind: 'gold',
          name: 'طلای ۱۸',
          symbol: 'GOLD18',
          unit: 'گرم',
          quantity: 2,
          avgBuy: 20_000_000,
          createdAt: '2026-01-01',
        },
      ],
      prices
    );
    expect(a.priceBasis).toBe('live');
    expect(a.value).toBe(2 * 24_124_600);
    expect(a.pnl).toBe(2 * 24_124_600 - 2 * 20_000_000);
  });

  it('دارایی بدون قیمت روز (ملک/خودرو) با قیمت دستی → مبنای manual', () => {
    const [a] = valueAssets(
      [
        {
          id: 'p1',
          kind: 'other',
          name: 'آپارتمان',
          symbol: 'OTHER',
          unit: 'عدد',
          quantity: 1,
          avgBuy: 2_000_000_000,
          manualPrice: 2_500_000_000,
          manualPriceAt: '2026-09-25',
          createdAt: '2026-01-01',
        },
      ],
      prices
    );
    expect(a.priceBasis).toBe('manual');
    expect(a.value).toBe(2_500_000_000);
    expect(a.live).toBe(false);
  });

  it('قیمت دستی + useManualPrice حتی با وجود قیمت لحظه‌ای ملاک است', () => {
    const [a] = valueAssets(
      [
        {
          id: 'g2',
          kind: 'gold',
          name: 'طلای دست‌ساز',
          symbol: 'GOLD18',
          unit: 'گرم',
          quantity: 1,
          avgBuy: 20_000_000,
          manualPrice: 22_000_000,
          useManualPrice: true,
          createdAt: '2026-01-01',
        },
      ],
      prices
    );
    expect(a.priceBasis).toBe('manual');
    expect(a.unitPrice).toBe(22_000_000);
  });

  it('بدون قیمت لحظه‌ای و بدون قیمت دستی → مبنای cost', () => {
    const [a] = valueAssets(
      [
        {
          id: 'o1',
          kind: 'other',
          name: 'دارایی دیگر',
          symbol: 'OTHER',
          unit: 'عدد',
          quantity: 3,
          avgBuy: 1_000_000,
          createdAt: '2026-01-01',
        },
      ],
      prices
    );
    expect(a.priceBasis).toBe('cost');
    expect(a.value).toBe(3_000_000);
  });
});

describe('computeNetWorth — تراز کامل', () => {
  it('خالص = نقد + سرمایه‌گذاری + اهداف − بدهی', () => {
    const state = {
      settings: { name: 'تست' },
      cash: 10_000_000,
      txs: [],
      assets: [
        {
          id: 'a',
          kind: 'gold',
          name: 'طلا',
          symbol: 'GOLD18',
          unit: 'گرم',
          quantity: 1,
          avgBuy: 20_000_000,
          createdAt: '2026-01-01',
        },
      ],
      loans: [
        {
          id: 'l1',
          title: 'وام',
          total: 12_000_000,
          installmentAmount: 1_000_000,
          installmentsTotal: 12,
          dueDay: 1,
          createdAt: '2026-01-01',
          payments: [{ id: 'p1', amount: 2_000_000, date: '2026-08-01' }],
        },
      ],
      goals: [
        {
          id: 'g1',
          icon: '🎯',
          title: 'هدف',
          target: 10_000_000,
          createdAt: '2026-01-01',
          transfers: [
            { id: 't1', amount: 3_000_000, date: '2026-08-01', kind: 'deposit' },
            { id: 't2', amount: 1_000_000, date: '2026-08-02', kind: 'withdraw' },
          ],
        },
      ],
      tests: { finance: null, personality: null },
    } as unknown as AppState;
    const prices = {
      usdToman: 1,
      usdTomanSource: 'tgju',
      gold18Toman: 22_000_000,
      gold18Source: 'tgju',
      items: { gold18: { id: 'gold18', toman: 22_000_000, source: 'tgju' } },
      updatedAt: 1,
      loading: false,
      error: null,
      sources: [],
    } as unknown as PriceState;

    const nw = computeNetWorth(state, prices);
    expect(nw.cash).toBe(10_000_000);
    expect(nw.investments).toBe(22_000_000);
    expect(nw.goals).toBe(2_000_000);
    expect(nw.debts).toBe(10_000_000); // ۱۲م − ۲م پرداخت‌شده
    expect(nw.net).toBe(10_000_000 + 22_000_000 + 2_000_000 - 10_000_000);
  });
});

describe('lastMonths — کلید ماه با برچسب ماه هماهنگ است (باگ P0)', () => {
  it('برای ماه جاری، کلید yyyy-mm ماه جاری محلی است', () => {
    const months = lastMonths([], 1);
    const now = new Date();
    const expectedKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(months[0].key).toBe(expectedKey);
  });
});
