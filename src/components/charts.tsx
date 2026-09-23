import { useId } from 'react';
import { faDigits, fmt, compact, pct } from '../lib/format';

/* ------------------------------------------------------------------ *
 * Lightweight, dependency-free SVG chart primitives
 * ------------------------------------------------------------------ */

interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({
  slices,
  size = 190,
  thickness = 26,
  centerLabel,
  centerValue,
  onSliceClick,
  activeKey,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  onSliceClick?: (key: string) => void;
  activeKey?: string | null;
}) {
  const gradientId = useId();
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = slices.map((slice) => {
    const frac = slice.value / total;
    const arc = {
      ...slice,
      frac,
      dash: `${Math.max(0, frac * circumference - 2.2)} ${circumference}`,
      offset: -offset * circumference,
    };
    offset += frac;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <defs>
            <filter id={`${gradientId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#1d2b25" floodOpacity="0.10" />
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ece8dd"
            strokeWidth={thickness}
          />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth={activeKey && activeKey !== a.key ? thickness - 6 : thickness}
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              strokeLinecap="round"
              opacity={activeKey && activeKey !== a.key ? 0.32 : 1}
              style={{
                transition: 'all .5s cubic-bezier(.22,1,.36,1)',
                cursor: onSliceClick ? 'pointer' : undefined,
                filter: `url(#${gradientId}-shadow)`,
              }}
              onClick={() => onSliceClick?.(a.key)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && (
            <div className="num text-[19px] font-extrabold text-ink leading-tight">{centerValue}</div>
          )}
          {centerLabel && (
            <div className="mt-0.5 text-[11.5px] font-medium text-ink-3 leading-tight">
              {centerLabel}
            </div>
          )}
        </div>
      </div>

      {slices.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {slices.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              <span className="text-[11.5px] font-semibold text-ink-2">{s.label}</span>
              <span className="num text-[11px] text-ink-3">{pct(s.value / total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ bars ------------------------------- */

export function GroupedBars({
  data,
  height = 210,
}: {
  data: { label: string; income: number; expense: number; investment: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense, d.investment]));
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height }}>
        {data.map((d, i) => (
          <div key={d.label + i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full items-end justify-center gap-[5px]">
              {[
                { v: d.income, c: '#2f9c78', t: 'درآمد' },
                { v: d.expense, c: '#cd6a58', t: 'هزینه' },
                { v: d.investment, c: '#c08d2c', t: 'سرمایه‌گذاری' },
              ].map((bar, bi) => (
                <div
                  key={bi}
                  className="group/bar relative w-full max-w-[16px] rounded-t-[7px]"
                  style={{
                    height: `${Math.max(3, (bar.v / max) * 100)}%`,
                    background: bar.c,
                    opacity: bar.v > 0 ? 1 : 0.18,
                    transition: 'height .7s cubic-bezier(.22,1,.36,1)',
                  }}
                  title={`${bar.t}: ${fmt(bar.v)} تومان`}
                >
                  <div className="pointer-events-none absolute -top-8 right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover/bar:opacity-100">
                    {compact(bar.v)}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full truncate text-center text-[10px] font-semibold text-ink-3 sm:text-[11px]">
              {d.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        {[
          { c: '#2f9c78', t: 'درآمد' },
          { c: '#cd6a58', t: 'هزینه' },
          { c: '#c08d2c', t: 'سرمایه‌گذاری' },
        ].map((l) => (
          <div key={l.t} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.c }} />
            <span className="text-[11px] font-semibold text-ink-2">{l.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ area ------------------------------- */

export function AreaChart({
  points,
  height = 190,
  color = '#2f9c78',
  label,
  formatValue,
}: {
  points: { label: string; value: number }[];
  height?: number;
  color?: string;
  label?: string;
  formatValue?: (v: number) => string;
}) {
  const gradientId = useId();
  const w = 640;
  const h = 220;
  const padX = 26;
  const padTop = 22;
  const padBottom = 34;

  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;

  const x = (i: number) =>
    padX + (i / Math.max(1, points.length - 1)) * (w - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / span) * (h - padTop - padBottom);

  // smooth cubic path
  let line = '';
  points.forEach((p, i) => {
    const px = x(i);
    const py = y(p.value);
    if (i === 0) line += `M ${px} ${py}`;
    else {
      const prevX = x(i - 1);
      const prevY = y(points[i - 1].value);
      const cx = (prevX + px) / 2;
      line += ` C ${cx} ${prevY}, ${cx} ${py}, ${px} ${py}`;
    }
  });
  const areaPath =
    line +
    ` L ${x(points.length - 1)} ${h - padBottom} L ${x(0)} ${h - padBottom} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={w - padX}
            y1={padTop + t * (h - padTop - padBottom)}
            y2={padTop + t * (h - padTop - padBottom)}
            stroke="#e9e4d8"
            strokeWidth="1.4"
            strokeDasharray={t === 1 ? '0' : '5 7'}
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={p.label + i}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={i === points.length - 1 ? 6 : 3.4}
              fill="#fff"
              stroke={color}
              strokeWidth={i === points.length - 1 ? 3.2 : 2}
            />
            <text
              x={x(i)}
              y={h - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#8a968f"
              fontWeight="600"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      {label && (
        <div className="mt-1 text-center text-[11.5px] font-medium text-ink-3">{label}</div>
      )}
      {formatValue && points.length > 0 && (
        <div className="mt-1 text-center text-[12px] font-bold text-ink">
          آخرین نقطه: {formatValue(points[points.length - 1].value)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ ring ------------------------------- */

export function Ring({
  value,
  max = 100,
  size = 132,
  thickness = 13,
  color = '#2f9c78',
  track = '#eae5d9',
  label,
  sub,
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  track?: string;
  label?: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const frac = Math.max(0, Math.min(1, value / max));

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${frac * circumference} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <div className="num text-[21px] font-extrabold leading-none text-ink">{label}</div>
            {sub && <div className="mt-1 text-[10.5px] font-semibold text-ink-3">{sub}</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- sparkline ---------------------------- */

export function Sparkline({
  values,
  width = 108,
  height = 38,
  color = '#2f9c78',
  fill = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  const gradientId = useId();
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 4 - ((v - min) / span) * (height - 10)]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gradientId})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------- stacked bar -------------------------- */

export function StackedBar({
  segments,
  height = 16,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="w-full">
      <div
        className="flex w-full overflow-hidden rounded-full"
        style={{ height, background: '#ece8dd' }}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${fmt(s.value)}`}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              transition: 'width .8s cubic-bezier(.22,1,.36,1)',
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-[11px] font-semibold text-ink-2">{s.label}</span>
            <span className="num text-[11px] text-ink-3">{pct(s.value / total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- progress bar -------------------------- */

export function Progress({
  value,
  max = 100,
  color = '#2f9c78',
  height = 9,
  showLabel = false,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}) {
  const pctValue = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full">
      <div className="w-full overflow-hidden rounded-full" style={{ height, background: '#ece8dd' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pctValue}%`,
            background: color,
            transition: 'width .9s cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>
      {showLabel && (
        <div className="num mt-1.5 text-[11px] font-semibold text-ink-3">
          {faDigits(Math.round(pctValue))}٪
        </div>
      )}
    </div>
  );
}
