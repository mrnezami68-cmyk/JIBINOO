import { useMemo, useState } from 'react';
import { Search, Filter, Trash2, Plus, Receipt, Download } from 'lucide-react';
import { useStore } from '../lib/store';
import { summarize, expenseByCategory, EXPENSE_CATEGORIES } from '../lib/analysis';
import { fmt, compact, pct, jDateLabel, monthStart, monthEnd, daysAgoISO, faDigits } from '../lib/format';
import { SectionHeader, EmptyState, ConfirmDialog, Banner, StatCard } from '../components/ui';
import { TxModal } from '../components/TxModal';
import { TxRow } from './Dashboard';
import { Progress } from '../components/charts';

const TYPE_FILTERS = [
  { key: 'all', label: 'همه' },
  { key: 'income', label: 'درآمد' },
  { key: 'expense', label: 'هزینه' },
  { key: 'investment', label: 'سرمایه‌گذاری' },
  { key: 'goal', label: 'اهداف' },
  { key: 'loan', label: 'اقساط' },
];

const PERIODS = [
  { key: 'month', label: 'این ماه' },
  { key: '45', label: '۴۵ روز اخیر' },
  { key: '90', label: '۳ ماه اخیر' },
  { key: '180', label: '۶ ماه اخیر' },
  { key: 'all', label: 'کل' },
];

export function Transactions() {
  const { txs, deleteTx, cash } = useStore();
  const [txOpen, setTxOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const range = useMemo(() => {
    if (period === 'month') return { from: monthStart(), to: monthEnd() };
    if (period === 'all') return { from: undefined, to: undefined };
    return { from: daysAgoISO(Number(period)), to: undefined };
  }, [period]);

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (range.from && t.date < range.from) return false;
      if (range.to && t.date > range.to) return false;
      if (query.trim()) {
        const q = query.trim();
        return (
          t.title.includes(q) ||
          (t.note ?? '').includes(q) ||
          String(t.amount).includes(q)
        );
      }
      return true;
    });
  }, [txs, typeFilter, categoryFilter, range, query]);

  const summary = useMemo(
    () => summarize(filtered),
    [filtered]
  );
  const cats = useMemo(() => expenseByCategory(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="دفتر تراکنش‌ها"
        subtitle="همه درآمدها، هزینه‌ها، سرمایه‌گذاری‌ها و جابه‌جایی‌های مالی شما در یک نگاه."
        action={
          <button className="btn btn-primary" onClick={() => setTxOpen(true)}>
            <Plus size={16} /> ثبت تراکنش
          </button>
        }
      />

      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="درآمد بازه"
          value={compact(summary.income)}
          sub={`${faDigits(summary.count)} تراکنش`}
          tone="brand"
        />
        <StatCard label="هزینه بازه" value={compact(summary.expense)} sub="تومان" tone="coral" />
        <StatCard
          label="سرمایه‌گذاری"
          value={compact(summary.investment)}
          sub="جدا از هزینه"
          tone="gold"
        />
        <StatCard
          label="مانده"
          value={compact(summary.income - summary.expense)}
          sub={summary.income > 0 ? `نرخ پس‌انداز ${pct(summary.savingsRate)}` : 'تومان'}
          tone={summary.income - summary.expense >= 0 ? 'brand' : 'coral'}
        />
      </div>

      {/* filters */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              className="input pr-10"
              placeholder="جستجو در عنوان، یادداشت یا مبلغ…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-ink-3">
            <Filter size={13} /> فیلترها:
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`chip ${period === p.key ? 'chip-active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.key}
              className={`chip ${typeFilter === t.key ? 'chip-active' : ''}`}
              onClick={() => setTypeFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {typeFilter === 'expense' && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className={`chip ${categoryFilter === 'all' ? 'chip-active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              همه دسته‌ها
            </button>
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                key={c.key}
                className={`chip ${categoryFilter === c.key ? 'chip-active' : ''}`}
                onClick={() => setCategoryFilter(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* category mini-chart when filtered */}
      {typeFilter === 'expense' && cats.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 text-[13px] font-extrabold text-ink">
            تفکیک هزینه‌های این بازه
          </h3>
          <div className="space-y-3">
            {cats.slice(0, 6).map((c) => (
              <div key={c.key}>
                <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
                  <span className="font-bold text-ink-2">{c.label}</span>
                  <span className="num font-extrabold text-ink">
                    {compact(c.value)} <span className="text-ink-3">({pct(c.share)})</span>
                  </span>
                </div>
                <Progress value={c.share * 100} color={c.color} height={7} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* list */}
      <div className="card p-4 sm:p-5">
        {filtered.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="text-[11px] font-bold text-ink-3">
                {faDigits(filtered.length)} تراکنش یافت شد
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-ink-3">
                <Receipt size={12} /> مجموع: {fmt(summary.income + summary.expense + summary.investment)} تومان
              </div>
            </div>
            {filtered.slice(0, 60).map((t) => (
              <TxRow key={t.id} tx={t} onDelete={setDeleteId} />
            ))}
            {filtered.length > 60 && (
              <div className="pt-2 text-center text-[10.5px] font-semibold text-ink-3">
                {faDigits(filtered.length - 60)} تراکنش دیگر با فیلترهای دقیق‌تر قابل مشاهده است.
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={24} />}
            title="تراکنشی یافت نشد"
            description={
              query || typeFilter !== 'all' || period !== 'all'
                ? 'با این فیلترها تراکنشی وجود ندارد. فیلترها را تغییر دهید یا تراکنش جدیدی ثبت کنید.'
                : 'هنوز تراکنشی ثبت نشده است. اولین درآمد یا هزینه خود را ثبت کنید.'
            }
            action={
              <button className="btn btn-primary" onClick={() => setTxOpen(true)}>
                <Plus size={15} /> ثبت تراکنش
              </button>
            }
          />
        )}
      </div>

      <Banner tone="info">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            موجودی نقد فعلی شما <strong className="num">{fmt(cash)}</strong> تومان است. برای
            خروجی گرفتن از داده‌ها می‌توانید از نسخه PWA روی دستگاه خود استفاده کنید.
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold">
            <Download size={11} /> نسخه آفلاین فعال است
          </span>
        </div>
      </Banner>

      <TxModal open={txOpen} onClose={() => setTxOpen(false)} />
      <ConfirmDialog
        open={!!deleteId}
        title="حذف تراکنش"
        message="این تراکنش حذف و مبلغ آن از موجودی نقد شما برگردانده می‌شود. ادامه می‌دهید؟"
        confirmLabel="حذف شود"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteTx(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
