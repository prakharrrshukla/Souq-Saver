// The AI household engine (V2). Claude on AWS Bedrock reads the household's Careem order history
// and makes every judgement: what this family likes and dislikes, what it switched away from,
// what is due this week, how essential each product is, which swaps are acceptable and which
// store to use. The calculator (check.ts) does every sum and rejects any plan that does not add up;
// the AI then revises. The AI never invents a price or a total.
//
// Everything the AI sees comes from Careem MCP responses (get_activities, groceries_get_items_details,
// search_groceries_items, global_search, cart_get_basket_price), reshaped but not interpreted.
import type { Plan, PlanItem, Tier } from '../contract.ts';
import type { ChatMessage, ModelAdapter, ToolSpec } from '../agent/bedrock.ts';
import { isoWeek, r2, type Order } from '../engine/analysis.ts';
import { matchScore, resolveBudget, type Addition, type BudgetRequest, type Override } from '../engine/planner.ts';
import { acceptable, compareStores, type CatalogueItem, type StoreCatalogue, type Want } from '../engine/stores.ts';
import { step } from '../xray.ts';
import { checkPlan, type BasketDraft, type Need } from './check.ts';

const TIER = { type: 'string', enum: ['T1', 'T2', 'T3', 'T4', 'T5'] };
const MAX_ATTEMPTS = 3;

// ---------- 1. reshape Careem data (no judgement) ----------

export type ProductHistory = {
  sku: string; name: string; category: string; parentCategory: string; size: string;
  purchases: { date: string; qty: number; unitPrice: number; store: string }[];
};

/** One record per product (by Careem master product id), purchases oldest first, across all stores. */
export function productHistory(orders: Order[]): ProductHistory[] {
  const bySku = new Map<string, ProductHistory>();
  for (const order of orders) {
    for (const line of order.lines) {
      const key = line.sku || `item:${line.itemId}`;
      const entry = bySku.get(key) ?? { sku: key, name: line.name, category: line.category, parentCategory: line.parentCategory, size: line.size, purchases: [] };
      entry.purchases.push({ date: line.date.slice(0, 10), qty: line.qty, unitPrice: line.unitPrice, store: order.merchantName });
      bySku.set(key, entry);
    }
  }
  return [...bySku.values()];
}

// ---------- 2. AI: learn the household ----------

export type Insight = {
  sku: string; decision: 'due' | 'not_due' | 'stopped' | 'occasional'; tier: Tier; qty: number;
  nextDue: string | null; loyal: boolean; reason: string;
};
export type Learned = { products: Insight[]; likes: string[]; dislikes: string[]; switches: string[] };

const LEARN_TOOL: ToolSpec = {
  name: 'household_insights',
  description: 'Report what you learned about this household from its Careem order history.',
  inputSchema: {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        description: 'Exactly one entry per product sku you were given.',
        items: {
          type: 'object',
          properties: {
            sku: { type: 'string' },
            decision: { type: 'string', enum: ['due', 'not_due', 'stopped', 'occasional'] },
            tier: TIER,
            qty: { type: 'integer', description: 'Usual quantity per order' },
            nextDue: { type: ['string', 'null'], description: 'YYYY-MM-DD when it will next be needed, for not_due items' },
            loyal: { type: 'boolean', description: 'Sticks to this exact product even though alternatives exist or were tried' },
            reason: { type: 'string', description: 'One short plain-English sentence citing the evidence (dates, counts)' },
          },
          required: ['sku', 'decision', 'tier', 'qty', 'loyal', 'reason'],
        },
      },
      likes: { type: 'array', items: { type: 'string' }, description: 'Short phrases, e.g. "Royal Mahal rice: every 3 weeks, never another brand"' },
      dislikes: { type: 'array', items: { type: 'string' }, description: 'Products tried and dropped' },
      switches: { type: 'array', items: { type: 'string' }, description: 'Product A replaced by product B, with when' },
    },
    required: ['products', 'likes', 'dislikes', 'switches'],
  },
};

const learnSystem = (today: string) => `You are the household engine of Souq Saver, a grocery assistant on the Careem super app in Dubai.
Today is ${today}. You receive every product this household bought through Careem (Careem Quik and Careem Shops stores) with each purchase date, quantity, unit price and store.
Learn the household from this data only. Do not assume anything the data does not show.

For each product decide:
- decision "due": it will run out within the next 7 days at this household's own rhythm. Bulk buys cover several weeks. A week with no order at all means the household was away, not that the habit changed.
- decision "not_due": bought on a regular rhythm but not needed in the next 7 days. Give nextDue.
- decision "stopped": the household replaced it with another product, or stopped buying it. Say what replaced it.
- decision "occasional": bought once or irregularly; not worth adding automatically.
- tier: T1 drinking water. T2 staples: rice, flour/atta, oil, dal, sugar, salt, baby essentials (diapers, formula, baby food), and basic foods this family buys in nearly every order (bread, eggs, milk, onions, tomatoes). T3 other fresh food. T4 household supplies. T5 treats: snacks, soft drinks, sweets, chocolate, ice cream, juice, biscuits. Treats stay T5 even when bought every week.
- qty: the usual quantity per order (not a bulk-buy outlier).
- loyal: true when they always buy this exact product, or tried an alternative and went back to it.
- Switches: when one product stops being bought around the time a similar product (same parent category, e.g. another kind of milk) starts being bought every order, the old product is "stopped" and the new one continues the habit.
- For each product you get timesBought, gapsDays between purchases and daysSinceLast, computed for you. A regular product is due when daysSinceLast plus 7 reaches its usual gap.
Also list likes, dislikes (tried once and dropped) and switches.
Never calculate money totals. Answer only by calling household_insights.`;

function instructionsText(overrides: Override[], additions: Addition[]): string {
  const parts = [
    ...overrides.filter((o) => o.keep).map((o) => `keep "${o.item}" (never cut or reduce)`),
    ...overrides.filter((o) => o.drop).map((o) => `leave out "${o.item}"`),
    ...overrides.filter((o) => o.tier).map((o) => `treat "${o.item}" as ${o.tier}`),
    ...additions.map((a) => `add ${a.qty ?? 1} x "${a.item}"`),
  ];
  return parts.length ? parts.join('; ') : 'none';
}

export async function learnHousehold(model: ModelAdapter, products: ProductHistory[], today: string): Promise<Learned> {
  // Plain arithmetic from the calculator (gaps and days since last purchase); the AI decides what they mean.
  const dayMs = 86_400_000;
  const payload = products.map((p) => {
    const t = p.purchases.map((x) => Date.parse(`${x.date}T00:00:00Z`));
    return {
      sku: p.sku, name: p.name, category: p.category, parentCategory: p.parentCategory, size: p.size,
      firstBought: p.purchases[0].date, lastBought: p.purchases[p.purchases.length - 1].date, timesBought: p.purchases.length,
      daysSinceLast: Math.round((Date.parse(`${today}T00:00:00Z`) - t[t.length - 1]) / dayMs),
      gapsDays: t.slice(1).map((v, i) => Math.round((v - t[i]) / dayMs)),
      purchases: p.purchases,
    };
  });
  return step('engine', 'learnHousehold', `ai-engine:${model.id}#learnHousehold`, { products: payload.length, today }, async () => {
    const { input } = await model.structured!(learnSystem(today), [{ role: 'user', content: [{ text: JSON.stringify({ today, products: payload }) }] }], LEARN_TOOL, 'AI engine: learn household');
    const learned = input as Learned;
    const known = new Set(products.map((p) => p.sku));
    learned.products = (learned.products ?? []).filter((i) => known.has(i.sku)).map((i) => ({ ...i, qty: Math.max(1, Math.round(i.qty || 1)), nextDue: i.nextDue ?? null }));
    // Anything the model skipped is treated as occasional, so nothing silently disappears.
    for (const p of products) if (!learned.products.some((i) => i.sku === p.sku)) learned.products.push({ sku: p.sku, decision: 'occasional', tier: 'T4', qty: 1, nextDue: null, loyal: false, reason: 'Not assessed' });
    return { products: learned.products, likes: learned.likes ?? [], dislikes: learned.dislikes ?? [], switches: learned.switches ?? [] };
  }, {
    traceAs: 'ai:learn_household',
    summary: (l) => `${l.products.filter((p) => p.decision === 'due').length} due, ${l.products.filter((p) => p.decision === 'not_due').length} not due, ${l.products.filter((p) => p.decision === 'stopped').length} stopped · ${[...l.switches, ...l.dislikes].slice(0, 2).join('; ') || 'no switches'}`,
  });
}

// ---------- 3. AI: build the basket, calculator checks ----------

const BASKET_TOOL: ToolSpec = {
  name: 'basket_plan',
  description: "This week's basket at one store.",
  inputSchema: {
    type: 'object',
    properties: {
      merchantId: { type: 'string', description: 'The one store for the whole order' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            need: { type: 'string', description: 'The need key this line covers' },
            itemId: { type: 'string', description: 'An itemId from the chosen store' },
            qty: { type: 'integer' },
            reason: { type: 'string', enum: ['kept', 'swapped', 'reduced'] },
            note: { type: 'string', description: 'One short sentence for the user' },
          },
          required: ['need', 'itemId', 'qty', 'reason', 'note'],
        },
      },
      cuts: { type: 'array', items: { type: 'object', properties: { need: { type: 'string' }, note: { type: 'string' } }, required: ['need', 'note'] } },
      summary: { type: 'string', description: 'Two short sentences on the choices you made' },
    },
    required: ['merchantId', 'lines', 'cuts', 'summary'],
  },
};

const basketSystem = `You build this week's grocery basket for a household on Careem, to a budget, at ONE store.
You get the household's needs (with tier, usual qty, brand loyalty and evidence), the user's instructions, the budget, and for every store: its delivery and service fees, a price check of the whole basket done by our calculator, and the items that store sells for each need.
Rules, in order:
1. Pick one store. A store that cannot supply a T1 or T2 need is not allowed. Prefer the store where the basket is cheapest including fees.
2. Every need appears exactly once: as a line or as a cut. Use only itemIds listed for the chosen store.
3. Delivery and service fees count toward the budget.
4. To fit the budget: cut T5 treats first (most expensive first), then swap to a cheaper equivalent ONLY where the household is not brand-loyal, then reduce T3 quantities (never below 1), then cut T4, then T3. Never cut T1 or T2. Never cut or reduce a need the user asked to keep.
5. If some treats still fit after the budget is met, you may keep them.
6. If the budget cannot be met without breaking rule 4, cut everything rule 4 allows, keep the rest, and say in the summary how much it is short and what would close the gap (e.g. a cheaper rice brand). Never break the rules to hit the number.
7. Do not calculate the final total yourself; our calculator checks every plan and tells you if it is over budget or invalid.
Answer only by calling basket_plan.`;

type StoreView = {
  merchantId: string; name: string; type: string; deliveryFee: number; serviceFee: number;
  calculatorCheck: { itemsTotal: number; estTotal: number; missing: string[]; validForEssentials: boolean };
  options: Record<string, { itemId: string; name: string; size: string; price: number }[]>;
};

function storeViews(needs: Need[], catalogues: StoreCatalogue[]): StoreView[] {
  const quotes = compareStores(needs.map(toWant), catalogues);
  return catalogues.map((catalogue) => {
    const quote = quotes.find((q) => q.merchantId === catalogue.merchantId)!;
    const options: StoreView['options'] = {};
    for (const need of needs) {
      const exact = catalogue.items.filter((i) => i.available && i.sku && i.sku === need.sku);
      const similar = need.category ? acceptable(need, catalogue) : need.matches?.(catalogue) ?? [];
      const list = [...new Map([...exact, ...similar].map((i) => [i.itemId, i])).values()].slice(0, 5);
      options[need.key] = list.map((i) => ({ itemId: i.itemId, name: i.name, size: i.size, price: i.price }));
    }
    return {
      merchantId: catalogue.merchantId, name: catalogue.name, type: catalogue.type, deliveryFee: catalogue.deliveryFee, serviceFee: catalogue.serviceFee,
      calculatorCheck: { itemsTotal: quote.itemsTotal, estTotal: quote.estTotal, missing: quote.missing, validForEssentials: quote.valid },
      options,
    };
  });
}

const toWant = (n: Need): Want => ({ key: n.key, name: n.name, category: n.category, size: n.size, sku: n.sku, qty: n.qty, tier: n.tier });

export async function buildBasket(model: ModelAdapter, needs: Need[], catalogues: StoreCatalogue[], budgetAed: number, instructions: string): Promise<{ draft: BasketDraft; check: ReturnType<typeof checkPlan>; attempts: number }> {
  const views = storeViews(needs, catalogues);
  const brief = {
    budgetAed, instructions,
    needs: needs.map((n) => ({ key: n.key, name: n.name, tier: n.tier, qty: n.qty, loyal: n.loyal, pinned: n.pinned, evidence: n.reason })),
    stores: views,
  };
  const messages: ChatMessage[] = [{ role: 'user', content: [{ text: JSON.stringify(brief) }] }];
  let last: { draft: BasketDraft; check: ReturnType<typeof checkPlan> } | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { input, turn } = await step('engine', 'buildBasket', `ai-engine:${model.id}#buildBasket`, { attempt, budgetAed, needs: needs.length }, () =>
      model.structured!(basketSystem, messages, BASKET_TOOL, `AI engine: build basket (attempt ${attempt})`), {
      traceAs: 'ai:build_basket',
      summary: (r) => `attempt ${attempt}: ${r.input?.lines?.length ?? 0} lines, ${r.input?.cuts?.length ?? 0} cuts at ${views.find((v) => v.merchantId === String(r.input?.merchantId))?.name ?? r.input?.merchantId}`,
    });
    const draft: BasketDraft = { merchantId: String(input.merchantId), lines: input.lines ?? [], cuts: input.cuts ?? [], summary: input.summary ?? '' };
    const check = await step('engine', 'checkPlan', 'calculator:check.ts#checkPlan', { draft, budgetAed }, () => checkPlan(draft, needs, catalogues, budgetAed), {
      traceAs: 'calculator:check_plan',
      summary: (c) => (c.ok ? `ok: AED ${c.estTotal.toFixed(2)} within AED ${budgetAed.toFixed(2)}` : `rejected: ${c.issues.slice(0, 2).join('; ')}`),
    });
    last = { draft, check };
    if (check.ok) return { ...last, attempts: attempt };
    // Send the calculator's findings back so the AI can revise its own plan.
    const toolUse = turn.toolCalls.find((c) => c.name === BASKET_TOOL.name)!;
    // Only the tool call goes back: some models (gpt-oss) reject their own reasoning blocks when echoed.
    messages.push({ role: 'assistant', content: turn.content.filter((b) => 'toolUse' in b) });
    messages.push({ role: 'user', content: [
      { toolResult: { toolUseId: toolUse.id, content: [{ json: { accepted: false, itemsTotal: check.itemsTotal, estTotal: check.estTotal, budgetAed, issues: check.issues } }], status: 'error' } },
      { text: 'The calculator rejected this plan. Fix every issue and call basket_plan again.' },
    ] });
  }
  return { ...last!, attempts: MAX_ATTEMPTS };
}

// ---------- 4. the whole V2 plan ----------

export type BrainInput = {
  model: ModelAdapter; orders: Order[]; catalogues: StoreCatalogue[]; today: Date;
  lastWeekTotal: number; budget: BudgetRequest; overrides: Override[]; additions: Addition[];
  insights: Plan['insights'];
};
export type BrainResult = Omit<Plan, 'planId' | 'approvalToken' | 'sampleData'> & { chosenMerchantId: string | null; learned: Learned; summary: string; unmatchedAdditions: string[] };

/** Average spend per calendar week over the latest 4 weeks that have orders (all stores, fees included). */
export function weeklySpend(orders: Order[], weeks = 4): number {
  const byWeek = new Map<string, number>();
  for (const o of orders) byWeek.set(isoWeek(o.date), r2((byWeek.get(isoWeek(o.date)) ?? 0) + o.total));
  const recent = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-weeks);
  return recent.length ? r2(recent.reduce((s, [, t]) => s + t, 0) / recent.length) : 0;
}

export async function brainPlan(input: BrainInput): Promise<BrainResult> {
  const today = input.today.toISOString().slice(0, 10);
  const products = productHistory(input.orders);
  const learned = await learnHousehold(input.model, products, today);
  const budget = resolveBudget(input.budget, input.lastWeekTotal);

  const productOf = new Map(products.map((p) => [p.sku, p]));
  const matchesOverride = (p: ProductHistory, o: Override) => matchScore(o.item, { name: p.name, category: p.category }) > 0;
  const needs: Need[] = [];
  const deferred: PlanItem[] = [];
  for (const insight of learned.products) {
    const p = productOf.get(insight.sku)!;
    const last = p.purchases[p.purchases.length - 1];
    const drop = input.overrides.some((o) => o.drop && matchesOverride(p, o));
    const keep = input.overrides.some((o) => o.keep && matchesOverride(p, o));
    const tier = input.overrides.find((o) => o.tier && matchesOverride(p, o))?.tier ?? insight.tier;
    const base = { itemId: insight.sku, name: p.name, qty: insight.qty, unitPrice: last.unitPrice, lineTotal: 0, tier, replaces: null };
    if (drop) deferred.push({ ...base, reason: 'cut', note: 'Left out because you asked', nextDue: null });
    else if (insight.decision === 'due' || keep) needs.push({ key: insight.sku, name: p.name, category: p.category, size: p.size, sku: p.sku, qty: insight.qty, tier, loyal: insight.loyal, pinned: keep, reason: insight.reason });
    else if (insight.decision === 'not_due') deferred.push({ ...base, reason: 'deferred', note: insight.reason, nextDue: insight.nextDue });
    else if (insight.decision === 'stopped') deferred.push({ ...base, reason: 'cut', note: `No longer bought: ${insight.reason}`, nextDue: null });
    // occasional: not shown
  }

  // Additions the user asked for this week: matched against what the stores sell.
  const unmatchedAdditions: string[] = [];
  for (const addition of input.additions) {
    const existing = needs.find((n) => matchScore(addition.item, { name: n.name, category: n.category }) > 0);
    if (existing) { existing.qty += Math.max(1, addition.qty ?? 1); existing.pinned = true; continue; }
    const found = input.catalogues.flatMap((c) => c.items).some((i) => matchScore(addition.item, i) > 0);
    if (!found) { unmatchedAdditions.push(addition.item); continue; }
    needs.push({
      key: `add:${addition.item.toLowerCase()}`, name: addition.item, category: '', size: '', sku: '', qty: Math.max(1, addition.qty ?? 1), tier: 'T3', loyal: false, pinned: true,
      reason: 'You asked to add this', matches: (c: StoreCatalogue) => c.items.filter((i) => i.available && matchScore(addition.item, i) > 0).sort((a, b) => a.price - b.price),
    });
  }

  const { draft, check, attempts } = await buildBasket(input.model, needs, input.catalogues, budget.aed, instructionsText(input.overrides, input.additions));
  if (!check.ok) throw new BrainRejected(check.issues, attempts);

  const catalogue = input.catalogues.find((c) => c.merchantId === draft.merchantId)!;
  const itemOf = new Map(catalogue.items.map((i) => [i.itemId, i]));
  const needOf = new Map(needs.map((n) => [n.key, n]));
  const lines: PlanItem[] = draft.lines.map((l) => {
    const item = itemOf.get(l.itemId)!;
    const need = needOf.get(l.need)!;
    return { itemId: item.itemId, name: item.name, qty: l.qty, unitPrice: item.price, lineTotal: r2(item.price * l.qty), tier: need.tier, reason: l.reason, note: l.note, replaces: l.reason === 'swapped' ? need.name : null, nextDue: null };
  });
  const cuts: PlanItem[] = draft.cuts.map((c) => {
    const need = needOf.get(c.need)!;
    const price = catalogue.items.find((i) => i.sku && i.sku === need.sku)?.price ?? productOf.get(need.sku)?.purchases.at(-1)?.unitPrice ?? 0;
    return { itemId: need.sku || need.key, name: need.name, qty: need.qty, unitPrice: price, lineTotal: 0, tier: need.tier, reason: 'cut', note: c.note, replaces: null, nextDue: null };
  });

  // Store table for the basket the user will see, priced by the calculator at every store.
  const finalWants: Want[] = draft.lines.map((l) => { const item = itemOf.get(l.itemId)!; const need = needOf.get(l.need)!; return { key: l.need, name: item.name, category: item.category, size: item.size, sku: item.sku, qty: l.qty, tier: need.tier }; });
  const stores = compareStores(finalWants, input.catalogues).map(({ lines: _l, ...q }) => ({ ...q, chosen: q.merchantId === draft.merchantId }));
  const tierRank: Record<Tier, number> = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5 };
  const items = [...lines, ...cuts, ...deferred].sort((a, b) => Number(a.lineTotal === 0) - Number(b.lineTotal === 0) || tierRank[a.tier] - tierRank[b.tier] || a.name.localeCompare(b.name));
  const avg = weeklySpend(input.orders);

  return {
    lastWeekTotal: input.lastWeekTotal, budget, stores, items, estTotal: check.estTotal, withinBudget: check.withinBudget, shortfall: check.shortfall,
    monthlySavingEstimate: r2((avg - check.estTotal) * 4.33), insights: input.insights,
    chosenMerchantId: draft.merchantId, learned, summary: draft.summary, unmatchedAdditions,
  };
}

export class BrainRejected extends Error {
  readonly issues: string[];
  readonly attempts: number;
  constructor(issues: string[], attempts: number) {
    super(`AI plan still invalid after ${attempts} attempts: ${issues.join('; ')}`);
    this.issues = issues;
    this.attempts = attempts;
  }
}

export type { CatalogueItem };
