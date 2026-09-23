import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, AlertTriangle, Info, TrendingUp, TrendingDown, Trash2, Plus } from 'lucide-react';
import { faDigits, fmt, parseAmount } from '../lib/format';

/* ------------------------------- Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky action bar — stays visible without scrolling (esp. on mobile) */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div
            className="fixed inset-0 bg-[#1d2b25]/45 backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden
          />
          {/* min-h-full keeps the sheet bottom-anchored while the overlay itself
              stays scrollable — so the action bar is always reachable. */}
          <div className="relative flex min-h-full items-end justify-center p-0 sm:items-center sm:p-6">
            <motion.div
              className={`relative w-full ${
                size === 'sm' ? 'sm:max-w-[420px]' : size === 'lg' ? 'sm:max-w-[680px]' : 'sm:max-w-[520px]'
              }`}
              initial={{ opacity: 0, y: 28, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              <div className="card flex max-h-[86vh] w-full flex-col overflow-hidden rounded-b-none rounded-t-[26px] sm:max-h-[82vh] sm:rounded-[26px]">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-surface/95 px-6 pb-4 pt-6">
                <div>
                  <h3 className="text-[17px] font-extrabold text-ink">{title}</h3>
                  {subtitle && <p className="mt-1 text-[12.5px] leading-6 text-ink-3">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-ink-2 transition hover:bg-paper-2"
                  aria-label="بستن"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-6 pb-6 pt-5">{children}</div>
              {footer && (
                <div className="shrink-0 border-t border-line bg-surface px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_28px_-18px_rgba(29,43,37,.35)]">
                  {footer}
                </div>
              )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ------------------------------- Field ------------------------------ */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline gap-2">
        <span className="text-[12.5px] font-bold text-ink-2">{label}</span>
        {hint && <span className="text-[11px] font-medium text-ink-3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Amount input with Persian digit normalisation + live formatted preview. */
export function AmountInput({
  value,
  onChange,
  placeholder = '۰',
  suffix = 'تومان',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        className="input num pl-16"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[11.5px] font-bold text-ink-3">
        {suffix}
      </span>
      {value && parseAmount(value) > 0 && (
        <div className="num mt-1.5 text-[11px] font-semibold text-brand">
          {fmt(parseAmount(value))} تومان
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Chips ------------------------------ */

export function ChipSelect({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { key: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex items-center justify-center gap-1.5 rounded-[13px] border-[1.5px] px-2 py-2.5 text-[11.5px] font-bold transition-all ${
            value === o.key
              ? 'border-brand-2 bg-brand-2 text-white shadow-[0_10px_22px_-12px_rgba(14,87,68,.55)]'
              : 'border-line bg-white text-ink-2 hover:border-line-2 hover:bg-paper'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------- Stat cards ---------------------------- */

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: 'brand' | 'gold' | 'coral' | 'violet' | 'sky' | 'neutral';
  trend?: number;
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    brand: { bg: 'bg-brand-soft', fg: 'text-brand-2' },
    gold: { bg: 'bg-gold-soft', fg: 'text-gold' },
    coral: { bg: 'bg-coral-soft', fg: 'text-coral' },
    violet: { bg: 'bg-violet-soft', fg: 'text-violet' },
    sky: { bg: 'bg-sky-soft', fg: 'text-sky' },
    neutral: { bg: 'bg-paper-2', fg: 'text-ink-2' },
  };
  const t = tones[tone] ?? tones.brand;

  return (
    <div className="card-flat group p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(29,43,37,.35)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11.5px] font-bold text-ink-3">{label}</div>
          <div className="num mt-1.5 truncate text-[17px] font-extrabold text-ink sm:text-[19px]">
            {value}
          </div>
          {sub && <div className="mt-1 text-[10.5px] font-medium text-ink-3">{sub}</div>}
          {typeof trend === 'number' && (
            <div
              className={`mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold ${
                trend >= 0 ? 'text-brand' : 'text-coral'
              }`}
            >
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {faDigits(Math.abs(Math.round(trend * 100) / 100))}٪
            </div>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${t.bg} ${t.fg}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Section ----------------------------- */

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-extrabold text-ink sm:text-[17px]">{title}</h2>
        {subtitle && <p className="mt-1 text-[11.5px] leading-6 text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------- Empty state --------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand-soft text-brand">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-extrabold text-ink">{title}</h3>
      <p className="mt-2 max-w-[380px] text-[12px] leading-7 text-ink-3">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------ Banner ------------------------------ */

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  const map = {
    info: { bg: 'bg-sky-soft', fg: 'text-[#2f6486]', icon: <Info size={15} /> },
    success: { bg: 'bg-brand-soft', fg: 'text-brand-2', icon: <Check size={15} /> },
    warning: { bg: 'bg-gold-soft', fg: 'text-[#8a6516]', icon: <AlertTriangle size={15} /> },
    danger: { bg: 'bg-coral-soft', fg: 'text-[#a8483a]', icon: <AlertTriangle size={15} /> },
  }[tone];

  return (
    <div className={`flex items-start gap-2.5 rounded-[15px] px-4 py-3 ${map.bg}`}>
      <span className={`mt-0.5 shrink-0 ${map.fg}`}>{map.icon}</span>
      <div className={`text-[11.5px] font-semibold leading-6 ${map.fg}`}>{children}</div>
    </div>
  );
}

/* ---------------------------- Confirm ------------------------------- */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  onConfirm,
  onCancel,
  danger = true,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-[12.5px] leading-7 text-ink-2">{message}</p>
      <div className="mt-6 flex gap-3">
        <button
          className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
        >
          <Trash2 size={15} />
          {confirmLabel}
        </button>
        <button className="btn btn-ghost flex-1" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------ Toast ------------------------------- */

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const show = (message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2800);
  };

  const toastNode = (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 sm:bottom-8"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        >
          <div
            className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-[12.5px] font-bold text-white shadow-[0_20px_44px_-18px_rgba(29,43,37,.55)] ${
              toast.tone === 'success' ? 'bg-brand-2' : 'bg-coral'
            }`}
          >
            {toast.tone === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            {toast.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { show, toastNode };
}

/* ---------------------------- Quick add ----------------------------- */

export function QuickAddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-full bg-brand-2 px-5 py-3 text-[12.5px] font-bold text-white shadow-[0_18px_36px_-16px_rgba(14,87,68,.7)] transition-all hover:-translate-y-0.5 hover:bg-brand active:scale-[.97]"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
        <Plus size={13} />
      </span>
      {label}
    </button>
  );
}

/* ------------------------- Likert scale input ----------------------- */

export function LikertScale({
  value,
  onChange,
  options,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`min-w-[62px] flex-1 rounded-[13px] border-[1.5px] px-2 py-2.5 text-[10.5px] font-bold transition-all sm:min-w-[84px] sm:text-[11px] ${
              active
                ? 'border-brand-2 bg-brand-2 text-white shadow-[0_12px_24px_-12px_rgba(14,87,68,.6)]'
                : 'border-line bg-white text-ink-2 hover:border-brand-3 hover:bg-brand-soft/50'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
