/* تست‌های اجرایی — موتور نقد اتمیک store (فاز ۱۴)
 * رگرسیون هر ۸ باگ «یکپارچگی داده‌های مالی» + قابلیت‌های فاز ۱۳.
 * اینترنت در تست قطع است (fetch رد می‌شود) تا منابع قیمت تداخل نکنند.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { StoreProvider, useStore, type StoreValue } from '../store';
import { valueAssets } from '../analysis';

// قطع اینترنت برای همه تست‌ها — fetch همیشه رد می‌شود
vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline-test'))));

let latest: StoreValue | null = null;
function Probe() {
  latest = useStore();
  return null;
}

function setup() {
  render(
    <StoreProvider>
      <Probe />
    </StoreProvider>
  );
}

const LOAN = {
  title: 'وام تست',
  total: 12_000_000,
  installmentAmount: 1_000_000,
  installmentsTotal: 12,
  dueDay: 1,
};

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

describe('باگ ۸ — موجودی اولیه آنبوردینگ (setCash)', () => {
  it('موجودی اولیه ذخیره و حفظ می‌شود', () => {
    setup();
    act(() => {
      latest!.setCash(5_000_000);
    });
    expect(latest!.cash).toBe(5_000_000);
  });
});

describe('باگ‌های ۱ و ۳ — پرداخت قسط اتمیک (فقط یک بار کسر نقد + ثبت در payments)', () => {
  it('payLoan دقیقاً یک بار نقد کم می‌کند و سند پیوندخورده می‌سازد', () => {
    setup();
    act(() => {
      latest!.addLoan(LOAN, { receiveCash: true });
    });
    expect(latest!.cash).toBe(12_000_000); // اصل وام واریز شد (باگ ۶)
    const loanId = latest!.loans[0].id;

    act(() => {
      latest!.payLoan(loanId, 1_000_000, '2026-09-25');
    });
    // ❌ باگ قدیمی: ۱۲م − ۱م − ۱م = ۱۰م | ✅ رفتار درست: ۱۱م
    expect(latest!.cash).toBe(11_000_000);
    expect(latest!.loans[0].payments).toHaveLength(1);
    const payTx = latest!.txs.find((t) => t.type === 'loan' && t.kind === 'payment');
    expect(payTx).toBeDefined();
    expect(payTx!.link?.type).toBe('loan-payment');
  });

  it('حذف سند قسط، همه اثرها را آینه‌ای برمی‌گرداند (باگ ۷)', () => {
    setup();
    act(() => {
      latest!.addLoan(LOAN, { receiveCash: true });
    });
    act(() => {
      latest!.payLoan(latest!.loans[0].id, 1_000_000, '2026-09-25');
    });
    const payTx = latest!.txs.find((t) => t.kind === 'payment')!;
    act(() => {
      latest!.deleteTx(payTx.id);
    });
    expect(latest!.cash).toBe(12_000_000);
    expect(latest!.loans[0].payments).toHaveLength(0);
    expect(latest!.txs.find((t) => t.kind === 'payment')).toBeUndefined();
  });
});

describe('فاز ۱۳ — گزینه وام قدیمی/جدید', () => {
  it('وام قدیمی (پیش‌فرض جدید) هیچ اثری بر نقد و دفتر ندارد', () => {
    setup();
    act(() => {
      latest!.addLoan(LOAN, { receiveCash: false });
    });
    expect(latest!.cash).toBe(0);
    expect(latest!.txs).toHaveLength(0);
    expect(latest!.loans).toHaveLength(1);
  });

  it('فقط وام جدید اصل را به نقد واریز و سند «دریافت وام» می‌سازد', () => {
    setup();
    act(() => {
      latest!.addLoan(LOAN, { receiveCash: true });
    });
    expect(latest!.cash).toBe(12_000_000);
    const principalTx = latest!.txs.find((t) => t.type === 'loan' && t.kind === 'principal');
    expect(principalTx).toBeDefined();
  });
});

describe('باگ‌های ۲ و ۴ — انتقال به هدف اتمیک', () => {
  it('انتقال: نقد کم + به هدف اضافه + سند دفتر — همه با هم', () => {
    setup();
    act(() => {
      latest!.setCash(10_000_000);
    });
    act(() => {
      latest!.addGoal({ icon: '🎯', title: 'هدف تست', target: 5_000_000 });
    });
    const goalId = latest!.goals[0].id;
    act(() => {
      latest!.transferGoal(goalId, 2_000_000, 'deposit');
    });
    expect(latest!.cash).toBe(8_000_000);
    expect(latest!.goals[0].transfers).toHaveLength(1);
    expect(latest!.goals[0].transfers[0].amount).toBe(2_000_000);
    const tx = latest!.txs.find((t) => t.type === 'goal');
    expect(tx).toBeDefined();
    expect(tx!.link?.type).toBe('goal-transfer');

    // حذف سند → برگشت کامل (باگ ۷)
    act(() => {
      latest!.deleteTx(tx!.id);
    });
    expect(latest!.cash).toBe(10_000_000);
    expect(latest!.goals[0].transfers).toHaveLength(0);
  });

  it('برداشت از هدف: نقد اضافه می‌شود', () => {
    setup();
    act(() => {
      latest!.setCash(10_000_000);
      latest!.addGoal({ icon: '🎯', title: 'هدف تست', target: 5_000_000 });
    });
    act(() => {
      latest!.transferGoal(latest!.goals[0].id, 2_000_000, 'deposit');
      latest!.transferGoal(latest!.goals[0].id, 500_000, 'withdraw');
    });
    expect(latest!.cash).toBe(8_500_000);
    expect(latest!.goals[0].transfers).toHaveLength(2);
  });
});

describe('باگ ۵ — فروش دارایی سند دفتر می‌سازد و برگشت‌پذیر است', () => {
  it('خرید از نقد → فروش → حذف سند فروش: تراز همیشه درست', () => {
    setup();
    act(() => {
      latest!.setCash(100_000_000);
    });
    act(() => {
      latest!.addAsset(
        {
          kind: 'gold',
          name: 'طلای ۱۸ عیار',
          symbol: 'GOLD18',
          unit: 'گرم',
          quantity: 2,
          avgBuy: 20_000_000,
        },
        { fromCash: true }
      );
    });
    expect(latest!.cash).toBe(60_000_000); // ۱۰۰م − ۴۰م
    const assetId = latest!.assets[0].id;

    act(() => {
      latest!.sellAsset(assetId, 1, 24_000_000, '2026-09-25');
    });
    expect(latest!.cash).toBe(84_000_000); // +۲۴م
    expect(latest!.assets[0].quantity).toBe(1);
    const sellTx = latest!.txs.find((t) => t.kind === 'sell')!;
    expect(sellTx).toBeDefined();
    expect(sellTx.link?.type).toBe('asset-sell');

    // حذف سند فروش → مقدار دارایی برمی‌گردد
    act(() => {
      latest!.deleteTx(sellTx.id);
    });
    expect(latest!.assets[0].quantity).toBe(2);
    expect(latest!.cash).toBe(60_000_000);
  });

  it('فروش کامل داراییِ حذف‌شده: حذف سند فروش، دارایی را از snapshot بازسازی می‌کند', () => {
    setup();
    act(() => {
      latest!.setCash(100_000_000);
    });
    act(() => {
      latest!.addAsset(
        {
          kind: 'gold',
          name: 'سکه امامی',
          symbol: 'IMAMI',
          unit: 'عدد',
          quantity: 1,
          avgBuy: 240_000_000,
        },
        { fromCash: true }
      );
    });
    act(() => {
      latest!.sellAsset(latest!.assets[0].id, 1, 245_000_000, '2026-09-25');
    });
    // فروش کامل → دارایی به‌صورت خودکار از فهرست حذف می‌شود (رفتار طراحی‌شده)
    expect(latest!.assets).toHaveLength(0);
    const sellTx = latest!.txs.find((t) => t.kind === 'sell')!;
    act(() => {
      latest!.deleteTx(sellTx.id); // بازسازی از snapshot
    });
    expect(latest!.assets).toHaveLength(1);
    expect(latest!.assets[0].quantity).toBe(1);
    expect(latest!.assets[0].symbol).toBe('IMAMI');
  });
});

describe('حذف دوطرفه رکوردها — تراز کامل', () => {
  it('deleteLoan: وام + همه اسنادش حذف و اثر نقدی برمی‌گردد', () => {
    setup();
    act(() => {
      latest!.addLoan(LOAN, { receiveCash: true });
    });
    act(() => {
      latest!.payLoan(latest!.loans[0].id, 1_000_000, '2026-09-25');
    });
    expect(latest!.cash).toBe(11_000_000);
    act(() => {
      latest!.deleteLoan(latest!.loans[0].id);
    });
    expect(latest!.cash).toBe(0); // ۱۱م − ۱۲م (اصل) + ۱م (قسط) = ۰
    expect(latest!.txs).toHaveLength(0);
    expect(latest!.loans).toHaveLength(0);
  });

  it('deleteGoal و deleteAsset هم اسناد مرتبط را پاک می‌کنند', () => {
    setup();
    act(() => {
      latest!.setCash(100_000_000);
      latest!.addGoal({ icon: '🎯', title: 'هدف', target: 1_000_000 });
    });
    act(() => {
      latest!.transferGoal(latest!.goals[0].id, 500_000, 'deposit');
    });
    act(() => {
      latest!.addAsset(
        { kind: 'currency', name: 'دلار', symbol: 'USD', unit: 'دلار', quantity: 100, avgBuy: 230_000 },
        { fromCash: true }
      );
    });
    expect(latest!.txs.length).toBe(2);
    act(() => {
      latest!.deleteGoal(latest!.goals[0].id);
      latest!.deleteAsset(latest!.assets[0].id);
    });
    expect(latest!.txs).toHaveLength(0);
    expect(latest!.cash).toBe(100_000_000);
  });
});

describe('فاز ۱۳ — قیمت دستی دارایی از طریق store', () => {
  it('updateAsset قیمت دستی را ذخیره و valueAssets ملاک قرار می‌دهد', () => {
    setup();
    act(() => {
      latest!.addAsset({
        kind: 'other',
        name: 'آپارتمان',
        symbol: 'OTHER',
        unit: 'عدد',
        quantity: 1,
        avgBuy: 2_000_000_000,
      });
    });
    act(() => {
      latest!.updateAsset(latest!.assets[0].id, {
        manualPrice: 2_500_000_000,
        manualPriceAt: '2026-09-25',
        useManualPrice: true,
      });
    });
    const a = latest!.assets[0];
    expect(a.manualPrice).toBe(2_500_000_000);
    // اینترنت قطع است → قیمت لحظه‌ای نیست → قیمت دستی ملاک است
    const [v] = valueAssets(latest!.assets, latest!.prices);
    expect(v.priceBasis).toBe('manual');
    expect(v.value).toBe(2_500_000_000);
  });
});

describe('P0 شماره ۳ — پشتیبان‌گیری و بازیابی', () => {
  it('داده‌های ساختگی معتبر جایگزین وضعیت فعلی می‌شوند', () => {
    setup();
    act(() => {
      latest!.setCash(1_000_000);
    });
    const payload = {
      app: 'jibino',
      version: 2,
      state: {
        settings: { name: 'کاربر بازیابی‌شده', onboarded: true },
        cash: 7_777_777,
        txs: [{ id: 't1', type: 'income', kind: 'fixed', category: 'salary', title: 'حقوق', amount: 5_000_000, date: '2026-09-01' }],
        assets: [],
        loans: [],
        goals: [],
        tests: { finance: null, personality: null },
      },
    };
    let res: { ok: boolean; error?: string } | undefined;
    act(() => {
      res = latest!.importBackup(payload);
    });
    expect(res!.ok).toBe(true);
    expect(latest!.cash).toBe(7_777_777);
    expect(latest!.txs).toHaveLength(1);
    expect(latest!.settings.name).toBe('کاربر بازیابی‌شده');
  });

  it('فایل نامعتبر رد می‌شود و داده‌های فعلی دست‌نخورده می‌مانند', () => {
    setup();
    act(() => {
      latest!.setCash(3_000_000);
    });
    let res: { ok: boolean; error?: string } | undefined;
    act(() => {
      res = latest!.importBackup({ foo: 'bar' });
    });
    expect(res!.ok).toBe(false);
    expect(res!.error).toBeDefined();
    expect(latest!.cash).toBe(3_000_000);
  });
});

describe('تراکنش‌های خام addTx — اثر نقدی آینه‌ای', () => {
  it('درآمد/هزینه و حذف آن‌ها', () => {
    setup();
    act(() => {
      latest!.addTx({ type: 'income', kind: 'fixed', category: 'salary', title: 'حقوق', amount: 10_000_000, date: '2026-09-01' });
    });
    expect(latest!.cash).toBe(10_000_000);
    const id = latest!.txs[0].id;
    act(() => {
      latest!.deleteTx(id);
    });
    expect(latest!.cash).toBe(0);

    act(() => {
      latest!.addTx({ type: 'expense', kind: 'food', category: 'food', title: 'خرید', amount: 2_000_000, date: '2026-09-02' });
    });
    expect(latest!.cash).toBe(-2_000_000); // اجازه منفی برای گزارش؛ UI جلویش را می‌گیرد
  });
});
