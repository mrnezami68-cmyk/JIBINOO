/* ------------------------------------------------------------------ *
 * Financial psychology & personality (Big Five) test engine
 * ------------------------------------------------------------------ */

import type { TestDimension, TestResult } from './types';
import { todayISO, faDigits } from './format';

export type Likert = 1 | 2 | 3 | 4 | 5;

export interface Question {
  id: string;
  text: string;
  /** which dimension this question feeds */
  dim: string;
  /** true => agreement raises the dimension score */
  positive: boolean;
}

export const LIKERT_LABELS: { value: Likert; label: string }[] = [
  { value: 1, label: 'کاملاً مخالفم' },
  { value: 2, label: 'مخالفم' },
  { value: 3, label: 'نظری ندارم' },
  { value: 4, label: 'موافقم' },
  { value: 5, label: 'کاملاً موافقم' },
];

/* --------------------- financial psychology ------------------------- */

export const FINANCE_DIMENSIONS: { key: string; label: string; desc: string }[] = [
  {
    key: 'discipline',
    label: 'انضباط و برنامه‌ریزی',
    desc: 'میزان ثبت، برنامه‌ریزی و پایبندی شما به چارچوب مالی',
  },
  {
    key: 'impulse',
    label: 'تکانشگری خرید',
    desc: 'گرایش به خریدهای آنی و بدون برنامه',
  },
  {
    key: 'anxiety',
    label: 'اضطراب مالی',
    desc: 'میزان نگرانی و اجتناب شما از مواجهه با پول',
  },
  {
    key: 'risk',
    label: 'ریسک‌پذیری',
    desc: 'تحمل نوسان و ریسک در تصمیم‌های سرمایه‌گذاری',
  },
  {
    key: 'future',
    label: 'آینده‌نگری',
    desc: 'اولویت دادن به رفاه آینده بر لذت امروز',
  },
  {
    key: 'status',
    label: 'خرج نمایشی',
    desc: 'اهمیت ظاهر، برند و دیدگاه دیگران در خرج‌کردن',
  },
];

export const FINANCE_QUESTIONS: Question[] = [
  // discipline
  { id: 'f1', text: 'برای هزینه‌های هر ماه از قبل برنامه مشخصی دارم.', dim: 'discipline', positive: true },
  { id: 'f2', text: 'تراکنش‌هایم را مرتب ثبت و مرور می‌کنم.', dim: 'discipline', positive: true },
  { id: 'f3', text: 'پیش از خریدهای بزرگ، چند روز فکر می‌کنم.', dim: 'discipline', positive: true },
  { id: 'f4', text: 'اغلب بدون اینکه دقیق بدانم پولم کجا می‌رود، خرج می‌کنم.', dim: 'discipline', positive: false },
  // impulse
  { id: 'f5', text: 'وقتی چیزی را می‌خواهم، معمولاً همان لحظه می‌خرم.', dim: 'impulse', positive: true },
  { id: 'f6', text: 'تخفیف‌ها من را به خریدهای برنامه‌ریزی‌نشده می‌کشانند.', dim: 'impulse', positive: true },
  { id: 'f7', text: 'گاهی برای تغییر حال‌وهوا خرید می‌کنم.', dim: 'impulse', positive: true },
  { id: 'f8', text: 'خریدهای غیرضروری‌ام را می‌توانم به‌راحتی عقب بیندازم.', dim: 'impulse', positive: false },
  // anxiety
  { id: 'f9', text: 'فکر کردن به وضعیت مالی‌ام مضطربم می‌کند.', dim: 'anxiety', positive: true },
  { id: 'f10', text: 'از چک کردن موجودی حسابم طفره می‌روم.', dim: 'anxiety', positive: true },
  { id: 'f11', text: 'نگرانم پولم برای آینده کافی نباشد.', dim: 'anxiety', positive: true },
  { id: 'f12', text: 'مواجهه با اعداد و ارقام مالی برایم راحت است.', dim: 'anxiety', positive: false },
  // risk
  { id: 'f13', text: 'برای سود بیشتر، پذیرفتن ضرر احتمالی برایم قابل قبول است.', dim: 'risk', positive: true },
  { id: 'f14', text: 'سرمایه‌گذاری در دارایی‌های پرنوسان برایم هیجان‌انگیز است.', dim: 'risk', positive: true },
  { id: 'f15', text: 'ترجیح می‌دهم پولم جای مطمئن باشد، حتی با سود کمتر.', dim: 'risk', positive: false },
  { id: 'f16', text: 'وقتی ارزش سرمایه‌گذاری‌ام افت می‌کند، آرامش خودم را حفظ می‌کنم.', dim: 'risk', positive: true },
  // future
  { id: 'f17', text: 'بخشی از هر درآمد را برای آینده کنار می‌گذارم.', dim: 'future', positive: true },
  { id: 'f18', text: 'داشتن هدف مالی مشخص به من انگیزه می‌دهد.', dim: 'future', positive: true },
  { id: 'f19', text: 'حاضردم لذت امروز را برای رفاه فردا به تعویق بیندازم.', dim: 'future', positive: true },
  { id: 'f20', text: 'بیشتر برای امروز زندگی می‌کنم و به برنامه بلندمدت مالی اعتقادی ندارم.', dim: 'future', positive: false },
  // status
  { id: 'f21', text: 'برایم مهم است دیگران برند و کیفیت وسایلم را ببینند.', dim: 'status', positive: true },
  { id: 'f22', text: 'گاهی برای هم‌قدمی با اطرافیان، بیش از توانم خرج می‌کنم.', dim: 'status', positive: true },
  { id: 'f23', text: 'خرج کردن برای ظاهر، بخشی از سبک زندگی من است.', dim: 'status', positive: true },
  { id: 'f24', text: 'نظر دیگران درباره وسایلم تأثیری روی خریدهایم ندارد.', dim: 'status', positive: false },
];

/* ------------------------ personality (Big Five) -------------------- */

export const PERSONALITY_DIMENSIONS: { key: string; label: string; desc: string }[] = [
  {
    key: 'openness',
    label: 'گشودگی به تجربه',
    desc: 'کنجکاوی، پذیرش ایده‌های نو و علاقه به بازارهای تازه',
  },
  {
    key: 'conscientiousness',
    label: 'وظیفه‌شناسی',
    desc: 'نظم، انضباط و پایبندی به برنامه',
  },
  {
    key: 'extraversion',
    label: 'برون‌گرایی',
    desc: 'انرژی اجتماعی، مهمانی، سفر و خرج‌های جمعی',
  },
  {
    key: 'agreeableness',
    label: 'سازگاری',
    desc: 'همدلی، سخاوت و سخت‌گیری کمتر در مذاکره مالی',
  },
  {
    key: 'neuroticism',
    label: 'روان‌رنجوری',
    desc: 'حساسیت هیجانی، اضطراب و واکنش به نوسان',
  },
];

export const PERSONALITY_QUESTIONS: Question[] = [
  // openness
  { id: 'p1', text: 'ایده‌ها و تجربه‌های نو هیجان‌زده‌ام می‌کنند.', dim: 'openness', positive: true },
  { id: 'p2', text: 'به ابزارها و بازارهای مالی جدید علاقه دارم.', dim: 'openness', positive: true },
  { id: 'p3', text: 'ترجیح می‌دهم کارها را به همان روش همیشگی انجام دهم.', dim: 'openness', positive: false },
  { id: 'p4', text: 'یادگیری مهارت تازه برایم لذت‌بخش است.', dim: 'openness', positive: true },
  // conscientiousness
  { id: 'p5', text: 'کارهایم را با برنامه و نظم پیش می‌برم.', dim: 'conscientiousness', positive: true },
  { id: 'p6', text: 'اهدافم را می‌نویسم و پیشرفتشان را دنبال می‌کنم.', dim: 'conscientiousness', positive: true },
  { id: 'p7', text: 'اغلب کارهای مهم را به لحظه‌های آخر موکول می‌کنم.', dim: 'conscientiousness', positive: false },
  { id: 'p8', text: 'قولی که به خودم می‌دهم را جدی می‌گیرم.', dim: 'conscientiousness', positive: true },
  // extraversion
  { id: 'p9', text: 'از بودن در جمع و مهمانی‌ها انرژی می‌گیرم.', dim: 'extraversion', positive: true },
  { id: 'p10', text: 'سفر و تفریح‌های اجتماعی سهم بزرگی از هزینه‌هایم دارد.', dim: 'extraversion', positive: true },
  { id: 'p11', text: 'تنهایی و فضای آرام را به جمع‌های شلوغ ترجیح می‌دهم.', dim: 'extraversion', positive: false },
  { id: 'p12', text: 'به‌راحتی با آدم‌های جدید ارتباط می‌گیرم.', dim: 'extraversion', positive: true },
  // agreeableness
  { id: 'p13', text: 'در برابر نیاز دیگران، به‌سختی می‌توانم «نه» بگویم.', dim: 'agreeableness', positive: true },
  { id: 'p14', text: 'معمولاً در مذاکره و چانه‌زنی موفق عمل می‌کنم.', dim: 'agreeableness', positive: false },
  { id: 'p15', text: 'کمک به دیگران برایم از منفعت شخصی مهم‌تر است.', dim: 'agreeableness', positive: true },
  { id: 'p16', text: 'سعی می‌کنم در تصمیم‌ها جانب انصاف را نگه دارم.', dim: 'agreeableness', positive: true },
  // neuroticism
  { id: 'p17', text: 'در برابر اتفاقات غیرمنتظره، به‌سرعت مضطرب می‌شوم.', dim: 'neuroticism', positive: true },
  { id: 'p18', text: 'نوسان‌ها و مشکلات، مدت‌ها ذهنم را درگیر نگه می‌دارند.', dim: 'neuroticism', positive: true },
  { id: 'p19', text: 'در شرایط فشار، آرامش خودم را حفظ می‌کنم.', dim: 'neuroticism', positive: false },
  { id: 'p20', text: 'بیشتر روزها حس خوب و باثباتی دارم.', dim: 'neuroticism', positive: false },
];

/* ------------------------------ scoring ----------------------------- */

function scoreDimensions(
  questions: Question[],
  answers: Record<string, number>,
  meta: { key: string; label: string; desc: string }[]
): TestDimension[] {
  return meta.map((m) => {
    const qs = questions.filter((q) => q.dim === m.key);
    if (!qs.length) return { key: m.key, label: m.label, score: 50, note: m.desc };
    let raw = 0;
    let max = 0;
    qs.forEach((q) => {
      const a = Number(answers[q.id] ?? 3);
      raw += q.positive ? a : 6 - a;
      max += 5;
    });
    const score = Math.round(((raw - qs.length) / (max - qs.length)) * 100);
    return {
      key: m.key,
      label: m.label,
      score: Math.max(0, Math.min(100, score)),
      note: m.desc,
    };
  });
}

function band(score: number): 'high' | 'mid' | 'low' {
  if (score >= 65) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

/* -------------------- financial psychology result ------------------- */

export function scoreFinanceTest(answers: Record<string, number>): TestResult {
  const dimensions = scoreDimensions(FINANCE_QUESTIONS, answers, FINANCE_DIMENSIONS);
  const get = (k: string) => dimensions.find((d) => d.key === k)?.score ?? 50;

  const discipline = get('discipline');
  const impulse = get('impulse');
  const anxiety = get('anxiety');
  const risk = get('risk');
  const future = get('future');
  const status = get('status');

  // archetype from the strongest behavioural pattern
  let archetype = 'عمل‌گرای متعادل';
  let archetypeDesc =
    'ترکیب نسبتاً متعادلی از انضباط، آینده‌نگری و ریسک‌پذیری دارید؛ مهم‌ترین فرصت شما ساختن عادت‌های کوچک اما منظم است.';
  if (discipline >= 65 && future >= 65 && impulse < 55) {
    archetype = 'معمار آینده';
    archetypeDesc =
      'نگاه بلندمدت، هدف‌محوری و انضباط مالی ویژگی اصلی شماست. نقاط قوت شما برنامه‌ریزی و پایبندی به هدف است؛ البته مراقب سخت‌گیری بیش از حد به خود باشید.';
  } else if (risk >= 65 && future < 55) {
    archetype = 'ماجراجوی فرصت‌شناس';
    archetypeDesc =
      'تحمل نوسان بالا و علاقه به یادگیری بازار از نقاط قوت شماست؛ اما ممکن است صندوق اضطراری و مدیریت ریسک را نادیده بگیرید.';
  } else if (impulse >= 62 || status >= 62) {
    archetype = 'خرج‌کننده احساسی';
    archetypeDesc =
      'خریدهای تکانشی و خرج‌های نمایشی در رفتار شما پررنگ‌اند. خبر خوب اینکه با چند قانون ساده (مثل قانون ۴۸ ساعت) می‌توانید این الگو را به‌سرعت تغییر دهید.';
  } else if (anxiety >= 65 && risk < 45) {
    archetype = 'نگهبان محتاط';
    archetypeDesc =
      'تمایل طبیعی به پس‌انداز و احتیاط دارید، اما اضطراب مالی ممکن است مانع رشد دارایی‌های شما شود. قدم‌های کوچک و کم‌ریسک بهترین مسیر برای شماست.';
  } else if (discipline >= 60 && risk >= 50) {
    archetype = 'عمل‌گرای متعادل';
    archetypeDesc =
      'ترکیب انضباط و ریسک‌پذیری حساب‌شده، پایه‌های یک برنامه مالی موفق است؛ حالا کافی است اهداف مشخص‌تری برای آن تعریف کنید.';
  }

  const strengths: string[] = [];
  const risks: string[] = [];
  const tips: string[] = [];

  if (discipline >= 60)
    strengths.push('انضباط مالی نقطه قوت شماست؛ ثبت و مرور منظم تراکنش‌ها بهترین سرمایه شما برای تصمیم‌های دقیق است.');
  if (future >= 60)
    strengths.push('آینده‌نگری بالایی دارید و می‌توانید لذت امروز را برای رفاه فردا به تعویق بیندازید.');
  if (risk >= 55 && risk <= 80)
    strengths.push('ریسک‌پذیری شما در محدوده سالم است؛ هم تحمل نوسان دارید و هم از افراط دوری می‌کنید.');
  if (anxiety < 45)
    strengths.push('آرامش شما در مواجهه با مسائل مالی، یک مزیت رقابتی واقعی است.');
  if (impulse < 45)
    strengths.push('کنترل بالایی روی خریدهای تکانشی دارید؛ این یعنی پولتان عملاً در اختیار اولویت‌های واقعی‌تان است.');

  if (impulse >= 60)
    risks.push('نمره تکانشگری شما بالاست؛ خریدهای آنی و پشیمانی بعد از آن، بزرگ‌ترین تهدید برای جریان نقدی شماست.');
  if (anxiety >= 60)
    risks.push('اضطراب مالی بالا می‌تواند به دو واکنش مخرب منجر شود: اجتناب از بررسی اعداد یا تصمیم‌های هیجانی.');
  if (status >= 60)
    risks.push('خرج نمایشی می‌تواند بی‌سروصدا بخش بزرگی از درآمد شما را مصرف کند.');
  if (risk >= 80)
    risks.push('ریسک‌پذیری خیلی بالا، بدون مدیریت ریسک، می‌تواند به ضررهای بزرگ منجر شود.');
  if (discipline < 45)
    risks.push('ضعف در ثبت و برنامه‌ریزی باعث می‌شود تصمیم‌های مالی شما بر اساس حس لحظه‌ای باشد نه واقعیت اعداد.');
  if (future < 45)
    risks.push('آینده‌نگری پایین یعنی احتمال کمتری برای ساختن دارایی بلندمدت وجود دارد.');

  if (impulse >= 55)
    tips.push('قانون ۴۸ ساعت را امتحان کنید: هر خرید غیرضروری را دو روز عقب بیندازید؛ بیشتر آن‌ها خودبه‌خود حذف می‌شوند.');
  if (anxiety >= 55)
    tips.push('برای کاهش اضطراب مالی، موثرترین قدم ساختن صندوق اضطراری سه‌ماهه است؛ یک هدف برای آن بسازید.');
  if (status >= 55)
    tips.push('برای دسته‌های «نمایشی» زندگی‌تان یک سقف ماهانه مشخص تعیین کنید تا از بقیه بودجه محافظت شود.');
  if (discipline < 55)
    tips.push('هر تراکنش را همان روز ثبت کنید؛ حتی یک هفته ثبت منظم، تصویر شفافی از الگوی خرج‌کردتان می‌سازد.');
  if (future < 55)
    tips.push('یک هدف مالی مشخص با موعد تعیین کنید و اول هر ماه، قبل از خرج کردن، مبلغی به آن منتقل کنید.');
  if (risk >= 70)
    tips.push('قبل از ورود به هر دارایی پرریسک، سقف مشخصی (مثلاً ۱۰٪ دارایی) برای آن تعیین کنید.');
  if (risk < 40)
    tips.push('با مبالغ کوچک، سرمایه‌گذاری کم‌ریسک را تجربه کنید تا تدریجاً به نوسان عادت کنید.');
  if (!tips.length)
    tips.push('الگوی رفتاری شما سالم است؛ حالا با تعیین یک هدف مالی مشخص، این توانایی را به نتیجه ملموس تبدیل کنید.');

  return {
    date: todayISO(),
    archetype,
    archetypeDesc,
    dimensions,
    strengths: strengths.slice(0, 4),
    risks: risks.slice(0, 4),
    tips: tips.slice(0, 5),
  };
}

/* ----------------------- personality result ------------------------- */

export function scorePersonalityTest(answers: Record<string, number>): TestResult {
  const dimensions = scoreDimensions(PERSONALITY_QUESTIONS, answers, PERSONALITY_DIMENSIONS);
  const get = (k: string) => dimensions.find((d) => d.key === k)?.score ?? 50;

  const openness = get('openness');
  const cons = get('conscientiousness');
  const extra = get('extraversion');
  const agree = get('agreeableness');
  const neuro = get('neuroticism');

  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0];

  const archetypeMap: Record<string, { title: string; desc: string }> = {
    openness: {
      title: 'کاوشگر مالی',
      desc: 'کنجکاوی و پذیرش ایده‌های نو، شما را به سمت ابزارها و بازارهای تازه می‌کشاند. قدرت شما یادگیری سریع است؛ فقط پیش از هر ورود، تحقیق عمیق را فراموش نکنید.',
    },
    conscientiousness: {
      title: 'منظم‌کننده مالی',
      desc: 'وظیفه‌شناسی بالا، بزرگ‌ترین سرمایه مالی شماست؛ بودجه‌بندی برایتان طبیعی است. ساختارهای خودکار مثل پس‌انداز خودکار و یادآور قسط، بهترین کمک برای شماست.',
    },
    extraversion: {
      title: 'اجتماعی‌خرج',
      desc: 'انرژی اجتماعی شما یعنی سهم بالای هزینه‌های مهمانی و سفر. برای این دسته‌ها بودجه جدا تعریف کنید تا از بقیه برنامه مالی‌تان محافظت شود.',
    },
    agreeableness: {
      title: 'همدل مالی',
      desc: 'سخاوت و همدلی شما ارزشمند است، اما مراقب قرض‌دادن‌ها و کمک‌های بدون برنامه باشید. در مذاکره و چانه‌زنی نیز می‌توانید قوی‌تر عمل کنید.',
    },
    neuroticism: {
      title: 'حساس به نوسان',
      desc: 'حساسیت هیجانی شما یعنی احتمال تصمیم‌های احساسی در ریزش بازار. قانون «۲۴ ساعت صبر قبل از فروش» می‌تواند کیفیت تصمیم‌های شما را به‌طور محسوسی بالا ببرد.',
    },
  };

  const arch = archetypeMap[strongest.key] ?? {
    title: 'شخصیت متعادل مالی',
    desc: 'ترکیب متعادلی از ویژگی‌های شخصیتی دارید؛ این یعنی انعطاف خوبی در شرایط مختلف مالی خواهید داشت.',
  };

  const strengths: string[] = [];
  const risks: string[] = [];
  const tips: string[] = [];

  if (cons >= 60)
    strengths.push('انضباط و نظم بالای شما، اجرای هر برنامه مالی را آسان‌تر می‌کند.');
  if (openness >= 60)
    strengths.push('گشودگی به تجربه یعنی توانایی یادگیری سریع ابزارهای مالی جدید.');
  if (extra >= 60)
    strengths.push('مهارت‌های اجتماعی شما می‌تواند در مذاکره، شبکه‌سازی و فرصت‌های درآمدی به کارتان بیاید.');
  if (agree >= 60)
    strengths.push('همدلی و انصاف شما، روابط مالی پایدار و قابل‌اعتماد می‌سازد.');
  if (neuro < 40)
    strengths.push('ثبات هیجانی، مزیت بزرگی در تصمیم‌های بلندمدت مالی است.');

  if (neuro >= 60)
    risks.push('حساسیت هیجانی بالا، احتمال تصمیم‌های شتاب‌زده در نوسان‌های بازار را بیشتر می‌کند.');
  if (extra >= 70)
    risks.push('خرج‌های اجتماعی بالا می‌تواند بی‌آنکه متوجه شوید، بخش بزرگی از درآمدتان را مصرف کند.');
  if (cons < 40)
    risks.push('ضعف در نظم و پیگیری، مانع تبدیل تصمیم‌های خوب به نتیجه واقعی می‌شود.');
  if (agree >= 70)
    risks.push('سخاوت بیش از حد می‌تواند به قرض‌ها و تعهدات مالی بدون برنامه منجر شود.');
  if (openness < 40)
    risks.push('پایبندی زیاد به روش‌های آشنا ممکن است باعث از‌دست‌رفتن فرصت‌های رشد شود.');

  if (neuro >= 55)
    tips.push('پیش از هر تصمیم مالی هیجانی، یک روز صبر کنید و تصمیم را روی کاغذ بنویسید.');
  if (cons < 55)
    tips.push('اهداف مالی‌تان را به گام‌های هفتگی کوچک تقسیم کنید؛ گام‌های کوچک راحت‌تر به عادت تبدیل می‌شوند.');
  if (extra >= 55)
    tips.push('برای هزینه‌های اجتماعی‌تان یک «بودجه تفریح» ماهانه مشخص کنید تا هم لذت ببرید و هم کنترل داشته باشید.');
  if (agree >= 55)
    tips.push('قبل از قرض‌دادن یا کمک مالی بزرگ، شرایط را شفاف و مکتوب کنید تا رابطه و مالی هر دو حفظ شوند.');
  if (openness >= 55)
    tips.push('ماهی یک ساعت را به یادگیری یک مفهوم مالی جدید اختصاص دهید؛ اثر مرکب دانش مالی کمتر از اثر مرکب پول نیست.');
  if (!tips.length)
    tips.push('ترکیب شخصیتی شما متعادل است؛ تمرکز بر یک هدف مالی مشخص، بهترین نتیجه را برایتان می‌سازد.');

  return {
    date: todayISO(),
    archetype: arch.title,
    archetypeDesc: arch.desc,
    dimensions,
    strengths: strengths.slice(0, 4),
    risks: risks.slice(0, 4),
    tips: tips.slice(0, 5),
  };
}

export function bandLabel(score: number): string {
  switch (band(score)) {
    case 'high':
      return 'بالا';
    case 'mid':
      return 'متوسط';
    default:
      return 'پایین‌تر از میانگین';
  }
}

export function questionCountLabel(index: number, total: number): string {
  return `سؤال ${faDigits(index + 1)} از ${faDigits(total)}`;
}
