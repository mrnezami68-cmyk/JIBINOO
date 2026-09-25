import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, Fingerprint, Sparkles, Wallet, Target, TrendingUp, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { parseAmount, fmt } from '../lib/format';
import { AmountInput, Field, Banner } from '../components/ui';

const FEATURES = [
  {
    icon: <Wallet size={20} />,
    title: 'دارایی هوشمند',
    desc: 'قیمت لحظه‌ای طلا، ارز و رمزارز با به‌روزرسانی خودکار',
  },
  {
    icon: <Target size={20} />,
    title: 'اهداف مالی',
    desc: 'هدف بسازید و پول را از موجودی نقد به آن منتقل کنید',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'تحلیل رفتار مالی',
    desc: 'آزمون‌های روان‌شناسی مالی و تحلیل هوشمند شخصیت',
  },
];

export function Welcome() {
  const { settings, updateSettings, setCash, cash, state } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.name ?? '');
  const [initialCash, setInitialCash] = useState(settings.name ? String(state.cash || '') : '');
  const [fixedIncome, setFixedIncome] = useState(
    settings.monthlyFixedIncome ? String(settings.monthlyFixedIncome) : ''
  );
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [enablePin, setEnablePin] = useState(false);
  const [enableBio, setEnableBio] = useState(false);
  const [error, setError] = useState('');

  const steps = ['خوش‌آمد', 'اطلاعات پایه', 'امنیت'];

  return (
    <div className="min-h-screen bg-paper">
      <div className="wash fixed inset-0" aria-hidden />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1080px] flex-col px-5 py-8 sm:px-8">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#1c8a67] to-[#0e5744] shadow-[0_14px_28px_-14px_rgba(14,87,68,.7)]">
              <img src="/favicon.svg" alt="جیبینو" className="h-8 w-8" />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-ink">جیبینو</div>
              <div className="text-[9.5px] font-semibold text-ink-3">
                حسابدار شخصی هوشمند شما
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[9.5px] font-bold transition-all ${
                    i <= step
                      ? 'bg-brand-2 text-white'
                      : 'border border-line bg-white text-ink-3'
                  }`}
                >
                  {i < step ? <Check size={11} /> : i + 1}
                </div>
                <span
                  className={`hidden text-[9.5px] font-bold sm:block ${
                    i === step ? 'text-ink' : 'text-ink-3'
                  }`}
                >
                  {s}
                </span>
                {i < steps.length - 1 && <div className="h-px w-5 bg-line sm:w-8" />}
              </div>
            ))}
          </div>
        </div>

        {/* content */}
        <div className="flex flex-1 items-center py-10">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45 }}
                className="grid w-full items-center gap-10 lg:grid-cols-2"
              >
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-soft-2 bg-brand-soft px-3.5 py-1.5 text-[9.5px] font-bold text-brand-2">
                    <Sparkles size={12} /> نسخه ۲.۰ — تحلیل هوشمند دارایی
                  </div>
                  <h1 className="mt-5 text-[32px] font-extrabold leading-[1.35] text-ink sm:text-[42px]">
                    دارایی، هدف و
                    <br />
                    <span className="text-brand-2">آرامش مالی</span> در یک جیب
                  </h1>
                  <p className="mt-5 max-w-[460px] text-[12.5px] leading-8 text-ink-2">
                    جیبینو به شما کمک می‌کند درآمد، هزینه، سرمایه‌گذاری، وام و اهداف مالی‌تان را در
                    یک نگاه ببینید — با قیمت لحظه‌ای طلا و رمزارز، و تحلیل هوشمند رفتار مالی‌تان.
                  </p>

                  <div className="mt-7 space-y-3">
                    {FEATURES.map((f, i) => (
                      <motion.div
                        key={f.title}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 * i, duration: 0.4 }}
                        className="flex items-center gap-3.5 rounded-[17px] border border-line bg-white/70 p-3.5 backdrop-blur"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-brand-soft text-brand-2">
                          {f.icon}
                        </div>
                        <div>
                          <div className="text-[11.5px] font-extrabold text-ink">{f.title}</div>
                          <div className="mt-0.5 text-[9.5px] font-medium text-ink-3">
                            {f.desc}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary mt-8 !px-8 !py-4 !text-[13px]"
                    onClick={() => setStep(1)}
                  >
                    شروع کنیم <ChevronLeft size={17} />
                  </button>
                  <div className="mt-4 text-[9px] font-semibold text-ink-3">
                    داده‌های شما فقط روی دستگاه خودتان ذخیره می‌شود و به هیچ سروری ارسال نمی‌شود.
                  </div>
                </div>

                <div className="relative hidden lg:block">
                  <div className="overflow-hidden rounded-[28px] border border-line shadow-[0_36px_70px_-32px_rgba(29,43,37,.5)]">
                    <img
                      src="/images/hero.png"
                      alt="آرامش مالی با جیبینو"
                      className="h-[440px] w-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-6 right-6 rounded-[19px] border border-line bg-white/95 px-5 py-4 shadow-[0_22px_44px_-20px_rgba(29,43,37,.5)] backdrop-blur">
                    <div className="text-[8.5px] font-bold text-ink-3">ارزش خالص دارایی</div>
                    <div className="num mt-1 text-[19px] font-extrabold text-brand-2">
                      {fmt(Math.max(0, parseAmount(initialCash) || 0))}
                    </div>
                    <div className="text-[8px] font-semibold text-ink-3">تومان</div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45 }}
                className="mx-auto w-full max-w-[560px]"
              >
                <div className="card p-7 sm:p-9">
                  <h2 className="text-[21px] font-extrabold text-ink">
                    وضعیت مالی امروز شما
                  </h2>
                  <p className="mt-2.5 text-[11px] leading-7 text-ink-3">
                    این اعداد نقطه شروع حساب‌وکتاب شما هستند و بعداً هم قابل ویرایش‌اند.
                  </p>

                  <div className="mt-7 space-y-5">
                    <Field label="نام شما">
                      <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثلاً سارا"
                        autoFocus
                      />
                    </Field>

                    <Field label="موجودی نقد فعلی" hint="تومان">
                      <AmountInput value={initialCash} onChange={setInitialCash} />
                    </Field>

                    <Field label="درآمد ماهانه ثابت" hint="اختیاری — تومان">
                      <AmountInput value={fixedIncome} onChange={setFixedIncome} />
                    </Field>
                  </div>

                  {error && (
                    <div className="mt-5">
                      <Banner tone="danger">{error}</Banner>
                    </div>
                  )}

                  <div className="mt-8 flex gap-3">
                    <button
                      className="btn btn-primary flex-1"
                      onClick={() => {
                        if (!name.trim()) {
                          setError('برای ادامه، نام خود را وارد کنید.');
                          return;
                        }
                        setError('');
                        setStep(2);
                      }}
                    >
                      ادامه <ChevronLeft size={16} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => setStep(0)}>
                      <ChevronRight size={16} /> بازگشت
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45 }}
                className="mx-auto w-full max-w-[560px]"
              >
                <div className="card p-7 sm:p-9">
                  <div className="flex h-13 w-13 items-center justify-center rounded-[19px] bg-brand-soft p-3.5 text-brand-2">
                    <Shield size={23} />
                  </div>
                  <h2 className="mt-5 text-[21px] font-extrabold text-ink">امنیت داده‌ها</h2>
                  <p className="mt-2.5 text-[11px] leading-7 text-ink-3">
                    برای جلوگیری از دسترسی دیگران، می‌توانید رمز ۴ رقمی و قفل بیومتریک فعال کنید.
                    این مرحله اختیاری است.
                  </p>

                  <div className="mt-7 space-y-3.5">
                    <button
                      onClick={() => setEnablePin((v) => !v)}
                      className={`flex w-full items-center justify-between rounded-[17px] border-[1.5px] p-4 transition-all ${
                        enablePin
                          ? 'border-brand-2 bg-brand-soft/60'
                          : 'border-line bg-white hover:border-line-2'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-brand-2">
                          <Shield size={18} />
                        </div>
                        <div className="text-right">
                          <div className="text-[11.5px] font-bold text-ink">
                            رمز عبور ۴ رقمی
                          </div>
                          <div className="mt-0.5 text-[9px] font-semibold text-ink-3">
                            هنگام باز کردن اپلیکیشن پرسیده می‌شود
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                          enablePin ? 'bg-brand-2' : 'bg-line-2'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white shadow transition-all ${
                            enablePin ? 'translate-x-[-20px]' : ''
                          }`}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {enablePin && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid gap-3.5 overflow-hidden sm:grid-cols-2"
                        >
                          <Field label="رمز ۴ رقمی">
                            <input
                              className="input num text-center text-[19px] font-extrabold tracking-[0.45em]"
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={pin}
                              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••"
                            />
                          </Field>
                          <Field label="تکرار رمز">
                            <input
                              className="input num text-center text-[19px] font-extrabold tracking-[0.45em]"
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={pinConfirm}
                              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••"
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={() => setEnableBio((v) => !v)}
                      className={`flex w-full items-center justify-between rounded-[17px] border-[1.5px] p-4 transition-all ${
                        enableBio
                          ? 'border-brand-2 bg-brand-soft/60'
                          : 'border-line bg-white hover:border-line-2'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-brand-2">
                          <Fingerprint size={18} />
                        </div>
                        <div className="text-right">
                          <div className="text-[11.5px] font-bold text-ink">
                            ورود با بیومتریک
                          </div>
                          <div className="mt-0.5 text-[9px] font-semibold text-ink-3">
                            اثر انگشت / تشخیص چهره (در نسخه موبایل)
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                          enableBio ? 'bg-brand-2' : 'bg-line-2'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white shadow transition-all ${
                            enableBio ? 'translate-x-[-20px]' : ''
                          }`}
                        />
                      </div>
                    </button>
                  </div>

                  {error && (
                    <div className="mt-5">
                      <Banner tone="danger">{error}</Banner>
                    </div>
                  )}

                  <div className="mt-8 flex gap-3">
                    <button
                      className="btn btn-primary flex-1"
                      onClick={() => {
                        if (enablePin) {
                          if (pin.length !== 4 || pinConfirm.length !== 4) {
                            setError('رمز باید ۴ رقم باشد.');
                            return;
                          }
                          if (pin !== pinConfirm) {
                            setError('رمزها یکسان نبودند، دوباره تلاش کنید.');
                            return;
                          }
                        }
                        setError('');
                        // باگ شماره ۸: موجودی اولیه واردشده باید ذخیره شود (قبلاً گم می‌شد)
                        setCash(
                          initialCash.trim()
                            ? Math.max(0, parseAmount(initialCash))
                            : Math.max(0, state.cash || 0)
                        );
                        updateSettings({
                          name: name.trim(),
                          monthlyFixedIncome: parseAmount(fixedIncome),
                          pinEnabled: enablePin,
                          pin: enablePin ? pin : null,
                          biometric: enableBio,
                          onboarded: true,
                        });
                        window.location.href = '/';
                      }}
                    >
                      ورود به جیبینو <Check size={16} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => setStep(1)}>
                      <ChevronRight size={16} /> بازگشت
                    </button>
                  </div>

                  <div className="mt-4 text-center text-[8.5px] font-semibold text-ink-3">
                    موجودی فعلی ثبت‌شده: {fmt(cash)} تومان — بعداً از بخش تنظیمات قابل تغییر است.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
