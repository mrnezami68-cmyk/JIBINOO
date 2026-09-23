import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Lock as LockIcon, Delete } from 'lucide-react';
import { useStore } from '../lib/store';
import { faDigits } from '../lib/format';

export function Lock({ onUnlock }: { onUnlock: () => void }) {
  const { settings } = useStore();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (v: string) => {
    if (v === settings.pin) {
      onUnlock();
    } else {
      setError('رمز اشتباه بود، دوباره تلاش کنید');
      setValue('');
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="wash flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[380px]"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#1c8a67] to-[#0e5744] shadow-[0_20px_42px_-18px_rgba(14,87,68,.8)]">
            <img src="/favicon.svg" alt="جیبینو" className="h-11 w-11" />
          </div>
          <h1 className="mt-5 text-[19px] font-extrabold text-ink">جیبینو قفل است</h1>
          <p className="mt-2 text-[11px] font-semibold text-ink-3">
            سلام {settings.name || 'دوست جیبینو'}، رمز را وارد کنید
          </p>
        </div>

        <motion.div
          animate={shake ? { x: [0, -9, 9, -7, 7, 0] } : {}}
          transition={{ duration: 0.45 }}
          className="mt-8"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={value}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                setValue(v);
                setError('');
                if (v.length === 4) window.setTimeout(() => submit(v), 120);
              }}
              className="input num text-center text-[27px] font-extrabold tracking-[0.62em]"
              placeholder="••••"
            />
            <LockIcon
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
            />
          </div>

          <div className="mt-4 flex justify-center gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  value.length > i ? 'scale-110 bg-brand-2' : 'bg-line-2'
                }`}
              />
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center text-[10.5px] font-bold text-coral"
            >
              {error}
            </motion.div>
          )}
        </motion.div>

        {/* numeric keypad */}
        <div className="mt-8 grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              className="card-flat num py-4 text-[19px] font-extrabold text-ink transition hover:bg-white active:scale-[.96]"
              onClick={() => {
                const next = (value + n).slice(0, 4);
                setValue(next);
                setError('');
                if (next.length === 4) window.setTimeout(() => submit(next), 120);
              }}
            >
              {faDigits(n)}
            </button>
          ))}
          <button
            className="card-flat flex items-center justify-center py-4 text-brand-2 transition hover:bg-white active:scale-[.96]"
            onClick={() => {
              if (settings.biometric && 'credentials' in navigator) {
                onUnlock();
              }
            }}
            title="ورود با بیومتریک"
          >
            <Fingerprint size={21} />
          </button>
          <button
            className="card-flat num py-4 text-[19px] font-extrabold text-ink transition hover:bg-white active:scale-[.96]"
            onClick={() => {
              const next = (value + '0').slice(0, 4);
              setValue(next);
              if (next.length === 4) window.setTimeout(() => submit(next), 120);
            }}
          >
            ۰
          </button>
          <button
            className="card-flat flex items-center justify-center py-4 text-ink-2 transition hover:bg-white active:scale-[.96]"
            onClick={() => setValue((v) => v.slice(0, -1))}
            title="حذف"
          >
            <Delete size={19} />
          </button>
        </div>

        <div className="mt-7 text-center text-[8.5px] font-semibold leading-5 text-ink-3">
          داده‌های شما فقط روی همین دستگاه ذخیره شده است.
          <br />
          برای ورود سریع‌تر می‌توانید از بیومتریک (در نسخه موبایل) استفاده کنید.
        </div>
      </motion.div>
    </div>
  );
}
