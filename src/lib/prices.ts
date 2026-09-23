/* ------------------------------------------------------------------ *
 * Phase 2 — live market data engine
 *
 *  • CoinGecko  -> crypto USD prices + 24h change + gold (PAXG, per oz)
 *  • er-api     -> live USD -> IRR reference rate (Toman = IRR / 10)
 *  • Manual     -> user-provided overrides always win (settings)
 *
 * Crypto in Toman = crypto USD x USD/Toman  (e.g. BTC 78,000 $ x 200,000 T)
 * Gold 18k / gram in Toman = (PAXG per oz / 31.1035) x 0.75 x USD/Toman
 * ------------------------------------------------------------------ */

import type { LivePrice, PriceSource, PriceState } from './types';

interface CoinRow {
  id: string;
  label: string;
  symbol: string;
}

export const COIN_ROWS: CoinRow[] = [
  { id: 'bitcoin', label: 'بیت‌کوین', symbol: 'BTC' },
  { id: 'ethereum', label: 'اتریوم', symbol: 'ETH' },
  { id: 'tether', label: 'تتر', symbol: 'USDT' },
  { id: 'solana', label: 'سولانا', symbol: 'SOL' },
  { id: 'ripple', label: 'ریپل', symbol: 'XRP' },
  { id: 'dogecoin', label: 'دوج‌کوین', symbol: 'DOGE' },
  { id: 'cardano', label: 'کاردانو', symbol: 'ADA' },
];

/** Last-resort reference values — clearly reported as "fallback" in the UI. */
export const FALLBACK = {
  usdToman: 139314,
  goldUsdOz: 4372,
  coins: {
    bitcoin: 80968,
    ethereum: 2600,
    tether: 1,
    solana: 172,
    ripple: 2.4,
    dogecoin: 0.19,
    cardano: 0.68,
  } as Record<string, number>,
  changes: {
    bitcoin: 5.6,
    ethereum: 5.6,
    tether: 0.03,
    solana: 3.1,
    ripple: 2.2,
    dogecoin: 1.4,
    cardano: 2.7,
    gold18: 0.4,
    usd: 0,
  } as Record<string, number>,
};

/** Deterministic decorative sparkline seeded from the 24h change. */
function makeSpark(change: number, seed: number, points = 24): number[] {
  const out: number[] = [];
  let v = 50;
  let s = seed * 9301 + 49297;
  for (let i = 0; i < points; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280 - 0.5) * 7;
    v += noise + (change / points) * 1.6;
    out.push(v);
  }
  return out;
}

async function fetchJson(url: string, timeoutMs = 9000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch live USD->Toman reference rate (IRR / 10). */
async function fetchUsdToman(): Promise<{ rate: number; source: PriceSource }> {
  try {
    const data = await fetchJson('https://open.er-api.com/v6/latest/USD');
    const irr = Number(data?.rates?.IRR);
    if (Number.isFinite(irr) && irr > 0) return { rate: irr / 10, source: 'live-rate' };
  } catch {
    /* network/CORS/limit — fall through */
  }
  return { rate: FALLBACK.usdToman, source: 'fallback' };
}

/** Fetch crypto USD prices + gold ounce price from CoinGecko. */
async function fetchCoins(): Promise<{
  usd: Record<string, number>;
  change: Record<string, number>;
  source: PriceSource;
  goldOz: number;
}> {
  const ids = [...COIN_ROWS.map((c) => c.id), 'pax-gold'].join(',');
  try {
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    const usd: Record<string, number> = {};
    const change: Record<string, number> = {};
    let ok = 0;
    for (const row of COIN_ROWS) {
      const v = Number(data?.[row.id]?.usd);
      const c = Number(data?.[row.id]?.usd_24h_change);
      if (Number.isFinite(v) && v > 0) {
        usd[row.id] = v;
        ok++;
      } else usd[row.id] = FALLBACK.coins[row.id];
      change[row.id] = Number.isFinite(c) ? c : FALLBACK.changes[row.id] ?? 0;
    }
    const goldOz = Number(data?.['pax-gold']?.usd);
    return {
      usd,
      change,
      source: ok > 0 ? 'coingecko' : 'fallback',
      goldOz: Number.isFinite(goldOz) && goldOz > 0 ? goldOz : FALLBACK.goldUsdOz,
    };
  } catch {
    return {
      usd: Object.fromEntries(COIN_ROWS.map((c) => [c.id, FALLBACK.coins[c.id]])),
      change: FALLBACK.changes,
      source: 'fallback',
      goldOz: FALLBACK.goldUsdOz,
    };
  }
}

/** Build the complete price snapshot used by the whole app. */
export async function fetchLivePrices(
  manualUsd: number | null,
  manualGold18: number | null
): Promise<PriceState> {
  const [coins, rate] = await Promise.all([fetchCoins(), fetchUsdToman()]);

  // Manual override always wins — the user stays in control of reference rates.
  const usdToman =
    manualUsd && manualUsd > 0 ? manualUsd : rate.rate;
  const usdTomanSource: PriceSource = manualUsd && manualUsd > 0 ? 'manual' : rate.source;

  // Gold 18k per gram: (USD/oz / 31.1035 g) * 0.75 karat factor * USD->Toman
  const derivedGold = (coins.goldOz / 31.1035) * 0.75 * usdToman;
  const gold18Toman = manualGold18 && manualGold18 > 0 ? manualGold18 : derivedGold;
  const gold18Source: PriceSource =
    manualGold18 && manualGold18 > 0
      ? 'manual'
      : coins.source === 'coingecko'
        ? usdTomanSource === 'manual'
          ? 'manual'
          : 'coingecko'
        : 'fallback';

  const items: Record<string, LivePrice> = {};

  items.usd = {
    id: 'usd',
    label: 'دلار آمریکا',
    symbol: 'USD',
    usd: 1,
    toman: usdToman,
    change24h: 0,
    source: usdTomanSource,
    spark: makeSpark(0.4, 3),
  };

  items.gold18 = {
    id: 'gold18',
    label: 'طلای ۱۸ عیار (گرم)',
    symbol: 'GOLD18',
    usd: coins.goldOz / 31.1035 * 0.75,
    toman: gold18Toman,
    change24h: coins.change.gold18 ?? 0.3,
    source: gold18Source,
    spark: makeSpark(coins.change.gold18 ?? 0.3, 7),
  };

  items.gold24 = {
    id: 'gold24',
    label: 'طلای ۲۴ عیار (گرم)',
    symbol: 'GOLD24',
    usd: coins.goldOz / 31.1035,
    toman: (coins.goldOz / 31.1035) * usdToman,
    change24h: coins.change.gold18 ?? 0.3,
    source: gold18Source,
    spark: makeSpark(coins.change.gold18 ?? 0.3, 11),
  };

  COIN_ROWS.forEach((row, i) => {
    const usd = coins.usd[row.id];
    items[row.id] = {
      id: row.id,
      label: row.label,
      symbol: row.symbol,
      usd,
      // Core Phase-2 rule: crypto Toman price = USD price x USD/Toman
      toman: usd * usdToman,
      change24h: coins.change[row.id] ?? 0,
      source: coins.source,
      spark: makeSpark(coins.change[row.id] ?? 0, i * 13 + 1),
    };
  });

  return {
    updatedAt: Date.now(),
    loading: false,
    error: null,
    usdToman,
    usdTomanSource,
    gold18Toman,
    gold18Source,
    items,
  };
}

/** Initial (pre-fetch) snapshot so the UI never renders empty numbers. */
export function initialPrices(): PriceState {
  return {
    updatedAt: null,
    loading: true,
    error: null,
    usdToman: FALLBACK.usdToman,
    usdTomanSource: 'fallback',
    gold18Toman: (FALLBACK.goldUsdOz / 31.1035) * 0.75 * FALLBACK.usdToman,
    gold18Source: 'fallback',
    items: {},
  };
}

/** Map an asset ticker to its live price entry (if any). */
export function priceForAsset(
  prices: PriceState,
  kind: string,
  symbol: string
): { toman: number | null; source: PriceSource } {
  const sym = symbol.toUpperCase();
  const idBySymbol: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    SOL: 'solana',
    XRP: 'ripple',
    DOGE: 'dogecoin',
    ADA: 'cardano',
    USD: 'usd',
    GOLD18: 'gold18',
    GOLD24: 'gold24',
  };
  const id = idBySymbol[sym];
  if (id && prices.items[id]?.toman) {
    return { toman: prices.items[id].toman, source: prices.items[id].source };
  }
  if (kind === 'currency' && prices.items.usd?.toman) {
    return { toman: prices.items.usd.toman, source: prices.items.usd.source };
  }
  return { toman: null, source: 'manual' };
}
