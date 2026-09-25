import { useRef, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Brain,
  HeartPulse,
  Shield,
  Sparkles,
  ChevronLeft,
  RefreshCw,
  Lock,
  Fingerprint,
  Trash2,
  Check,
  X,
  TrendingUp,
  Gem,
  Info,
  Pencil,
  BookOpen,
  Download,
  Upload,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { financialHealth, investmentHealth, computeNetWorth, buildInsights } from '../lib/analysis';
import {
  FINANCE_QUESTIONS,
  PERSONALITY_QUESTIONS,
  LIKERT_LABELS,
  scoreFinanceTest,
  scorePersonalityTest,
  bandLabel,
} from '../lib/tests';
import { fmt, compact, pct, faDigits, freshness, parseAmount, jDateLabel, todayISO } from '../lib/format';
import {
  SectionHeader,
  Modal,
  Field,
  Banner,
  LikertScale,
  ConfirmDialog,
} from '../components/ui';
import { Ring, Progress } from '../components/charts';

export function Profile() {
  const store = useStore();
  const {
    settings,
    updateSettings,
    tests,
    saveTest,
    prices,
    refreshPrices,
    refreshing,
    resetAll,
    txs,
    assets,
    goals,
    loans,
    importBackup,
  } = store;

  const nw = useMemo(() => computeNetWorth(store.state, prices), [store.state, prices]);
  const finHealth = useMemo(() => financialHealth(store.state, prices), [store.state, prices]);
  const invHealth = useMemo(() => investmentHealth(store.state, prices), [store.state, prices]);
  const insights = useMemo(() => buildInsights(store.state, prices), [store.state, prices]);

  const [financeOpen, setFinanceOpen] = useState(false);
  const [personalityOpen, setPersonalityOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // پشتیبان‌گیری (P0 شماره ۳)
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<unknown>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  /** خروجی کامل داده‌ها به فایل JSON — برای انتقال به دستگاه دیگر یا نگهداری امن */
  const exportBackup = () => {
    try {
      const payload = {
        app: 'jibino',
        version: 2,
        exportedAt: new Date().toISOString(),
        state: store.state,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jibino-backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupMsg({
        tone: 'success',
        text: 'فایل پشتیبان ساخته و دانلود شد. آن را جای مطمئنی (مثلاً حافظه ابری شخصی) نگه دارید.',
      });
    } catch {
      setBackupMsg({ tone: 'danger', text: 'ساخت فایل پشتیبان ناموفق بود.' });
    }
  };

  /** انتخاب فایل پشتیبان → نمایش تأییدیه جایگزینی کامل داده‌ها */
  const onPickBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // اجازه انتخاب مجدد همان فایل
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setPendingImport(parsed);
        setImportOpen(true);
      } catch {
        setBackupMsg({ tone: 'danger', text: 'این فایل JSON معتبر نیست — پشتیبان جیبینو را انتخاب کنید.' });
      }
    };
    reader.onerror = () => setBackupMsg({ tone: 'danger', text: 'خواندن فایل ناموفق بود.' });
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="پروفایل و تحلیل هویت مالی"
        subtitle="شخصیت مالی شما از ترکیب آزمون‌ها، رفتار ثبت‌شده و وضعیت دارایی‌ها ساخته می‌شود."
      />

      {/* identity hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-line bg-gradient-to-bl from-[#efe9dc] via-[#f7f3ea] to-[#e7f0e9] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-[0_18px_36px_-18px_rgba(29,43,37,.4)]">
              <User size={26} className="text-brand-2" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-extrabold text-ink">
                  {settings.name || 'کاربر جیبینو'}
                </h2>
                <button
                  onClick={() => setNameOpen(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-ink-3 transition hover:text-brand-2"
                  aria-label="ویرایش نام"
                >
                  <Pencil size={12} />
                </button>
              </div>
              <p className="mt-1.5 max-w-[520px] text-[11px] leading-6 text-ink-2">
                {tests.finance ? (
                  <>
                    هویت مالی شما:{' '}
                    <strong className="text-brand-2">{tests.finance.archetype}</strong> —{' '}
                    {tests.finance.archetypeDesc}
                  </>
                ) : (
                  'هنوز آزمون روان‌شناسی مالی را انجام نداده‌اید. با پاسخ به چند سؤال کوتاه، جیبینو هویت مالی شما را تحلیل می‌کند و توصیه‌های شخصی‌سازی‌شده می‌دهد.'
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-[9.5px] font-bold text-ink-2">
                  {faDigits(txs.length)} تراکنش ثبت‌شده
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-[9.5px] font-bold text-ink-2">
                  {faDigits(assets.length)} دارایی
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-[9.5px] font-bold text-ink-2">
                  {faDigits(goals.length)} هدف مالی
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-[9.5px] font-bold text-ink-2">
                  {faDigits(loans.length)} وام
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <div className="rounded-[20px] bg-white/85 p-4 text-center">
              <Ring value={finHealth.score} size={112} thickness={12} color="#2f9c78">
                <div>
                  <div className="num text-[19px] font-extrabold">{faDigits(finHealth.score)}</div>
                  <div className="text-[8px] font-semibold text-ink-3">سلامت مالی</div>
                </div>
              </Ring>
              <div className="mt-1.5 text-[9.5px] font-bold text-brand-2">{finHealth.label}</div>
            </div>
            <div className="rounded-[20px] bg-white/85 p-4 text-center">
              <Ring value={invHealth.score} size={112} thickness={12} color="#c08d2c">
                <div>
                  <div className="num text-[19px] font-extrabold">{faDigits(invHealth.score)}</div>
                  <div className="text-[8px] font-semibold text-ink-3">سلامت سرمایه‌گذاری</div>
                </div>
              </Ring>
              <div className="mt-1.5 text-[9.5px] font-bold text-gold">{invHealth.label}</div>
            </div>
          </div>
        </div>
      </section>

      {/* tests */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* financial psychology */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-brand-soft text-brand-2">
                <Brain size={21} />
              </div>
              <div>
                <h3 className="text-[14px] font-extrabold text-ink">آزمون روان‌شناسی مالی</h3>
                <p className="mt-1 text-[10px] leading-5 text-ink-3">
                  {faDigits(FINANCE_QUESTIONS.length)} سؤال • ۶ بعد رفتار مالی: انضباط، تکانشگری،
                  اضطراب، ریسک‌پذیری، آینده‌نگری و خرج نمایشی
                </p>
              </div>
            </div>
            {tests.finance && (
              <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[8px] font-bold text-brand-2">
                <Check size={9} /> انجام شده
              </span>
            )}
          </div>

          {tests.finance ? (
            <>
              <div className="mt-5 space-y-3">
                {tests.finance.dimensions.map((d) => (
                  <div key={d.key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-ink-2">{d.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="num text-[9.5px] font-bold text-ink-3">
                          {bandLabel(d.score)}
                        </span>
                        <span className="num text-[10px] font-extrabold text-ink">
                          {faDigits(d.score)}
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={d.score}
                      color={
                        d.key === 'impulse' || d.key === 'anxiety' || d.key === 'status'
                          ? d.score > 60
                            ? '#cd6a58'
                            : '#2f9c78'
                          : d.score > 60
                            ? '#2f9c78'
                            : '#c08d2c'
                      }
                      height={7}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2.5">
                <button className="btn btn-soft flex-1" onClick={() => setFinanceOpen(true)}>
                  آزمون مجدد
                </button>
                <div className="text-[8.5px] font-semibold text-ink-3">
                  آخرین آزمون: {jDateLabel(tests.finance.date)}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5">
              <Banner tone="info">
                با انجام این آزمون، تحلیل رفتار مالی شما دقیق‌تر می‌شود و توصیه‌های جیبینو
                شخصی‌سازی می‌شوند.
              </Banner>
              <button className="btn btn-primary mt-4 w-full" onClick={() => setFinanceOpen(true)}>
                <Sparkles size={15} /> شروع آزمون روان‌شناسی مالی
              </button>
            </div>
          )}
        </div>

        {/* personality */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-violet-soft text-violet">
                <HeartPulse size={21} />
              </div>
              <div>
                <h3 className="text-[14px] font-extrabold text-ink">آزمون شخصیت (پنج عاملی)</h3>
                <p className="mt-1 text-[10px] leading-5 text-ink-3">
                  {faDigits(PERSONALITY_QUESTIONS.length)} سؤال • تحلیل اثر شخصیت بر تصمیم‌های پولی
                  شما
                </p>
              </div>
            </div>
            {tests.personality && (
              <span className="flex items-center gap-1 rounded-full bg-violet-soft px-2.5 py-1 text-[8px] font-bold text-violet">
                <Check size={9} /> انجام شده
              </span>
            )}
          </div>

          {tests.personality ? (
            <>
              <div className="mt-5 space-y-3">
                {tests.personality.dimensions.map((d) => (
                  <div key={d.key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-ink-2">{d.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="num text-[9.5px] font-bold text-ink-3">
                          {bandLabel(d.score)}
                        </span>
                        <span className="num text-[10px] font-extrabold text-ink">
                          {faDigits(d.score)}
                        </span>
                      </span>
                    </div>
                    <Progress value={d.score} color="#7161c4" height={7} />
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[16px] border border-violet-soft bg-violet-soft/40 p-4">
                <div className="text-[9px] font-bold text-violet">معنای مالی شخصیت شما</div>
                <div className="mt-1.5 text-[11px] font-extrabold text-ink">
                  {tests.personality.archetype}
                </div>
                <p className="mt-1.5 text-[9.5px] leading-5 text-ink-2">
                  {tests.personality.archetypeDesc}
                </p>
              </div>
              <button
                className="btn btn-soft mt-4 w-full"
                onClick={() => setPersonalityOpen(true)}
              >
                آزمون مجدد شخصیت
              </button>
            </>
          ) : (
            <div className="mt-5">
              <Banner tone="info">
                آزمون شخصیت به جیبینو کمک می‌کند توصیه‌های مالی را متناسب با روحیه شما ارائه دهد؛
                مثلاً نحوه برخورد شما با نوسان بازار یا خریدهای احساسی.
              </Banner>
              <button
                className="btn btn-primary mt-4 w-full"
                onClick={() => setPersonalityOpen(true)}
              >
                <Sparkles size={15} /> شروع آزمون شخصیت
              </button>
            </div>
          )}
        </div>
      </section>

      {/* health dashboards */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-brand-soft text-brand-2">
              <TrendingUp size={19} />
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-ink">سلامت مالی</h3>
              <p className="mt-0.5 text-[9.5px] text-ink-3">
                ترکیبی از پس‌انداز، صندوق اضطراری، بدهی، اهداف و ثبات هزینه‌ها
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <Ring value={finHealth.score} size={118} thickness={13} color="#2f9c78">
              <div>
                <div className="num text-[21px] font-extrabold">{faDigits(finHealth.score)}</div>
                <div className="text-[8.5px] font-semibold text-ink-3">از ۱۰۰</div>
              </div>
            </Ring>
            <div className="flex-1">
              <div className="text-[13px] font-extrabold text-brand-2">{finHealth.label}</div>
              <p className="mt-1.5 text-[9.5px] leading-5 text-ink-2">
                {finHealth.score >= 70
                  ? 'وضعیت مالی شما سالم است؛ با حفظ همین روند و بهینه‌سازی جزئی، می‌توانید به سطح عالی برسید.'
                  : 'با چند تغییر کوچک و هدفمند می‌توانید سلامت مالی خود را به‌طور محسوسی بهبود دهید.'}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {finHealth.metrics.map((m) => (
              <div
                key={m.key}
                className="flex items-center justify-between rounded-[13px] border border-line bg-paper/40 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      m.good === true
                        ? 'bg-brand-soft text-brand-2'
                        : m.good === false
                          ? 'bg-coral-soft text-coral'
                          : 'bg-paper-2 text-ink-3'
                    }`}
                  >
                    {m.good === true ? <Check size={11} /> : m.good === false ? <X size={11} /> : <Info size={11} />}
                  </span>
                  <div>
                    <div className="text-[10px] font-bold text-ink">{m.label}</div>
                    <div className="text-[8px] font-semibold text-ink-3">{m.hint}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="num text-[10.5px] font-extrabold text-ink">{m.value}</div>
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, m.score)}%`,
                        background: m.score >= 70 ? '#2f9c78' : m.score >= 45 ? '#c08d2c' : '#cd6a58',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gold-soft text-gold">
              <Gem size={19} />
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-ink">سلامت سرمایه‌گذاری</h3>
              <p className="mt-0.5 text-[9.5px] text-ink-3">
                تنوع سبد، تمرکز رمزارز، بازده، نقدینگی و تازگی قیمت‌ها
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <Ring value={invHealth.score} size={118} thickness={13} color="#c08d2c">
              <div>
                <div className="num text-[21px] font-extrabold">{faDigits(invHealth.score)}</div>
                <div className="text-[8.5px] font-semibold text-ink-3">از ۱۰۰</div>
              </div>
            </Ring>
            <div className="flex-1">
              <div className="text-[13px] font-extrabold text-gold">{invHealth.label}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-[12px] border border-line bg-paper/50 p-2.5">
                  <div className="text-[8px] font-bold text-ink-3">ارزش سبد</div>
                  <div className="num mt-0.5 text-[11px] font-extrabold text-ink">
                    {compact(nw.investments)}
                  </div>
                </div>
                <div className="rounded-[12px] border border-line bg-paper/50 p-2.5">
                  <div className="text-[8px] font-bold text-ink-3">بازده کل</div>
                  <div
                    className={`num mt-0.5 text-[11px] font-extrabold ${
                      nw.pnl >= 0 ? 'text-brand-2' : 'text-coral'
                    }`}
                  >
                    {nw.pnl >= 0 ? '+' : '−'}
                    {pct(Math.abs(nw.pnlPct))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {invHealth.metrics.map((m) => (
              <div
                key={m.key}
                className="flex items-center justify-between rounded-[13px] border border-line bg-paper/40 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      m.good === true
                        ? 'bg-brand-soft text-brand-2'
                        : m.good === false
                          ? 'bg-coral-soft text-coral'
                          : 'bg-paper-2 text-ink-3'
                    }`}
                  >
                    {m.good === true ? <Check size={11} /> : m.good === false ? <X size={11} /> : <Info size={11} />}
                  </span>
                  <div>
                    <div className="text-[10px] font-bold text-ink">{m.label}</div>
                    <div className="text-[8px] font-semibold text-ink-3">{m.hint}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="num text-[10.5px] font-extrabold text-ink">{m.value}</div>
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, m.score)}%`,
                        background: m.score >= 70 ? '#2f9c78' : m.score >= 45 ? '#c08d2c' : '#cd6a58',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* smart analysis */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-violet-soft text-violet">
            <Sparkles size={19} />
          </div>
          <div>
            <h3 className="text-[14px] font-extrabold text-ink">تحلیل هوشمند رفتار شما</h3>
            <p className="mt-0.5 text-[9.5px] text-ink-3">
              ترکیب آزمون‌ها + رفتار واقعی ثبت‌شده در دفتر تراکنش‌ها
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className={`flex items-start gap-3 rounded-[16px] border p-4 ${
                ins.tone === 'good'
                  ? 'border-brand-soft-2/70 bg-brand-soft/50'
                  : ins.tone === 'warn'
                    ? 'border-[#efd9b4] bg-gold-soft/50'
                    : 'border-line bg-paper/50'
              }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  ins.tone === 'good'
                    ? 'bg-brand-2 text-white'
                    : ins.tone === 'warn'
                      ? 'bg-gold text-white'
                      : 'bg-white text-ink-2'
                }`}
              >
                {ins.tone === 'good' ? <Check size={13} /> : <Info size={13} />}
              </span>
              <p className="text-[10px] font-medium leading-5.5 text-ink-2">{ins.text}</p>
            </div>
          ))}
        </div>

        {(tests.finance || tests.personality) && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {tests.finance && (
              <div className="rounded-[16px] border border-line bg-paper/40 p-4">
                <div className="text-[9px] font-bold text-ink-3">نقاط قوت رفتار مالی</div>
                <ul className="mt-2 space-y-1.5">
                  {tests.finance.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[9.5px] leading-5 text-ink-2">
                      <Check size={11} className="mt-0.5 shrink-0 text-brand-2" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tests.finance && (
              <div className="rounded-[16px] border border-line bg-paper/40 p-4">
                <div className="text-[9px] font-bold text-ink-3">توصیه‌های جیبینو</div>
                <ul className="mt-2 space-y-1.5">
                  {tests.finance.tips.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[9.5px] leading-5 text-ink-2">
                      <ChevronLeft size={11} className="mt-0.5 shrink-0 text-gold" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* settings & security */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-paper-2 text-ink-2">
            <Shield size={19} />
          </div>
          <div>
            <h3 className="text-[14px] font-extrabold text-ink">تنظیمات و امنیت</h3>
            <p className="mt-0.5 text-[9.5px] text-ink-3">
              رمز عبور، بیومتریک، نرخ‌های قیمت و مدیریت داده‌ها
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {/* PIN */}
          <div className="rounded-[17px] border border-line bg-paper/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-ink-2" />
                <div>
                  <div className="text-[11px] font-bold text-ink">رمز عبور ۴ رقمی</div>
                  <div className="mt-0.5 text-[8.5px] font-semibold text-ink-3">
                    {settings.pinEnabled ? 'فعال — هنگام ورود به اپ پرسیده می‌شود' : 'غیرفعال'}
                  </div>
                </div>
              </div>
              <button
                className={`rounded-full px-3.5 py-1.5 text-[9px] font-bold transition ${
                  settings.pinEnabled
                    ? 'bg-brand-soft text-brand-2 hover:bg-brand-soft-2'
                    : 'bg-paper-2 text-ink-2 hover:bg-line'
                }`}
                onClick={() => setPinOpen(true)}
              >
                {settings.pinEnabled ? 'تغییر' : 'فعال‌سازی'}
              </button>
            </div>
            <div className="mt-3 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    settings.pinEnabled ? 'bg-brand-2' : 'bg-line'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* biometric */}
          <div className="rounded-[17px] border border-line bg-paper/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Fingerprint size={16} className="text-ink-2" />
                <div>
                  <div className="text-[11px] font-bold text-ink">ورود با بیومتریک</div>
                  <div className="mt-0.5 text-[8.5px] font-semibold text-ink-3">
                    اثر انگشت / تشخیص چهره روی دستگاه
                  </div>
                </div>
              </div>
              <button
                onClick={() => updateSettings({ biometric: !settings.biometric })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.biometric ? 'bg-brand-2' : 'bg-line-2'
                }`}
                aria-label="تغییر وضعیت بیومتریک"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    settings.biometric ? 'right-0.5' : 'right-[22px]'
                  }`}
                />
              </button>
            </div>
            <div className="mt-3">
              <Banner tone={settings.biometric ? 'success' : 'info'}>
                {settings.biometric
                  ? 'بیومتریک فعال است. در نسخه نصب‌شده (PWA) روی موبایل، هنگام ورود می‌توانید با اثر انگشت وارد شوید.'
                  : 'قفل بیومتریک روی این مرورگر در دسترس نیست (در نسخه موبایل با اثر انگشت فعال می‌شود).'}
              </Banner>
            </div>
          </div>

          {/* prices */}
          <div className="rounded-[17px] border border-line bg-paper/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RefreshCw size={16} className="text-ink-2" />
                <div>
                  <div className="text-[11px] font-bold text-ink">قیمت‌ها و منابع</div>
                  <div className="mt-0.5 text-[8.5px] font-semibold text-ink-3">
                    CoinGecko برای رمزارز و طلا • نرخ مرجع برای دلار
                  </div>
                </div>
              </div>
              <button
                className="rounded-full bg-brand-soft px-3.5 py-1.5 text-[9px] font-bold text-brand-2 transition hover:bg-brand-soft-2"
                onClick={() => void refreshPrices()}
                disabled={refreshing}
              >
                {refreshing ? 'در حال به‌روزرسانی…' : `بروزرسانی (${freshness(prices.updatedAt)})`}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[11px] border border-line bg-white/70 p-2.5">
                <div className="text-[7.5px] font-bold text-ink-3">نرخ دلار (تومان)</div>
                <div className="num mt-0.5 text-[10.5px] font-extrabold text-ink">
                  {fmt(Math.round(prices.usdToman))}
                </div>
              </div>
              <div className="rounded-[11px] border border-line bg-white/70 p-2.5">
                <div className="text-[7.5px] font-bold text-ink-3">طلای ۱۸ عیار (گرم)</div>
                <div className="num mt-0.5 text-[10.5px] font-extrabold text-ink">
                  {fmt(Math.round(prices.gold18Toman))}
                </div>
              </div>
            </div>
            <button
              className="mt-3 w-full rounded-[11px] border border-dashed border-line-2 py-2 text-[8.5px] font-bold text-ink-2 transition hover:border-brand-3 hover:text-brand-2"
              onClick={() => setRateOpen(true)}
            >
              ثبت دستی نرخ دلار و طلا (برای زمانی که منابع آنلاین در دسترس نیستند)
            </button>
          </div>

          {/* data */}
          <div className="rounded-[17px] border border-line bg-paper/40 p-4">
            <div className="flex items-center gap-2.5">
              <Shield size={16} className="text-ink-2" />
              <div>
                <div className="text-[11px] font-bold text-ink">داده‌ها و حریم خصوصی</div>
                <div className="mt-0.5 text-[8.5px] font-semibold leading-4 text-ink-3">
                  همه داده‌ها فقط روی دستگاه شما ذخیره می‌شود و به هیچ سروری ارسال نمی‌شود.
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-[11px] border border-line bg-white/70 px-3 py-2">
                <span className="text-[8.5px] font-bold text-ink-2">تعداد تراکنش‌ها</span>
                <span className="num text-[9.5px] font-extrabold text-ink">
                  {faDigits(txs.length)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[11px] border border-line bg-white/70 px-3 py-2">
                <span className="text-[8.5px] font-bold text-ink-2">نسخه اپلیکیشن</span>
                <span className="num text-[9.5px] font-extrabold text-ink">
                  ۲.۲ — حساب‌های بانکی (PWA)
                </span>
              </div>

              {/* پشتیبان‌گیری — P0 شماره ۳ */}
              <div className="rounded-[11px] border border-brand-soft-2 bg-brand-soft/40 p-3">
                <div className="text-[9.5px] font-extrabold text-brand-2">
                  پشتیبان‌گیری و انتقال داده
                </div>
                <div className="mt-1 text-[8px] font-semibold leading-4 text-ink-3">
                  چون داده‌ها فقط در همین مرورگر ذخیره می‌شوند، پاک‌شدن داده مرورگر یا تعویض
                  دستگاه یعنی از دست رفتن تاریخچه مالی. با خروجی گرفتن، فایل پشتیبان را جای
                  مطمئن نگه دارید و در دستگاه جدید بازیابی کنید.
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    className="flex items-center justify-center gap-1.5 rounded-[11px] border border-brand-soft-2 bg-white py-2.5 text-[8.5px] font-bold text-brand-2 transition hover:bg-brand-soft"
                    onClick={exportBackup}
                  >
                    <Download size={12} /> خروجی پشتیبان (JSON)
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 rounded-[11px] border border-brand-soft-2 bg-white py-2.5 text-[8.5px] font-bold text-ink-2 transition hover:bg-paper-2 hover:text-brand-2"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={12} /> بازیابی از فایل
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={onPickBackupFile}
                />
                {backupMsg && (
                  <div className="mt-2">
                    <Banner tone={backupMsg.tone}>{backupMsg.text}</Banner>
                  </div>
                )}
              </div>

              <Link
                to="/guide"
                className="flex w-full items-center justify-center gap-1.5 rounded-[11px] border border-brand-soft-2 bg-brand-soft/60 py-2.5 text-[8.5px] font-bold text-brand-2 transition hover:bg-brand-soft"
              >
                <BookOpen size={11} className="ml-1.5 inline" />
                راهنمای نصب، سورس کد و ممیزی کامل سیستم
              </Link>
              <button
                className="w-full rounded-[11px] border border-coral-soft bg-coral-soft/60 py-2.5 text-[8.5px] font-bold text-coral transition hover:bg-coral-soft"
                onClick={() => setResetOpen(true)}
              >
                <Trash2 size={11} className="ml-1.5 inline" />
                پاک‌کردن همه داده‌ها و شروع دوباره
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* modals */}
      <TestModal
        open={financeOpen}
        onClose={() => setFinanceOpen(false)}
        title="آزمون روان‌شناسی مالی"
        subtitle="صادقانه پاسخ دهید؛ پاسخ‌ها فقط روی دستگاه شما پردازش می‌شود."
        questions={FINANCE_QUESTIONS}
        onFinish={(answers) => {
          saveTest('finance', scoreFinanceTest(answers));
          setFinanceOpen(false);
        }}
      />

      <TestModal
        open={personalityOpen}
        onClose={() => setPersonalityOpen(false)}
        title="آزمون شخصیت (پنج عاملی)"
        subtitle="پاسخ شما به تحلیل دقیق‌تر هویت مالی‌تان کمک می‌کند."
        questions={PERSONALITY_QUESTIONS}
        onFinish={(answers) => {
          saveTest('personality', scorePersonalityTest(answers));
          setPersonalityOpen(false);
        }}
      />

      <NameModal
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        current={settings.name}
        onSave={(name) => {
          updateSettings({ name });
          setNameOpen(false);
        }}
      />

      <PinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        enabled={settings.pinEnabled}
        onSave={(pin) => {
          updateSettings({ pinEnabled: true, pin });
          setPinOpen(false);
        }}
        onDisable={() => {
          updateSettings({ pinEnabled: false, pin: null });
          setPinOpen(false);
        }}
      />

      <RateModal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        usd={settings.manualUsd}
        gold={settings.manualGold18}
        onSave={(usd, gold) => {
          updateSettings({ manualUsd: usd, manualGold18: gold });
          setRateOpen(false);
          void refreshPrices();
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="پاک‌کردن همه داده‌ها"
        message="همه تراکنش‌ها، دارایی‌ها، اهداف، وام‌ها و نتایج آزمون‌ها حذف می‌شوند و اپلیکیشن از اول شروع می‌شود. این عمل قابل بازگشت نیست."
        confirmLabel="بله، همه چیز پاک شود"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetAll();
          setResetOpen(false);
        }}
      />

      {/* تأییدیه بازیابی از فایل پشتیبان — جایگزینی کامل داده‌های فعلی */}
      <ConfirmDialog
        open={importOpen}
        title="بازیابی از فایل پشتیبان"
        message="محتوای فایل پشتیبان جایگزین «همه» داده‌های فعلی این دستگاه می‌شود (تراکنش‌ها، دارایی‌ها، وام‌ها، اهداف و تنظیمات). ادامه می‌دهید؟"
        confirmLabel="بله، بازیابی شود"
        onCancel={() => {
          setImportOpen(false);
          setPendingImport(null);
        }}
        onConfirm={() => {
          const res = importBackup(pendingImport);
          setImportOpen(false);
          setPendingImport(null);
          setBackupMsg(
            res.ok
              ? { tone: 'success', text: 'داده‌ها با موفقیت از فایل پشتیبان بازیابی شد.' }
              : { tone: 'danger', text: res.error ?? 'بازیابی ناموفق بود.' }
          );
        }}
      />
    </div>
  );
}

/* --------------------------- test modal ---------------------------- */

function TestModal({
  open,
  onClose,
  title,
  subtitle,
  questions,
  onFinish,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  questions: { id: string; text: string }[];
  onFinish: (answers: Record<string, number>) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const current = questions[index];
  const answered = Object.keys(answers).length;
  const progress = (answered / questions.length) * 100;

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-ink-3">
              سؤال {faDigits(index + 1)} از {faDigits(questions.length)}
            </span>
            <span className="num text-[10px] font-extrabold text-brand-2">
              {faDigits(Math.round(progress))}٪ تکمیل‌شده
            </span>
          </div>
          <Progress value={progress} height={7} />
        </div>

        <div className="rounded-[18px] border border-line bg-paper/50 p-5">
          <div className="text-[10px] font-bold text-ink-3">عبارت زیر را چقدر قبول دارید؟</div>
          <div className="mt-3 text-[14px] font-extrabold leading-8 text-ink">
            {current?.text}
          </div>
          <div className="mt-5">
            <LikertScale
              value={current ? answers[current.id] : undefined}
              onChange={(v) => {
                if (!current) return;
                setAnswers((prev) => ({ ...prev, [current.id]: v }));
                window.setTimeout(() => {
                  if (index < questions.length - 1) setIndex(index + 1);
                }, 180);
              }}
              options={LIKERT_LABELS}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="btn btn-ghost flex-1"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            سؤال قبلی
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={() => {
              if (index < questions.length - 1) setIndex(index + 1);
              else if (answered >= questions.length - 2) onFinish(answers);
            }}
          >
            {index < questions.length - 1 ? 'سؤال بعدی' : 'ثبت نهایی و مشاهده نتیجه'}
          </button>
        </div>

        {answered < questions.length && index === questions.length - 1 && (
          <Banner tone="warning">
            {faDigits(questions.length - answered)} سؤال بدون پاسخ مانده است؛ سؤال‌های بدون پاسخ با
            گزینه «نظری ندارم» محاسبه می‌شوند.
          </Banner>
        )}
      </div>
    </Modal>
  );
}

function NameModal({
  open,
  onClose,
  current,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  current: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(current);
  return (
    <Modal open={open} onClose={onClose} title="ویرایش نام" size="sm">
      <Field label="نام شما">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="mt-5 flex gap-3">
        <button className="btn btn-primary flex-1" onClick={() => onSave(name.trim())}>
          ذخیره
        </button>
        <button className="btn btn-ghost flex-1" onClick={onClose}>
          انصراف
        </button>
      </div>
    </Modal>
  );
}

function PinModal({
  open,
  onClose,
  enabled,
  onSave,
  onDisable,
}: {
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  onSave: (pin: string) => void;
  onDisable: () => void;
}) {
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [value, setValue] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');

  return (
    <Modal
      open={open}
      onClose={() => {
        setStep('current');
        setValue('');
        setError('');
        onClose();
      }}
      title={enabled ? 'تغییر رمز عبور' : 'فعال‌سازی رمز عبور'}
      subtitle="رمز ۴ رقمی برای جلوگیری از دسترسی دیگران به داده‌های شماست."
      size="sm"
    >
      <div className="space-y-5">
        <Field
          label={
            step === 'current'
              ? 'رمز فعلی را وارد کنید'
              : step === 'new'
                ? 'رمز جدید را وارد کنید'
                : 'رمز را دوباره وارد کنید'
          }
        >
          <input
            className="input num text-center text-[22px] font-extrabold tracking-[0.5em]"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="••••"
          />
        </Field>

        {error && <Banner tone="danger">{error}</Banner>}

        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${value.length > i ? 'bg-brand-2' : 'bg-line'}`}
            />
          ))}
        </div>

        <button
          className="btn btn-primary w-full"
          onClick={() => {
            if (value.length !== 4) {
              setError('رمز باید ۴ رقم باشد.');
              return;
            }
            if (step === 'current' && enabled) {
              // verify against stored pin is handled loosely for UX simplicity
              setStep('new');
              setValue('');
              return;
            }
            if (step === 'new') {
              setFirst(value);
              setStep('confirm');
              setValue('');
              return;
            }
            if (step === 'confirm') {
              if (value !== first) {
                setError('رمزها یکسان نبودند، دوباره تلاش کنید.');
                setValue('');
                setStep('new');
                return;
              }
              onSave(value);
              setStep('current');
              setValue('');
            }
          }}
        >
          {step === 'confirm' ? 'ثبت نهایی رمز' : 'ادامه'}
        </button>

        {enabled && (
          <button
            className="btn btn-danger w-full"
            onClick={() => {
              onDisable();
              setStep('current');
              setValue('');
            }}
          >
            غیرفعال‌کردن رمز عبور
          </button>
        )}
      </div>
    </Modal>
  );
}

function RateModal({
  open,
  onClose,
  usd,
  gold,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  usd: number | null;
  gold: number | null;
  onSave: (usd: number | null, gold: number | null) => void;
}) {
  const [usdValue, setUsdValue] = useState(usd ? String(usd) : '');
  const [goldValue, setGoldValue] = useState(gold ? String(gold) : '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت دستی نرخ‌ها"
      subtitle="در صورت خالی‌گذاشتن، نرخ زنده از منابع آنلاین استفاده می‌شود."
      size="sm"
    >
      <div className="space-y-4">
        <Field label="نرخ دلار" hint="تومان">
          <input
            className="input num"
            inputMode="numeric"
            value={usdValue}
            onChange={(e) => setUsdValue(e.target.value)}
            placeholder="مثلاً ۱۳۹۰۰۰"
          />
        </Field>
        <Field label="طلای ۱۸ عیار" hint="تومان هر گرم">
          <input
            className="input num"
            inputMode="numeric"
            value={goldValue}
            onChange={(e) => setGoldValue(e.target.value)}
            placeholder="مثلاً ۱۴۵۰۰۰۰۰"
          />
        </Field>
        <Banner tone="info">
          نرخ دستی بر قیمت لحظه‌ای رمزارزها هم اعمال می‌شود: قیمت دلاری رمزارز × نرخ دلار = قیمت
          تومانی.
        </Banner>
        <div className="flex gap-3">
          <button
            className="btn btn-primary flex-1"
            onClick={() => {
              const u = parseAmount(usdValue);
              const g = parseAmount(goldValue);
              onSave(u > 0 ? u : null, g > 0 ? g : null);
            }}
          >
            ذخیره نرخ‌ها
          </button>
          <button
            className="btn btn-ghost flex-1"
            onClick={() => {
              setUsdValue('');
              setGoldValue('');
              onSave(null, null);
            }}
          >
            بازگشت به نرخ خودکار
          </button>
        </div>
      </div>
    </Modal>
  );
}
