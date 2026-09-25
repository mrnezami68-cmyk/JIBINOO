import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Landmark,
  Target,
  Sparkles,
  ArrowUpLeft,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  RefreshCw,
  Plus,
  ChevronLeft,
  Gem,
  Info,
} from 'lucide-react';
import { useStore } from '../lib/store';
import {
  computeNetWorth,
  summarize,
  buildInsights,
  lastMonths,
  expenseByCategory,
  valueAssets,
} from '../lib/analysis';
import { fmt, compact, pct, freshness, timeLabel, faDigits, jDateLabel, monthStart, todayISO } from '../lib/format';
import { Donut, AreaChart, Progress, Sparkline, Ring } from '../components/charts';
import { StatCard, SectionHeader, Banner, QuickAddButton } from '../components/ui';
import { TxModal } from '../components/TxModal';

export function Dashboard() {
  const store = useStore();
  const { settings, txs, prices, assets, loans, goals, accounts, refreshing, refreshPrices } = store;
  const [txOpen, setTxOpen] = useState(false);

  const nw = useMemo(() => computeNetWorth(store.state, prices), [store.state, prices]);
  // مرز ماه بر اساس تقویم محلی کاربر — نه UTC (باگ P0 شماره ۱)
  const monthStartISO = monthStart();
  const month = useMemo(() => summarize(txs, monthStartISO), [txs, monthStartISO]);
  const insights = useMemo(() => buildInsights(store.state, prices), [store.state, prices]);
  const months = useMemo(() => lastMonths(txs, 6), [txs]);
  const cats = useMemo(() => expenseByCategory(txs, monthStartISO), [txs, monthStartISO]);
  const valued = useMemo(() => valueAssets(assets, prices), [assets, prices]);

  const firstName = settings.name?.trim() ? settings.name.trim().split(' ')[0] : 'دوست جیبینو';

  const priceCards = ['usd', 'gold18', 'abshode', 'coin_emami', 'bitcoin']
    .map((k) => prices.items[k])
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* ---------------------------- hero ---------------------------- */}
      <section className="relative overflow-hidden rounded-[30px] border border-line bg-gradient-to-bl from-[#0e5744] via-[#17795c] to-[#2f9c78] px-6 py-8 text-white shadow-[0_30px_70px_-30px_rgba(14,87,68,.75)] sm:px-9 sm:py-10">
        <div
          className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#e0b35a]/25 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Sparkles size={16} />
              </span>
              <div>
                <div className="text-[12px] font-semibold text-white/75">
                  سلام {firstName} عزیز، خوش آمدید
                </div>
                <div className="text-[10.5px] font-medium text-white/55">
                  {jDateLabel(todayISO())} • وضعیت مالی امروز شما
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[12px] font-bold text-white/70">ارزش خالص دارایی شما</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <motion.span
                  key={Math.round(nw.net)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="num text-[38px] font-extrabold leading-none tracking-tight sm:text-[52px]"
                >
                  {fmt(nw.net)}
                </motion.span>
                <span className="text-[13px] font-bold text-white/70">تومان</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[10.5px] font-bold">
                  <Wallet size={12} /> نقد: {compact(nw.cash)}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[10.5px] font-bold">
                  <Gem size={12} /> سرمایه‌گذاری: {compact(nw.investments)}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[10.5px] font-bold">
                  <Target size={12} /> اهداف: {compact(nw.goals)}
                </span>
                {nw.debts > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-[#e0b35a]/25 px-3 py-1.5 text-[10.5px] font-bold">
                    <Landmark size={12} /> بدهی: {compact(nw.debts)}
                  </span>
                )}
              </div>
              {/* فاز ۱۵ — موجودی هر حساب در یک نگاه */}
              {accounts.filter((a) => !a.archived).length > 1 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {accounts
                    .filter((a) => !a.archived)
                    .map((a) => (
                      <Link
                        key={a.id}
                        to="/accounts"
                        className="flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[9px] font-bold text-white/85 transition hover:bg-white/15"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: a.color || '#fff' }}
                        />
                        {a.name}: <span className="num">{compact(a.balance)}</span>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* live allocation ring */}
          <div className="flex shrink-0 items-center gap-6">
            <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm">
              <Ring
                value={100}
                size={148}
                thickness={15}
                color="rgba(255,255,255,.92)"
                track="rgba(255,255,255,.18)"
              >
                <div className="text-center">
                  <div className="num text-[19px] font-extrabold leading-none">
                    {nw.investments > 0 ? pct(nw.investments / Math.max(1, nw.net)) : '۰٪'}
                  </div>
                  <div className="mt-1 text-[9.5px] font-semibold text-white/70">
                    سهم سرمایه‌گذاری
                  </div>
                  <div className="mt-2 h-px w-12 bg-white/25" />
                  <div
                    className={`num mt-2 flex items-center justify-center gap-1 text-[11px] font-bold ${
                      nw.pnl >= 0 ? 'text-[#b8f0d4]' : 'text-[#ffc9be]'
                    }`}
                  >
                    {nw.pnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {compact(Math.abs(nw.pnl))}
                  </div>
                  <div className="text-[8.5px] font-semibold text-white/60">
                    {nw.pnl >= 0 ? 'سود سبد' : 'زیان سبد'}
                  </div>
                </div>
              </Ring>
            </div>

            <div className="hidden flex-col gap-2.5 sm:flex">
              {nw.byClass.slice(0, 5).map((c) => (
                <div key={c.key} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c.color === '#2f9c78' ? '#b8f0d4' : c.color }}
                  />
                  <span className="w-[74px] text-[10px] font-bold text-white/75">{c.label}</span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.value / Math.max(1, nw.cash + nw.investments + nw.goals)) * 100}%`,
                        background: c.color === '#2f9c78' ? '#b8f0d4' : c.color,
                      }}
                    />
                  </div>
                  <span className="num w-[52px] text-left text-[9.5px] font-bold text-white/70">
                    {compact(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setTxOpen(true)}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-extrabold text-brand-2 shadow-[0_18px_36px_-16px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5"
          >
            <Plus size={15} /> ثبت تراکنش جدید
          </button>
          <Link
            to="/assets"
            className="flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-[12px] font-bold text-white transition hover:bg-white/10"
          >
            مدیریت دارایی‌ها <ChevronLeft size={14} />
          </Link>
          <button
            onClick={() => void refreshPrices()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-[12px] font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'در حال به‌روزرسانی قیمت‌ها…' : `بروزرسانی قیمت‌ها (${freshness(prices.updatedAt)})`}
          </button>
        </div>
      </section>

      {/* ------------------------- monthly flow ------------------------ */}
      <section>
        <SectionHeader
          title="جریان نقدی این ماه"
          subtitle="سرمایه‌گذاری و انتقال به هدف، هزینه محسوب نمی‌شوند؛ آن‌ها جابه‌جایی دارایی هستند."
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard
            label="درآمد"
            value={`${compact(month.income)}`}
            sub="تومان این ماه"
            icon={<ArrowDownLeft size={18} />}
            tone="brand"
          />
          <StatCard
            label="هزینه"
            value={`${compact(month.expense)}`}
            sub="تومان این ماه"
            icon={<ArrowUpLeft size={18} />}
            tone="coral"
          />
          <StatCard
            label="سرمایه‌گذاری"
            value={`${compact(month.investment)}`}
            sub="خرید دارایی (نه هزینه)"
            icon={<Gem size={18} />}
            tone="gold"
          />
          <StatCard
            label="انتقال به اهداف"
            value={`${compact(month.goalDeposit)}`}
            sub="پس‌انداز هدفمند"
            icon={<Target size={18} />}
            tone="violet"
          />
          <StatCard
            label="مانده ماه"
            value={`${compact(month.income - month.expense)}`}
            sub={`نرخ پس‌انداز ${month.income > 0 ? pct(month.savingsRate) : '—'}`}
            icon={<PiggyBank size={18} />}
            tone={month.income - month.expense >= 0 ? 'brand' : 'coral'}
          />
        </div>
      </section>

      {/* --------------------------- prices ---------------------------- */}
      <section>
        <SectionHeader
          title="قیمت‌های لحظه‌ای"
          subtitle="طلای ۱۸ عیار از اونس جهانی و نرخ دلار محاسبه می‌شود؛ قیمت رمزارزها = قیمت دلاری × نرخ دلار."
          action={
            <div className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-[10px] font-bold text-ink-3">
              <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? 'animate-pulse bg-gold' : 'bg-brand-3'}`} />
              به‌روزرسانی {freshness(prices.updatedAt)} • {timeLabel(prices.updatedAt)}
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {priceCards.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="card-flat group p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(29,43,37,.4)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold text-ink-3">{p.label}</div>
                  <div className="num mt-1.5 text-[15px] font-extrabold text-ink">
                    {p.toman ? fmt(Math.round(p.toman)) : '—'}
                  </div>
                  <div className="text-[9px] font-semibold text-ink-3">تومان</div>
                </div>
                <div
                  className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    (p.change24h ?? 0) >= 0 ? 'bg-brand-soft text-brand' : 'bg-coral-soft text-coral'
                  }`}
                >
                  {(p.change24h ?? 0) >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {Math.abs(p.change24h ?? 0).toFixed(1)}٪
                </div>
              </div>
              <div className="mt-2 opacity-80">
                <Sparkline
                  values={p.spark}
                  color={(p.change24h ?? 0) >= 0 ? '#2f9c78' : '#cd6a58'}
                />
              </div>
              {p.id === 'bitcoin' && prices.usdToman > 0 && (
                <div className="mt-1.5 rounded-[9px] bg-paper px-2 py-1 text-[8.5px] font-semibold leading-4 text-ink-3">
                  {faDigits(Math.round(p.usd ?? 0).toLocaleString('en-US'))} دلار ×{' '}
                  {fmt(prices.usdToman)} = قیمت تومانی
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ------------------- charts + insights row -------------------- */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* trend */}
        <div className="card p-5 sm:p-6">
          <SectionHeader
            title="روند ۶ ماه اخیر"
            subtitle="درآمد، هزینه و سرمایه‌گذاری ماهانه"
          />
          <AreaChart
            points={months.map((m) => ({ label: m.label.slice(0, 4), value: m.income }))}
            color="#2f9c78"
            label="روند درآمد ماهانه (تومان)"
            formatValue={(v) => `${compact(v)} تومان`}
          />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              {
                label: 'درآمد ۶ ماه',
                value: months.reduce((s, m) => s + m.income, 0),
                color: '#2f9c78',
              },
              {
                label: 'هزینه ۶ ماه',
                value: months.reduce((s, m) => s + m.expense, 0),
                color: '#cd6a58',
              },
              {
                label: 'سرمایه‌گذاری ۶ ماه',
                value: months.reduce((s, m) => s + m.investment, 0),
                color: '#c08d2c',
              },
            ].map((x) => (
              <div key={x.label} className="rounded-[15px] border border-line bg-paper/60 p-3">
                <div className="text-[9.5px] font-bold text-ink-3">{x.label}</div>
                <div className="num mt-1 text-[13px] font-extrabold" style={{ color: x.color }}>
                  {compact(x.value)}
                </div>
                <div className="text-[8.5px] font-semibold text-ink-3">تومان</div>
              </div>
            ))}
          </div>
        </div>

        {/* allocation donut */}
        <div className="card p-5 sm:p-6">
          <SectionHeader
            title="ترکیب دارایی شما"
            subtitle="ارزش لحظه‌ای هر طبقه دارایی نسبت به کل"
          />
          {nw.byClass.length > 0 ? (
            <Donut
              slices={nw.byClass}
              size={200}
              thickness={28}
              centerValue={compact(nw.cash + nw.investments + nw.goals)}
              centerLabel="کل دارایی (تومان)"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand-soft text-brand">
                <Gem size={26} />
                  </div>
              <p className="mt-4 max-w-[300px] text-[11.5px] leading-7 text-ink-3">
                هنوز دارایی ثبت نکرده‌اید. از بخش «دارایی‌ها» طلا، ارز یا رمزارز خود را اضافه کنید تا
                ارزش لحظه‌ای آن اینجا نمایش داده شود.
              </p>
              <Link to="/assets" className="btn btn-primary mt-5">
                افزودن دارایی
              </Link>
            </div>
          )}

          {valued.length > 0 && (
            <div className="mt-6 space-y-2.5">
              {valued.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-[14px] border border-line bg-paper/50 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-white text-[10px] font-extrabold text-ink-2">
                      {a.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-ink">{a.name}</div>
                      <div className="text-[9px] font-semibold text-ink-3">
                        {a.live ? 'قیمت لحظه‌ای' : 'قیمت خرید'} • {fmt(a.quantity)} {a.unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="num text-[11.5px] font-extrabold text-ink">
                      {compact(a.value)}
                    </div>
                    <div
                      className={`num text-[9px] font-bold ${
                        a.pnl >= 0 ? 'text-brand' : 'text-coral'
                      }`}
                    >
                      {a.pnl >= 0 ? '+' : '−'}
                      {compact(Math.abs(a.pnl))} ({pct(a.pnlPct)})
                    </div>
                  </div>
                </div>
              ))}
              <Link
                to="/assets"
                className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-bold text-brand-2 hover:underline"
              >
                مشاهده همه دارایی‌ها <ChevronLeft size={13} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------ expenses + insights ----------------- */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <SectionHeader
            title="هزینه‌های این ماه"
            subtitle="برای تحلیل دقیق‌تر به گزارش‌ها سر بزنید"
            action={
              <Link to="/reports" className="btn btn-ghost !px-4 !py-2 text-[11px]">
                گزارش کامل <ChevronLeft size={13} />
              </Link>
            }
          />
          {cats.length > 0 ? (
            <div className="space-y-3">
              {cats.slice(0, 5).map((c) => (
                <div key={c.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-[11px] font-bold text-ink-2">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="num text-[11px] font-extrabold text-ink">
                        {compact(c.value)}
                      </span>
                      <span className="num text-[9.5px] font-bold text-ink-3">
                        {pct(c.share)}
                      </span>
                    </div>
                  </div>
                  <Progress value={c.share * 100} color={c.color} height={7} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-paper-2 text-ink-3">
                <Info size={22} />
              </div>
              <p className="mt-3 max-w-[290px] text-[11px] leading-6 text-ink-3">
                این ماه هنوز هزینه‌ای ثبت نشده است. با ثبت تراکنش‌ها، تحلیل دسته‌بندی هزینه‌ها اینجا
                ظاهر می‌شود.
              </p>
            </div>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <SectionHeader
            title="تحلیل هوشمند جیبینو"
            subtitle="بر اساس رفتار مالی ثبت‌شده شما"
          />
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className={`flex items-start gap-3 rounded-[16px] border p-3.5 ${
                  ins.tone === 'good'
                    ? 'border-brand-soft-2/70 bg-brand-soft/50'
                    : ins.tone === 'warn'
                      ? 'border-[#efd9b4] bg-gold-soft/50'
                      : 'border-line bg-paper/50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    ins.tone === 'good'
                      ? 'bg-brand-2 text-white'
                      : ins.tone === 'warn'
                        ? 'bg-gold text-white'
                        : 'bg-white text-ink-2'
                  }`}
                >
                  {ins.tone === 'good' ? (
                    <TrendingUp size={13} />
                  ) : ins.tone === 'warn' ? (
                    <Info size={13} />
                  ) : (
                    <Sparkles size={13} />
                  )}
                </span>
                <p className="text-[11px] font-medium leading-6 text-ink-2">{ins.text}</p>
              </motion.div>
            ))}
            <Link
              to="/profile"
              className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-bold text-brand-2 hover:underline"
            >
              تحلیل کامل شخصیت و سلامت مالی <ChevronLeft size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------- quick links ----------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/loans"
          className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-1 hover:shadow-[0_26px_50px_-26px_rgba(29,43,37,.5)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-coral-soft text-coral">
            <Landmark size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-ink">وام‌ها و اقساط</div>
            <div className="mt-1 text-[10px] font-semibold text-ink-3">
              {loans.length > 0
                ? `${faDigits(loans.length)} وام ثبت‌شده • مانده ${compact(nw.debts)} تومان`
                : 'ثبت وام و پیگیری اقساط از موجودی نقد'}
            </div>
          </div>
          <ChevronLeft size={17} className="text-ink-3 transition group-hover:-translate-x-1" />
        </Link>

        <Link
          to="/goals"
          className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-1 hover:shadow-[0_26px_50px_-26px_rgba(29,43,37,.5)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-violet-soft text-violet">
            <Target size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-ink">اهداف مالی</div>
            <div className="mt-1 text-[10px] font-semibold text-ink-3">
              {goals.length > 0
                ? `${faDigits(goals.length)} هدف فعال • ${compact(nw.goals)} تومان پس‌انداز`
                : 'ساخت هدف و انتقال پول از موجودی نقد'}
            </div>
          </div>
          <ChevronLeft size={17} className="text-ink-3 transition group-hover:-translate-x-1" />
        </Link>

        <Link
          to="/reports"
          className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-1 hover:shadow-[0_26px_50px_-26px_rgba(29,43,37,.5)] sm:col-span-2 lg:col-span-1"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-sky-soft text-sky">
            <TrendingUp size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-ink">گزارش‌ها و تحلیل</div>
            <div className="mt-1 text-[10px] font-semibold text-ink-3">
              تفکیک جریان نقدی، نمودارها و فیلترهای هوشمند
            </div>
          </div>
          <ChevronLeft size={17} className="text-ink-3 transition group-hover:-translate-x-1" />
        </Link>
      </section>

      {/* --------------------------- recent txs ----------------------- */}
      <section className="card p-5 sm:p-6">
        <SectionHeader
          title="آخرین تراکنش‌ها"
          subtitle="دفتر تراکنش‌های شما"
          action={
            <div className="flex items-center gap-2">
              <QuickAddButton onClick={() => setTxOpen(true)} label="ثبت تراکنش" />
              <Link to="/transactions" className="btn btn-ghost !px-4 !py-2.5 text-[11px]">
                مشاهده همه <ChevronLeft size={13} />
              </Link>
            </div>
          }
        />
        {txs.length > 0 ? (
          <div className="space-y-2">
            {txs.slice(0, 6).map((t) => (
              <TxRow key={t.id} tx={t} />
            ))}
          </div>
        ) : (
          <Banner tone="info">
            هنوز تراکنشی ثبت نشده است. اولین درآمد یا هزینه خود را ثبت کنید تا جریان نقدی، گزارش‌ها و
            تحلیل‌های هوشمند جیبینو فعال شوند.
          </Banner>
        )}
      </section>

      <TxModal open={txOpen} onClose={() => setTxOpen(false)} />
    </div>
  );
}

export function TxRow({
  tx,
  onDelete,
}: {
  tx: {
    id: string;
    type: string;
    kind: string;
    category: string;
    title: string;
    amount: number;
    date: string;
    accountId?: string;
    link?: { type: string; toId?: string };
  };
  onDelete?: (id: string) => void;
}) {
  const { accounts } = useStore();
  const accountName = (id?: string) =>
    id ? (accounts.find((a) => a.id === id)?.name ?? 'حساب حذف‌شده') : null;
  const meta: Record<string, { label: string; color: string; icon: React.ReactNode; sign: string }> = {
    income: {
      label: tx.kind === 'fixed' ? 'درآمد ثابت' : 'درآمد متغیر',
      color: 'bg-brand-soft text-brand-2',
      icon: <ArrowDownLeft size={13} />,
      sign: '+',
    },
    expense: {
      label: 'هزینه',
      color: 'bg-coral-soft text-coral',
      icon: <ArrowUpLeft size={13} />,
      sign: '−',
    },
    investment: {
      label: tx.kind === 'sell' ? 'فروش دارایی' : 'سرمایه‌گذاری',
      color: 'bg-gold-soft text-gold',
      icon: <Gem size={13} />,
      sign: tx.kind === 'sell' ? '+' : '−',
    },
    goal: {
      label: tx.kind === 'withdraw' ? 'برداشت از هدف' : 'انتقال به هدف',
      color: 'bg-violet-soft text-violet',
      icon: <Target size={13} />,
      sign: tx.kind === 'withdraw' ? '+' : '−',
    },
    loan: {
      label: tx.kind === 'principal' ? 'دریافت وام' : 'پرداخت قسط',
      color: 'bg-sky-soft text-sky',
      icon: <Landmark size={13} />,
      sign: tx.kind === 'principal' ? '+' : '−',
    },
    // فاز ۱۵ — انتقال بین حساب‌ها: نه واریز نه برداشت (اثر خالص صفر)
    transfer: {
      label: 'انتقال بین حساب‌ها',
      color: 'bg-paper-2 text-ink-2',
      icon: <ArrowLeftRight size={13} />,
      sign: '⇄',
    },
  };
  const m = meta[tx.type] ?? meta.expense;
  // برچسب حساب: برای انتقال «از X به Y»، برای بقیه نام حساب مؤثر (اگر ثبت شده)
  const accLabel =
    tx.type === 'transfer' && tx.link?.type === 'account-transfer'
      ? `${accountName(tx.accountId) ?? '?'} ← ${accountName(tx.link.toId) ?? '?'}`
      : accountName(tx.accountId);

  return (
    <div className="group flex items-center gap-3 rounded-[15px] border border-line/80 bg-paper/40 px-3.5 py-3 transition hover:border-line-2 hover:bg-white">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${m.color}`}>
        {m.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11.5px] font-bold text-ink">{tx.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[9px] font-semibold text-ink-3">
          <span>{m.label}</span>
          <span className="h-1 w-1 rounded-full bg-line-2" />
          <span>{jDateLabel(tx.date, false)}</span>
          {accLabel && (
            <>
              <span className="h-1 w-1 rounded-full bg-line-2" />
              <span className="flex items-center gap-1 text-ink-2">
                <CreditCard size={9} /> {accLabel}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="text-left">
        <div
          className={`num text-[12px] font-extrabold ${
            m.sign === '+' ? 'text-brand-2' : 'text-ink'
          }`}
        >
          {m.sign !== '⇄' && `${m.sign} `}
          {fmt(tx.amount)}
        </div>
        <div className="text-[8.5px] font-semibold text-ink-3">تومان</div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(tx.id)}
          className="opacity-0 transition group-hover:opacity-100"
          aria-label="حذف"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-2 text-ink-3 hover:bg-coral-soft hover:text-coral">
            ×
          </span>
        </button>
      )}
    </div>
  );
}
