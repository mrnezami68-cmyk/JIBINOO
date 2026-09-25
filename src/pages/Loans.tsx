import { useState } from 'react';
import { Landmark, Plus, Trash2, Calendar, CheckCircle2, Wallet, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { fmt, compact, faDigits, todayISO, jDateLabel, parseAmount, pct } from '../lib/format';
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
import { Progress, Ring } from '../components/charts';

export function Loans() {
  const { loans, addLoan, payLoan, deleteLoan, cash } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [payId, setPayId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalDebt = loans.reduce((s, l) => {
    const paid = l.payments.reduce((t, p) => t + p.amount, 0);
    return s + Math.max(0, l.total - paid);
  }, 0);
  const totalPaid = loans.reduce((s, l) => s + l.payments.reduce((t, p) => t + p.amount, 0), 0);
  const monthlyDue = loans.reduce((s, l) => {
    const paidCount = l.payments.length;
    return paidCount < l.installmentsTotal ? s + l.installmentAmount : s;
  }, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="وام‌ها و اقساط"
        subtitle="وام خود را ثبت کنید، اقساط را پیگیری کنید و هر پرداخت به‌صورت خودکار از موجودی نقد کم و در دفتر تراکنش‌ها ثبت می‌شود."
        action={
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> ثبت وام جدید
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="مجموع مانده بدهی"
          value={compact(totalDebt)}
          sub="تومان"
          icon={<Landmark size={18} />}
          tone="coral"
        />
        <StatCard
          label="پرداخت‌شده"
          value={compact(totalPaid)}
          sub="تومان"
          icon={<CheckCircle2 size={18} />}
          tone="brand"
        />
        <StatCard
          label="اقساط ماهانه"
          value={compact(monthlyDue)}
          sub="تومان در ماه"
          icon={<Calendar size={18} />}
          tone="sky"
        />
        <StatCard
          label="موجودی نقد"
          value={compact(cash)}
          sub="تومان"
          icon={<Wallet size={18} />}
          tone="neutral"
        />
      </div>

      {loans.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {loans.map((loan) => {
            const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
            const remaining = Math.max(0, loan.total - paid);
            const progress = loan.total > 0 ? Math.min(1, paid / loan.total) : 0;
            const settled = remaining <= 0;
            const paidCount = loan.payments.length;

            return (
              <div
                key={loan.id}
                className={`card overflow-hidden p-5 sm:p-6 ${settled ? 'opacity-90' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-[17px] ${
                        settled ? 'bg-brand-soft text-brand-2' : 'bg-coral-soft text-coral'
                      }`}
                    >
                      <Landmark size={21} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13.5px] font-extrabold text-ink">{loan.title}</h3>
                        {settled && (
                          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[8px] font-bold text-brand-2">
                            تسویه شد ✓
                          </span>
                        )}
                      </div>
                      {loan.lender && (
                        <div className="mt-1 text-[9.5px] font-semibold text-ink-3">
                          وام‌دهنده: {loan.lender}
                        </div>
                      )}
                      <div className="mt-1 text-[9.5px] font-semibold text-ink-3">
                        هر قسط {fmt(loan.installmentAmount)} تومان • سررسید روز{' '}
                        {faDigits(loan.dueDay)} هر ماه
                      </div>
                    </div>
                  </div>

                  <Ring
                    value={progress * 100}
                    size={72}
                    thickness={8}
                    color={settled ? '#2f9c78' : '#cd6a58'}
                  >
                    <div className="num text-[12px] font-extrabold">
                      {pct(progress)}
                    </div>
                  </Ring>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between text-[10px]">
                    <span className="font-bold text-ink-3">
                      اقساط پرداخت‌شده: {faDigits(paidCount)} از {faDigits(loan.installmentsTotal)}
                    </span>
                    <span className="num font-extrabold text-ink">
                      {compact(paid)} / {compact(loan.total)}
                    </span>
                  </div>
                  <Progress
                    value={progress * 100}
                    color={settled ? '#2f9c78' : '#cd6a58'}
                    height={9}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] border border-line bg-paper/50 p-3">
                    <div className="text-[8.5px] font-bold text-ink-3">مانده بدهی</div>
                    <div className="num mt-1 text-[13px] font-extrabold text-coral">
                      {compact(remaining)}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-line bg-paper/50 p-3">
                    <div className="text-[8.5px] font-bold text-ink-3">تاریخچه پرداخت‌ها</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {loan.payments.length > 0 ? (
                        loan.payments.slice(-4).map((p) => (
                          <span
                            key={p.id}
                            className="rounded-full bg-brand-soft px-2 py-0.5 text-[7.5px] font-bold text-brand-2"
                          >
                            {jDateLabel(p.date, false)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[8px] font-semibold text-ink-3">
                          هنوز قسطی پرداخت نشده
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2.5">
                  {!settled && (
                    <button className="btn btn-primary flex-1" onClick={() => setPayId(loan.id)}>
                      <Wallet size={15} /> پرداخت قسط (کسر از موجودی نقد)
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    onClick={() => setDeleteId(loan.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Landmark size={24} />}
            title="وام فعالی ندارید"
            description="وام یا بدهی خود را ثبت کنید تا اقساط را پیگیری و پرداخت‌ها را از موجودی نقد کم کنید. هر پرداخت به‌صورت خودکار در دفتر تراکنش‌ها ثبت می‌شود."
            action={
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={15} /> ثبت وام جدید
              </button>
            }
          />
        </div>
      )}

      <Banner tone="info">
        پرداخت قسط از موجودی نقد شما کم می‌شود و در دفتر تراکنش‌ها با عنوان «پرداخت قسط» ثبت
        می‌گردد. در گزارش‌ها، اقساط «هزینه زندگی» محسوب نمی‌شوند، بلکه بازپرداخت بدهی‌اند.
      </Banner>

      {/* add loan modal */}
      <AddLoanModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addLoan} />

      {/* pay installment modal */}
      <PayModal
        loanId={payId}
        onClose={() => setPayId(null)}
        onPay={(amount, date) => {
          // اتمیک داخل store: کسر نقد دقیقاً یک بار + ثبت در اقساط + سند دفتر (باگ شماره ۱)
          if (payId) payLoan(payId, amount, date);
          setPayId(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف وام"
        message="این وام به‌همراه اسناد مرتبط آن (دریافت وام و اقساط پرداختی) از دفتر تراکنش‌ها حذف و اثر نقدی آن‌ها برگردانده می‌شود تا تراز بماند. ادامه می‌دهید؟"
        confirmLabel="حذف شود"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteLoan(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}

function AddLoanModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (
    loan: {
      title: string;
      lender?: string;
      total: number;
      installmentAmount: number;
      installmentsTotal: number;
      dueDay: number;
    },
    opts?: { receiveCash?: boolean }
  ) => void;
}) {
  const { cash } = useStore();
  const [title, setTitle] = useState('');
  const [lender, setLender] = useState('');
  const [total, setTotal] = useState('');
  const [installment, setInstallment] = useState('');
  const [count, setCount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [receiveCash, setReceiveCash] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const t = parseAmount(total);
    const c = parseAmount(count);
    const i = installment.trim()
      ? parseAmount(installment)
      : t > 0 && c > 0
        ? Math.round(t / c)
        : 0;
    const d = parseAmount(dueDay) || 1;
    if (!title.trim()) {
      setError('عنوان وام را وارد کنید.');
      return;
    }
    if (t <= 0 || i <= 0 || c <= 0) {
      setError('مبلغ کل، مبلغ قسط و تعداد اقساط را کامل وارد کنید.');
      return;
    }
    onAdd(
      {
        title: title.trim(),
        lender: lender.trim() || undefined,
        total: t,
        installmentAmount: i,
        installmentsTotal: c,
        dueDay: Math.min(31, Math.max(1, d)),
      },
      // باگ شماره ۶: دریافت نقدی اصل وام + سند «دریافت وام» در دفتر
      { receiveCash }
    );
    setTitle('');
    setLender('');
    setTotal('');
    setInstallment('');
    setCount('');
    setDueDay('1');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت وام جدید"
      subtitle="اطلاعات وام را وارد کنید تا اقساط آن را پیگیری کنید."
      footer={
        <div className="flex gap-3">
          <button className="btn btn-primary flex-1 !py-3.5" onClick={handleSubmit}>
            ثبت وام
          </button>
          <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
            انصراف
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="عنوان وام">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً وام ازدواج، قسط گوشی…"
          />
        </Field>
        <Field label="وام‌دهنده" hint="اختیاری">
          <input
            className="input"
            value={lender}
            onChange={(e) => setLender(e.target.value)}
            placeholder="بانک، صندوق، دوست…"
          />
        </Field>
        <Field label="مبلغ کل وام" hint="تومان">
          <AmountInput value={total} onChange={setTotal} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="مبلغ هر قسط" hint="تومان">
            <input
              className="input num"
              inputMode="numeric"
              value={installment}
              onChange={(e) => setInstallment(e.target.value)}
              placeholder="۰"
            />
          </Field>
          <Field label="تعداد اقساط">
            <input
              className="input num"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="۱۲"
            />
          </Field>
          <Field label="روز سررسید">
            <input
              className="input num"
              inputMode="numeric"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="۱"
            />
          </Field>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-[15px] border border-line bg-paper/50 p-4">
          <input
            type="checkbox"
            checked={receiveCash}
            onChange={(e) => setReceiveCash(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#0e5744]"
          />
          <div>
            <div className="text-[11px] font-bold text-ink-2">
              مبلغ وام به موجودی نقد واریز شود
            </div>
            <div className="mt-1 text-[9.5px] font-medium leading-5 text-ink-3">
              موجودی نقد فعلی: {fmt(cash)} تومان — سند «دریافت وام» در دفتر تراکنش‌ها ثبت
              می‌شود تا ارزش خالص دارایی درست بماند.
            </div>
          </div>
        </label>
        {(parseAmount(total) > 0 || parseAmount(count) > 0) && (
          <div className="flex items-center justify-between rounded-[14px] border border-brand-soft-2 bg-brand-soft/50 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-brand-2">
              <Info size={13} /> راهنمای خودکار اقساط
            </div>
            <div className="text-[10px] font-semibold text-brand-2">
              {parseAmount(total) > 0 && parseAmount(count) > 0
                ? `هر قسط ≈ ${fmt(Math.round(parseAmount(total) / parseAmount(count)))} تومان`
                : parseAmount(installment) > 0 && parseAmount(count) > 0
                  ? `مجموع وام ≈ ${fmt(parseAmount(installment) * parseAmount(count))} تومان`
                  : 'مبلغ کل و تعداد اقساط را وارد کنید'}
            </div>
          </div>
        )}
        {error && <Banner tone="danger">{error}</Banner>}
      </div>
    </Modal>
  );
}

function PayModal({
  loanId,
  onClose,
  onPay,
}: {
  loanId: string | null;
  onClose: () => void;
  onPay: (amount: number, date: string) => void;
}) {
  const { loans, cash } = useStore();
  const loan = loans.find((l) => l.id === loanId);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');

  return (
    <Modal
      open={!!loanId}
      onClose={onClose}
      title={`پرداخت قسط «${loan?.title ?? ''}»`}
      subtitle="مبلغ پرداختی از موجودی نقد کم و در دفتر تراکنش‌ها ثبت می‌شود."
      size="sm"
      footer={
        loan ? (
          <div className="flex gap-3">
            <button
              className="btn btn-primary flex-1 !py-3.5"
              onClick={() => {
                const v = amount.trim() ? parseAmount(amount) : loan.installmentAmount;
                if (v <= 0) {
                  setError('مبلغ پرداختی را وارد کنید.');
                  return;
                }
                if (v > cash) {
                  setError(`مبلغ از موجودی نقد (${fmt(cash)} تومان) بیشتر است.`);
                  return;
                }
                onPay(v, date);
                setAmount('');
                setError('');
              }}
            >
              ثبت پرداخت قسط
            </button>
            <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
              انصراف
            </button>
          </div>
        ) : null
      }
    >
      {loan && (
        <div className="space-y-4">
          <div className="rounded-[15px] border border-line bg-paper/50 p-4 text-[10.5px] font-semibold text-ink-2">
            مبلغ هر قسط: <span className="num font-extrabold">{fmt(loan.installmentAmount)}</span>{' '}
            تومان • موجودی نقد: <span className="num font-extrabold">{fmt(cash)}</span> تومان
          </div>
          <Field label="مبلغ پرداختی" hint="تومان">
            <AmountInput
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setError('');
              }}
              placeholder={String(loan.installmentAmount)}
            />
          </Field>

          {/* quick amounts — one-tap payment */}
          <div className="flex flex-wrap gap-2">
            <button
              className="chip"
              onClick={() => {
                setAmount(String(loan.installmentAmount));
                setError('');
              }}
            >
              مبلغ یک قسط ({compact(loan.installmentAmount)})
            </button>
            <button
              className="chip"
              onClick={() => {
                const paidSoFar = loan.payments.reduce((s, p) => s + p.amount, 0);
                const remaining = Math.max(0, loan.total - paidSoFar);
                setAmount(String(remaining));
                setError('');
              }}
            >
              تسویه کامل مانده
            </button>
            <button
              className="chip"
              onClick={() => {
                setAmount(String(Math.round(loan.installmentAmount * 2)));
                setError('');
              }}
            >
              دو قسط
            </button>
          </div>

          <Field label="تاریخ پرداخت">
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          {error && <Banner tone="danger">{error}</Banner>}
        </div>
      )}
    </Modal>
  );
}
