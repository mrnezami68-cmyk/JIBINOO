import { useState } from 'react';
import { Gem, ArrowDownLeft, ArrowUpLeft, Target, Landmark, Wallet } from 'lucide-react';
import { Modal, Field, AmountInput, ChipSelect, Banner } from './ui';
import { useStore } from '../lib/store';
import { parseAmount, todayISO, fmt } from '../lib/format';
import { EXPENSE_CATEGORIES } from '../lib/analysis';

const TX_TYPES = [
  { key: 'income', label: 'درآمد', icon: <ArrowDownLeft size={14} /> },
  { key: 'expense', label: 'هزینه', icon: <ArrowUpLeft size={14} /> },
  { key: 'investment', label: 'سرمایه‌گذاری', icon: <Gem size={14} /> },
  { key: 'goal', label: 'انتقال به هدف', icon: <Target size={14} /> },
  { key: 'loan', label: 'پرداخت قسط', icon: <Landmark size={14} /> },
];

const INCOME_SOURCES = [
  { key: 'salary', label: 'حقوق' },
  { key: 'project', label: 'پروژه' },
  { key: 'business', label: 'کسب‌وکار' },
  { key: 'gift', label: 'هدیه' },
  { key: 'interest', label: 'سود سپرده' },
  { key: 'other', label: 'سایر' },
];

const INVESTMENT_TYPES = [
  { key: 'gold', label: 'طلا و سکه' },
  { key: 'currency', label: 'ارز' },
  { key: 'crypto', label: 'رمزارز' },
  { key: 'stock', label: 'بورس' },
  { key: 'business', label: 'کسب‌وکار' },
  { key: 'other', label: 'سایر' },
];

export function TxModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTx, transferGoal, payLoan, goals, loans, cash, settings } = useStore();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('food');
  const [incomeKind, setIncomeKind] = useState<'fixed' | 'variable'>('variable');
  const [source, setSource] = useState('salary');
  const [investType, setInvestType] = useState('gold');
  const [goalId, setGoalId] = useState(goals[0]?.id ?? '');
  const [loanId, setLoanId] = useState(loans[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setAmount('');
    setTitle('');
    setNote('');
    setError('');
  };

  const submit = () => {
    const value = parseAmount(amount);
    if (value <= 0) {
      setError('مبلغ را وارد کنید.');
      return;
    }
    if (
      (type === 'expense' || type === 'investment' || type === 'goal' || type === 'loan') &&
      value > cash
    ) {
      setError(`مبلغ از موجودی نقد فعلی (${fmt(cash)} تومان) بیشتر است.`);
      return;
    }

    if (type === 'goal') {
      if (!goalId) {
        setError('ابتدا یک هدف مالی بسازید تا انتقال به آن ثبت شود.');
        return;
      }
      // اتمیک: جابه‌جایی نقد + ثبت در تاریخچه هدف + سند دفتر (باگ شماره ۲)
      transferGoal(goalId, value, 'deposit', {
        date,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
      });
    } else if (type === 'loan') {
      if (!loanId) {
        setError('ابتدا یک وام ثبت کنید تا پرداخت قسط برای آن ثبت شود.');
        return;
      }
      // اتمیک: کسر نقد + ثبت در اقساط وام + سند دفتر (باگ شماره ۳)
      payLoan(loanId, value, date, {
        title: title.trim() || undefined,
        note: note.trim() || undefined,
      });
    } else {
      const fallbackTitles: Record<string, string> = {
        income: incomeKind === 'fixed' ? 'درآمد ثابت ماهانه' : 'درآمد متغیر',
        expense: EXPENSE_CATEGORIES.find((c) => c.key === category)?.label ?? 'هزینه',
        investment: 'خرید دارایی',
      };
      addTx({
        type: type as never,
        kind: type === 'income' ? incomeKind : type === 'investment' ? investType : category,
        category:
          type === 'income' ? source : type === 'expense' ? category : investType,
        title: title.trim() || fallbackTitles[type],
        amount: value,
        date,
        note: note.trim() || undefined,
      });
    }

    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت تراکنش"
      subtitle={`موجودی نقد فعلی: ${fmt(cash)} تومان — سرمایه‌گذاری و انتقال به هدف، هزینه محسوب نمی‌شوند.`}
      footer={
        <div className="flex gap-3">
          <button className="btn btn-primary flex-1 !py-3.5" onClick={submit}>
            ثبت تراکنش
          </button>
          <button className="btn btn-ghost flex-1 !py-3.5" onClick={onClose}>
            انصراف
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-[12px] font-bold text-ink-2">نوع تراکنش</div>
          <ChipSelect
            options={TX_TYPES}
            value={type}
            onChange={(v) => {
              setType(v);
              setError('');
            }}
            columns={5}
          />
        </div>

        <Field label="مبلغ" hint="تومان">
          <AmountInput value={amount} onChange={(v) => { setAmount(v); setError(''); }} />
        </Field>

        {error && <Banner tone="danger">{error}</Banner>}

        {type === 'income' && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[12px] font-bold text-ink-2">نوع درآمد</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'fixed', label: 'ثابت ماهانه', desc: 'مثل حقوق' },
                  { key: 'variable', label: 'متغیر / پروژه‌ای', desc: 'مثل درآمد آزاد' },
                ].map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setIncomeKind(o.key as 'fixed' | 'variable')}
                    className={`rounded-[15px] border-[1.5px] p-3 text-right transition-all ${
                      incomeKind === o.key
                        ? 'border-brand-2 bg-brand-soft'
                        : 'border-line bg-white hover:border-line-2'
                    }`}
                  >
                    <div className="text-[11.5px] font-bold text-ink">{o.label}</div>
                    <div className="mt-0.5 text-[9px] font-semibold text-ink-3">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-bold text-ink-2">منبع درآمد</div>
              <ChipSelect
                options={INCOME_SOURCES.map((s) => ({ key: s.key, label: s.label }))}
                value={source}
                onChange={setSource}
                columns={3}
              />
            </div>
          </div>
        )}

        {type === 'expense' && (
          <div>
            <div className="mb-2 text-[12px] font-bold text-ink-2">دسته‌بندی هزینه</div>
            <ChipSelect
              options={EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
              value={category}
              onChange={setCategory}
              columns={5}
            />
          </div>
        )}

        {type === 'investment' && (
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-[12px] font-bold text-ink-2">نوع سرمایه‌گذاری</div>
              <ChipSelect
                options={INVESTMENT_TYPES.map((c) => ({ key: c.key, label: c.label }))}
                value={investType}
                onChange={setInvestType}
                columns={3}
              />
            </div>
            <Banner tone="info">
              مبلغ سرمایه‌گذاری از موجودی نقد کم می‌شود، اما در گزارش‌ها «هزینه» محسوب نمی‌شود؛ بلکه
              به‌عنوان جابه‌جایی دارایی ثبت می‌شود.
            </Banner>
          </div>
        )}

        {type === 'goal' && (
          <div className="space-y-3">
            {goals.length > 0 ? (
              <Field label="هدف مقصد">
                <select className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Banner tone="warning">
                هنوز هدفی نساخته‌اید. ابتدا از بخش «اهداف» یک هدف مالی بسازید تا بتوانید به آن پول
                منتقل کنید.
              </Banner>
            )}
            <Banner tone="info">
              انتقال به هدف از موجودی نقد کم می‌شود و در دفتر تراکنش‌ها ثبت می‌گردد، اما «هزینه»
              محسوب نمی‌شود.
            </Banner>
          </div>
        )}

        {type === 'loan' && (
          <div className="space-y-3">
            {loans.length > 0 ? (
              <Field label="انتخاب وام">
                <select className="input" value={loanId} onChange={(e) => setLoanId(e.target.value)}>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Banner tone="warning">
                وامی ثبت نشده است. ابتدا از بخش «وام‌ها» وام خود را ثبت کنید تا پرداخت اقساط آن را
                اینجا ثبت کنید.
              </Banner>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان" hint="اختیاری">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'مثلاً حقوق شهریور…'
                  : type === 'expense'
                    ? 'مثلاً خرید هفتگی…'
                    : 'عنوان تراکنش…'
              }
            />
          </Field>
          <Field label="تاریخ">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label="یادداشت" hint="اختیاری">
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="هر توضیحی که برای آینده مفید است…"
          />
        </Field>

        <div className="flex items-center gap-2.5 rounded-[15px] bg-paper px-4 py-3">
          <Wallet size={16} className="text-brand-2" />
          <div className="text-[10.5px] font-semibold leading-5 text-ink-2">
            {type === 'income'
              ? `بعد از ثبت، موجودی نقد شما ${fmt(cash + parseAmount(amount))} تومان می‌شود.`
              : `بعد از ثبت، موجودی نقد شما ${fmt(Math.max(0, cash - parseAmount(amount)))} تومان می‌شود.`}
            {settings.pinEnabled && ' داده‌ها فقط روی دستگاه شما ذخیره می‌شود.'}
          </div>
        </div>
      </div>
    </Modal>
  );
}
