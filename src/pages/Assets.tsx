import { useMemo, useState } from 'react';
import {
  Gem,
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  Wallet,
  Info,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { valueAssets, computeNetWorth, investmentByType } from '../lib/analysis';
import { fmt, compact, pct, freshness, parseAmount } from '../lib/format';
import { priceForAsset } from '../lib/prices';
import { SectionHeader, Modal, Field, ChipSelect, Banner, EmptyState, ConfirmDialog, StatCard } from '../components/ui';
import { Donut, Progress } from '../components/charts';

const KIND_OPTIONS = [
  { key: 'gold', label: 'طلا و سکه' },
  { key: 'currency', label: 'ارز' },
  { key: 'crypto', label: 'رمزارز' },
  { key: 'metal', label: 'فلزات' },
  { key: 'other', label: 'سایر' },
];

/** برچسب و رنگ منبع قیمت در UI */
const SRC_META: Record<string, { label: string; cls: string }> = {
  tgju: { label: 'طلایار / TGJU', cls: 'bg-gold-soft text-gold' },
  bitpin: { label: 'بیت‌پین', cls: 'bg-brand-soft text-brand-2' },
  coingecko: { label: 'CoinGecko', cls: 'bg-violet-soft text-violet' },
  metals: { label: 'Gold-API', cls: 'bg-sky-soft text-sky' },
  yahoo: { label: 'COMEX', cls: 'bg-sky-soft text-sky' },
  erapi: { label: 'نرخ رسمی', cls: 'bg-paper-2 text-ink-3' },
  'live-rate': { label: 'نرخ رسمی', cls: 'bg-paper-2 text-ink-3' },
  derived: { label: 'مشتق', cls: 'bg-coral-soft text-coral' },
  manual: { label: 'دستی', cls: 'bg-gold-soft text-gold' },
  cache: { label: 'کش', cls: 'bg-paper-2 text-ink-3' },
  fallback: { label: 'آفلاین', cls: 'bg-paper-2 text-ink-3' },
};

const SYMBOL_PRESETS: Record<string, { symbol: string; name: string; unit: string }[]> = {
  gold: [
    { symbol: 'GOLD18', name: 'طلای ۱۸ عیار', unit: 'گرم' },
    { symbol: 'GOLD24', name: 'طلای ۲۴ عیار', unit: 'گرم' },
    { symbol: 'ABSHODE', name: 'طلای آب‌شده', unit: 'مثقال' },
    { symbol: 'IMAMI', name: 'سکه امامی', unit: 'عدد' },
    { symbol: 'BAHAR', name: 'سکه بهار آزادی', unit: 'عدد' },
    { symbol: 'NIM', name: 'نیم‌سکه', unit: 'عدد' },
    { symbol: 'ROB', name: 'ربع‌سکه', unit: 'عدد' },
    { symbol: 'GERMI', name: 'سکه گرمی', unit: 'عدد' },
    { symbol: 'OTHER', name: 'سکه / طلای دست‌ساز', unit: 'عدد' },
  ],
  currency: [
    { symbol: 'USD', name: 'دلار آمریکا', unit: 'دلار' },
    { symbol: 'EUR', name: 'یورو', unit: 'یورو' },
    { symbol: 'AED', name: 'درهم امارات', unit: 'درهم' },
    { symbol: 'TRY', name: 'لیر ترکیه', unit: 'لیر' },
    { symbol: 'OTHER', name: 'سایر ارزها', unit: 'واحد' },
  ],
  crypto: [
    { symbol: 'BTC', name: 'بیت‌کوین', unit: 'BTC' },
    { symbol: 'ETH', name: 'اتریوم', unit: 'ETH' },
    { symbol: 'USDT', name: 'تتر', unit: 'USDT' },
    { symbol: 'SOL', name: 'سولانا', unit: 'SOL' },
    { symbol: 'XRP', name: 'ریپل', unit: 'XRP' },
    { symbol: 'DOGE', name: 'دوج‌کوین', unit: 'DOGE' },
    { symbol: 'ADA', name: 'کاردانو', unit: 'ADA' },
    { symbol: 'TRX', name: 'ترون', unit: 'TRX' },
    { symbol: 'BNB', name: 'بایننس‌کوین', unit: 'BNB' },
    { symbol: 'TON', name: 'تون‌کوین', unit: 'TON' },
    { symbol: 'LINK', name: 'چین‌لینک', unit: 'LINK' },
    { symbol: 'AVAX', name: 'آوالانچ', unit: 'AVAX' },
    { symbol: 'OTHER', name: 'سایر رمزارزها', unit: 'واحد' },
  ],
  metal: [
    { symbol: 'SILVER', name: 'نقره', unit: 'گرم' },
    { symbol: 'PLATIN', name: 'پلاتین', unit: 'گرم' },
    { symbol: 'COPPER', name: 'مس', unit: 'کیلوگرم' },
    { symbol: 'OTHER', name: 'فلز دیگر', unit: 'واحد' },
  ],
  other: [
    { symbol: 'OTHER', name: 'دارایی دیگر (ماشین، ملک، تجهیزات…)', unit: 'واحد' },
  ],
};

export function Assets() {
  const store = useStore();
  const { assets, prices, addAsset, deleteAsset, sellAsset, refreshPrices, refreshing, cash } = store;
  const [addOpen, setAddOpen] = useState(false);
  const [sellId, setSellId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const valued = useMemo(() => valueAssets(assets, prices), [assets, prices]);
  const nw = useMemo(() => computeNetWorth(store.state, prices), [store.state, prices]);
  const slices = useMemo(() => investmentByType(assets, prices), [assets, prices]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="دارایی‌ها و سرمایه‌گذاری"
        subtitle="ارزش لحظه‌ای طلا، ارز و رمزارز شما به‌صورت خودکار به‌روزرسانی می‌شود."
        action={
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => void refreshPrices()}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'در حال به‌روزرسانی…' : `قیمت‌ها ${freshness(prices.updatedAt)}`}
            </button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> افزودن دارایی
            </button>
          </div>
        }
      />

      {/* overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="ارزش کل سرمایه‌گذاری"
          value={compact(nw.investments)}
          sub="تومان — به‌روز"
          icon={<Gem size={18} />}
          tone="gold"
        />
        <StatCard
          label="قیمت تمام‌شده خرید"
          value={compact(nw.investedCost)}
          sub="تومان"
          icon={<Wallet size={18} />}
          tone="neutral"
        />
        <StatCard
          label="سود / زیان"
          value={`${nw.pnl >= 0 ? '+' : '−'} ${compact(Math.abs(nw.pnl))}`}
          sub={valued.length ? `${pct(nw.pnlPct)} نسبت به خرید` : '—'}
          icon={nw.pnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          tone={nw.pnl >= 0 ? 'brand' : 'coral'}
        />
        <StatCard
          label="موجودی نقد"
          value={compact(cash)}
          sub="تومان"
          icon={<Wallet size={18} />}
          tone="sky"
        />
      </div>

      {/* allocation + rates */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h3 className="mb-1 text-[15px] font-extrabold text-ink">ترکیب سبد سرمایه‌گذاری</h3>
          <p className="mb-5 text-[11px] text-ink-3">
            سهم هر طبقه دارایی از ارزش لحظه‌ای سبد شما
          </p>
          {slices.length > 0 ? (
            <Donut
              slices={slices}
              size={196}
              thickness={27}
              centerValue={compact(nw.investments)}
              centerLabel="ارزش سبد (تومان)"
            />
          ) : (
            <EmptyState
              icon={<Gem size={22} />}
              title="سبد شما خالی است"
              description="با افزودن طلا، ارز یا رمزارز، ترکیب سبد و سود و زیان لحظه‌ای آن اینجا نمایش داده می‌شود."
            />
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="mb-1 text-[15px] font-extrabold text-ink">نرخ‌های مرجع امروز</h3>
          <p className="mb-4 text-[11px] leading-6 text-ink-3">
            موتور چندمنبعه: طلایار/TGJU، بیت‌پین، CoinGecko، Gold-API و COMEX — با قیمت‌های
            مشتق و کش آخرین قیمت واقعی.
          </p>

          {/* سلامت منابع */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {prices.sources.map((s) => (
              <span
                key={s.id}
                title={s.detail ?? ''}
                className={`rounded-full px-2.5 py-1 text-[8.5px] font-bold ${
                  s.ok ? 'bg-brand-soft text-brand-2' : 'bg-paper-2 text-ink-3'
                }`}
              >
                {s.ok ? '✓' : '✕'} {s.label}
              </span>
            ))}
          </div>

          <div className="space-y-2.5">
            {['usd', 'gold18', 'gold24', 'abshode', 'coin_emami', 'coin_nim', 'coin_rob', 'silver', 'copper', 'bitcoin']
              .map((id) => prices.items[id])
              .filter(Boolean)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-[14px] border border-line bg-paper/50 px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-brand-3" />
                    <span className="text-[11px] font-bold text-ink-2">{p.label}</span>
                    <span className="text-[8.5px] font-bold text-ink-3">{p.unit}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${
                        SRC_META[p.source]?.cls ?? 'bg-paper-2 text-ink-3'
                      }`}
                    >
                      {SRC_META[p.source]?.label ?? p.source}
                    </span>
                  </div>
                  <div className="num text-[12px] font-extrabold text-ink">
                    {p.toman ? fmt(Math.round(p.toman)) : '—'}
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-4">
            <Banner tone="info">
              منابع: طلایار/TGJU (بازار ایران)، بیت‌پین (بازار تومانی + نرخ مشتق دلار از تتر)،
              CoinGecko (رمزارز)، Gold-API (نقره/پلاتین) و COMEX (مس). در صورت قطعی، ابتدا
              آخرین قیمت واقعی (کش) و سپس نرخ دستی شما (تنظیمات) استفاده می‌شود. فرمول‌های
              مشتق‌سازی: فایل <span className="font-extrabold">docs/PRICE_ENGINE.md</span>
            </Banner>
          </div>
        </div>
      </div>

      {/* asset list */}
      <div className="card p-4 sm:p-6">
        <h3 className="mb-4 text-[15px] font-extrabold text-ink">فهرست دارایی‌ها</h3>
        {valued.length > 0 ? (
          <div className="space-y-3">
            {valued.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-4 rounded-[18px] border border-line bg-paper/40 p-4 transition hover:border-line-2 hover:bg-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-white shadow-[0_10px_22px_-14px_rgba(29,43,37,.4)]">
                  <span className="text-[10px] font-extrabold text-ink-2">
                    {a.symbol.slice(0, 4)}
                  </span>
                </div>

                <div className="min-w-[150px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-extrabold text-ink">{a.name}</span>
                    {a.live && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[8px] font-bold text-brand-2">
                        قیمت لحظه‌ای
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[9.5px] font-semibold text-ink-3">
                    {fmt(a.quantity)} {a.unit} • میانگین خرید {fmt(a.avgBuy)} تومان
                  </div>
                  <div className="mt-2 w-full max-w-[190px]">
                    <Progress
                      value={a.pnlPct >= 0 ? 50 + Math.min(50, a.pnlPct * 100) : 50 - Math.min(50, Math.abs(a.pnlPct) * 100)}
                      color={a.pnl >= 0 ? '#2f9c78' : '#cd6a58'}
                      height={5}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-[8.5px] font-bold text-ink-3">قیمت فعلی هر واحد</div>
                    <div className="num text-[11px] font-extrabold text-ink">
                      {a.livePrice ? fmt(Math.round(a.livePrice)) : fmt(a.avgBuy)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8.5px] font-bold text-ink-3">ارزش کل</div>
                    <div className="num text-[13px] font-extrabold text-ink">
                      {compact(a.value)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8.5px] font-bold text-ink-3">سود / زیان</div>
                    <div
                      className={`num text-[11px] font-extrabold ${
                        a.pnl >= 0 ? 'text-brand-2' : 'text-coral'
                      }`}
                    >
                      {a.pnl >= 0 ? '+' : '−'} {compact(Math.abs(a.pnl))} ({pct(a.pnlPct)})
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-2 transition hover:border-brand-3 hover:text-brand-2"
                      onClick={() => setSellId(a.id)}
                      title="فروش"
                    >
                      <TrendingDown size={13} />
                    </button>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-2 transition hover:border-coral hover:text-coral"
                      onClick={() => setDeleteId(a.id)}
                      title="حذف"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Gem size={24} />}
            title="هنوز دارایی ثبت نکرده‌اید"
            description="طلا، ارز یا رمزارز خود را اضافه کنید تا جیبینو ارزش لحظه‌ای، سود و زیان و ترکیب سبد شما را به‌صورت خودکار محاسبه کند."
            action={
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={15} /> افزودن اولین دارایی
              </button>
            }
          />
        )}
      </div>

      <AddAssetModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addAsset} />
      <SellModal
        assetId={sellId}
        onClose={() => setSellId(null)}
        onSell={(qty, price) => {
          if (sellId) sellAsset(sellId, qty, price);
          setSellId(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="حذف دارایی"
        message="این دارایی به‌همراه تراکنش‌های خرید/فروش مرتبط آن حذف و اثر نقدی برگردانده می‌شود تا تراز بماند. ادامه می‌دهید؟"
        confirmLabel="حذف شود"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteAsset(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}

function AddAssetModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (
    a: {
      kind: 'gold' | 'currency' | 'crypto' | 'metal' | 'other';
      name: string;
      symbol: string;
      unit: string;
      quantity: number;
      avgBuy: number;
      note?: string;
    },
    opts?: { fromCash?: boolean }
  ) => void;
}) {
  const { prices, cash } = useStore();
  const [kind, setKind] = useState('gold');
  const [preset, setPreset] = useState('GOLD18');
  const [name, setName] = useState('طلای ۱۸ عیار');
  const [qty, setQty] = useState('');
  const [avgBuy, setAvgBuy] = useState('');
  const [note, setNote] = useState('');
  const [fromCash, setFromCash] = useState(true);
  const [error, setError] = useState('');

  const presets = SYMBOL_PRESETS[kind] ?? SYMBOL_PRESETS.other;
  const selected = presets.find((p) => p.symbol === preset) ?? presets[0];
  const live = selected ? priceForAsset(prices, kind, selected.symbol) : { toman: null };

  const handleSubmit = () => {
    const q = parseAmount(qty);
    const avg = avgBuy.trim() ? parseAmount(avgBuy) : (live.toman ?? 0);
    if (q <= 0) {
      setError('تعداد یا مقدار دارایی را وارد کنید.');
      return;
    }
    if (avg <= 0) {
      setError('قیمت خرید هر واحد را وارد کنید.');
      return;
    }
    const total = q * avg;
    if (fromCash && total > cash) {
      setError(`مجموع خرید (${fmt(total)} تومان) از موجودی نقد بیشتر است.`);
      return;
    }
    // اتمیک داخل store: ثبت دارایی + کسر نقد + سند خریدِ پیوندخورده (باگ شماره ۷)
    onAdd(
      {
        kind: kind as never,
        name: name || selected?.name || 'دارایی',
        symbol: selected?.symbol ?? 'OTHER',
        unit: selected?.unit ?? 'واحد',
        quantity: q,
        avgBuy: avg,
        note: note.trim() || undefined,
      },
      { fromCash }
    );
    setQty('');
    setAvgBuy('');
    setNote('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="افزودن دارایی"
      subtitle="قیمت لحظه‌ای به‌صورت خودکار محاسبه می‌شود؛ کافی است مقدار و قیمت خرید را وارد کنید."
      footer={
        <div className="flex gap-3">
          <button className="btn btn-primary flex-1 !py-3.5" onClick={handleSubmit}>
            ثبت دارایی
          </button>
          <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
            انصراف
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-[12px] font-bold text-ink-2">نوع دارایی</div>
          <ChipSelect
            options={KIND_OPTIONS}
            value={kind}
            onChange={(v) => {
              setKind(v);
              const first = SYMBOL_PRESETS[v][0];
              setPreset(first.symbol);
              setName(first.name);
            }}
            columns={3}
          />
        </div>

        <Field label="عنوان دارایی">
          <select
            className="input"
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              const p = presets.find((x) => x.symbol === e.target.value);
              if (p) setName(p.name);
            }}
          >
            {presets.map((p) => (
              <option key={p.symbol} value={p.symbol}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="تعداد / مقدار" hint={selected?.unit}>
            <input
              className="input num"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="مثلاً ۲٫۵"
            />
          </Field>
          <Field label="میانگین قیمت خرید هر واحد" hint="تومان">
            <input
              className="input num"
              inputMode="numeric"
              value={avgBuy}
              onChange={(e) => setAvgBuy(e.target.value)}
              placeholder={live.toman ? fmt(Math.round(live.toman)) : '۰'}
            />
          </Field>
        </div>

        {live.toman && (
          <div className="flex items-center justify-between rounded-[14px] border border-brand-soft-2 bg-brand-soft/50 px-4 py-3">
            <div className="flex items-center gap-2 text-[10.5px] font-bold text-brand-2">
              <Info size={14} /> قیمت لحظه‌ای هر واحد (تومان)
            </div>
            <div className="num text-[13px] font-extrabold text-brand-2">
              {fmt(Math.round(live.toman))}
            </div>
          </div>
        )}

        <Field label="یادداشت" hint="اختیاری">
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً خرید از طلافروشی محل…"
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-[15px] border border-line bg-paper/50 p-4">
          <input
            type="checkbox"
            checked={fromCash}
            onChange={(e) => setFromCash(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#0e5744]"
          />
          <div>
            <div className="text-[11px] font-bold text-ink-2">
              مبلغ خرید از موجودی نقد کم و در دفتر تراکنش‌ها ثبت شود
            </div>
            <div className="mt-1 text-[9.5px] font-medium leading-5 text-ink-3">
              موجودی نقد فعلی: {fmt(cash)} تومان — این مبلغ «سرمایه‌گذاری» ثبت می‌شود، نه هزینه.
            </div>
          </div>
        </label>

        {error && <Banner tone="danger">{error}</Banner>}
      </div>
    </Modal>
  );
}

function SellModal({
  assetId,
  onClose,
  onSell,
}: {
  assetId: string | null;
  onClose: () => void;
  onSell: (quantity: number, unitPrice: number) => void;
}) {
  const { assets, prices } = useStore();
  const asset = assets.find((a) => a.id === assetId);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');

  const live = asset ? priceForAsset(prices, asset.kind, asset.symbol) : { toman: null };

  return (
    <Modal
      open={!!assetId}
      onClose={onClose}
      title={`فروش ${asset?.name ?? 'دارایی'}`}
      subtitle="مبلغ فروش به موجودی نقد شما واریز می‌شود."
      size="sm"
      footer={
        asset ? (
          <div className="flex gap-3">
            <button
              className="btn btn-primary flex-1 !py-3.5"
              onClick={() => {
                const q = qty.trim() ? parseAmount(qty) : asset.quantity;
                const p = price.trim() ? parseAmount(price) : (live.toman ?? asset.avgBuy);
                if (q > 0 && p > 0) onSell(Math.min(q, asset.quantity), p);
              }}
            >
              ثبت فروش
            </button>
            <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
              انصراف
            </button>
          </div>
        ) : null
      }
    >
      {asset && (
        <div className="space-y-4">
          <div className="rounded-[15px] border border-line bg-paper/50 p-4 text-[10.5px] font-semibold text-ink-2">
            موجودی فعلی: <span className="num font-extrabold">{fmt(asset.quantity)}</span>{' '}
            {asset.unit} • قیمت لحظه‌ای هر واحد:{' '}
            <span className="num font-extrabold">
              {live.toman ? fmt(Math.round(live.toman)) : fmt(asset.avgBuy)}
            </span>{' '}
            تومان
          </div>
          <Field label="مقدار فروش" hint={asset.unit}>
            <input
              className="input num"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={String(asset.quantity)}
            />
          </Field>
          <Field label="قیمت فروش هر واحد" hint="تومان">
            <input
              className="input num"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={String(Math.round(live.toman ?? asset.avgBuy))}
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}
