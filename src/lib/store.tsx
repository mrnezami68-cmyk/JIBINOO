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
  Account,
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

const STORAGE_KEY = 'jibino.state.v3';
const LEGACY_STORAGE_KEY = 'jibino.state.v2';

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
  accounts: [],
  txs: [],
  assets: [],
  loans: [],
  goals: [],
  tests: { finance: null, personality: null },
};

/* ------------------------------------------------------------------ *
 * موتور اثر نقدی — تک‌نقطه حقیقت
 * ------------------------------------------------------------------ */

/**
 * اثر هر تراکنش روی «نقد کل» (مثبت = واریز، منفی = برداشت).
 * انتقال بین حساب‌ها روی نقد کل اثری ندارد (نه درآمد است نه هزینه).
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
  return 0; // transfer و هر تایپ ناشناخته
}

/** حساب پیش‌فرض (فال‌بک تراکنش‌های قدیمی و مهاجرت) */
function defaultAccountId(accounts: Account[]): string | null {
  return (accounts.find((a) => a.isDefault) ?? accounts[0])?.id ?? null;
}

/**
 * اثر یک تراکنش روی موجودی «یک حساب مشخص» — فاز ۱۵.
 * آینه دقیق cashDelta در سطح حساب:
 *  - transfer: از حساب مبدأ کم و به حساب مقصد اضافه می‌شود (مجموع ثابت)
 *  - سایر تراکنش‌ها: فقط روی حساب مؤثر (صریح یا فال‌بک پیش‌فرض) اثر دارند
 * ثبت و حذف/برگشت هر دو از همین تابع استفاده می‌کنند.
 */
function accountDelta(
  tx: Pick<Tx, 'type' | 'kind' | 'amount' | 'accountId' | 'link'>,
  accountId: string,
  accounts: Account[]
): number {
  const amount = Number(tx.amount) || 0;
  if (tx.type === 'transfer') {
    if (tx.accountId === accountId) return -amount;
    if (tx.link?.type === 'account-transfer' && tx.link.toId === accountId) return amount;
    return 0;
  }
  const effId = tx.accountId ?? defaultAccountId(accounts);
  return accountId === effId ? cashDelta(tx) : 0;
}

/** نقد کل مشتق = مجموع موجودی حساب‌ها (تصمیم ۱ سند طراحی فاز ۱۵) */
function totalAccountsBalance(accounts: Account[]): number {
  return accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
}

/** اعمال اثر یک سند روی حساب‌ها + درج آن در دفتر (جهش اتمیک) */
function applyTx(s: AppState, tx: Tx): AppState {
  // خودایجاد حساب پیش‌فرض: اثر نقدی هرگز در state بدون حساب گم نمی‌شود
  const accounts = s.accounts.length
    ? s.accounts
    : [mkAccount({ name: 'پول نقد', balance: 0, isDefault: true, color: '#2f9c78' })];
  return {
    ...s,
    accounts: accounts.map((a) => ({
      ...a,
      balance: a.balance + accountDelta(tx, a.id, accounts),
    })),
    txs: [tx, ...s.txs],
  };
}

/** برگشت اتمیک اثر یک سند از روی حساب‌ها + حذف آن از دفتر */
function withdrawTx(s: AppState, tx: Tx, remainingTxs: Tx[]): AppState {
  const accounts = s.accounts.length
    ? s.accounts
    : [mkAccount({ name: 'پول نقد', balance: 0, isDefault: true, color: '#2f9c78' })];
  return {
    ...s,
    accounts: accounts.map((a) => ({
      ...a,
      balance: a.balance - accountDelta(tx, a.id, accounts),
    })),
    txs: remainingTxs,
  };
}

function mkAccount(partial: Omit<Account, 'id' | 'createdAt'>): Account {
  return { ...partial, id: uid(), createdAt: todayISO() };
}

/* ------------------------------------------------------------------ *
 * بارگذاری، مهاجرت و پاک‌سازی
 * ------------------------------------------------------------------ */

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitizeState(JSON.parse(raw) as Partial<AppState>);
    // مهاجرت v2 → v3: خواندن کلید قدیمی (فایل به‌عنوان نسخه احتیاطی دست‌نخورده می‌ماند)
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return sanitizeState(JSON.parse(legacy) as Partial<AppState>);
    return defaultState;
  } catch {
    return defaultState;
  }
}

/**
 * اعتبارسنجی و پاک‌سازی داده‌ی خام (از localStorage یا فایل پشتیبان).
 * مقادیر ناقص/نامعتبر با مقادیر پیش‌فرض جایگزین می‌شوند تا برنامه هرگز روی داده خراب نشکند.
 * مهاجرت v2→v3 (فاز ۱۵): فیلد قدیمی cash به حساب پیش‌فرض «پول نقد» تبدیل می‌شود.
 */
function sanitizeState(parsed: Partial<AppState> | null | undefined): AppState {
  if (!parsed || typeof parsed !== 'object') {
    return { ...defaultState, settings: { ...defaultSettings } };
  }

  // --- مهاجرت حساب‌ها ---
  let accounts: Account[] = Array.isArray(parsed.accounts)
    ? parsed.accounts
        .filter((a) => a && typeof a === 'object' && typeof a.id === 'string')
        .map((a) => ({
          id: a.id,
          name: String(a.name || 'حساب'),
          bank: a.bank ? String(a.bank) : undefined,
          color: a.color ? String(a.color) : undefined,
          balance: Number(a.balance) || 0,
          isDefault: Boolean(a.isDefault),
          archived: Boolean(a.archived),
          note: a.note ? String(a.note) : undefined,
          createdAt: a.createdAt ? String(a.createdAt) : todayISO(),
        }))
    : [];

  // داده قدیمی v2: موجودی نقد تکی → حساب پیش‌فرض «پول نقد»
  const legacyCash = Number((parsed as { cash?: unknown }).cash) || 0;
  if (accounts.length === 0 && legacyCash !== 0) {
    accounts = [
      mkAccount({
        name: 'پول نقد',
        balance: legacyCash,
        isDefault: true,
        color: '#2f9c78',
      }),
    ];
  }
  // دقیقاً یک حساب پیش‌فرض
  if (accounts.length > 0 && !accounts.some((a) => a.isDefault)) {
    accounts = accounts.map((a, i) => (i === 0 ? { ...a, isDefault: true } : a));
  } else if (accounts.filter((a) => a.isDefault).length > 1) {
    let seen = false;
    accounts = accounts.map((a) => {
      if (a.isDefault && !seen) {
        seen = true;
        return a;
      }
      return { ...a, isDefault: false };
    });
  }

  return {
    settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    accounts,
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
  /** نقد کل مشتق = مجموع موجودی حساب‌ها (فاز ۱۵) */
  cash: number;
  accounts: Account[];
  txs: Tx[];
  assets: Asset[];
  loans: Loan[];
  goals: Goal[];
  tests: TestsState;
  prices: PriceState;
  refreshing: boolean;
  refreshPrices: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  /**
   * تنظیم مجموع نقد از مسیر آنبوردینگ (باگ شماره ۸) — فاز ۱۵:
   * حساب پیش‌فرض «پول نقد» ساخته/تنظیم می‌شود تا مجموع برابر مقدار ورودی شود.
   */
  setCash: (amount: number) => void;
  /* ------------------------- حساب‌های بانکی ------------------------- */
  addAccount: (account: {
    name: string;
    bank?: string;
    color?: string;
    balance?: number;
    note?: string;
  }) => void;
  /** ویرایش مشخصات حساب (موجودی از این مسیر قابل ویرایش نیست — فقط با سند) */
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id' | 'balance' | 'createdAt'>>) => void;
  /**
   * حذف فیزیکی حساب — فقط وقتی موجودی صفر و هیچ سندی به آن اشاره نکند (تصمیم ۳).
   * در غیر این صورت {ok:false} با پیام راهنما برمی‌گرداند (آرشیو با updateAccount).
   */
  deleteAccount: (id: string) => { ok: boolean; error?: string };
  /**
   * انتقال بین دو حساب — اتمیک: جهش دو موجودی + سند «انتقال» در دفتر.
   * نه درآمد است نه هزینه؛ نقد کل و ارزش خالص تغییر نمی‌کنند.
   */
  transferBetweenAccounts: (
    fromId: string,
    toId: string,
    amount: number,
    opts?: { date?: string; note?: string; title?: string }
  ) => { ok: boolean; error?: string };
  addTx: (tx: Omit<Tx, 'id'>) => void;
  deleteTx: (id: string) => void;
  addAsset: (
    asset: Omit<Asset, 'id' | 'createdAt'>,
    opts?: { fromCash?: boolean; date?: string; accountId?: string }
  ) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  sellAsset: (
    id: string,
    quantity: number,
    unitPrice: number,
    date?: string,
    opts?: { accountId?: string }
  ) => void;
  deleteAsset: (id: string) => void;
  addLoan: (
    loan: Omit<Loan, 'id' | 'createdAt' | 'payments'>,
    opts?: { receiveCash?: boolean; date?: string; accountId?: string }
  ) => void;
  /** پرداخت قسط — اتمیک: کسر نقد + ثبت در payments + سند دفتر (بدون addTx جداگانه) */
  payLoan: (
    loanId: string,
    amount: number,
    date: string,
    opts?: { title?: string; note?: string; accountId?: string }
  ) => void;
  deleteLoan: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'transfers'>) => void;
  /** انتقال به/از هدف — اتمیک: جابه‌جایی نقد + ثبت در transfers + سند دفتر */
  transferGoal: (
    goalId: string,
    amount: number,
    kind: 'deposit' | 'withdraw',
    opts?: { date?: string; title?: string; note?: string; accountId?: string }
  ) => void;
  deleteGoal: (id: string) => void;
  saveTest: (which: 'finance' | 'personality', result: TestResult) => void;
  resetAll: () => void;
  /**
   * بازیابی کامل داده‌ها از فایل پشتیبان (P0 شماره ۳ — جلوگیری از گم شدن داده مالی).
   * کل وضعیت فعلی را با فایل جایگزین می‌کند؛ خروجی ok/error برای نمایش در UI.
   * هر دو قالب v2 (cash تکی) و v3 (accounts) پشتیبانی می‌شوند.
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
  const stateRef = useRef(state);
  useEffect(() => {
    refreshRef.current = refreshPrices;
    pricesRef.current = prices;
    stateRef.current = state;
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
    const target = Math.max(0, Number(amount) || 0);
    setState((s) => {
      if (s.accounts.length === 0) {
        return {
          ...s,
          accounts: [mkAccount({ name: 'پول نقد', balance: target, isDefault: true, color: '#2f9c78' })],
        };
      }
      // تنظیم مجدد از آنبوردینگ: اختلاف روی حساب پیش‌فرض اعمال می‌شود تا مجموع برابر شود
      const diff = target - totalAccountsBalance(s.accounts);
      const defId = defaultAccountId(s.accounts)!;
      return {
        ...s,
        accounts: s.accounts.map((a) =>
          a.id === defId ? { ...a, balance: Math.max(0, a.balance + diff) } : a
        ),
      };
    });
  }, []);

  /* ---------------------------- حساب‌های بانکی ---------------------------- */

  const addAccount = useCallback(
    (account: { name: string; bank?: string; color?: string; balance?: number; note?: string }) => {
      setState((s) => {
        const clean: Account = mkAccount({
          name: account.name.trim() || 'حساب جدید',
          bank: account.bank?.trim() || undefined,
          color: account.color,
          balance: Math.max(0, Number(account.balance) || 0),
          note: account.note?.trim() || undefined,
          // اولین حساب به‌طور خودکار پیش‌فرض می‌شود (فال‌بک مهاجرت/نمایش)
          isDefault: s.accounts.length === 0,
        });
        return { ...s, accounts: [...s.accounts, clean] };
      });
    },
    []
  );

  const updateAccount = useCallback(
    (id: string, patch: Partial<Omit<Account, 'id' | 'balance' | 'createdAt'>>) => {
      setState((s) => {
        let accounts = s.accounts.map((a) => (a.id === id ? { ...a, ...patch, id, balance: a.balance } : a));
        // فقط یک حساب می‌تواند پیش‌فرض باشد
        if (patch.isDefault) {
          accounts = accounts.map((a) => (a.id === id ? a : { ...a, isDefault: false }));
        }
        return { ...s, accounts };
      });
    },
    []
  );

  const deleteAccount = useCallback((id: string): { ok: boolean; error?: string } => {
    // اعتبارسنجی همگام از روی stateRef (نه داخل updater — تا خروجی همان لحظه درست برگردد)
    const s = stateRef.current;
    const acc = s.accounts.find((a) => a.id === id);
    if (!acc) return { ok: false, error: 'حساب پیدا نشد.' };
    // تصمیم ۳: حساب دارای موجودی حذف نمی‌شود — ابتدا موجودی را منتقل کنید
    if (acc.balance !== 0) {
      return { ok: false, error: 'موجودی این حساب صفر نیست؛ ابتدا موجودی را به حساب دیگری منتقل کنید.' };
    }
    // تصمیم ۳: حساب دارای تاریخچه حذف فیزیکی نمی‌شود — باید آرشیو شود
    const hasHistory = s.txs.some(
      (t) => t.accountId === id || (t.link?.type === 'account-transfer' && t.link.toId === id)
    );
    if (hasHistory) {
      return { ok: false, error: 'برای این حساب تراکنش ثبت شده است؛ برای حفظ تاریخچه، آن را «آرشیو» کنید.' };
    }
    setState((cur) => {
      // حذف حساب پیش‌فرضِ بدون سابقه → اولین حساب باقی‌مانده پیش‌فرض می‌شود
      let accounts = cur.accounts.filter((a) => a.id !== id);
      if (acc.isDefault && accounts.length > 0) {
        accounts = accounts.map((a, i) => (i === 0 ? { ...a, isDefault: true } : a));
      }
      return { ...cur, accounts };
    });
    return { ok: true };
  }, []);

  const transferBetweenAccounts = useCallback(
    (
      fromId: string,
      toId: string,
      amount: number,
      opts?: { date?: string; note?: string; title?: string }
    ): { ok: boolean; error?: string } => {
      const value = Math.round(Number(amount) || 0);
      if (value <= 0) return { ok: false, error: 'مبلغ انتقال را وارد کنید.' };
      if (fromId === toId) return { ok: false, error: 'حساب مبدأ و مقصد یکسان است.' };
      // اعتبارسنجی همگام از روی stateRef تا خروجی همان لحظه درست برگردد
      const s = stateRef.current;
      const from = s.accounts.find((a) => a.id === fromId);
      const to = s.accounts.find((a) => a.id === toId);
      if (!from || !to) return { ok: false, error: 'حساب مبدأ یا مقصد پیدا نشد.' };
      if (from.balance < value) return { ok: false, error: 'موجودی حساب مبدأ کافی نیست.' };
      setState((cur) => {
        const fromAcc = cur.accounts.find((a) => a.id === fromId) ?? from;
        const toAcc = cur.accounts.find((a) => a.id === toId) ?? to;
        const tx: Tx = {
          id: uid(),
          type: 'transfer',
          kind: 'transfer',
          category: 'transfer',
          title: opts?.title?.trim() || `انتقال از «${fromAcc.name}» به «${toAcc.name}»`,
          amount: value,
          date: opts?.date ?? todayISO(),
          note: opts?.note?.trim() || undefined,
          accountId: fromId,
          link: { type: 'account-transfer', toId },
        };
        return applyTx(cur, tx);
      });
      return { ok: true };
    },
    []
  );

  /* --------------------------- دفتر تراکنش‌ها --------------------------- */

  const addTx = useCallback((tx: Omit<Tx, 'id'>) => {
    const full: Tx = { ...tx, id: uid() };
    setState((s) => applyTx(s, full));
  }, []);

  const deleteTx = useCallback((id: string) => {
    setState((s) => {
      const tx = s.txs.find((t) => t.id === id);
      if (!tx) return s;

      const remainingTxs = s.txs.filter((t) => t.id !== id);

      // ۱) برگرداندن اثر نقدی از حساب(ها) (دقیقاً آینه accountDelta)
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

      const base = withdrawTx({ ...s, loans, goals, assets }, tx, remainingTxs);
      return base;
    });
  }, []);

  /* ------------------------------- دارایی‌ها ------------------------------ */

  const addAsset = useCallback(
    (
      asset: Omit<Asset, 'id' | 'createdAt'>,
      opts?: { fromCash?: boolean; date?: string; accountId?: string }
    ) => {
      setState((s) => {
        const id = uid();
        const date = opts?.date ?? todayISO();
        const total = Math.round((asset.quantity || 0) * (asset.avgBuy || 0));
        // خرید از نقد → سند دفتر با پیوند به دارایی (باگ شماره ۷ — قابل برگشت کامل)
        const s2 =
          opts?.fromCash && total > 0
            ? applyTx(s, {
                id: uid(),
                type: 'investment',
                kind: asset.kind,
                category: asset.kind,
                title: `خرید ${asset.name}`,
                amount: total,
                date,
                note: asset.note,
                accountId: opts.accountId,
                link: {
                  type: 'asset-buy',
                  refId: id,
                  qty: asset.quantity,
                  unitPrice: asset.avgBuy,
                },
              })
            : s;
        return {
          ...s2,
          assets: [{ ...asset, id, createdAt: date }, ...s2.assets],
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
    (id: string, quantity: number, unitPrice: number, date: string = todayISO(), opts?: { accountId?: string }) => {
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
          accountId: opts?.accountId,
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
        const s2 = applyTx(s, tx);
        return {
          ...s2,
          assets: s2.assets
            .map((a) => (a.id === id ? { ...a, quantity: Math.max(0, a.quantity - qty) } : a))
            .filter((a) => a.quantity > 0.00000001),
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
      // برگشت اتمیک اثر همه اسناد مرتبط از حساب‌ها
      let next: AppState = { ...s, assets: s.assets.filter((a) => a.id !== id) };
      let remaining = next.txs;
      for (const t of linked) {
        remaining = remaining.filter((x) => x.id !== t.id);
        next = withdrawTx(next, t, remaining);
      }
      return next;
    });
  }, []);

  /* -------------------------------- وام‌ها -------------------------------- */

  const addLoan = useCallback(
    (
      loan: Omit<Loan, 'id' | 'createdAt' | 'payments'>,
      opts?: { receiveCash?: boolean; date?: string; accountId?: string }
    ) => {
      setState((s) => {
        const id = uid();
        const date = opts?.date ?? todayISO();
        const receive = Boolean(opts?.receiveCash) && loan.total > 0;
        // باگ شماره ۶: دریافت اصل وام → واریز به حساب + سند «دریافت وام» با پیوند loan-principal
        const s2 = receive
          ? applyTx(s, {
              id: uid(),
              type: 'loan',
              kind: 'principal',
              category: 'loan',
              title: `دریافت وام «${loan.title}»`,
              amount: loan.total,
              date,
              accountId: opts?.accountId,
              link: { type: 'loan-principal', refId: id },
            })
          : s;
        return {
          ...s2,
          loans: [{ ...loan, id, createdAt: date, payments: [] }, ...s2.loans],
        };
      });
    },
    []
  );

  const payLoan = useCallback(
    (
      loanId: string,
      amount: number,
      date: string,
      opts?: { title?: string; note?: string; accountId?: string }
    ) => {
      setState((s) => {
        const loan = s.loans.find((l) => l.id === loanId);
        if (!loan || amount <= 0) return s;
        const paymentId = uid();
        // اتمیک: کسر از حساب دقیقاً یک بار + ثبت در payments + سند دفتر (باگ‌های ۱ و ۳)
        const tx: Tx = {
          id: uid(),
          type: 'loan',
          kind: 'payment',
          category: 'loan',
          title: opts?.title?.trim() || `پرداخت قسط «${loan.title}»`,
          amount,
          date,
          note: opts?.note?.trim() || undefined,
          accountId: opts?.accountId,
          link: { type: 'loan-payment', refId: loanId, subId: paymentId },
        };
        const s2 = applyTx(s, tx);
        return {
          ...s2,
          loans: s2.loans.map((l) =>
            l.id === loanId ? { ...l, payments: [...l.payments, { id: paymentId, amount, date }] } : l
          ),
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
      let next: AppState = { ...s, loans: s.loans.filter((l) => l.id !== id) };
      let remaining = next.txs;
      for (const t of linked) {
        remaining = remaining.filter((x) => x.id !== t.id);
        next = withdrawTx(next, t, remaining);
      }
      return next;
    });
  }, []);

  /* -------------------------------- اهداف -------------------------------- */

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
      opts?: { date?: string; title?: string; note?: string; accountId?: string }
    ) => {
      setState((s) => {
        const goal = s.goals.find((g) => g.id === goalId);
        if (!goal || amount <= 0) return s;
        const date = opts?.date ?? todayISO();
        const transferId = uid();
        // اتمیک: جابه‌جایی بین حساب و پس‌انداز هدف + ثبت در transfers + سند دفتر (باگ‌های ۲ و ۴)
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
          accountId: opts?.accountId,
          link: { type: 'goal-transfer', refId: goalId, subId: transferId },
        };
        const s2 = applyTx(s, tx);
        return {
          ...s2,
          goals: s2.goals.map((g) =>
            g.id === goalId
              ? { ...g, transfers: [...g.transfers, { id: transferId, amount, date, kind }] }
              : g
          ),
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
      let next: AppState = { ...s, goals: s.goals.filter((g) => g.id !== id) };
      let remaining = next.txs;
      for (const t of linked) {
        remaining = remaining.filter((x) => x.id !== t.id);
        next = withdrawTx(next, t, remaining);
      }
      return next;
    });
  }, []);

  /* ------------------------------ تست‌ها و کلی ------------------------------ */

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
      const c = candidate as Partial<AppState & { cash?: unknown }>;
      const looksValid =
        Array.isArray(c.txs) ||
        Array.isArray(c.assets) ||
        Array.isArray(c.loans) ||
        Array.isArray(c.goals) ||
        Array.isArray(c.accounts) ||
        typeof c.cash === 'number';
      if (!looksValid) {
        return { ok: false, error: 'در فایل پشتیبان هیچ داده مالی (تراکنش/دارایی/وام/هدف/حساب) پیدا نشد.' };
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
      cash: totalAccountsBalance(state.accounts),
      accounts: state.accounts,
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
      addAccount,
      updateAccount,
      deleteAccount,
      transferBetweenAccounts,
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
      addAccount,
      updateAccount,
      deleteAccount,
      transferBetweenAccounts,
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
