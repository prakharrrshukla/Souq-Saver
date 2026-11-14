// Household facts that follow from the order history by plain rules, no model. Used two ways:
// 1. When Bedrock is off, they are the household profile the planner works from.
// 2. When the AI learned the household, they validate its answer: malformed values are replaced and
//    clear evidence (a product replaced by another, an alternative tried and dropped) is enforced.
import type { Tier } from '../contract.ts';
import { baseTier } from '../engine/planner.ts';
import { limits } from '../limits.ts';
import type { Insight, Learned, ProductHistory } from './brain.ts';

const DAY = 86_400_000;
const at = (date: string) => Date.parse(`${date}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Evidence per product that the history makes unambiguous. */
export type Signals = { replacedBy?: string; lapsed?: boolean; triedAndReturned?: boolean };
export type HistoryProfile = { learned: Learned; signals: Map<string, Signals> };

function tierOf(p: ProductHistory, orderShare: number): Tier {
  if (/diaper|nappy|formula|baby/i.test(`${p.category} ${p.parentCategory} ${p.name}`)) return 'T2';
  const base = baseTier(p.category, p.parentCategory, p.name);
  return base === 'T3' && orderShare >= 0.75 ? 'T2' : base; // a fresh item in most orders is a staple here
}

export function historyProfile(products: ProductHistory[], today: string, totalOrders: number): HistoryProfile {
  const now = at(today);
  const signals = new Map<string, Signals>();
  const insights: Insight[] = [];
  const switches: string[] = [];
  for (const p of products) {
    const times = p.purchases.map((x) => at(x.date));
    const first = times[0];
    const last = times[times.length - 1];
    const gaps = times.slice(1).map((t, i) => Math.round((t - times[i]) / DAY));
    const gap = gaps.length ? median(gaps) : null;
    const sinceLast = Math.round((now - last) / DAY);
    const orderShare = new Set(p.purchases.map((x) => x.date)).size / Math.max(1, totalOrders);
    const s: Signals = {};

    // Replaced: it stopped, and a product of the same kind started around then and has been bought since.
    if (p.purchases.length >= 2 && sinceLast >= Math.max(21, 2 * (gap ?? 0))) {
      const successor = products.find((q) => q.sku !== p.sku && q.parentCategory === p.parentCategory && q.purchases.length >= 2
        && at(q.purchases[0].date) > first && at(q.purchases[0].date) >= last - 14 * DAY && at(q.purchases[0].date) <= last + 28 * DAY
        && at(q.purchases[q.purchases.length - 1].date) > last);
      if (successor) s.replacedBy = successor.name;
    }
    // Lapsed: a regular habit not seen for three of its own cycles (and at least four weeks).
    if (!s.replacedBy && p.purchases.length >= 3 && gap && sinceLast > Math.max(28, 3 * gap)) s.lapsed = true;
    // Loyal: an alternative of the same kind was bought once or twice in between, then this one again.
    s.triedAndReturned = products.some((q) => q.sku !== p.sku && q.category === p.category && q.purchases.length <= 2
      && q.purchases.some((x) => at(x.date) > first && at(x.date) < last));
    signals.set(p.sku, s);

    const qty = Math.max(1, Math.round(median(p.purchases.map((x) => x.qty))));
    const soleProduct = !products.some((q) => q.sku !== p.sku && q.category === p.category);
    const loyal = s.triedAndReturned || (p.purchases.length >= 3 && soleProduct);
    const base = { sku: p.sku, tier: tierOf(p, orderShare), qty, loyal };
    if (s.replacedBy) {
      insights.push({ ...base, decision: 'stopped', nextDue: null, reason: `Not bought since ${iso(last)}; replaced by ${s.replacedBy}` });
      switches.push(`${p.name} to ${s.replacedBy} (from ${iso(last)})`);
    } else if (s.lapsed) insights.push({ ...base, decision: 'stopped', nextDue: null, reason: `Bought every ${gap} days until ${iso(last)}, not since` });
    else if (!gap) insights.push({ ...base, decision: 'occasional', nextDue: null, reason: `Bought once, on ${iso(last)}` });
    else if (sinceLast + 7 >= gap) insights.push({ ...base, decision: 'due', nextDue: null, reason: `Bought about every ${gap} days, last on ${iso(last)}` });
    else insights.push({ ...base, decision: 'not_due', nextDue: iso(last + gap * DAY), reason: `Bought about every ${gap} days, last on ${iso(last)}` });
  }
  return { learned: { products: insights, likes: [], dislikes: [], switches, persona: { summary: '', routines: [] } }, signals };
}

const DECISIONS = ['due', 'not_due', 'stopped', 'occasional'];
const TIERS = ['T1', 'T2', 'T3', 'T4', 'T5'];
const strings = (v: unknown, max = 12) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => String(x).trim().slice(0, 200)).slice(0, max) : []);

/**
 * Validates the AI's reading of the household against the data. Returns the cleaned profile and every
 * correction made (shown in X-ray). Duplicates keep the first answer; unknown products are dropped;
 * missing products get the history answer.
 */
export function validateLearned(ai: any, products: ProductHistory[], history: HistoryProfile): { learned: Learned; corrections: string[] } {
  const corrections: string[] = [];
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const fromHistory = new Map(history.learned.products.map((i) => [i.sku, i]));
  const { maxQtyPerLine } = limits();
  const out = new Map<string, Insight>();
  for (const raw of Array.isArray(ai?.products) ? ai.products : []) {
    const sku = String(raw?.sku ?? '');
    const p = bySku.get(sku);
    if (!p) { corrections.push(`dropped unknown product "${sku}"`); continue; }
    if (out.has(sku)) { corrections.push(`${p.name}: duplicate answer ignored`); continue; }
    const h = fromHistory.get(sku)!;
    const s = history.signals.get(sku) ?? {};
    const insight: Insight = {
      sku,
      decision: DECISIONS.includes(raw.decision) ? raw.decision : (corrections.push(`${p.name}: decision "${raw.decision}" replaced by "${h.decision}"`), h.decision),
      tier: TIERS.includes(raw.tier) ? raw.tier : (corrections.push(`${p.name}: tier "${raw.tier}" replaced by ${h.tier}`), h.tier),
      qty: h.qty,
      nextDue: typeof raw.nextDue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.nextDue) ? raw.nextDue : h.nextDue,
      loyal: raw.loyal === true,
      reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim().slice(0, 300) : h.reason,
    };
    const most = Math.max(...p.purchases.map((x) => x.qty));
    if (Number.isInteger(raw.qty) && raw.qty >= 1 && raw.qty <= Math.min(maxQtyPerLine, Math.max(2, most * 2))) insight.qty = raw.qty;
    else corrections.push(`${p.name}: usual quantity ${JSON.stringify(raw.qty)} is not supported by the history (most ever bought: ${most}), using ${h.qty}`);
    if (s.replacedBy && (insight.decision === 'due' || insight.decision === 'not_due')) {
      corrections.push(`${p.name}: marked ${insight.decision}, but it was replaced by ${s.replacedBy}; treated as stopped`);
      Object.assign(insight, { decision: 'stopped', nextDue: null, reason: h.reason });
    }
    // Running out of water or a staple is worse than buying it a few days early.
    if (insight.decision === 'not_due' && h.decision === 'due' && (insight.tier === 'T1' || insight.tier === 'T2')) {
      corrections.push(`${p.name}: an essential that runs out this week by its own rhythm (${h.reason}); treated as due`);
      Object.assign(insight, { decision: 'due', nextDue: null });
    }
    if (s.triedAndReturned && !insight.loyal) { corrections.push(`${p.name}: an alternative was tried and dropped, so the household is loyal to it`); insight.loyal = true; }
    out.set(sku, insight);
  }
  for (const p of products) if (!out.has(p.sku)) { corrections.push(`${p.name}: not assessed by the AI, using the history rules`); out.set(p.sku, fromHistory.get(p.sku)!); }
  const persona = ai?.persona && typeof ai.persona === 'object' ? ai.persona : {};
  return {
    learned: {
      products: [...out.values()], likes: strings(ai?.likes), dislikes: strings(ai?.dislikes), switches: strings(ai?.switches),
      persona: { summary: typeof persona.summary === 'string' ? persona.summary.trim().slice(0, 600) : '', routines: strings(persona.routines, 4) },
    },
    corrections,
  };
}
