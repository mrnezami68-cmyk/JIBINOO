import { Link } from 'react-router-dom';
import {
  Smartphone,
  Download,
  Code2,
  FolderTree,
  Terminal,
  Shield,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  Circle,
  Sparkles,
  Database,
  Wifi,
  Lock,
  Layers,
  GitBranch,
  AlertTriangle,
  Rocket,
  ChevronLeft,
  BookOpen,
  Settings2,
  FileBarChart,
  Wallet,
  Target,
  Landmark,
  User,
} from 'lucide-react';
import { SectionHeader, Banner } from '../components/ui';

/* ------------------------------------------------------------------ *
 * راهنما و ممیزی سیستم — Consultation & System Audit
 * ------------------------------------------------------------------ */

const INSTALL_STEPS = {
  android: [
    'مرورگر Chrome را روی گوشی باز کنید.',
    'آدرس اپلیکیشن جیبینو را وارد کنید و صفحه را باز کنید.',
    'روی منوی سه‌نقطه (⋮) در بالای مرورگر بزنید.',
    'گزینه «Add to Home screen» یا «Install app» را انتخاب کنید.',
    'در پنجره بازشده «Install» را بزنید.',
    'آیکون جیبینو روی صفحه اصلی ظاهر می‌شود و مانند یک اپلیکیشن مستقل باز می‌شود.',
  ],
  ios: [
    'حتماً از مرورگر Safari استفاده کنید (در iOS نصب PWA فقط از Safari ممکن است).',
    'آدرس اپلیکیشن جیبینو را در Safari باز کنید.',
    'دکمه Share (مربع با فلش رو به بالا) را در پایین صفحه بزنید.',
    'در منوی بازشده گزینه «Add to Home Screen» را پیدا و انتخاب کنید.',
    'در بالای پنجره «Add» را بزنید.',
    'آیکون جیبینو روی Home Screen ظاهر می‌شود.',
  ],
  desktop: [
    'در Chrome یا Edge، آدرس اپلیکیشن را باز کنید.',
    'آیکون نصب (فلش رو به پایین در یک قاب) را در نوار آدرس بزنید.',
    'یا از منوی مرورگر: More tools > Install page as app.',
    'نام اپلیکیشن را تأیید کنید تا به‌صورت یک پنجره مستقل نصب شود.',
  ],
};

const PROJECT_TREE = [
  { path: 'src/App.tsx', desc: 'مسیریابی اصلی، کنترل قفل و ورود' },
  { path: 'src/main.tsx', desc: 'نقطه ورود، ثبت Service Worker برای حالت آفلاین' },
  { path: 'src/index.css', desc: 'سیستم طراحی: رنگ‌ها، تایپوگرافی، کامپوننت‌های پایه' },
  { path: 'src/lib/types.ts', desc: 'مدل‌های داده (تراکنش، دارایی، وام، هدف، آزمون)' },
  { path: 'src/lib/format.ts', desc: 'اعداد فارسی، تاریخ شمسی، فرمت تومان' },
  { path: 'src/lib/prices.ts', desc: 'موتور قیمت لحظه‌ای با چند منبع و fallback' },
  { path: 'src/lib/analysis.ts', desc: 'محاسبات ارزش خالص دارایی، سلامت مالی، بینش‌ها' },
  { path: 'src/lib/tests.ts', desc: 'موتور آزمون‌های روان‌شناسی مالی و شخصیت' },
  { path: 'src/lib/store.tsx', desc: 'وضعیت سراسری + ذخیره‌سازی محلی (localStorage)' },
  { path: 'src/components/Layout.tsx', desc: 'چارچوب اپ: منوها، هدر، ناوبری موبایل و دسکتاپ' },
  { path: 'src/components/ui.tsx', desc: 'دکمه‌ها، مودال‌ها، فیلدها، بنرها' },
  { path: 'src/components/charts.tsx', desc: 'نمودارهای SVG سفارشی (دونات، ستونی، حلقه، اسپارک‌لاین)' },
  { path: 'src/pages/', desc: '۹ صفحه اصلی: داشبورد، تراکنش‌ها، دارایی‌ها، گزارش‌ها، اهداف، وام‌ها، پروفایل، ورود، قفل' },
  { path: 'public/manifest.webmanifest', desc: 'مانیفست PWA برای نصب روی موبایل و دسکتاپ' },
  { path: 'public/sw.js', desc: 'Service Worker: کش آفلاین، به‌روزرسانی خودکار' },
];

const STRENGTHS = [
  {
    icon: <Layers size={19} />,
    title: 'یکپارچگی کامل فاز ۱ و فاز ۲',
    desc: 'تمام ویژگی‌های نسخه قبلی (تراکنش، دارایی، وام، هدف، آزمون، امنیت) بدون حذف یا تغییر حفظ شده و قابلیت‌های فاز ۲ (قیمت لحظه‌ای، داشبورد جامع، گزارش‌های هوشمند) روی آن سوار شده است.',
  },
  {
    icon: <TrendingUp size={19} />,
    title: 'دقت محاسبات مالی',
    desc: 'سرمایه‌گذاری، انتقال به هدف و پرداخت قسط به‌صورت ساختاری از «هزینه» تفکیک شده‌اند. نرخ پس‌انداز، جریان نقدی خالص و نرخ سرمایه‌گذاری هرکدام فرمول مستقل و شفاف دارند.',
  },
  {
    icon: <Wifi size={19} />,
    title: 'موتور قیمت چندمنبعه',
    desc: 'قیمت رمزارز از CoinGecko، نرخ ارز از مرجع جهانی، طلا از اونس جهانی محاسبه می‌شود. در صورت قطعی شبکه، آخرین نرخ ذخیره‌شده یا نرخ دستی کاربر جایگزین می‌شود — هیچ‌وقت صفحه خالی نمی‌ماند.',
  },
  {
    icon: <Lock size={19} />,
    title: 'حریم خصوصی محلی',
    desc: 'هیچ داده‌ای به سرور ارسال نمی‌شود. همه اطلاعات در localStorage مرورگر کاربر ذخیره می‌شود. رمز عبور ۴ رقمی و قفل بیومتریک از دسترسی دیگران جلوگیری می‌کند.',
  },
  {
    icon: <Download size={19} />,
    title: 'PWA کامل و قابل نصب',
    desc: 'مانیفست + Service Worker + کش آفلاین. اپلیکیشن روی اندروید، iOS و دسکتاپ قابل نصب است و بدون اینترنت هم (با داده‌های ذخیره‌شده) باز می‌شود.',
  },
  {
    icon: <Sparkles size={19} />,
    title: 'تحلیل هوشمند رفتار مالی',
    desc: 'دو آزمون روان‌شناسی (۴۴ سؤال، ۱۱ بعد) + تحلیل رفتار واقعی ثبت‌شده در دفتر تراکنش‌ها → تولید هویت مالی، نقاط قوت، ریسک‌ها و توصیه‌های شخصی‌سازی‌شده.',
  },
  {
    icon: <Code2 size={19} />,
    title: 'کد تمیز و نوع‌امن',
    desc: 'TypeScript در حالت strict، جداسازی لایه‌ها (presentation / state / analysis / data)، کامپوننت‌های قابل استفاده مجدد و نمودارهای SVG بدون وابستگی سنگین.',
  },
  {
    icon: <Smartphone size={19} />,
    title: 'طراحی واکنش‌گرا و نرم',
    desc: 'سیستم طراحی یکپارچه (کاغذ گرم، زمردی نرم، گوشه‌های بزرگ، سایه‌های لطیف). ناوبری موبایل/دسکتاپ مجزا، مودال‌های portal-محور با نوار اقدام چسبان.',
  },
];

const WEAKNESSES = [
  {
    severity: 'high',
    title: 'نبود پشتیبان‌گیری / بازیابی داده',
    desc: 'چون داده‌ها فقط در localStorage است، پاک‌شدن داده مرورگر یا تعویض گوشی یعنی از‌دست‌رفتن همه اطلاعات. مهم‌ترین قابلیتی که باید بعداً اضافه شود.',
    fix: 'افزودن خروجی/ورودی JSON (Export / Import) در بخش تنظیمات.',
  },
  {
    severity: 'high',
    title: 'نبود یادآوری و اعلان',
    desc: 'سررسید اقساط، موعد اهداف و یادآور ثبت تراکنش اعلانی دریافت نمی‌کند. کاربر باید خودش هر روز اپ را باز کند.',
    fix: 'استفاده از Notification API + یادآورهای زمان‌بندی‌شده داخل اپ.',
  },
  {
    severity: 'medium',
    title: 'رمز عبور بدون هش',
    desc: 'رمز ۴ رقمی به‌صورت متن ساده در localStorage ذخیره می‌شود. چون داده‌ها محلی‌اند ریسک پایین است، اما استاندارد نیست.',
    fix: 'هش‌کردن رمز (SHA-256) قبل از ذخیره‌سازی.',
  },
  {
    severity: 'medium',
    title: 'وابستگی به یک منبع نرخ ارز',
    desc: 'نرخ دلار از یک API رایگان دریافت می‌شود؛ محدودیت نرخ درخواست (rate limit) ممکن است باعث تأخیر شود.',
    fix: 'افزودن منبع دوم + کش طولانی‌تر + صف درخواست هوشمند.',
  },
  {
    severity: 'medium',
    title: 'نبود تراکنش تکرارشونده',
    desc: 'حقوق ماهانه، اجاره و اقساط باید هر ماه دستی ثبت شوند.',
    fix: 'تعریف تراکنش خودکار ماهانه با امکان ویرایش/تأیید.',
  },
  {
    severity: 'low',
    title: 'نبود خروجی CSV از گزارش‌ها',
    desc: 'کاربر نمی‌تواند گزارش‌ها را برای حسابدار یا تحلیل در اکسل خروجی بگیرد.',
    fix: 'دکمه خروجی CSV/Excel در صفحه گزارش‌ها.',
  },
  {
    severity: 'low',
    title: 'نبود تست خودکار',
    desc: 'پروژه تست واحد (unit test) یا تست سرتاسری (e2e) ندارد؛ تغییرات آینده ممکن است باگ پنهان ایجاد کند.',
    fix: 'افزودن Vitest برای توابع محاسباتی (analysis, format, prices).',
  },
  {
    severity: 'low',
    title: 'حجم اولیه باندل',
    desc: 'خروجی JS حدود ۶۵۰ کیلوبایت است (عمدتاً React + Framer Motion). روی اینترنت ضعیف ممکن است کند باشد.',
    fix: 'کد اسپلیتینگ (dynamic import) برای صفحات سنگین مثل آزمون‌ها.',
  },
];

const ROADMAP = [
  { priority: 1, effort: 'کم', title: 'خروجی و ورودی داده (JSON Backup)', impact: 'بسیار بالا' },
  { priority: 2, effort: 'کم', title: 'یادآور سررسید اقساط و اهداف', impact: 'بالا' },
  { priority: 3, effort: 'کم', title: 'خروجی CSV از گزارش‌ها', impact: 'بالا' },
  { priority: 4, effort: 'متوسط', title: 'تراکنش‌های تکرارشونده ماهانه', impact: 'بالا' },
  { priority: 5, effort: 'متوسط', title: 'هش‌کردن رمز عبور + WebAuthn', impact: 'متوسط' },
  { priority: 6, effort: 'متوسط', title: 'بودجه‌بندی ماهانه برای هر دسته + هشدار', impact: 'بالا' },
  { priority: 7, effort: 'متوسط', title: 'منبع دوم نرخ ارز + کش هوشمند', impact: 'متوسط' },
  { priority: 8, effort: 'زیاد', title: 'همگام‌سازی ابری اختیاری (رمزنگاری‌شده)', impact: 'بسیار بالا' },
  { priority: 9, effort: 'زیاد', title: 'پشتیبانی چندارزی (دلار/یورو مبنای گزارش)', impact: 'متوسط' },
  { priority: 10, effort: 'زیاد', title: 'ویجت صفحه اصلی + افزودن سریع', impact: 'متوسط' },
];

const PHASE2_CHECKLIST = [
  'اتصال به CoinGecko برای قیمت لحظه‌ای رمزارزها',
  'دریافت نرخ لحظه‌ای دلار و محاسبه طلای ۱۸ عیار از اونس جهانی',
  'منطق تبدیل دلار به ریال/تومان برای رمزارز (قیمت دلاری × نرخ دلار)',
  'محاسبه ارزش لحظه‌ای دارایی‌ها به‌صورت خودکار',
  'داشبورد جامع با ارزش خالص دارایی، ترکیب سبد و جریان نقدی',
  'نمودارهای بصری بیشتر (دونات، ستونی، روند، حلقه پیشرفت)',
  'فیلترهای هوشمند گزارش (بازه زمانی، دسته، نوع تراکنش)',
  'دقت محاسبات گزارش‌ها در تفکیک سرمایه‌گذاری از هزینه',
  'ساختار کامل نسخه قبلی بدون حذف هیچ قابلیتی',
  'تبدیل کامل به PWA قابل نصب (مانیفست + Service Worker + کش آفلاین)',
];

function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: 'اولویت بالا', cls: 'bg-coral-soft text-coral' },
    medium: { label: 'اولویت متوسط', cls: 'bg-gold-soft text-gold' },
    low: { label: 'اولویت پایین', cls: 'bg-sky-soft text-sky' },
  };
  const s = map[level] ?? map.low;
  return (
    <span className={`rounded-full px-2.5 py-1 text-[8.5px] font-bold ${s.cls}`}>{s.label}</span>
  );
}

export function Guide() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="راهنما و ممیزی سیستم جیبینو"
        subtitle="راهنمای نصب روی گوشی، دسترسی به سورس کد، و ارزیابی کامل معماری، نقاط قوت، ضعف‌ها و نقشه راه بهبود."
      />

      <Banner tone="success">
        <strong>وضعیت فعلی:</strong> فاز دوم (تحلیل دارایی و گزارش‌ها) به‌طور کامل پیاده‌سازی
        شده است. اپلیکیشن به‌صورت PWA قابل نصب روی اندروید، iOS و دسکتاپ است و تمام ویژگی‌های
        نسخه قبلی بدون تغییر حفظ شده‌اند.
      </Banner>

      {/* ---------------------- installation ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-brand-soft text-brand-2">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">نصب اپلیکیشن روی گوشی</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              جیبینو یک PWA است — نیازی به Google Play یا App Store ندارد و مستقیم از مرورگر نصب
              می‌شود.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-brand-soft text-brand-2">
                <Smartphone size={18} />
              </div>
              <h3 className="text-[13px] font-extrabold text-ink">اندروید (Chrome)</h3>
            </div>
            <ol className="mt-4 space-y-2.5">
              {INSTALL_STEPS.android.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-2 text-[9px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[10.5px] leading-5.5 text-ink-2">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-violet-soft text-violet">
                <Smartphone size={18} />
              </div>
              <h3 className="text-[13px] font-extrabold text-ink">آیفون (Safari)</h3>
            </div>
            <ol className="mt-4 space-y-2.5">
              {INSTALL_STEPS.ios.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet text-[9px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[10.5px] leading-5.5 text-ink-2">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4">
              <Banner tone="info">
                در iOS حتماً باید از Safari استفاده کنید. اگر لینک را در Chrome یا اینستاگرام
                باز کرده‌اید، ابتدا «Open in Safari» را بزنید.
              </Banner>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-sky-soft text-sky">
                <Download size={18} />
              </div>
              <h3 className="text-[13px] font-extrabold text-ink">دسکتاپ</h3>
            </div>
            <ol className="mt-4 space-y-2.5">
              {INSTALL_STEPS.desktop.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky text-[9px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[10.5px] leading-5.5 text-ink-2">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 space-y-2">
              <div className="rounded-[13px] border border-line bg-paper/50 p-3">
                <div className="text-[9px] font-bold text-ink-3">مزایای نصب PWA</div>
                <ul className="mt-2 space-y-1.5">
                  {[
                    'اجرای مستقل بدون نوار مرورگر',
                    'دسترسی سریع از صفحه اصلی',
                    'کارکرد آفلاین با داده‌های ذخیره‌شده',
                    'به‌روزرسانی خودکار بدون نیاز به نصب مجدد',
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[9px] leading-4.5 text-ink-2">
                      <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-brand-2" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------- source code ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-violet-soft text-violet">
            <Code2 size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">سورس کد و ساختار پروژه</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              پروژه با Vite + React 19 + TypeScript + Tailwind CSS v4 ساخته شده است.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <FolderTree size={18} className="text-brand-2" />
              <h3 className="text-[13px] font-extrabold text-ink">ساختار فایل‌ها</h3>
            </div>
            <div className="mt-4 space-y-1.5">
              {PROJECT_TREE.map((f) => (
                <div
                  key={f.path}
                  className="flex items-start justify-between gap-3 rounded-[11px] border border-line/70 bg-paper/40 px-3 py-2"
                >
                  <code className="text-[9px] font-bold text-brand-2" dir="ltr">
                    {f.path}
                  </code>
                  <span className="text-left text-[8.5px] leading-4 text-ink-3">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-2.5">
                <Terminal size={18} className="text-brand-2" />
                <h3 className="text-[13px] font-extrabold text-ink">دستورات اجرا و ساخت</h3>
              </div>
              <div className="mt-4 space-y-2.5" dir="ltr">
                {[
                  { cmd: 'npm install', desc: 'Install dependencies' },
                  { cmd: 'npm run dev', desc: 'Start dev server (localhost:5173)' },
                  { cmd: 'npm run build', desc: 'Type-check + production build → /dist' },
                  { cmd: 'npm run preview', desc: 'Preview the production build locally' },
                ].map((c) => (
                  <div
                    key={c.cmd}
                    className="flex items-center justify-between gap-3 rounded-[11px] border border-line bg-[#1d2b25] px-3.5 py-2.5"
                  >
                    <code className="text-[10px] font-bold text-[#7fd0ab]">$ {c.cmd}</code>
                    <span className="text-[8px] text-white/50">{c.desc}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Banner tone="info">
                  خروجی نهایی در پوشه <code className="font-bold" dir="ltr">/dist</code> قرار
                  می‌گیرد. این فایل‌ها را می‌توانید روی هر هاست استاتیک (Vercel, Netlify,
                  GitHub Pages) یا هاست شخصی آپلود کنید.
                </Banner>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2.5">
                <GitBranch size={18} className="text-violet" />
                <h3 className="text-[13px] font-extrabold text-ink">مراحل انتشار تغییرات</h3>
              </div>
              <ol className="mt-4 space-y-2.5">
                {[
                  'فایل موردنظر را در src/ ویرایش کنید.',
                  'npm run build را اجرا کنید تا از صحت TypeScript مطمئن شوید.',
                  'npm run preview را اجرا و تغییر را در مرورگر تست کنید.',
                  'فایل‌های /dist را روی هاست آپلود کنید (جایگزینی کامل).',
                  'در گوشی، اپلیکیشن نصب‌شده را یک‌بار ببندید و دوباره باز کنید تا کش به‌روز شود.',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet/15 text-[9px] font-bold text-violet">
                      {i + 1}
                    </span>
                    <span className="text-[10px] leading-5 text-ink-2">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------- architecture audit ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gold-soft text-gold">
            <FileBarChart size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">ممیزی معماری و یکپارچگی سیستم</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              ارزیابی ارتباط اجزا، جریان داده و هماهنگی میان لایه‌های مختلف
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Layers size={19} />,
              label: 'لایه نمایش',
              items: ['React 19 + TypeScript', 'Tailwind CSS v4', 'Framer Motion', 'نمودارهای SVG سفارشی'],
              color: 'bg-brand-soft text-brand-2',
            },
            {
              icon: <Database size={19} />,
              label: 'لایه وضعیت و ذخیره‌سازی',
              items: ['React Context', 'localStorage', 'بازیابی خودکار هنگام بوت', 'همگام‌سازی لحظه‌ای UI'],
              color: 'bg-violet-soft text-violet',
            },
            {
              icon: <Wifi size={19} />,
              label: 'لایه داده خارجی',
              items: ['CoinGecko (رمزارز)', 'مرجع نرخ ارز', 'Fallback چندلایه', 'کش + نرخ دستی کاربر'],
              color: 'bg-sky-soft text-sky',
            },
            {
              icon: <Settings2 size={19} />,
              label: 'لایه تحلیل',
              items: ['توابع خالص (pure)', 'محاسبه ارزش خالص دارایی', 'امتیازهای سلامت مالی', 'موتور بینش هوشمند'],
              color: 'bg-gold-soft text-gold',
            },
          ].map((l) => (
            <div key={l.label} className="card p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${l.color}`}>
                {l.icon}
              </div>
              <h3 className="mt-3.5 text-[12px] font-extrabold text-ink">{l.label}</h3>
              <ul className="mt-2.5 space-y-1.5">
                {l.items.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[9px] leading-4.5 text-ink-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-line-2" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="card mt-4 p-5 sm:p-6">
          <h3 className="text-[13px] font-extrabold text-ink">جریان داده در سیستم</h3>
          <p className="mt-1 text-[10px] text-ink-3">
            مسیر کامل یک تراکنش از لحظه ثبت تا نمایش در گزارش‌ها
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {[
              'ورودی کاربر (فرم)',
              'اعتبارسنجی مبلغ و موجودی',
              'ذخیره در Context',
              'به‌روزرسانی موجودی نقد',
              'نوشتن در localStorage',
              'بازمحاسبه مشتقات',
              'رندر داشبورد و گزارش‌ها',
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2.5">
                <div className="rounded-[11px] border border-line bg-paper/50 px-3 py-2 text-[9px] font-bold text-ink-2">
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <ChevronLeft size={13} className="shrink-0 text-line-2" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[13px] border border-brand-soft-2 bg-brand-soft/50 p-3.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-2">
                <ShieldCheck size={12} /> انسجام محاسباتی
              </div>
              <p className="mt-1.5 text-[8.5px] leading-4.5 text-ink-2">
                همه توابع محاسباتی (analysis.ts) خالص هستند و از یک منبع داده واحد (Context)
                تغذیه می‌شوند — تناقض عددی بین صفحات وجود ندارد.
              </p>
            </div>
            <div className="rounded-[13px] border border-brand-soft-2 bg-brand-soft/50 p-3.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-2">
                <ShieldCheck size={12} /> انسجام رابط کاربری
              </div>
              <p className="mt-1.5 text-[8.5px] leading-4.5 text-ink-2">
                سیستم طراحی متمرکز (index.css) + کامپوننت‌های مشترک (ui.tsx) باعث شده رنگ،
                فاصله، تایپوگرافی و رفتار مودال‌ها در همه صفحات یکسان باشد.
              </p>
            </div>
            <div className="rounded-[13px] border border-brand-soft-2 bg-brand-soft/50 p-3.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-2">
                <ShieldCheck size={12} /> انسجام داده
              </div>
              <p className="mt-1.5 text-[8.5px] leading-4.5 text-ink-2">
                مدل داده واحد (types.ts) بین همه بخش‌ها مشترک است؛ تراکنش، دارایی، وام و هدف
                همگی به موجودی نقد و گزارش‌ها متصل‌اند.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------- strengths ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-brand-soft text-brand-2">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">نقاط قوت سیستم</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">۸ قوت کلیدی شناسایی‌شده در ممیزی</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {STRENGTHS.map((s, i) => (
            <div key={i} className="card flex items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-brand-soft text-brand-2">
                {s.icon}
              </div>
              <div>
                <h3 className="text-[12px] font-extrabold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[9.5px] leading-5.5 text-ink-2">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------- weaknesses ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-coral-soft text-coral">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">نقاط ضعف و ریسک‌ها</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              ۸ مورد شناسایی‌شده به همراه راه‌حل پیشنهادی برای هرکدام
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {WEAKNESSES.map((w, i) => (
            <div key={i} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-paper-2 text-ink-2">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h3 className="text-[11.5px] font-extrabold text-ink">{w.title}</h3>
                    <p className="mt-1.5 max-w-[640px] text-[9.5px] leading-5.5 text-ink-2">
                      {w.desc}
                    </p>
                  </div>
                </div>
                <SeverityBadge level={w.severity} />
              </div>
              <div className="mt-3.5 flex items-start gap-2 rounded-[12px] border border-brand-soft-2 bg-brand-soft/40 px-3.5 py-2.5">
                <Rocket size={13} className="mt-0.5 shrink-0 text-brand-2" />
                <div className="text-[9px] font-semibold leading-4.5 text-brand-2">
                  <strong>راه‌حل پیشنهادی:</strong> {w.fix}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------- roadmap ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-sky-soft text-sky">
            <Rocket size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">نقشه راه بهبود (اولویت‌بندی‌شده)</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              ۱۰ پیشنهاد بهبود مرتب‌شده بر اساس اولویت، تأثیر و میزان تلاش
            </p>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-right">
              <thead>
                <tr className="border-b border-line bg-paper/50 text-[9px] font-bold text-ink-3">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">پیشنهاد</th>
                  <th className="px-4 py-3">میزان تأثیر</th>
                  <th className="px-4 py-3">میزان تلاش</th>
                </tr>
              </thead>
              <tbody>
                {ROADMAP.map((r) => (
                  <tr key={r.priority} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[9px] font-bold text-brand-2">
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-bold text-ink">{r.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${
                          r.impact === 'بسیار بالا'
                            ? 'bg-brand-soft text-brand-2'
                            : r.impact === 'بالا'
                              ? 'bg-sky-soft text-sky'
                              : 'bg-paper-2 text-ink-2'
                        }`}
                      >
                        {r.impact}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${
                          r.effort === 'کم'
                            ? 'bg-brand-soft text-brand-2'
                            : r.effort === 'متوسط'
                              ? 'bg-gold-soft text-gold'
                              : 'bg-coral-soft text-coral'
                        }`}
                      >
                        {r.effort}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------------- phase 2 checklist ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-brand-soft text-brand-2">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">تأییدیه اجرای فاز دوم</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              چک‌لیست کامل مطابق سند چشم‌انداز پروژه — همه موارد اجرا شده‌اند
            </p>
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PHASE2_CHECKLIST.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-[13px] border border-brand-soft-2 bg-brand-soft/40 px-3.5 py-3"
              >
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-2" />
                <span className="text-[9.5px] font-semibold leading-5 text-ink-2">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------- quick links ---------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-violet-soft text-violet">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">دسترسی سریع به بخش‌ها</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              برای بررسی عملکرد هر بخش، مستقیماً به آن بروید
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/', icon: <Wallet size={18} />, title: 'داشبورد', desc: 'ارزش خالص دارایی، قیمت لحظه‌ای، جریان نقدی' },
            { to: '/transactions', icon: <FileBarChart size={18} />, title: 'تراکنش‌ها', desc: 'ثبت درآمد، هزینه، سرمایه‌گذاری و فیلترها' },
            { to: '/assets', icon: <TrendingUp size={18} />, title: 'دارایی‌ها', desc: 'طلا، ارز، رمزارز با ارزش لحظه‌ای' },
            { to: '/reports', icon: <FileBarChart size={18} />, title: 'گزارش‌ها', desc: 'نمودارها، فیلترهای هوشمند، تفکیک دقیق' },
            { to: '/goals', icon: <Target size={18} />, title: 'اهداف مالی', desc: 'ساخت هدف، انتقال پول، پیگیری پیشرفت' },
            { to: '/loans', icon: <Landmark size={18} />, title: 'وام‌ها', desc: 'ثبت وام، پرداخت قسط، تاریخچه' },
            { to: '/profile', icon: <User size={18} />, title: 'پروفایل', desc: 'آزمون‌ها، سلامت مالی، تنظیمات امنیت' },
            { to: '/guide', icon: <BookOpen size={18} />, title: 'راهنما و ممیزی', desc: 'همین صفحه — نصب، سورس، ارزیابی' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="card group flex items-center gap-3.5 p-4 transition-all hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-soft text-brand-2">
                {l.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold text-ink">{l.title}</div>
                <div className="mt-0.5 truncate text-[8.5px] font-medium text-ink-3">{l.desc}</div>
              </div>
              <ChevronLeft
                size={15}
                className="shrink-0 text-ink-3 transition group-hover:-translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      </section>

      <div className="flex items-start gap-2.5 rounded-[15px] border border-line bg-paper/50 px-4 py-3.5">
        <Circle size={11} className="mt-1 shrink-0 text-brand-2" />
        <p className="text-[9px] font-medium leading-5 text-ink-2">
          این صفحه بخشی از خود اپلیکیشن است و همیشه در دسترس خواهد بود. برای اعمال هر تغییر،
          کافی است فایل مربوطه را ویرایش و مراحل ساخت و انتشار را (که در بخش سورس کد توضیح داده
          شد) دنبال کنید.
        </p>
      </div>
    </div>
  );
}
