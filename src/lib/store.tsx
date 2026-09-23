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

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
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
  } catch {
    return defaultState;
  }
}

interface StoreValue {
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
  addTx: (tx: Omit<Tx, 'id'>) => void;
  deleteTx: (id: string) => void;
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  sellAsset: (id: string, quantity: number, unitPrice: number) => void;
  deleteAsset: (id: string) => void;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'payments'>) => void;
  payLoan: (loanId: string, amount: number, date: string) => void;
  deleteLoan: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'transfers'>) => void;
  transferGoal: (goalId: string, amount: number, kind: 'deposit' | 'withdraw') => void;
  deleteGoal: (id: string) => void;
  saveTest: (which: 'finance' | 'personality', result: TestResult) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [prices, setPrices] = useState<PriceState>(() => initialPrices());
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);

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

  // auto-load prices on first mount
  useEffect(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      void refreshPrices();
    }
  }, [refreshPrices]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const addTx = useCallback((tx: Omit<Tx, 'id'>) => {
    const full: Tx = { ...tx, id: uid() };
    setState((s) => {
      let cash = s.cash;
      if (full.type === 'income') cash += full.amount;
      else if (full.type === 'expense') cash -= full.amount;
      else if (full.type === 'investment') cash += full.kind === 'sell' ? full.amount : -full.amount;
      else if (full.type === 'goal') cash += full.kind === 'withdraw' ? full.amount : -full.amount;
      else if (full.type === 'loan') cash -= full.amount;
      return { ...s, cash, txs: [full, ...s.txs] };
    });
  }, []);

  const deleteTx = useCallback((id: string) => {
    setState((s) => {
      const tx = s.txs.find((t) => t.id === id);
      if (!tx) return s;
      let cash = s.cash;
      if (tx.type === 'income') cash -= tx.amount;
      else if (tx.type === 'expense') cash += tx.amount;
      else if (tx.type === 'investment') cash += tx.kind === 'sell' ? -tx.amount : tx.amount;
      else if (tx.type === 'goal') cash += tx.kind === 'withdraw' ? -tx.amount : tx.amount;
      else if (tx.type === 'loan') cash += tx.amount;
      return { ...s, cash, txs: s.txs.filter((t) => t.id !== id) };
    });
  }, []);

  const addAsset = useCallback((asset: Omit<Asset, 'id' | 'createdAt'>) => {
    setState((s) => ({ ...s, assets: [{ ...asset, id: uid(), createdAt: todayISO() }, ...s.assets] }));
  }, []);

  const updateAsset = useCallback((id: string, patch: Partial<Asset>) => {
    setState((s) => ({
      ...s,
      assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const sellAsset = useCallback((id: string, quantity: number, unitPrice: number) => {
    setState((s) => {
      const asset = s.assets.find((a) => a.id === id);
      if (!asset) return s;
      const proceeds = Math.round(quantity * unitPrice);
      return {
        ...s,
        cash: s.cash + proceeds,
        assets: s.assets
          .map((a) => (a.id === id ? { ...a, quantity: Math.max(0, a.quantity - quantity) } : a))
          .filter((a) => a.quantity > 0.00000001),
      };
    });
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setState((s) => ({ ...s, assets: s.assets.filter((a) => a.id !== id) }));
  }, []);

  const addLoan = useCallback((loan: Omit<Loan, 'id' | 'createdAt' | 'payments'>) => {
    setState((s) => ({
      ...s,
      loans: [{ ...loan, id: uid(), createdAt: todayISO(), payments: [] }, ...s.loans],
    }));
  }, []);

  const payLoan = useCallback((loanId: string, amount: number, date: string) => {
    setState((s) => ({
      ...s,
      cash: s.cash - amount,
      loans: s.loans.map((l) =>
        l.id === loanId
          ? { ...l, payments: [...l.payments, { id: uid(), amount, date }] }
          : l
      ),
    }));
  }, []);

  const deleteLoan = useCallback((id: string) => {
    setState((s) => ({ ...s, loans: s.loans.filter((l) => l.id !== id) }));
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'transfers'>) => {
    setState((s) => ({
      ...s,
      goals: [{ ...goal, id: uid(), createdAt: todayISO(), transfers: [] }, ...s.goals],
    }));
  }, []);

  const transferGoal = useCallback(
    (goalId: string, amount: number, kind: 'deposit' | 'withdraw') => {
      setState((s) => ({
        ...s,
        cash: s.cash + (kind === 'deposit' ? -amount : amount),
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                transfers: [...g.transfers, { id: uid(), amount, date: todayISO(), kind }],
              }
            : g
        ),
      }));
    },
    []
  );

  const deleteGoal = useCallback((id: string) => {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  }, []);

  const saveTest = useCallback((which: 'finance' | 'personality', result: TestResult) => {
    setState((s) => ({ ...s, tests: { ...s.tests, [which]: result } }));
  }, []);

  const resetAll = useCallback(() => {
    setState({ ...defaultState, settings: { ...defaultSettings } });
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
    }),
    [
      state,
      prices,
      refreshing,
      refreshPrices,
      updateSettings,
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
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
