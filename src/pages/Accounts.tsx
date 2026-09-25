import { useState } from 'react';
import {
  CreditCard,
  Plus,
  ArrowLeftRight,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Wallet,
  Star,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { fmt, compact, faDigits, parseAmount, todayISO } from '../lib/format';
import type { Account } from '../lib/types';
import {
  SectionHeader,
  Modal,
  Field,
  AmountInput,
  Banner,
  EmptyState,
  ConfirmDialog,
  StatCard,
} from '../components/ui';

/** پالت رنگ کارت حساب‌ها */
const ACCOUNT_COLORS = ['#2f9c78', '#4a86b4', '#c08d2c', '#7161c4', '#cd6a58', '#59a5c9', '#7bab6b', '#9a8fb8'];

export function Accounts() {
  const { accounts, txs, addAccount, updateAccount, deleteAccount, transferBetweenAccounts } =
    useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferPreset, setTransferPreset] = useState<{ from?: string; to?: string; amount?: string }>({});

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const monthKey = todayISO().slice(0, 7);

  const deleteTarget = accounts.find((a) => a.id === deleteId) ?? null;

  const openTransfer = (preset: { from?: string; to?: string; amount?: string } = {}) => {
    setTransferPreset(preset);
    setTransferOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="حساب‌های بانکی"
        subtitle="موجودی هر حساب را جدا مدیریت کنید؛ مجموع آن‌ها همان «موجودی نقد» شماست. برای هر پرداخت یا واریز، حساب مبدأ/مقصد را انتخاب می‌کنید."
        action={
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => openTransfer()}
              disabled={active.length < 2}
              title={active.length < 2 ? 'برای انتقال حداقل دو حساب لازم است' : undefined}
            >
              <ArrowLeftRight size={15} /> انتقال بین حساب‌ها
            </button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> افزودن حساب
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="مجموع موجودی نقد"
          value={compact(total)}
          sub="تومان"
          icon={<Wallet size={18} />}
          tone="brand"
        />
        <StatCard
          label="تعداد حساب‌ها"
          value={faDigits(active.length)}
          sub={archived.length ? `${faDigits(archived.length)} آرشیو‌شده` : 'حساب فعال'}
          icon={<CreditCard size={18} />}
          tone="sky"
        />
        <StatCard
          label="پرتراکنش‌ترین حساب این ماه"
          value={
            (() => {
              const counts = new Map<string, number>();
              txs
                .filter((t) => t.date.startsWith(monthKey) && t.accountId)
                .forEach((t) => counts.set(t.accountId!, (counts.get(t.accountId!) ?? 0) + 1));
              const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
              const acc = top ? accounts.find((a) => a.id === top[0]) : null;
              return acc ? acc.name : '—';
            })()
          }
          sub="بر اساس تعداد تراکنش"
          icon={<ArrowLeftRight size={18} />}
          tone="gold"
        />
        <StatCard
          label="حساب پیش‌فرض"
          value={active.find((a) => a.isDefault)?.name ?? '—'}
          sub="فال‌بک اسناد قدیمی"
          icon={<Star size={18} />}
          tone="neutral"
        />
      </div>

      {active.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              monthKey={monthKey}
              txs={txs}
              onEdit={() => setEditId(a.id)}
              onDelete={() => {
                setDeleteError('');
                setDeleteId(a.id);
              }}
              onTransfer={() => openTransfer({ from: a.id })}
              onSetDefault={() => updateAccount(a.id, { isDefault: true })}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<CreditCard size={24} />}
            title="هنوز حسابی نساخته‌اید"
            description="حساب‌های بانکی و کیف پول نقد خود را بسازید تا موجودی هر کدام را جدا دنبال کنید. مثلاً یک حساب برای خرج خانه، یکی برای پس‌انداز و یکی برای حقوق."
            action={
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={15} /> ساخت اولین حساب
              </button>
            }
          />
        </div>
      )}

      {archived.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[12px] font-extrabold text-ink-3">
            <Archive size={14} /> حساب‌های آرشیو‌شده ({faDigits(archived.length)})
          </h3>
          <div className="space-y-2">
            {archived.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-[14px] border border-line/70 bg-paper/40 px-4 py-3 opacity-80"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: a.color || '#9a8fb8' }}
                  />
                  <span className="text-[11.5px] font-bold text-ink-2">{a.name}</span>
                  {a.bank && <span className="text-[9px] font-semibold text-ink-3">{a.bank}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-[11px] font-extrabold text-ink-2">
                    {fmt(a.balance)} <span className="text-[8px] font-semibold text-ink-3">تومان</span>
                  </span>
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-ink-2 transition hover:border-brand-3 hover:text-brand-2"
                    onClick={() => updateAccount(a.id, { archived: false })}
                    title="بازگردانی از آرشیو"
                  >
                    <ArchiveRestore size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] font-semibold leading-5 text-ink-3">
            حساب‌های آرشیو‌شده در فرم‌های ثبت نمایش داده نمی‌شوند، اما تاریخچه تراکنش‌هایشان در
            دفتر و گزارش‌ها حفظ می‌ماند.
          </p>
        </div>
      )}

      <Banner tone="info">
        انتقال بین حساب‌ها در دفتر تراکنش‌ها ثبت می‌شود اما نه «درآمد» است نه «هزینه» — فقط
        موجودی دو حساب جابه‌جا می‌کند و نقد کل شما تغییر نمی‌کند.
      </Banner>

      <AccountFormModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addAccount} />
      {editId && (
        <AccountEditModal accountId={editId} onClose={() => setEditId(null)} onSave={updateAccount} />
      )}
      <TransferModal
        key={`${transferPreset.from}|${transferPreset.to}|${transferPreset.amount}|${transferOpen}`}
        open={transferOpen}
        preset={transferPreset}
        accounts={active}
        onClose={() => setTransferOpen(false)}
        onTransfer={(from, to, amount, date, note) => transferBetweenAccounts(from, to, amount, { date, note })}
      />
      <ConfirmDialog
        open={!!deleteId}
        title={`حذف حساب «${deleteTarget?.name ?? ''}»`}
        message={
          deleteError ||
          'حذف فیزیکی حساب فقط وقتی ممکن است که موجودی‌اش صفر و هیچ تراکنشی به آن مرتبط نباشد. ادامه می‌دهید؟'
        }
        confirmLabel={deleteError ? 'متوجه شدم' : 'حذف شود'}
        onCancel={() => {
          setDeleteId(null);
          setDeleteError('');
        }}
        onConfirm={() => {
          if (!deleteId) return;
          if (deleteError) {
            setDeleteId(null);
            setDeleteError('');
            return;
          }
          const r = deleteAccount(deleteId);
          if (!r.ok) {
            setDeleteError(r.error ?? 'حذف ممکن نشد.');
          } else {
            setDeleteId(null);
            setDeleteError('');
          }
        }}
      />
    </div>
  );
}

/* ------------------------------- کارت حساب ------------------------------ */

function AccountCard({
  account,
  monthKey,
  txs,
  onEdit,
  onDelete,
  onTransfer,
  onSetDefault,
}: {
  account: Account;
  monthKey: string;
  txs: ReturnType<typeof useStore>['txs'];
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: () => void;
  onSetDefault: () => void;
}) {
  const color = account.color || '#2f9c78';

  // ورودی / خروجی ماه جاری این حساب (انتقال‌ها هم لحاظ می‌شوند)
  let inMonth = 0;
  let outMonth = 0;
  for (const t of txs) {
    if (!t.date.startsWith(monthKey)) continue;
    if (t.type === 'transfer') {
      if (t.link?.type === 'account-transfer' && t.link.toId === account.id) inMonth += t.amount;
      if (t.accountId === account.id) outMonth += t.amount;
      continue;
    }
    const eff = t.accountId ?? null; // اسناد قدیمی در آمار هر-حساب لحاظ نمی‌شوند (فاز ۱۶: گزارش کامل)
    if (eff !== account.id) continue;
    const d =
      t.type === 'income'
        ? t.amount
        : t.type === 'expense'
          ? -t.amount
          : t.type === 'investment'
            ? t.kind === 'sell'
              ? t.amount
              : -t.amount
            : t.type === 'goal'
              ? t.kind === 'withdraw'
                ? t.amount
                : -t.amount
              : t.type === 'loan'
                ? t.kind === 'principal'
                  ? t.amount
                  : -t.amount
                : 0;
    if (d > 0) inMonth += d;
    else outMonth += -d;
  }

  return (
    <div className="card overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: color }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[15px] text-white"
              style={{ background: color }}
            >
              <CreditCard size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[13.5px] font-extrabold text-ink">{account.name}</h3>
                {account.isDefault && (
                  <span className="flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[7.5px] font-bold text-gold">
                    <Star size={8} /> پیش‌فرض
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[9.5px] font-semibold text-ink-3">
                {account.bank || 'کیف پول / نقد'}
                {account.note ? ` • ${account.note}` : ''}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="num text-[16px] font-extrabold text-ink">{fmt(account.balance)}</div>
            <div className="text-[8.5px] font-semibold text-ink-3">تومان</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[13px] border border-line bg-paper/50 p-2.5">
            <div className="text-[8px] font-bold text-ink-3">ورودی این ماه</div>
            <div className="num mt-0.5 text-[11.5px] font-extrabold text-brand-2">
              +{compact(inMonth)}
            </div>
          </div>
          <div className="rounded-[13px] border border-line bg-paper/50 p-2.5">
            <div className="text-[8px] font-bold text-ink-3">خروجی این ماه</div>
            <div className="num mt-0.5 text-[11.5px] font-extrabold text-coral">
              −{compact(outMonth)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary flex-1 !py-2.5 !text-[10.5px]" onClick={onTransfer}>
            <ArrowLeftRight size={13} /> انتقال از این حساب
          </button>
          {!account.isDefault && (
            <button
              className="btn btn-ghost !py-2.5 !text-[10.5px]"
              onClick={onSetDefault}
              title="پیش‌فرض کردن (فال‌بک اسناد قدیمی)"
            >
              <Star size={13} />
            </button>
          )}
          <button className="btn btn-ghost !py-2.5 !text-[10.5px]" onClick={onEdit} title="ویرایش حساب">
            <Pencil size={13} />
          </button>
          <button
            className="btn btn-danger !py-2.5 !text-[10.5px]"
            onClick={onDelete}
            title="حذف حساب"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- مودال افزودن حساب ---------------------------- */

function AccountFormModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (a: { name: string; bank?: string; color?: string; balance?: number; note?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) {
      setError('نام حساب را وارد کنید (مثلاً «سامان — خرج خانه»).');
      return;
    }
    onAdd({
      name: name.trim(),
      bank: bank.trim() || undefined,
      color,
      balance: parseAmount(balance),
      note: note.trim() || undefined,
    });
    setName('');
    setBank('');
    setBalance('');
    setNote('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="افزودن حساب بانکی"
      subtitle="برای هر کارت بانکی یا پول نقد یک حساب بسازید؛ موجودی اولیه همان عدد فعلی حساب است و بعداً فقط با تراکنش‌ها تغییر می‌کند."
      footer={
        <div className="flex gap-3">
          <button className="btn btn-primary flex-1 !py-3.5" onClick={submit}>
            ساخت حساب
          </button>
          <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
            انصراف
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="نام حساب">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً سامان — خرج خانه، سپه — پس‌انداز، پول نقد…"
            autoFocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام بانک" hint="اختیاری">
            <input
              className="input"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="سامان، سپه، رسالت، خاورمیانه…"
            />
          </Field>
          <Field label="موجودی فعلی" hint="تومان — موجودی اولیه">
            <AmountInput value={balance} onChange={setBalance} />
          </Field>
        </div>
        <Field label="رنگ کارت">
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full border-[2.5px] transition-all ${
                  color === c ? 'scale-110 border-ink/40' : 'border-transparent'
                }`}
                style={{ background: c }}
                aria-label={`رنگ ${c}`}
              />
            ))}
          </div>
        </Field>
        <Field label="یادداشت" hint="اختیاری — مثلاً «فقط برای خرج خانه»">
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="هدف این حساب چیست؟"
          />
        </Field>
        {error && <Banner tone="danger">{error}</Banner>}
      </div>
    </Modal>
  );
}

/* ----------------------------- مودال ویرایش حساب ---------------------------- */

function AccountEditModal({
  accountId,
  onClose,
  onSave,
}: {
  accountId: string;
  onClose: () => void;
  onSave: (
    id: string,
    patch: Partial<Pick<Account, 'name' | 'bank' | 'color' | 'note' | 'isDefault' | 'archived'>>
  ) => void;
}) {
  const { accounts } = useStore();
  const account = accounts.find((a) => a.id === accountId);
  const [name, setName] = useState(account?.name ?? '');
  const [bank, setBank] = useState(account?.bank ?? '');
  const [color, setColor] = useState(account?.color || ACCOUNT_COLORS[0]);
  const [note, setNote] = useState(account?.note ?? '');
  const [error, setError] = useState('');

  if (!account) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`ویرایش «${account.name}»`}
      subtitle={`موجودی فعلی: ${fmt(account.balance)} تومان — موجودی فقط با تراکنش تغییر می‌کند و از اینجا قابل ویرایش نیست تا حساب‌وکتاب به‌هم نریزد.`}
      footer={
        <div className="flex gap-3">
          <button
            className="btn btn-primary flex-1 !py-3.5"
            onClick={() => {
              if (!name.trim()) {
                setError('نام حساب نمی‌تواند خالی باشد.');
                return;
              }
              onSave(accountId, {
                name: name.trim(),
                bank: bank.trim() || undefined,
                color,
                note: note.trim() || undefined,
              });
              onClose();
            }}
          >
            ذخیره تغییرات
          </button>
          <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
            انصراف
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="نام حساب">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="نام بانک" hint="اختیاری">
          <input className="input" value={bank} onChange={(e) => setBank(e.target.value)} />
        </Field>
        <Field label="رنگ کارت">
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full border-[2.5px] transition-all ${
                  color === c ? 'scale-110 border-ink/40' : 'border-transparent'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
        <Field label="یادداشت" hint="اختیاری">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <Banner tone="danger">{error}</Banner>}

        <div className="rounded-[15px] border border-line bg-paper/50 p-4">
          <div className="text-[10.5px] font-bold text-ink-2">آرشیو حساب</div>
          <p className="mt-1 text-[9.5px] font-semibold leading-5 text-ink-3">
            اگر دیگر از این حساب استفاده نمی‌کنید ولی تراکنش‌هایی به آن مرتبط است، به‌جای حذف آن
            را آرشیو کنید تا تاریخچه‌اش حفظ بماند.
          </p>
          <button
            className="btn btn-ghost mt-3 !py-2 !text-[10.5px]"
            onClick={() => {
              onSave(accountId, { archived: true });
              onClose();
            }}
          >
            <Archive size={13} /> آرشیو این حساب
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------- مودال انتقال بین حساب‌ها --------------------------- */

function TransferModal({
  open,
  preset,
  accounts,
  onClose,
  onTransfer,
}: {
  open: boolean;
  preset: { from?: string; to?: string; amount?: string };
  accounts: Account[];
  onClose: () => void;
  onTransfer: (
    from: string,
    to: string,
    amount: number,
    date?: string,
    note?: string
  ) => { ok: boolean; error?: string };
}) {
  // هنگام بازشدن با preset جدید، والد این مودال را با key متفاوت رندر می‌کند ⇒ state تازه
  const [fromId, setFromId] = useState(preset.from ?? '');
  const [toId, setToId] = useState(preset.to ?? '');
  const [amount, setAmount] = useState(preset.amount ?? '');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const from = accounts.find((a) => a.id === fromId) ?? null;
  const value = parseAmount(amount);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="انتقال بین حساب‌ها"
      subtitle="پول فقط بین حساب‌های شما جابه‌جا می‌شود؛ نه درآمد محسوب می‌شود نه هزینه و نقد کل تغییر نمی‌کند."
      footer={
        <div className="flex gap-3">
          <button
            className="btn btn-primary flex-1 !py-3.5"
            onClick={() => {
              if (!fromId || !toId) {
                setError('حساب مبدأ و مقصد را انتخاب کنید.');
                return;
              }
              if (value <= 0) {
                setError('مبلغ انتقال را وارد کنید.');
                return;
              }
              const r = onTransfer(fromId, toId, value, date, note.trim() || undefined);
              if (!r.ok) {
                setError(r.error ?? 'انتقال انجام نشد.');
                return;
              }
              setAmount('');
              setNote('');
              setError('');
              onClose();
            }}
          >
            ثبت انتقال
          </button>
          <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
            انصراف
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="از حساب (مبدأ)">
            <select
              className="input"
              value={fromId}
              onChange={(e) => {
                setFromId(e.target.value);
                setError('');
              }}
            >
              <option value="">انتخاب کنید…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({fmt(a.balance)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="به حساب (مقصد)">
            <select
              className="input"
              value={toId}
              onChange={(e) => {
                setToId(e.target.value);
                setError('');
              }}
            >
              <option value="">انتخاب کنید…</option>
              {accounts
                .filter((a) => a.id !== fromId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({fmt(a.balance)})
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <Field label="مبلغ انتقال" hint="تومان">
          <AmountInput
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setError('');
            }}
          />
        </Field>

        {from && value > 0 && (
          <div className="rounded-[14px] border border-brand-soft-2 bg-brand-soft/40 px-4 py-3 text-[10px] font-semibold leading-5 text-ink-2">
            موجودی «{from.name}» پس از انتقال:{' '}
            <span className={`num font-extrabold ${from.balance - value < 0 ? 'text-coral' : 'text-brand-2'}`}>
              {fmt(from.balance - value)}
            </span>{' '}
            تومان
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="تاریخ">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="یادداشت" hint="اختیاری">
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً تقسیم حقوق…"
            />
          </Field>
        </div>

        {error && <Banner tone="danger">{error}</Banner>}
      </div>
    </Modal>
  );
}
