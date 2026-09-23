import { useState } from 'react';
import {
  Target,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  Trophy,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { fmt, compact, pct, faDigits, parseAmount, todayISO, jDateLabel } from '../lib/format';
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

const GOAL_ICONS = ['💻', '🏠', '✈️', '🚗', '💍', '🎓', '🪙', '📱', '🎯', '🛡️', '🎁', '📚'];

export function Goals() {
  const { goals, addGoal, transferGoal, deleteGoal, cash } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalSaved = goals.reduce(
    (s, g) =>
      s + g.transfers.reduce((t, x) => t + (x.kind === 'deposit' ? x.amount : -x.amount), 0),
    0
  );
  const totalTargets = goals.reduce((s, g) => s + g.target, 0);
  const achieved = goals.filter((g) => {
    const saved = g.transfers.reduce((t, x) => t + (x.kind === 'deposit' ? x.amount : -x.amount), 0);
    return saved >= g.target;
  }).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="اهداف مالی"
        subtitle="برای هر هدف مبلغ هدف تعیین کنید و پول را از موجودی نقد به هدف منتقل کنید — هر انتقال در دفتر تراکنش‌ها ثبت می‌شود."
        action={
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> ساخت هدف جدید
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="کل پس‌انداز اهداف"
          value={compact(totalSaved)}
          sub="تومان"
          icon={<Target size={18} />}
          tone="violet"
        />
        <StatCard
          label="مجموع اهداف"
          value={compact(totalTargets)}
          sub="تومان"
          icon={<Sparkles size={18} />}
          tone="gold"
        />
        <StatCard
          label="اهداف محقق‌شده"
          value={`${faDigits(achieved)} از ${faDigits(goals.length)}`}
          sub="هدف"
          icon={<Trophy size={18} />}
          tone="brand"
        />
        <StatCard
          label="موجودی نقد"
          value={compact(cash)}
          sub="تومان قابل انتقال"
          icon={<Wallet size={18} />}
          tone="neutral"
        />
      </div>

      {goals.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => {
            const saved = goal.transfers.reduce(
              (s, t) => s + (t.kind === 'deposit' ? t.amount : -t.amount),
              0
            );
            const progress = goal.target > 0 ? Math.min(1, saved / goal.target) : 0;
            const done = saved >= goal.target;
            const remaining = Math.max(0, goal.target - saved);

            return (
              <div key={goal.id} className="card overflow-hidden p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[19px] bg-gradient-to-br from-violet-soft to-brand-soft text-[26px]">
                      {goal.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13.5px] font-extrabold text-ink">{goal.title}</h3>
                        {done && (
                          <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[8px] font-bold text-brand-2">
                            <Trophy size={9} /> محقق شد
                          </span>
                        )}
                      </div>
                      {goal.note && (
                        <div className="mt-1 text-[9.5px] font-semibold text-ink-3">
                          {goal.note}
                        </div>
                      )}
                      <div className="mt-1.5 text-[9.5px] font-semibold text-ink-3">
                        ساخته‌شده در {jDateLabel(goal.createdAt)}
                      </div>
                    </div>
                  </div>

                  <Ring value={progress * 100} size={78} thickness={9} color="#7161c4">
                    <div className="text-center">
                      <div className="num text-[12.5px] font-extrabold">
                        {pct(progress)}
                      </div>
                      <div className="text-[7px] font-semibold text-ink-3">پیشرفت</div>
                    </div>
                  </Ring>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between text-[10px]">
                    <span className="font-bold text-ink-3">
                      {compact(saved)} از {compact(goal.target)} تومان
                    </span>
                    <span className="num font-extrabold text-violet">
                      {done ? '✓ هدف محقق شد' : `${compact(remaining)} تومان مانده`}
                    </span>
                  </div>
                  <Progress value={progress * 100} color="#7161c4" height={10} />
                </div>

                {goal.transfers.length > 0 && (
                  <div className="mt-4 rounded-[15px] border border-line bg-paper/50 p-3.5">
                    <div className="mb-2 text-[9px] font-bold text-ink-3">
                      تاریخچه انتقال‌ها ({faDigits(goal.transfers.length)} مورد)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {goal.transfers.slice(-5).map((t) => (
                        <span
                          key={t.id}
                          className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${
                            t.kind === 'deposit'
                              ? 'bg-violet-soft text-violet'
                              : 'bg-coral-soft text-coral'
                          }`}
                        >
                          {t.kind === 'deposit' ? '+' : '−'} {compact(t.amount)} •{' '}
                          {jDateLabel(t.date, false)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => setTransferId(goal.id)}
                  >
                    <ArrowDownToLine size={15} /> واریز از موجودی نقد
                  </button>
                  <button className="btn btn-ghost" onClick={() => setWithdrawId(goal.id)}>
                    <ArrowUpFromLine size={15} /> برداشت
                  </button>
                  <button className="btn btn-danger" onClick={() => setDeleteId(goal.id)}>
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
            icon={<Target size={24} />}
            title="هنوز هدفی نساخته‌اید"
            description="مثلاً پس‌انداز یک هزار دلاری یا خرید لپ‌تاپ ۹۰ میلیون تومانی — مبلغ هدف را تعیین کنید و کم‌کم از موجودی نقد به آن منتقل کنید. هر انتقال در دفتر تراکنش‌ها ثبت می‌شود."
            action={
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={15} /> ساخت اولین هدف
              </button>
            }
          />
        </div>
      )}

      <Banner tone="success">
        <strong>نکته جیبینو:</strong> انتقال منظم و کوچک به هدف (مثلاً اول هر ماه)، بسیار مؤثرتر از
        مبالغ بزرگ و نامنظم است. انتقال به هدف «هزینه» نیست، بلکه پس‌انداز محسوب می‌شود و از نرخ
        پس‌انداز شما کم نمی‌کند.
      </Banner>

      <AddGoalModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addGoal} />

      <TransferModal
        goalId={transferId}
        mode="deposit"
        onClose={() => setTransferId(null)}
        onTransfer={(amount) => {
          if (transferId) {
            transferGoal(transferId, amount, 'deposit');
          }
          setTransferId(null);
        }}
      />

      <TransferModal
        goalId={withdrawId}
        mode="withdraw"
        onClose={() => setWithdrawId(null)}
        onTransfer={(amount) => {
          if (withdrawId) {
            transferGoal(withdrawId, amount, 'withdraw');
          }
          setWithdrawId(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف هدف"
        message="این هدف و تاریخچه انتقال‌های آن حذف می‌شود (تراکنش‌های دفتر دست‌نخورده باقی می‌مانند). ادامه می‌دهید؟"
        confirmLabel="حذف شود"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteGoal(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}

function AddGoalModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (goal: { icon: string; title: string; target: number; note?: string }) => void;
}) {
  const [icon, setIcon] = useState(GOAL_ICONS[0]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ساخت هدف مالی"
      subtitle="مبلغ هدف را مشخص کنید؛ بعداً می‌توانید از موجودی نقد به آن پول منتقل کنید."
    >
      <div className="space-y-4">
        <Field label="نماد هدف">
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`flex h-11 w-11 items-center justify-center rounded-[14px] border-[1.5px] text-[19px] transition-all ${
                  icon === emoji
                    ? 'border-brand-2 bg-brand-soft shadow-[0_10px_22px_-12px_rgba(14,87,68,.5)]'
                    : 'border-line bg-white hover:border-line-2'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>
        <Field label="عنوان هدف">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً خرید لپ‌تاپ، پس‌انداز هزار دلاری…"
          />
        </Field>
        <Field label="مبلغ هدف" hint="تومان">
          <AmountInput value={target} onChange={setTarget} />
        </Field>
        <Field label="توضیح" hint="اختیاری">
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً مدل مورد نظر…"
          />
        </Field>
        {error && <Banner tone="danger">{error}</Banner>}
        <div className="flex gap-3">
          <button
            className="btn btn-primary flex-1"
            onClick={() => {
              const t = parseAmount(target);
              if (!title.trim()) {
                setError('عنوان هدف را وارد کنید.');
                return;
              }
              if (t <= 0) {
                setError('مبلغ هدف را وارد کنید.');
                return;
              }
              onAdd({ icon, title: title.trim(), target: t, note: note.trim() || undefined });
              setTitle('');
              setTarget('');
              setNote('');
              setError('');
              onClose();
            }}
          >
            ساخت هدف
          </button>
          <button className="btn btn-ghost flex-1" onClick={onClose}>
            انصراف
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TransferModal({
  goalId,
  mode,
  onClose,
  onTransfer,
}: {
  goalId: string | null;
  mode: 'deposit' | 'withdraw';
  onClose: () => void;
  onTransfer: (amount: number) => void;
}) {
  const { goals, cash } = useStore();
  const goal = goals.find((g) => g.id === goalId);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const saved = goal
    ? goal.transfers.reduce((s, t) => s + (t.kind === 'deposit' ? t.amount : -t.amount), 0)
    : 0;

  return (
    <Modal
      open={!!goalId}
      onClose={onClose}
      title={
        mode === 'deposit'
          ? `واریز به «${goal?.title ?? ''}»`
          : `برداشت از «${goal?.title ?? ''}»`
      }
      subtitle={
        mode === 'deposit'
          ? 'مبلغ از موجودی نقد کم و به پس‌انداز هدف اضافه می‌شود.'
          : 'مبلغ از پس‌انداز هدف کم و به موجودی نقد برمی‌گردد.'
      }
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-[15px] border border-line bg-paper/50 p-4 text-[10.5px] font-semibold text-ink-2">
          پس‌انداز فعلی هدف: <span className="num font-extrabold">{fmt(saved)}</span> تومان •
          موجودی نقد: <span className="num font-extrabold">{fmt(cash)}</span> تومان
        </div>
        <Field label="مبلغ" hint="تومان">
          <AmountInput
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setError('');
            }}
          />
        </Field>
        {error && <Banner tone="danger">{error}</Banner>}
        <div className="flex gap-3">
          <button
            className="btn btn-primary flex-1"
            onClick={() => {
              const v = parseAmount(amount);
              if (v <= 0) {
                setError('مبلغ را وارد کنید.');
                return;
              }
              if (mode === 'deposit' && v > cash) {
                setError(`موجودی نقد کافی نیست (${fmt(cash)} تومان).`);
                return;
              }
              if (mode === 'withdraw' && v > saved) {
                setError(`بیشتر از پس‌انداز هدف است (${fmt(saved)} تومان).`);
                return;
              }
              onTransfer(v);
              setAmount('');
              setError('');
            }}
          >
            {mode === 'deposit' ? 'واریز به هدف' : 'برداشت از هدف'}
          </button>
          <button className="btn btn-ghost flex-1" onClick={onClose}>
            انصراف
          </button>
        </div>
      </div>
    </Modal>
  );
}
