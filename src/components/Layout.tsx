import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  BarChart3,
  Target,
  Landmark,
  CreditCard,
  User,
  Download,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { freshness, timeLabel, fmt, compact } from '../lib/format';

const NAV = [
  { to: '/', label: 'خانه', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'تراکنش‌ها', icon: Receipt },
  { to: '/accounts', label: 'حساب‌ها', icon: CreditCard },
  { to: '/assets', label: 'دارایی‌ها', icon: Wallet },
  { to: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
  { to: '/goals', label: 'اهداف', icon: Target },
  { to: '/loans', label: 'وام‌ها', icon: Landmark },
  { to: '/profile', label: 'پروفایل', icon: User },
];

const BOTTOM_NAV = NAV.slice(0, 4).concat([{ to: '/profile', label: 'پروفایل', icon: User, end: false }]);

function Logo({ compactMode = false }: { compactMode?: boolean }) {
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#1c8a67] to-[#0e5744] shadow-[0_12px_24px_-12px_rgba(14,87,68,.7)]">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
      </div>
      {!compactMode && (
        <div>
          <div className="text-[15px] font-extrabold leading-tight text-ink">جیبینو</div>
          <div className="text-[9.5px] font-semibold leading-tight text-ink-3">
            حسابدار شخصی هوشمند
          </div>
        </div>
      )}
    </NavLink>
  );
}

function PriceTicker() {
  const { prices, refreshPrices, refreshing } = useStore();
  const items = ['usd', 'gold18', 'abshode', 'coin_emami']
    .map((k) => prices.items[k])
    .filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-ink-3">
          <Sparkles size={12} className="text-gold" />
          قیمت‌های لحظه‌ای
        </div>
        <button
          onClick={() => void refreshPrices()}
          disabled={refreshing}
          className="rounded-full border border-line bg-white px-2.5 py-1 text-[9.5px] font-bold text-ink-2 transition hover:border-brand-3 hover:text-brand-2 disabled:opacity-50"
        >
          {refreshing ? 'در حال به‌روزرسانی…' : `به‌روزرسانی ${freshness(prices.updatedAt)}`}
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-[12px] border border-line/80 bg-white/70 px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  (p.change24h ?? 0) >= 0 ? 'bg-brand-3' : 'bg-coral'
                }`}
              />
              <span className="text-[10px] font-bold text-ink-2">{p.label}</span>
            </div>
            <div className="text-left">
              <div className="num text-[10px] font-extrabold text-ink">
                {p.toman ? compact(p.toman) : '—'}
              </div>
              <div className="num text-[8.5px] font-semibold text-ink-3">
                {(p.change24h ?? 0) >= 0 ? '+' : '−'}
                {Math.abs(p.change24h ?? 0).toFixed(1)}٪
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-1 text-[8.5px] font-medium leading-4 text-ink-3">
        آخرین به‌روزرسانی: {timeLabel(prices.updatedAt)} • CoinGecko + نرخ مرجع ارز
      </div>
    </div>
  );
}

/** PWA install prompt — only shows when the browser allows installation. */
function InstallPWA({ variant = 'rail' }: { variant?: 'rail' | 'icon' }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const trigger = async () => {
    if (deferred?.prompt) {
      deferred.prompt();
      try {
        await deferred.userChoice;
      } catch {
        /* user dismissed */
      }
      setDeferred(null);
    } else {
      alert('برای نصب جیبینو: از منوی مرورگر گزینه «Add to Home Screen» یا «Install app» را انتخاب کنید.');
    }
  };

  // compact icon button — used in the mobile top bar
  if (variant === 'icon') {
    return (
      <button
        onClick={trigger}
        title="نصب اپلیکیشن جیبینو روی دستگاه"
        aria-label="نصب اپلیکیشن"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-brand-3/50 bg-brand-soft/70 text-brand-2 transition active:scale-95"
      >
        <Download size={15} />
      </button>
    );
  }

  return (
    <button
      onClick={trigger}
      className="flex w-full items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-dashed border-brand-3/70 bg-brand-soft/60 px-3 py-2.5 text-[11px] font-bold text-brand-2 transition hover:bg-brand-soft"
    >
      <Download size={14} />
      نصب اپلیکیشن روی دستگاه
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { prices, refreshPrices, refreshing } = useStore();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-paper">
      {/* ambient background wash */}
      <div className="pointer-events-none fixed inset-0 wash" aria-hidden />

      {/* desktop side rail */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[248px] flex-col border-l border-line bg-surface/85 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-2">
          <Logo />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-[15px] px-3.5 py-2.5 text-[12.5px] font-bold transition-all ${
                  isActive
                    ? 'bg-brand-2 text-white shadow-[0_16px_30px_-16px_rgba(14,87,68,.7)]'
                    : 'text-ink-2 hover:bg-paper hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} className={isActive ? 'text-white' : 'text-ink-3'} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 space-y-4">
          <InstallPWA />
          <PriceTicker />
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/88 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <InstallPWA variant="icon" />
            <button
              onClick={() => void refreshPrices()}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-2 text-[10px] font-bold text-ink-2"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  refreshing ? 'animate-pulse bg-gold' : 'bg-brand-3'
                }`}
              />
              {refreshing ? 'به‌روزرسانی…' : `قیمت‌ها ${freshness(prices.updatedAt)}`}
            </button>
          </div>
        </div>
      </header>

      {/* main content */}
      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pe-[280px] lg:ps-6 lg:pt-9">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>

        <footer className="mt-12 hidden items-center justify-between border-t border-line pt-6 text-[10.5px] text-ink-3 lg:flex">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-5 w-5 opacity-80" />
            جیبینو — داده‌های شما فقط روی همین دستگاه ذخیره می‌شود.
          </div>
          <div className="flex items-center gap-4">
            <span>قیمت لحظه‌ای: CoinGecko</span>
            <span>نرخ ارز: مرجع جهانی + نرخ دستی</span>
            <span className="num">نسخه ۲.۰ — تحلیل دارایی</span>
          </div>
        </footer>
      </main>

      {/* mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[520px] items-stretch justify-between">
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-[14px] px-1 py-2 text-[9.5px] font-bold transition-colors ${
                  isActive ? 'text-brand-2' : 'text-ink-3'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                      isActive ? 'bg-brand-soft' : 'bg-transparent'
                    }`}
                  >
                    <item.icon size={18} />
                  </div>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* floating net-worth pill on mobile */}
      <MobileNetWorthPill />
    </div>
  );
}

function MobileNetWorthPill() {
  const { cash, prices } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-[86px] left-0 right-0 z-30 flex justify-center lg:hidden">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface/92 px-4 py-2 shadow-[0_18px_40px_-18px_rgba(29,43,37,.5)] backdrop-blur-xl">
        <span className="text-[9.5px] font-bold text-ink-3">موجودی نقد</span>
        <span className="num text-[11px] font-extrabold text-ink">{fmt(cash)}</span>
        <span className="text-[9px] font-semibold text-ink-3">تومان</span>
        <span className="mx-0.5 h-3 w-px bg-line" />
        <span className="text-[9.5px] font-bold text-ink-3">دلار</span>
        <span className="num text-[11px] font-extrabold text-brand-2">
          {prices.items.usd?.toman ? fmt(prices.items.usd.toman) : '—'}
        </span>
      </div>
    </div>
  );
}
