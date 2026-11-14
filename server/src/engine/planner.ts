// The basket planner: tiers, budget, candidates, priority filling and the monthly saving.
// Pure functions. The model never does any of this maths.
import type { Plan, PlanItem, Reason, Tier } from '../contract.ts';
import { r2 } from './analysis.ts';
import { cheaperSwap, compareStores, type CatalogueItem, type Quote, type StoreCatalogue, type Want } from './stores.ts';

/** One product the household has bought, with what the analysis learned about it. */
export type HistoryItem = {
  itemId: string; name: string; category: string; parentCategory: string; size: string; sku: string;
  orders: number; orderShare: number; lastQty: number; lastPrice: number; lastOrdered: string;
  medianDays: number | null; nextDue: string | null; dueThisWeek: boolean;
  driftPct: number | null; driftSince: string | null;
};
export type Override = { item: string; tier?: Tier; keep?: boolean; drop?: boolean };
export type Addition = { item: string; qty?: number };
export type BudgetRequest = { budgetAed?: number; cutPercent?: number };

// ---------- tiers ----------

const TIER_RULES: [Tier, RegExp][] = [
  // Treats are checked first so "Water & Beverages > Soft Drinks" is a treat, not water.
  ['T5', /chips|crisps|snack|soft drink|cola|soda|chocolate|sweets|candy|biscuit|ice cream/],
  ['T1', /\bwater\b/],
  ['T2', /rice|atta|flour|\boil\b|dal\b|lentil|pulses|sugar|\bsalt\b/],
  ['T3', /milk|egg|bread|bakery|onion|tomato|vegetable|fruit|dairy|yogurt|chicken|meat|poultry|fish/],
  ['T4', /dishwash|detergent|laundry|tissue|household|clean/],
];
export const TIER_LABEL: Record<Tier, string> = { T1: 'Water', T2: 'Staple', T3: 'Fresh essential', T4: 'Household', T5: 'Treat' };

/** Default tier from the category (then the name). Unknown items are T4: deferrable, never the first cut. */
export function baseTier(category: string, parentCategory: string, name: string): Tier {
  for (const text of [category, name, parentCategory]) {
    const hit = TIER_RULES.find(([, pattern]) => pattern.test(text.toLowerCase()));
    if (hit) return hit[0];
  }
  return 'T4';
}

const SYNONYMS: Record<string, string> = { soap: 'dishwashing', crisps: 'chips', coke: 'cola', soda: 'cola', lentils: 'dal', flour: 'atta', tissues: 'tissue', veg: 'vegetable' };
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).map((w) => (SYNONYMS[w] ?? w).replace(/(?<=[a-z]{3})s$/, ''));

/** How well a user's phrase ("chips", "dish soap") matches a product. 0 means no match. */
export function matchScore(term: string, target: { name: string; category: string }): number {
  const haystack = words(`${target.name} ${target.category}`).join(' ');
  return words(term).filter((w) => haystack.includes(w)).length;
}

function bestMatches<T extends { name: string; category: string }>(term: string, list: T[]): T[] {
  const scored = list.map((entry) => ({ entry, score: matchScore(term, entry) })).filter((s) => s.score > 0);
  const top = Math.max(0, ...scored.map((s) => s.score));
  return scored.filter((s) => s.score === top).map((s) => s.entry);
}

export type TierAssignment = { itemId: string; name: string; tier: Tier; baseTier: Tier; promoted: boolean; pinned: boolean; dropped: boolean };

/**
 * Category gives the default tier. An item in at least 75% of orders moves up one tier
 * (T4 to T3, T3 to T2): it is a staple for this household. Treats are never promoted
 * automatically and nothing is promoted into T1. A user override pins the tier.
 */
export function assignTiers(items: HistoryItem[], overrides: Override[] = []): TierAssignment[] {
  const result = items.map((item) => {
    const base = baseTier(item.category, item.parentCategory, item.name);
    const promoted = item.orderShare >= 0.75 && (base === 'T3' || base === 'T4');
    const tier: Tier = promoted ? (base === 'T3' ? 'T2' : 'T3') : base;
    return { itemId: item.itemId, name: item.name, category: item.category, tier, baseTier: base, promoted, pinned: false, dropped: false };
  });
  for (const override of overrides) {
    for (const hit of bestMatches(override.item, result)) {
      if (override.drop) hit.dropped = true;
      else {
        hit.pinned = true; // "keep the chips": never cut or reduced
        hit.dropped = false;
        if (override.tier) hit.tier = override.tier;
      }
    }
  }
  return result.map(({ category: _category, ...rest }) => rest);
}

// ---------- budget ----------

export function resolveBudget(request: BudgetRequest, lastWeekTotal: number): Plan['budget'] {
  if (request.cutPercent !== undefined && request.cutPercent >= 0 && request.cutPercent < 100) {
    return { aed: r2(lastWeekTotal * (1 - request.cutPercent / 100)), source: 'cut_percent', cutPercent: request.cutPercent };
  }
  if (request.budgetAed !== undefined && request.budgetAed > 0) return { aed: r2(request.budgetAed), source: 'absolute' };
  return { aed: r2(lastWeekTotal), source: 'last_week' };
}

// ---------- candidates ----------

export type Candidate = Want & { pinned: boolean; promoted: boolean; added: boolean; history?: HistoryItem };
export type Excluded = { history: HistoryItem; tier: Tier; reason: Extract<Reason, 'deferred' | 'cut'>; note: string };

const prettyDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * This week's shopping list: items whose cycle says they are due, plus what the user asked to add.
 * Items that are not due are deferred with their next due date, not cut.
 */
export function selectCandidates(history: HistoryItem[], tiers: TierAssignment[], additions: Addition[], catalogues: StoreCatalogue[]): { candidates: Candidate[]; excluded: Excluded[]; unmatchedAdditions: string[] } {
  const tierOf = new Map(tiers.map((t) => [t.itemId, t]));
  const candidates: Candidate[] = [];
  const excluded: Excluded[] = [];
  const toCandidate = (h: HistoryItem, t: TierAssignment): Candidate => ({ key: h.itemId, name: h.name, category: h.category, size: h.size, sku: h.sku, qty: h.lastQty, tier: t.tier, pinned: t.pinned, promoted: t.promoted, added: false, history: h });

  for (const h of history) {
    const t = tierOf.get(h.itemId)!;
    if (t.dropped) excluded.push({ history: h, tier: t.tier, reason: 'cut', note: 'Left out because you asked' });
    else if (h.dueThisWeek || t.pinned) candidates.push(toCandidate(h, t));
    else if (h.nextDue) excluded.push({ history: h, tier: t.tier, reason: 'deferred', note: `Not due until ${prettyDate(h.nextDue)}: bought about every ${h.medianDays} days, last on ${prettyDate(h.lastOrdered)}` });
    // Bought only once: no cycle yet, so it is neither due nor deferred.
  }

  const unmatchedAdditions: string[] = [];
  for (const addition of additions) {
    const qty = Math.max(1, Math.round(addition.qty ?? 1));
    const known = bestMatches(addition.item, history)[0];
    if (known) {
      const existing = candidates.find((c) => c.key === known.itemId);
      if (existing) { existing.qty += qty; existing.pinned = true; existing.added = true; continue; }
      const index = excluded.findIndex((e) => e.history.itemId === known.itemId);
      if (index >= 0) excluded.splice(index, 1);
      candidates.push({ ...toCandidate(known, tierOf.get(known.itemId)!), qty, pinned: true, added: true });
      continue;
    }
    const fresh = bestMatches(addition.item, catalogues.flatMap((c) => c.items)).sort((a, b) => a.price - b.price)[0];
    if (!fresh) { unmatchedAdditions.push(addition.item); continue; }
    candidates.push({ key: `add:${fresh.sku || fresh.itemId}`, name: fresh.name, category: fresh.category, size: fresh.size, sku: fresh.sku, qty, tier: baseTier(fresh.category, '', fresh.name), pinned: true, promoted: false, added: true });
  }
  return { candidates, excluded, unmatchedAdditions };
}

// ---------- priority filling ----------

export type FitLine = { key: string; item: CatalogueItem; qty: number; tier: Tier; pinned: boolean; promoted: boolean; added: boolean; history?: HistoryItem };
export type FitItem = FitLine & { included: boolean; reason: Reason; note: string; replaces: string | null };
export type FitResult = { items: FitItem[]; itemsTotal: number; estTotal: number; withinBudget: boolean; shortfall: number; actions: string[] };

function keptNote(line: FitLine): string {
  if (line.added) return 'Added at your request';
  if (line.pinned) return 'Kept because you asked';
  if (line.promoted) return `In ${Math.round((line.history?.orderShare ?? 0) * 100)}% of your orders, so it counts as ${TIER_LABEL[line.tier].toLowerCase()} (${line.tier}) for this household`;
  if (line.tier === 'T1' || line.tier === 'T2') return `${TIER_LABEL[line.tier]} (${line.tier}): never cut`;
  return `${TIER_LABEL[line.tier]} (${line.tier}): due this week`;
}

/**
 * Fits the basket to the budget at one store, cutting from the bottom:
 *   1. remove treats (T5), most expensive first
 *   2. swap to a cheaper equivalent (same category, size within 25%), biggest saving first
 *   3. reduce fresh essentials (T3) by one, never below one
 *   4. remove household items (T4), then fresh essentials (T3), most expensive first
 * Water (T1) and staples (T2) are never removed. Pinned items are never touched.
 * If the basket is still over budget the shortfall is reported, not hidden.
 */
export function fitBudget(lines: FitLine[], catalogue: StoreCatalogue, budgetAed: number): FitResult {
  const fees = catalogue.deliveryFee + catalogue.serviceFee;
  const items: FitItem[] = lines.map((line) => ({ ...line, included: true, reason: 'kept', note: keptNote(line), replaces: null }));
  const actions: string[] = [];
  const total = () => r2(items.filter((i) => i.included).reduce((sum, i) => sum + i.item.price * i.qty, 0) + fees);
  const over = () => total() > budgetAed;
  const byCost = (a: FitItem, b: FitItem) => b.item.price * b.qty - a.item.price * a.qty || a.item.name.localeCompare(b.item.name);
  const open = (tier: Tier) => items.filter((i) => i.included && !i.pinned && i.tier === tier).sort(byCost);
  const cut = (item: FitItem, note: string) => { item.included = false; item.reason = 'cut'; item.note = note; actions.push(`cut ${item.item.name}`); };

  for (const item of open('T5')) if (over()) cut(item, `${TIER_LABEL.T5} (T5): cut first to fit the budget`);

  if (over()) {
    const swaps = items.filter((i) => i.included && !i.pinned)
      .map((item) => ({ item, to: cheaperSwap(item.item, catalogue) }))
      .filter((s): s is { item: FitItem; to: CatalogueItem } => !!s.to)
      .sort((a, b) => (b.item.item.price - b.to.price) * b.item.qty - (a.item.item.price - a.to.price) * a.item.qty);
    for (const { item, to } of swaps) {
      if (!over()) break;
      const saving = r2((item.item.price - to.price) * item.qty);
      const drift = item.history?.driftPct && item.history.driftPct > 5 ? `Up ${item.history.driftPct}% since ${prettyDate(item.history.driftSince!)}; ` : '';
      item.replaces = item.item.name;
      item.note = `${drift}${to.name} saves AED ${saving.toFixed(2)}`;
      item.item = to;
      item.reason = 'swapped';
      actions.push(`swapped ${item.replaces} for ${to.name}`);
    }
  }

  while (over()) {
    const reducible = open('T3').filter((i) => i.qty > 1)[0];
    if (!reducible) break;
    const from = reducible.history?.lastQty ?? reducible.qty;
    reducible.qty -= 1;
    reducible.reason = 'reduced';
    reducible.note = `Reduced from ${from} to ${reducible.qty} to fit the budget`;
    actions.push(`reduced ${reducible.item.name} to ${reducible.qty}`);
  }
  for (const tier of ['T4', 'T3'] as const) {
    for (const item of open(tier)) if (over()) cut(item, `${TIER_LABEL[tier]} (${tier}): removed to fit the budget after treats and swaps`);
  }

  const estTotal = total();
  return { items, itemsTotal: r2(estTotal - fees), estTotal, withinBudget: estTotal <= budgetAed, shortfall: r2(Math.max(0, estTotal - budgetAed)), actions };
}

// ---------- savings ----------

/** (4-week average weekly spend - planned weekly spend) x 4.33 weeks. An estimate, labelled as such. */
export function monthlySaving(averageWeeklySpend: number, plannedWeeklySpend: number): number {
  return r2((averageWeeklySpend - plannedWeeklySpend) * 4.33);
}

// ---------- the whole plan ----------

export type PlanInput = {
  history: HistoryItem[]; lastWeekTotal: number; averageWeeklySpend: number; catalogues: StoreCatalogue[];
  budget: BudgetRequest; overrides: Override[]; additions: Addition[];
  categorySpend: { category: string; weeklyAvg: number }[];
};
export type PlanResult = Omit<Plan, 'planId' | 'approvalToken' | 'sampleData'> & { chosen: Quote | null; unmatchedAdditions: string[]; actions: string[] };

/** Wraps each engine function so the caller can record it (X-ray). The default just runs it. */
export type Runner = <T>(fn: string, file: string, input: unknown, run: () => T, summary: (out: T) => string) => T | Promise<T>;
const direct: Runner = (_fn, _file, _input, run) => run();

/**
 * Tiers -> budget -> this week's candidates -> cheapest valid store -> fit to budget there
 * -> price the final basket at every store for the comparison table -> monthly saving.
 */
export async function planBasket(input: PlanInput, run: Runner = direct): Promise<PlanResult> {
  const tiers = await run('assignTiers', 'planner.ts', { items: input.history.map((h) => ({ name: h.name, category: h.category, orderShare: h.orderShare })), overrides: input.overrides },
    () => assignTiers(input.history, input.overrides), (t) => `${t.length} items tiered, ${t.filter((x) => x.promoted).length} promoted, ${t.filter((x) => x.pinned).length} pinned`);
  const budget = await run('resolveBudget', 'planner.ts', { request: input.budget, lastWeekTotal: input.lastWeekTotal },
    () => resolveBudget(input.budget, input.lastWeekTotal), (b) => `budget AED ${b.aed.toFixed(2)} (${b.source})`);
  const { candidates, excluded, unmatchedAdditions } = await run('selectCandidates', 'planner.ts', { additions: input.additions, items: input.history.map((h) => ({ name: h.name, nextDue: h.nextDue, dueThisWeek: h.dueThisWeek })) },
    () => selectCandidates(input.history, tiers, input.additions, input.catalogues), (c) => `${c.candidates.length} due this week, ${c.excluded.filter((e) => e.reason === 'deferred').length} not due`);

  const firstQuotes = await run('compareStores', 'stores.ts', { basket: candidates.map(({ history: _h, ...want }) => want), stores: input.catalogues.map((c) => ({ merchantId: c.merchantId, name: c.name, items: c.items.length, deliveryFee: c.deliveryFee, serviceFee: c.serviceFee })) },
    () => compareStores(candidates, input.catalogues), (q) => q.map((s) => `${s.name} AED ${s.estTotal.toFixed(2)}${s.valid ? '' : ' (missing essentials)'}`).join(' · '));
  const chosen = firstQuotes.find((q) => q.chosen) ?? null;
  const tierOf = new Map(tiers.map((t) => [t.itemId, t.tier]));
  const excludedItems = (catalogue?: StoreCatalogue): PlanItem[] => excluded.map((e) => {
    const price = catalogue?.items.find((i) => i.sku === e.history.sku)?.price ?? e.history.lastPrice;
    return { itemId: e.history.itemId, name: e.history.name, qty: e.history.lastQty, unitPrice: price, lineTotal: 0, tier: tierOf.get(e.history.itemId) ?? e.tier, reason: e.reason, note: e.note, replaces: null, nextDue: e.history.nextDue };
  });
  const insights = {
    categorySpend: input.categorySpend,
    priceDrift: input.history.filter((h) => (h.driftPct ?? 0) > 5).map((h) => ({ name: h.name, driftPct: h.driftPct! })).sort((a, b) => b.driftPct - a.driftPct),
  };
  const stripLines = (quotes: Quote[]) => quotes.map(({ lines: _lines, ...quote }) => quote);

  if (!chosen) {
    // No store carries every essential: say so instead of inventing a basket.
    return { lastWeekTotal: input.lastWeekTotal, budget, stores: stripLines(firstQuotes), items: excludedItems(), estTotal: 0, withinBudget: false, shortfall: 0, monthlySavingEstimate: 0, insights, chosen: null, unmatchedAdditions, actions: [] };
  }

  const catalogue = input.catalogues.find((c) => c.merchantId === chosen.merchantId)!;
  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const lines: FitLine[] = chosen.lines.map((l) => { const c = byKey.get(l.key)!; return { key: l.key, item: l.item, qty: l.qty, tier: c.tier, pinned: c.pinned, promoted: c.promoted, added: c.added, history: c.history }; });
  const fit = await run('fitBudget', 'planner.ts', { store: catalogue.name, budgetAed: budget.aed, fees: { deliveryFee: catalogue.deliveryFee, serviceFee: catalogue.serviceFee }, lines: lines.map((l) => ({ name: l.item.name, qty: l.qty, unitPrice: l.item.price, tier: l.tier, pinned: l.pinned })) },
    () => fitBudget(lines, catalogue, budget.aed), (f) => `${f.actions.length} changes, est. AED ${f.estTotal.toFixed(2)} ${f.withinBudget ? 'within' : `over by AED ${f.shortfall.toFixed(2)}`} budget`);

  // Comparison table for the basket the user will actually see.
  const finalWants: Want[] = fit.items.filter((i) => i.included).map((i) => ({ key: i.key, name: i.item.name, category: i.item.category, size: i.item.size, sku: i.item.sku, qty: i.qty, tier: i.tier }));
  const finalQuotes = await run('compareStores', 'stores.ts', { basket: finalWants, note: 'final basket, priced at every store' },
    () => compareStores(finalWants, input.catalogues).map((q) => ({ ...q, chosen: q.merchantId === chosen.merchantId })), (q) => q.map((s) => `${s.name} AED ${s.estTotal.toFixed(2)}${s.valid ? '' : ' (missing essentials)'}`).join(' · '));
  const saving = await run('monthlySaving', 'planner.ts', { averageWeeklySpend: input.averageWeeklySpend, plannedWeeklySpend: fit.estTotal, weeksPerMonth: 4.33 },
    () => monthlySaving(input.averageWeeklySpend, fit.estTotal), (s) => `about AED ${s.toFixed(2)} a month (estimate)`);

  const tierRank: Record<Tier, number> = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5 };
  const items: PlanItem[] = [
    ...fit.items.map((i) => ({
      itemId: i.item.itemId, name: i.item.name, qty: i.qty, unitPrice: i.item.price, lineTotal: i.included ? r2(i.item.price * i.qty) : 0,
      tier: i.tier, reason: i.reason, note: i.note, replaces: i.replaces, nextDue: null,
    })),
    ...excludedItems(catalogue),
  ].sort((a, b) => Number(a.lineTotal === 0) - Number(b.lineTotal === 0) || tierRank[a.tier] - tierRank[b.tier] || a.name.localeCompare(b.name));

  return {
    lastWeekTotal: input.lastWeekTotal, budget, stores: stripLines(finalQuotes), items, estTotal: fit.estTotal, withinBudget: fit.withinBudget,
    shortfall: fit.shortfall, monthlySavingEstimate: saving, insights, chosen, unmatchedAdditions, actions: fit.actions,
  };
}

// ---------- glue: analysis -> planner input ----------

/** Joins order lines with their cycle and drift into one record per product. */
export function itemHistory(lines: import('./analysis.ts').OrderLine[], cycleList: import('./analysis.ts').Cycle[], drifts: import('./analysis.ts').Drift[]): HistoryItem[] {
  const driftOf = new Map(drifts.map((d) => [d.itemId, d]));
  return cycleList.map((cycle) => {
    const latest = lines.filter((l) => l.itemId === cycle.itemId).sort((a, b) => b.date.localeCompare(a.date))[0];
    const drift = driftOf.get(cycle.itemId);
    return {
      itemId: cycle.itemId, name: cycle.name, category: latest.category, parentCategory: latest.parentCategory, size: latest.size, sku: latest.sku,
      orders: cycle.orders, orderShare: cycle.orderShare, lastQty: cycle.lastQty, lastPrice: latest.unitPrice, lastOrdered: cycle.lastOrdered,
      medianDays: cycle.medianDays, nextDue: cycle.nextDue, dueThisWeek: cycle.dueThisWeek,
      driftPct: drift?.driftPct ?? null, driftSince: drift?.firstDate ?? null,
    };
  });
}
