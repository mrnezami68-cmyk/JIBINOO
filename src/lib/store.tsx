import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppState,
  Asset,
  Goal,
  Loan,
  PriceState,
  Settings,
  TestResult,
  TestsState,
  Tx,
} from './types';
import { fetchLivePrices, initialPrices } from './prices';
import { todayISO, uid } from './format';

const STORAGE_KEY = 'jibino.state.v2';

const defaultSettings: Settings = {
  name: '',
  monthlyFixedIncome: 0,
  onboarded: false,
  pinEnabled: false,
  pin: null,
  biometric: false,
  manualUsd: null,
  manualGold18: null,
};

const defaultState: AppState = {
  settings: defaultSettings,
  cash: 0,
  txs: [],
  assets: [],
  loans: [],
  goals: [],
  tests: { finance: null, personality: null },
};

/**
 * اثر هر تراکنش روی موجودی نقد (مثبت = واریز، منفی = برداشت).
 * تنها مرجع محاسبه جابه‌جایی نقد — هم ثبت و هم حذف/برگشت از همین تابع استفاده می‌کنند
 * تا اثرها همیشه دقیقاً آینه یکدیگر باشند (باگ‌های ۱ تا ۷).
 */
function cashDelta(tx: Pick<Tx, 'type' | 'kind' | 'amount'>): number {
  const amount = Number(tx.amount) || 0;
  if (tx.type === 'income') return amount;
  if (tx.type === 'expense') return -amount;
  if (tx.type === 'investment') return tx.kind === 'sell' ? amount : -amount;
  if (tx.type === 'goal') return tx.kind === 'withdraw' ? amount : -amount;
  if (tx.type === 'loan') return tx.kind === 'principal' ? amount : -amount;
  return 0;
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return sanitizeState(JSON.parse(raw) as Partial<AppState>);
  } catch {
    return defaultState;
  }
}

/**
 * اعتبارسنجی و پاک‌سازی داده‌ی خام (از localStorage یا فایل پشتیبان).
 * مقادیر ناقص/نامعتبر با مقادیر پیش‌فرض جایگزین می‌شوند تا برنامه هرگز روی داده خراب نشکند.
 */
function sanitizeState(parsed: Partial<AppState> | null | undefined): AppState {
  if (!parsed || typeof parsed !== 'object') {
    return { ...defaultState, settings: { ...defaultSettings } };
  }
  return {
    settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    cash: Number(parsed.cash) || 0,
    txs: Array.isArray(parsed.txs) ? parsed.txs : [],
    assets: Array.isArray(parsed.assets) ? parsed.assets : [],
    loans: Array.isArray(parsed.loans) ? parsed.loans : [],
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    tests: {
      finance: parsed.tests?.finance ?? null,
      personality: parsed.tests?.personality ?? null,
    },
  };
}

/** API عمومی store — برای مصرف در کامپوننت‌ها و تست‌ها */
export interface StoreValue {
  state: AppState;
  settings: Settings;
  cash: number;
  txs: Tx[];
  assets: Asset[];
  loans: Loan[];
  goals: Goal[];
  tests: TestsState;
  prices: PriceState;
  refreshing: boolean;
  refreshPrices: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  /** تنظیم مستقیم موجودی نقد (موجودی اولیه آنبوردینگ — باگ شماره ۸) */
  setCash: (amount: number) => void;
  addTx: (tx: Omit<Tx, 'id'>) => void;
  deleteTx: (id: string) => void;
  addAsset: (
    asset: Omit<Asset, 'id' | 'createdAt'>,
    opts?: { fromCash?: boolean; date?: string }
  ) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  sellAsset: (id: string, quantity: number, unitPrice: number, date?: string) => void;
  deleteAsset: (id: string) => void;
  addLoan: (
    loan: Omit<Loan, 'id' | 'createdAt' | 'payments'>,
    opts?: { receiveCash?: boolean; date?: string }
  ) => void;
  /** پرداخت قسط — اتمیک: کسر نقد + ثبت در payments + سند دفتر (بدون addTx جداگانه) */
  payLoan: (
    loanId: string,
    amount: number,
    date: string,
    opts?: { title?: string; note?: string }
  ) => void;
  deleteLoan: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'transfers'>) => void;
  /** انتقال به/از هدف — اتمیک: جابه‌جایی نقد + ثبت در transfers + سند دفتر */
  transferGoal: (
    goalId: string,
    amount: number,
    kind: 'deposit' | 'withdraw',
    opts?: { date?: string; title?: string; note?: string }
  ) => void;
  deleteGoal: (id: string) => void;
  saveTest: (which: 'finance' | 'personality', result: TestResult) => void;
  resetAll: () => void;
  /**
   * بازیابی کامل داده‌ها از فایل پشتیبان (P0 شماره ۳ — جلوگیری از گم شدن داده مالی).
   * کل وضعیت فعلی را با فایل جایگزین می‌کند؛ خروجی ok/error برای نمایش در UI.
   */
  importBackup: (raw: unknown) => { ok: boolean; error?: string };
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [prices, setPrices] = useState<PriceState>(() => initialPrices());
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  const pricesRef = useRef(prices);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / private mode */
    }
  }, [state]);

  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    setPrices((p) => ({ ...p, loading: true }));
    try {
      const next = await fetchLivePrices(state.settings.manualUsd, state.settings.manualGold18);
      setPrices(next);
    } catch {
      setPrices((p) => ({ ...p, loading: false, error: 'ارتباط با منابع قیمت برقرار نشد' }));
    } finally {
      setRefreshing(false);
    }
  }, [state.settings.manualUsd, state.settings.manualGold18]);

  // نگه‌داشتن آخرین تابع/مقادیر در ref — فقط داخل effect (نه render)
  useEffect(() => {
    refreshRef.current = refreshPrices;
    pricesRef.current = prices;
  });

  // بارگذاری اولیه + به‌روزرسانی خودکار قیمت‌ها (هر ۵ دقیقه و هنگام بازگشت به تب).
  // با ref نگه داشته می‌شود تا تایمر به نرخ‌های دستی تازه دسترسی داشته باشد (رفع باگ closure کهنه).
  useEffect(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      void refreshRef.current?.();
    }
    const timer = window.setInterval(() => void refreshRef.current?.(), 5 * 60 * 1000);
    const onVisible = () => {
      const last = pricesRef.current.updatedAt;
      if (document.visibilityState === 'visible' && (!last || Date.now() - last > 60_000)) {
        void refreshRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const setCash = useCallback((amount: number) => {
    setState((s) => ({ ...s, cash: Math.max(0, Number(amount) || 0) }));
  }, []);

  const addTx = useCallback((tx: Omit<Tx, 'id'>) => {
    const full: Tx = { ...tx, id: uid() };
    setState((s) => ({ ...s, cash: s.cash + cashDelta(full), txs: [full, ...s.txs] }));
  }, []);

  const deleteTx = useCallback((id: string) => {
    setState((s) => {
      const tx = s.txs.find((t) => t.id === id);
      if (!tx) return s;

      // ۱) برگرداندن اثر نقدی (دقیقاً آینه cashDelta)
      const cash = s.cash - cashDelta(tx);

      // ۲) برگرداندن اثر روی رکورد مرتبط (وام / هدف / دارایی) — باگ شماره ۷
      let loans = s.loans;
      let goals = s.goals;
      let assets = s.assets;
      const link = tx.link;
      if (link) {
        if (link.type === 'loan-payment') {
          loans = loans.map((l) =>
            l.id === link.refId
              ? { ...l, payments: l.payments.filter((p) => p.id !== link.subId) }
              : l
          );
        } else if (link.type === 'goal-transfer') {
          goals = goals.map((g) =>
            g.id === link.refId
              ? { ...g, transfers: g.transfers.filter((t) => t.id !== link.subId) }
              : g
          );
        } else if (link.type === 'asset-sell') {
          const snap = link.assetSnapshot;
          const existing = assets.find((a) => a.id === link.refId);
          if (existing) {
            assets = assets.map((a) =>
              a.id === link.refId ? { ...a, quantity: a.quantity + (link.qty ?? 0) } : a
            );
          } else if (link.qty > 0) {
            // دارایی قبلاً کاملاً فروخته/حذف شده بود — بازسازی از snapshot
            assets = [
              {
                id: link.refId,
                createdAt: tx.date,
                kind: snap.kind,
                name: snap.name,
                symbol: snap.symbol,
                unit: snap.unit,
                avgBuy: snap.avgBuy,
                quantity: link.qty,
              },
              ...assets,
            ];
          }
        } else if (link.type === 'asset-buy') {
          assets = assets
            .map((a) =>
              a.id === link.refId
                ? { ...a, quantity: Math.max(0, a.quantity - (link.qty ?? 0)) }
                : a
            )
            .filter((a) => a.quantity > 0.00000001);
        }
        // loan-principal: طبق تعریف، حذف سند «دریافت وام» فقط اثر نقدی را برمی‌گرداند؛
        // پیگیری خود وام در بخش وام‌ها می‌ماند و از آنجا قابل حذف کامل است.
      }

      return { ...s, cash, loans, goals, assets, txs: s.txs.filter((t) => t.id !== id) };
    });
  }, []);

  const addAsset = useCallback(
    (asset: Omit<Asset, 'id' | 'createdAt'>, opts?: { fromCash?: boolean; date?: string }) => {
      setState((s) => {
        const id = uid();
        const date = opts?.date ?? todayISO();
        const total = Math.round((asset.quantity || 0) * (asset.avgBuy || 0));
        // خرید از نقد → سند دفتر با پیوند به دارایی (باگ شماره ۷ — قابل برگشت کامل)
        const txs =
          opts?.fromCash && total > 0
            ? [
                {
                  id: uid(),
                  type: 'investment' as const,
                  kind: asset.kind,
                  category: asset.kind,
                  title: `خرید ${asset.name}`,
                  amount: total,
                  date,
                  note: asset.note,
                  link: {
                    type: 'asset-buy' as const,
                    refId: id,
                    qty: asset.quantity,
                    unitPrice: asset.avgBuy,
                  },
                },
                ...s.txs,
              ]
            : s.txs;
        return {
          ...s,
          cash: opts?.fromCash && total > 0 ? s.cash - total : s.cash,
          assets: [{ ...asset, id, createdAt: date }, ...s.assets],
          txs,
        };
      });
    },
    []
  );

  const updateAsset = useCallback((id: string, patch: Partial<Asset>) => {
    setState((s) => ({
      ...s,
      assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const sellAsset = useCallback(
    (id: string, quantity: number, unitPrice: number, date: string = todayISO()) => {
      setState((s) => {
        const asset = s.assets.find((a) => a.id === id);
        if (!asset || quantity <= 0 || unitPrice <= 0) return s;
        const qty = Math.min(quantity, asset.quantity);
        const proceeds = Math.round(qty * unitPrice);
        // باگ شماره ۵: فروش حالا سند دفتر با پیوند asset-sell ثبت می‌کند
        const tx: Tx = {
          id: uid(),
          type: 'investment',
          kind: 'sell',
          category: asset.kind,
          title: `فروش ${asset.name}`,
          amount: proceeds,
          date,
          link: {
            type: 'asset-sell',
            refId: id,
            qty,
            unitPrice,
            assetSnapshot: {
              kind: asset.kind,
              name: asset.name,
              symbol: asset.symbol,
              unit: asset.unit,
              avgBuy: asset.avgBuy,
            },
          },
        };
        return {
          ...s,
          cash: s.cash + proceeds,
          assets: s.assets
            .map((a) => (a.id === id ? { ...a, quantity: Math.max(0, a.quantity - qty) } : a))
            .filter((a) => a.quantity > 0.00000001),
          txs: [tx, ...s.txs],
        };
      });
    },
    []
  );

  const deleteAsset = useCallback((id: string) => {
    setState((s) => {
      // حذف دارایی = حذف کامل رویداد؛ اسناد خرید/فروش مرتبط هم حذف و اثر نقدی برگردانده می‌شود
      const linked = s.txs.filter(
        (t) =>
          t.link &&
          (t.link.type === 'asset-buy' || t.link.type === 'asset-sell') &&
          t.link.refId === id
      );
      const cash = linked.reduce((c, t) => c - cashDelta(t), s.cash);
      return {
        ...s,
        cash,
        assets: s.assets.filter((a) => a.id !== id),
        txs: s.txs.filter((t) => !linked.includes(t)),
      };
    });
  }, []);

  const addLoan = useCallback(
    (loan: Omit<Loan, 'id' | 'createdAt' | 'payments'>, opts?: { receiveCash?: boolean; date?: string }) => {
      setState((s) => {
        const id = uid();
        const date = opts?.date ?? todayISO();
        const receive = Boolean(opts?.receiveCash) && loan.total > 0;
        // باگ شماره ۶: دریافت اصل وام → واریز به نقد + سند «دریافت وام» با پیوند loan-principal
        const txs = receive
          ? [
              {
                id: uid(),
                type: 'loan' as const,
                kind: 'principal',
                category: 'loan',
                title: `دریافت وام «${loan.title}»`,
                amount: loan.total,
                date,
                link: { type: 'loan-principal' as const, refId: id },
              },
              ...s.txs,
            ]
          : s.txs;
        return {
          ...s,
          cash: receive ? s.cash + loan.total : s.cash,
          loans: [{ ...loan, id, createdAt: date, payments: [] }, ...s.loans],
          txs,
        };
      });
    },
    []
  );

  const payLoan = useCallback(
    (loanId: string, amount: number, date: string, opts?: { title?: string; note?: string }) => {
    setState((s) => {
      const loan = s.loans.find((l) => l.id === loanId);
      if (!loan || amount <= 0) return s;
      const paymentId = uid();
      // اتمیک: کسر نقد دقیقاً یک بار + ثبت در payments + سند دفتر (باگ‌های ۱ و ۳)
      const tx: Tx = {
        id: uid(),
        type: 'loan',
        kind: 'payment',
        category: 'loan',
        title: opts?.title?.trim() || `پرداخت قسط «${loan.title}»`,
        amount,
        date,
        note: opts?.note?.trim() || undefined,
        link: { type: 'loan-payment', refId: loanId, subId: paymentId },
      };
      return {
        ...s,
        cash: s.cash - amount,
        loans: s.loans.map((l) =>
          l.id === loanId ? { ...l, payments: [...l.payments, { id: paymentId, amount, date }] } : l
        ),
        txs: [tx, ...s.txs],
      };
    });
    },
    []
  );

  const deleteLoan = useCallback((id: string) => {
    setState((s) => {
      // حذف وام = حذف کامل رویداد؛ اسناد «دریافت وام» و «اقساط» مرتبط هم حذف و اثر نقدی برمی‌گردد
      const linked = s.txs.filter(
        (t) =>
          t.link &&
          (t.link.type === 'loan-principal' || t.link.type === 'loan-payment') &&
          t.link.refId === id
      );
      const cash = linked.reduce((c, t) => c - cashDelta(t), s.cash);
      return {
        ...s,
        cash,
        loans: s.loans.filter((l) => l.id !== id),
        txs: s.txs.filter((t) => !linked.includes(t)),
      };
    });
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'transfers'>) => {
    setState((s) => ({
      ...s,
      goals: [{ ...goal, id: uid(), createdAt: todayISO(), transfers: [] }, ...s.goals],
    }));
  }, []);

  const transferGoal = useCallback(
    (
      goalId: string,
      amount: number,
      kind: 'deposit' | 'withdraw',
      opts?: { date?: string; title?: string; note?: string }
    ) => {
      setState((s) => {
        const goal = s.goals.find((g) => g.id === goalId);
        if (!goal || amount <= 0) return s;
        const date = opts?.date ?? todayISO();
        const transferId = uid();
        // اتمیک: جابه‌جایی نقد + ثبت در transfers + سند دفتر (باگ‌های ۲ و ۴)
        const tx: Tx = {
          id: uid(),
          type: 'goal',
          kind,
          category: 'goal',
          title:
            opts?.title?.trim() ||
            `${kind === 'deposit' ? 'انتقال به هدف' : 'برداشت از هدف'} «${goal.title}»`,
          amount,
          date,
          note: opts?.note?.trim() || undefined,
          link: { type: 'goal-transfer', refId: goalId, subId: transferId },
        };
        return {
          ...s,
          cash: s.cash + (kind === 'deposit' ? -amount : amount),
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, transfers: [...g.transfers, { id: transferId, amount, date, kind }] }
              : g
          ),
          txs: [tx, ...s.txs],
        };
      });
    },
    []
  );

  const deleteGoal = useCallback((id: string) => {
    setState((s) => {
      // حذف هدف = حذف کامل رویداد؛ اسناد انتقال مرتبط هم حذف و اثر نقدی برگردانده می‌شود
      const linked = s.txs.filter(
        (t) => t.link && t.link.type === 'goal-transfer' && t.link.refId === id
      );
      const cash = linked.reduce((c, t) => c - cashDelta(t), s.cash);
      return {
        ...s,
        cash,
        goals: s.goals.filter((g) => g.id !== id),
        txs: s.txs.filter((t) => !linked.includes(t)),
      };
    });
  }, []);

  const saveTest = useCallback((which: 'finance' | 'personality', result: TestResult) => {
    setState((s) => ({ ...s, tests: { ...s.tests, [which]: result } }));
  }, []);

  const resetAll = useCallback(() => {
    setState({ ...defaultState, settings: { ...defaultSettings } });
  }, []);

  const importBackup = useCallback((raw: unknown): { ok: boolean; error?: string } => {
    try {
      // فایل پشتیبان می‌تواند یا مستقیم AppState باشد یا پوشش‌دار ({ app, version, state })
      const candidate =
        raw && typeof raw === 'object' && 'state' in (raw as Record<string, unknown>)
          ? (raw as { state: unknown }).state
          : raw;
      if (!candidate || typeof candidate !== 'object') {
        return { ok: false, error: 'ساختار فایل پشتیبان معتبر نیست.' };
      }
      const c = candidate as Partial<AppState>;
      const looksValid =
        Array.isArray(c.txs) || Array.isArray(c.assets) || Array.isArray(c.loans) || Array.isArray(c.goals);
      if (!looksValid) {
        return { ok: false, error: 'در فایل پشتیبان هیچ داده مالی (تراکنش/دارایی/وام/هدف) پیدا نشد.' };
      }
      setState(sanitizeState(c));
      return { ok: true };
    } catch {
      return { ok: false, error: 'خواندن فایل پشتیبان ناموفق بود.' };
    }
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      settings: state.settings,
      cash: state.cash,
      txs: state.txs,
      assets: state.assets,
      loans: state.loans,
      goals: state.goals,
      tests: state.tests,
      prices,
      refreshing,
      refreshPrices,
      updateSettings,
      setCash,
      addTx,
      deleteTx,
      addAsset,
      updateAsset,
      sellAsset,
      deleteAsset,
      addLoan,
      payLoan,
      deleteLoan,
      addGoal,
      transferGoal,
      deleteGoal,
      saveTest,
      resetAll,
      importBackup,
    }),
    [
      state,
      prices,
      refreshing,
      refreshPrices,
      updateSettings,
      setCash,
      addTx,
      deleteTx,
      addAsset,
      updateAsset,
      sellAsset,
      deleteAsset,
      addLoan,
      payLoan,
      deleteLoan,
      addGoal,
      transferGoal,
      deleteGoal,
      saveTest,
      resetAll,
      importBackup,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
