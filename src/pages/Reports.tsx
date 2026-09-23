import { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Gem,
  Filter,
  Info,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useStore } from '../lib/store';
import {
  summarize,
  expenseByCategory,
  investmentByType,
  lastMonths,
  computeNetWorth,
  EXPENSE_CATEGORIES,
} from '../lib/analysis';
import {
  compact,
  pct,
  faDigits,
  monthStart,
  monthEnd,
  daysAgoISO,
  jDateLabel,
  jYear,
  J_MONTHS,
  toJalali,
} from '../lib/format';
import { SectionHeader, StatCard, Banner } from '../components/ui';
import { Donut, GroupedBars, AreaChart, Progress, StackedBar, Ring } from '../components/charts';

type PeriodKey = 'month' | 'lastMonth' | '3m' | '6m' | 'year' | 'all';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'این ماه' },
  { key: 'lastMonth', label: 'ماه قبل' },
  { key: '3m', label: '۳ ماه اخیر' },
  { key: '6m', label: '۶ ماه اخیر' },
  { key: 'year', label: 'سال جاری' },
  { key: 'all', label: 'کل دوره' },
];

export function Reports() {
  const store = useStore();
  const { txs, prices, assets, goals } = store;
  const [period, setPeriod] = useState<PeriodKey>('3m');
  const [excludedCats, setExcludedCats] = useState<string[]>([]);
  const [chartMode, setChartMode] = useState<'bars' | 'area'>('bars');

  const range = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'month':
        return { from: monthStart(now), to: monthEnd(now) };
      case 'lastMonth': {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { from: monthStart(d), to: monthEnd(d) };
      }
      case '3m':
        return { from: daysAgoISO(90), to: undefined };
      case '6m':
        return { from: daysAgoISO(180), to: undefined };
      case 'year':
        return { from: `${now.getFullYear()}-01-01`, to: undefined };
      default:
        return { from: undefined, to: undefined };
    }
  }, [period]);

  const summary = useMemo(() => summarize(txs, range.from, range.to), [txs, range]);
  const cats = useMemo(
    () => expenseByCategory(txs, range.from, range.to).filter((c) => !excludedCats.includes(c.key)),
    [txs, range, excludedCats]
  );
  const months = useMemo(() => lastMonths(txs, 6), [txs]);
  const nw = useMemo(() => computeNetWorth(store.state, prices), [store.state, prices]);
  const investSlices = useMemo(() => investmentByType(assets, prices), [assets, prices]);

  const now = new Date();
  const [, jm] = toJalali(now);
  const currentJMonth = `${J_MONTHS[jm - 1]} ${faDigits(jYear(now))}`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="گزارش‌ها و تحلیل مالی"
        subtitle="تفکیک دقیق جریان نقدی — سرمایه‌گذاری و انتقال به هدف، «هزینه» نیستند؛ آن‌ها جابه‌جایی دارایی‌اند."
        action={
          <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-[10px] font-bold text-ink-3">
            <Calendar size={12} />
            {range.from ? jDateLabel(range.from) : 'از ابتدا'} تا{' '}
            {range.to ? jDateLabel(range.to) : 'امروز'}
          </div>
        }
      />

      {/* period filter */}
      <div className="card flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold text-ink-2">
          <Filter size={14} className="text-brand-2" /> بازه زمانی:
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`chip ${period === p.key ? 'chip-active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="درآمد"
          value={compact(summary.income)}
          sub={`ثابت ${compact(summary.fixedIncome)} • متغیر ${compact(summary.variableIncome)}`}
          icon={<TrendingDown size={18} />}
          tone="brand"
        />
        <StatCard
          label="هزینه‌ها"
          value={compact(summary.expense)}
          sub={`${faDigits(summary.count)} تراکنش در بازه`}
          icon={<TrendingUp size={18} />}
          tone="coral"
        />
        <StatCard
          label="جریان نقدی خالص"
          value={`${summary.netFlow >= 0 ? '+' : '−'} ${compact(Math.abs(summary.netFlow))}`}
          sub="درآمد منهای هزینه"
          icon={<PiggyBank size={18} />}
          tone={summary.netFlow >= 0 ? 'brand' : 'coral'}
        />
        <StatCard
          label="سرمایه‌گذاری"
          value={compact(summary.investment)}
          sub="جدا از هزینه محاسبه می‌شود"
          icon={<Gem size={18} />}
          tone="gold"
        />
        <StatCard
          label="نرخ پس‌انداز"
          value={summary.income > 0 ? pct(summary.savingsRate) : '—'}
          sub={`نرخ سرمایه‌گذاری: ${summary.income > 0 ? pct(summary.investRate) : '—'}`}
          icon={<Sparkles size={18} />}
          tone={summary.savingsRate >= 0.2 ? 'brand' : 'violet'}
        />
      </div>

      {/* clarity banner */}
      <Banner tone="success">
        <strong>شفاف‌سازی محاسبات:</strong> در این گزارش‌ها، «درآمد» فقط پول واردشده به جیب شماست،
        «هزینه» فقط مخارج زندگی است، و «سرمایه‌گذاری / انتقال به هدف / پرداخت قسط» جابه‌جایی دارایی
        محسوب می‌شوند و از نرخ پس‌انداز شما کم نمی‌شوند.
      </Banner>

      {/* main charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* comparison chart */}
        <div className="card p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-extrabold text-ink">مقایسه ۶ ماه اخیر</h3>
              <p className="mt-1 text-[10.5px] text-ink-3">
                درآمد، هزینه و سرمایه‌گذاری هر ماه در یک نگاه
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className={`chip ${chartMode === 'bars' ? 'chip-active' : ''}`}
                onClick={() => setChartMode('bars')}
              >
                ستونی
              </button>
              <button
                className={`chip ${chartMode === 'area' ? 'chip-active' : ''}`}
                onClick={() => setChartMode('area')}
              >
                روند
              </button>
            </div>
          </div>

          {chartMode === 'bars' ? (
            <GroupedBars
              data={months.map((m) => ({
                label: m.label.slice(0, 5),
                income: m.income,
                expense: m.expense,
                investment: m.investment,
              }))}
            />
          ) : (
            <AreaChart
              points={months.map((m) => ({ label: m.label.slice(0, 4), value: m.net }))}
              color="#7161c4"
              label="روند جریان نقدی خالص ماهانه (درآمد − هزینه)"
              formatValue={(v) => `${compact(v)} تومان`}
            />
          )}
        </div>

        {/* expense donut */}
        <div className="card p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-[15px] font-extrabold text-ink">هزینه‌ها بر اساس دسته</h3>
            <p className="mt-1 text-[10.5px] text-ink-3">
              برای حذف/افزودن یک دسته از نمودار، روی آن بزنید
            </p>
          </div>

          {cats.length > 0 ? (
            <>
              <Donut
                slices={cats.map((c) => ({
                  key: c.key,
                  label: c.label,
                  value: c.value,
                  color: c.color,
                }))}
                size={196}
                thickness={27}
                centerValue={compact(cats.reduce((s, c) => s + c.value, 0))}
                centerLabel="کل هزینه (تومان)"
                onSliceClick={(key) =>
                  setExcludedCats((prev) =>
                    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                  )
                }
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((c) => {
                  const excluded = excludedCats.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      className={`chip ${excluded ? 'opacity-45' : ''}`}
                      onClick={() =>
                        setExcludedCats((prev) =>
                          prev.includes(c.key) ? prev.filter((k) => k !== c.key) : [...prev, c.key]
                        )
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: c.color, opacity: excluded ? 0.35 : 1 }}
                      />
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {excludedCats.length > 0 && (
                <button
                  className="mt-3 text-[10.5px] font-bold text-brand-2 hover:underline"
                  onClick={() => setExcludedCats([])}
                >
                  بازگردانی همه دسته‌ها
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-paper-2 text-ink-3">
                <Info size={22} />
              </div>
              <p className="mt-3 max-w-[280px] text-[11px] leading-6 text-ink-3">
                هزینه‌ای در این بازه ثبت نشده است. با ثبت تراکنش‌های هزینه، نمودار دسته‌بندی اینجا
                ظاهر می‌شود.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* income structure + investment mix */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h3 className="text-[15px] font-extrabold text-ink">ساختار درآمد</h3>
          <p className="mt-1 text-[10.5px] text-ink-3">
            تفکیک درآمد ثابت ماهانه از درآمد متغیر و پروژه‌ای ({currentJMonth})
          </p>

          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-ink-2">درآمد ثابت ماهانه</span>
              <span className="num text-[13px] font-extrabold text-brand-2">
                {compact(summary.fixedIncome)}
              </span>
            </div>
            <Progress
              value={summary.income > 0 ? (summary.fixedIncome / summary.income) * 100 : 0}
              color="#2f9c78"
              height={11}
            />
            <div className="mb-2 mt-5 flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-ink-2">درآمد متغیر / پروژه‌ای</span>
              <span className="num text-[13px] font-extrabold text-gold">
                {compact(summary.variableIncome)}
              </span>
            </div>
            <Progress
              value={summary.income > 0 ? (summary.variableIncome / summary.income) * 100 : 0}
              color="#c08d2c"
              height={11}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[16px] border border-line bg-paper/50 p-4">
              <div className="text-[9.5px] font-bold text-ink-3">سهم درآمد ثابت</div>
              <div className="num mt-1.5 text-[19px] font-extrabold text-brand-2">
                {summary.income > 0 ? pct(summary.fixedIncome / summary.income) : '—'}
              </div>
              <div className="mt-1 text-[9px] font-semibold leading-4 text-ink-3">
                درآمد قابل‌پیش‌بینی، پایه برنامه‌ریزی مالی است
              </div>
            </div>
            <div className="rounded-[16px] border border-line bg-paper/50 p-4">
              <div className="text-[9.5px] font-bold text-ink-3">سهم درآمد متغیر</div>
              <div className="num mt-1.5 text-[19px] font-extrabold text-gold">
                {summary.income > 0 ? pct(summary.variableIncome / summary.income) : '—'}
              </div>
              <div className="mt-1 text-[9px] font-semibold leading-4 text-ink-3">
                درآمد متغیر بالا ← صندوق اضطراری بزرگ‌تر (۶ ماه)
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Banner tone="info">
              برای درآمدهای متغیر، جیبینو میانگین سه‌ماهه را مبنا قرار می‌دهد تا در ماه‌های پردرآمد
              بیش از توان خرج نکنید و در ماه‌های کم‌درآمد غافلگیر نشوید.
            </Banner>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="text-[15px] font-extrabold text-ink">سرمایه‌گذاری‌ها بر اساس نوع</h3>
          <p className="mt-1 text-[10.5px] text-ink-3">
            ارزش لحظه‌ای سبد شما — به‌روزرسانی خودکار با قیمت‌های زنده
          </p>

          {investSlices.length > 0 ? (
            <>
              <div className="mt-6">
                <StackedBar
                  segments={investSlices.map((s) => ({
                    key: s.key,
                    label: s.label,
                    value: s.value,
                    color: s.color,
                  }))}
                  height={18}
                />
              </div>

              <div className="mt-6 space-y-3">
                {investSlices.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between rounded-[15px] border border-line bg-paper/40 px-4 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-8 w-1.5 rounded-full" style={{ background: s.color }} />
                      <div>
                        <div className="text-[11px] font-bold text-ink">{s.label}</div>
                        <div className="text-[8.5px] font-semibold text-ink-3">
                          {pct(s.share)} از کل سبد
                        </div>
                      </div>
                    </div>
                    <div className="num text-[12px] font-extrabold text-ink">
                      {compact(s.value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-around rounded-[18px] border border-line bg-paper/40 py-5">
                <Ring
                  value={Math.max(0, 50 + nw.pnlPct * 100)}
                  size={110}
                  thickness={12}
                  color={nw.pnl >= 0 ? '#2f9c78' : '#cd6a58'}
                >
                  <div className="text-center">
                    <div className="num text-[15px] font-extrabold">
                      {nw.pnl >= 0 ? '+' : '−'}
                      {pct(Math.abs(nw.pnlPct))}
                    </div>
                    <div className="mt-0.5 text-[8px] font-semibold text-ink-3">بازده سبد</div>
                  </div>
                </Ring>
                <div className="space-y-2.5">
                  <div>
                    <div className="text-[9px] font-bold text-ink-3">ارزش فعلی سبد</div>
                    <div className="num text-[13px] font-extrabold text-ink">
                      {compact(nw.investments)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-ink-3">قیمت تمام‌شده</div>
                    <div className="num text-[13px] font-extrabold text-ink-2">
                      {compact(nw.investedCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-ink-3">سود / زیان</div>
                    <div
                      className={`num text-[13px] font-extrabold ${
                        nw.pnl >= 0 ? 'text-brand-2' : 'text-coral'
                      }`}
                    >
                      {nw.pnl >= 0 ? '+' : '−'} {compact(Math.abs(nw.pnl))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gold-soft text-gold">
                <Gem size={22} />
              </div>
              <p className="mt-3 max-w-[300px] text-[11px] leading-6 text-ink-3">
                هنوز دارایی سرمایه‌گذاری ثبت نکرده‌اید. از تب «دارایی‌ها» طلا، ارز یا رمزارز خود را
                اضافه کنید تا تحلیل سبد اینجا نمایش داده شود.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* goals + debt summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h3 className="text-[15px] font-extrabold text-ink">پیشرفت اهداف مالی</h3>
          <p className="mt-1 text-[10.5px] text-ink-3">انتقال به هدف، پس‌انداز است نه هزینه</p>
          {goals.length > 0 ? (
            <div className="mt-5 space-y-4">
              {goals.slice(0, 5).map((g) => {
                const saved = g.transfers.reduce(
                  (s, t) => s + (t.kind === 'deposit' ? t.amount : -t.amount),
                  0
                );
                const progress = g.target > 0 ? Math.min(1, saved / g.target) : 0;
                return (
                  <div key={g.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[18px]">{g.icon}</span>
                        <div>
                          <div className="text-[11px] font-bold text-ink">{g.title}</div>
                          <div className="text-[8.5px] font-semibold text-ink-3">
                            {compact(saved)} از {compact(g.target)} تومان
                          </div>
                        </div>
                      </div>
                      <div className="num text-[12px] font-extrabold text-brand-2">
                        {pct(progress)}
                      </div>
                    </div>
                    <Progress value={progress * 100} color="#7161c4" height={8} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[16px] border border-dashed border-line-2 bg-paper/40 px-5 py-8 text-center">
              <p className="text-[11px] leading-6 text-ink-3">
                هنوز هدف مالی تعریف نکرده‌اید. یک هدف مشخص (مثلاً خرید لپ‌تاپ یا پس‌انداز اضطراری)
                با مبلغ معین بسازید.
              </p>
            </div>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="text-[15px] font-extrabold text-ink">فشار بدهی و اقساط</h3>
          <p className="mt-1 text-[10.5px] text-ink-3">نسبت اقساط به درآمد، شاخص مهم سلامت مالی</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[16px] border border-line bg-paper/50 p-4">
              <div className="text-[9.5px] font-bold text-ink-3">پرداخت‌شده در این بازه</div>
              <div className="num mt-1.5 text-[17px] font-extrabold text-sky">
                {compact(summary.loanPaid)}
              </div>
            </div>
            <div className="rounded-[16px] border border-line bg-paper/50 p-4">
              <div className="text-[9.5px] font-bold text-ink-3">مانده کل بدهی</div>
              <div className="num mt-1.5 text-[17px] font-extrabold text-coral">
                {compact(nw.debts)}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between text-[10.5px]">
              <span className="font-bold text-ink-2">نسبت اقساط به درآمد این بازه</span>
              <span className="num font-extrabold text-ink">
                {summary.income > 0 ? pct(summary.loanPaid / summary.income) : '—'}
              </span>
            </div>
            <Progress
              value={
                summary.income > 0 ? Math.min(100, (summary.loanPaid / summary.income) * 100) : 0
              }
              color={
                summary.income > 0 && summary.loanPaid / summary.income > 0.3 ? '#cd6a58' : '#4a86b4'
              }
              height={10}
            />
            <p className="mt-2 text-[9px] font-semibold leading-4 text-ink-3">
              مرز سلامت: نسبت بالای ۳۰٪ یعنی فشار بدهی زیاد؛ در این حالت از وام جدید پرهیز کنید.
            </p>
          </div>

          <div className="mt-5">
            <Banner tone="info">
              پرداخت قسط از موجودی نقد کم می‌شود، اما «هزینه زندگی» محسوب نمی‌شود؛ زیرا اصل بدهی
              قبلاً به‌صورت دارایی یا خدمات دریافت شده است.
            </Banner>
          </div>
        </div>
      </div>

      {/* monthly detail table */}
      <div className="card p-5 sm:p-6">
        <h3 className="text-[15px] font-extrabold text-ink">جدول ماهانه ۶ ماه اخیر</h3>
        <p className="mt-1 text-[10.5px] text-ink-3">اعداد دقیق برای مقایسه روندها</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-right">
            <thead>
              <tr className="border-b border-line text-[9.5px] font-bold text-ink-3">
                <th className="pb-3 pr-2">ماه</th>
                <th className="pb-3">درآمد</th>
                <th className="pb-3">هزینه</th>
                <th className="pb-3">سرمایه‌گذاری</th>
                <th className="pb-3">جریان خالص</th>
                <th className="pb-3 pl-2">نرخ پس‌انداز</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-2 text-[10.5px] font-bold text-ink">{m.label}</td>
                  <td className="num py-3 text-[10.5px] font-extrabold text-brand-2">
                    {compact(m.income)}
                  </td>
                  <td className="num py-3 text-[10.5px] font-extrabold text-coral">
                    {compact(m.expense)}
                  </td>
                  <td className="num py-3 text-[10.5px] font-extrabold text-gold">
                    {compact(m.investment)}
                  </td>
                  <td
                    className={`num py-3 text-[10.5px] font-extrabold ${
                      m.net >= 0 ? 'text-ink' : 'text-coral'
                    }`}
                  >
                    {m.net >= 0 ? '+' : '−'} {compact(Math.abs(m.net))}
                  </td>
                  <td className="num py-3 pl-2 text-[10.5px] font-bold text-ink-2">
                    {m.income > 0 ? pct(Math.max(0, m.net) / m.income) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-[15px] bg-paper px-4 py-3">
          <BarChart3 size={15} className="mt-0.5 shrink-0 text-brand-2" />
          <p className="text-[10px] font-semibold leading-5 text-ink-2">
            نکته: ماه‌هایی که در آن‌ها دارایی خریداری شده یا به هدف پول منتقل شده، ممکن است «جریان
            نقدی» منفی نشان دهند — این به معنای هزینه نیست، بلکه تبدیل نقد به دارایی است.
          </p>
        </div>
      </div>
    </div>
  );
}
