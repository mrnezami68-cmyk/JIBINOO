import { useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { useStore } from '../lib/store';
import { fmt } from '../lib/format';

/**
 * سلکتور مشترک حساب بانکی — فاز ۱۵ (تصمیم ۲: انتخاب همیشه الزامی).
 * اگر فقط یک حساب فعال (غیرآرشیو) وجود داشته باشد، به‌صورت خودکار همان انتخاب می‌شود
 * تا اصطکاک بی‌مورد ایجاد نشود؛ در غیر این صورت کاربر باید صراحتاً انتخاب کند.
 */
export function AccountPicker({
  value,
  onChange,
  label,
  error,
}: {
  value: string;
  onChange: (accountId: string) => void;
  label?: string;
  /** رشته خطا وقتی انتخاب الزامی ولی انجام نشده (فقط نمایش — منطق در هسته) */
  error?: boolean;
}) {
  const { accounts } = useStore();
  const active = accounts.filter((a) => !a.archived);

  // قانون تک‌حسابی: خودکار انتخاب شود
  useEffect(() => {
    if (active.length === 1 && value !== active[0].id) {
      onChange(active[0].id);
    }
    // اگر حساب انتخاب‌شده آرشیو/حذف شده باشد، انتخاب را خالی کن
    if (value && !active.some((a) => a.id === value)) {
      onChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length, value]);

  if (active.length === 0) {
    return (
      <div className="rounded-[15px] border border-line bg-paper/60 p-4 text-[10.5px] font-semibold leading-6 text-ink-2">
        هنوز حسابی نساخته‌اید — ابتدا از صفحه «حساب‌ها» یک حساب بانکی یا کیف پول اضافه کنید تا
        بتوانید تراکنش ثبت کنید.
      </div>
    );
  }

  return (
    <div>
      {label !== null && (
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-ink-2">
          <CreditCard size={13} className="text-brand-2" />
          {label ?? 'کدام حساب؟'}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {active.map((a) => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              className={`rounded-[15px] border-[1.5px] p-3 text-right transition-all ${
                selected
                  ? 'border-brand-2 bg-brand-soft'
                  : error
                    ? 'border-coral/60 bg-white hover:border-coral'
                    : 'border-line bg-white hover:border-line-2'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: a.color || '#2f9c78' }}
                />
                <span className="truncate text-[11px] font-bold text-ink">{a.name}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                {a.bank && (
                  <span className="text-[8.5px] font-semibold text-ink-3">{a.bank}</span>
                )}
                <span className="num ms-auto text-[10.5px] font-extrabold text-ink-2">
                  {fmt(a.balance)}{' '}
                  <span className="text-[8px] font-semibold text-ink-3">تومان</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
