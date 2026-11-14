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
import { compareStores, type CatalogueItem, type StoreCatalogue, type Want } from '../engine/stores.ts';
import { limits } from '../limits.ts';
import { step } from '../xray.ts';
import { budgetVerdict, canSupply, checkPlan, compatibleItems, type BasketDraft, type Check, type CheckContext, type Need } from './check.ts';
import { chooseStore, ruleBasket } from './fallback.ts';
import { historyProfile, validateLearned, type HistoryProfile } from './history.ts';
import { householdFocus, routeBasket, shelfLife, type HouseholdFocus, type Routing } from './routing.ts';

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
/** How the AI describes the household, shown to the user. Written from the order data only. */
export type Persona = { summary: string; routines: string[] };
export type Learned = { products: Insight[]; likes: string[]; dislikes: string[]; switches: string[]; persona: Persona };

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
      dislikes: { type: 'array', items: { type: 'string' }, description: 'Alternatives tried instead of a usual product and dropped, e.g. a cheaper rice brand bought once before going back to the usual one. A one-off purchase of something new is not a dislike.' },
      switches: { type: 'array', items: { type: 'string' }, description: 'Product A replaced by product B, with when. Also a group of products replaced by another group at the same time, e.g. noodles, cola and chips stopping in the week healthier items start. Products in a switch are not dislikes.' },
      persona: {
        type: 'object',
        description: 'How you would describe this household to a shop assistant, from the orders only',
        properties: {
          summary: { type: 'string', description: 'Two or three plain sentences: what kind of household this looks like (size judged from quantities, habits, diet, how they shop, any change over time such as larger orders), each point backed by the orders. Say "looks like" for anything inferred. No names, no guesses about religion, ethnicity or income.' },
          routines: { type: 'array', items: { type: 'string' }, description: 'Up to 4 short shopping routines, e.g. "Weekly Saturday shop at Careem Quik", "Bulk staples once a month at Marina Fresh Market"' },
        },
        required: ['summary', 'routines'],
      },
    },
    required: ['products', 'likes', 'dislikes', 'switches', 'persona'],
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
Also list likes, dislikes (tried once and dropped) and switches, and describe the household in persona (what the orders suggest about who they are and how they shop).
householdFocus is the share of this household's Careem spend on fresh produce, computed for you: say in the persona whether they shop mostly for fresh produce or mostly for long-shelf-life pantry items.
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

export async function learnHousehold(model: ModelAdapter, products: ProductHistory[], today: string, history: HistoryProfile, focus?: HouseholdFocus): Promise<Learned & { corrections: string[] }> {
  // Plain arithmetic from the calculator (gaps and days since last purchase); the AI decides what they mean.
  const dayMs = 86_400_000;
  const payload = products.map((p) => {
    const t = p.purchases.map((x) => Date.parse(`${x.date}T00:00:00Z`));
    return {
      sku: p.sku, name: p.name, category: p.category, parentCategory: p.parentCategory, size: p.size,
      firstBought: p.purchases[0].date, lastBought: p.purchases[p.purchases.length - 1].date, timesBought: p.purchases.length,
      daysSinceLast: Math.round((Date.parse(`${today}T00:00:00Z`) - t[t.length - 1]) / dayMs),
      gapsDays: t.slice(1).map((v, i) => Math.round((v - t[i]) / dayMs)),
      purchases: p.purchases.map((x) => ({ ...x, weekday: new Date(`${x.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Asia/Dubai' }) })),
    };
  });
  return step('engine', 'learnHousehold', `ai-engine:${model.id}#learnHousehold`, { products: payload.length, today }, async () => {
    const { input } = await model.structured!(learnSystem(today), [{ role: 'user', content: [{ text: JSON.stringify({ today, ...(focus && { householdFocus: { freshProduceShareOfSpend: focus.freshShare, label: focus.label } }), products: payload }) }] }], LEARN_TOOL, 'AI engine: learn household');
    // The answer is checked against the history before anything uses it.
    const { learned, corrections } = validateLearned(input, products, history);
    return { ...learned, corrections };
  }, {
    traceAs: 'ai:learn_household',
    summary: (l) => `${l.products.filter((p) => p.decision === 'due').length} due, ${l.products.filter((p) => p.decision === 'not_due').length} not due, ${l.products.filter((p) => p.decision === 'stopped').length} stopped · ${[...l.switches, ...l.dislikes].slice(0, 2).join('; ') || 'no switches'}${l.corrections.length ? ` · ${l.corrections.length} answers corrected from the history` : ''}`,
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
1. Use the one store in "stores" (its merchantId). Our code chose it from the shelf life of the order: fresh produce sends the whole basket to Careem Quik, long-shelf-life-only baskets go to the cheapest supermarket. A need that store does not sell goes in cuts (it is shown as not available).
2. Every need appears exactly once: as a line or as a cut. Use only itemIds listed for the chosen store under that need, and only the outcomes listed in the need's "allowed".
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

const essential = (tier: Tier) => tier === 'T1' || tier === 'T2';

/** Per store, the products that really satisfy each need (checked by code), same product first. */
function storeViews(needs: Need[], catalogues: StoreCatalogue[], context: CheckContext): StoreView[] {
  const quotes = compareStores(needs.map(toWant), catalogues);
  return catalogues.map((catalogue) => {
    const quote = quotes.find((q) => q.merchantId === catalogue.merchantId)!;
    const options: StoreView['options'] = {};
    for (const need of needs) {
      const exact = (i: CatalogueItem) => !!need.sku && i.sku === need.sku;
      const list = compatibleItems(need, catalogue)
        .filter((i) => exact(i) || (!need.loyal && !(i.sku && context.blockedSkus?.has(i.sku))))
        .sort((a, b) => Number(exact(b)) - Number(exact(a)) || a.price - b.price).slice(0, 5);
      options[need.key] = list.map((i) => ({ itemId: i.itemId, name: i.name, size: i.size, price: i.price }));
    }
    return {
      merchantId: catalogue.merchantId, name: catalogue.name, type: catalogue.type, deliveryFee: catalogue.deliveryFee, serviceFee: catalogue.serviceFee,
      calculatorCheck: { itemsTotal: quote.itemsTotal, estTotal: quote.estTotal, missing: quote.missing, validForEssentials: quote.valid },
      options,
    };
  });
}

/** What the calculator will accept for each need, so the AI is told the rules as data, not only in prose. */
function allowedOutcomes(need: Need): string[] {
  return ['kept', ...(need.loyal ? [] : ['swapped']), ...(!need.pinned && !essential(need.tier) && need.qty > 1 ? ['reduced'] : []), ...(!need.pinned && !essential(need.tier) ? ['cut'] : [])];
}

const toWant = (n: Need): Want => ({ key: n.key, name: n.name, category: n.category, size: n.size, sku: n.sku, qty: n.qty, tier: n.tier });

export async function buildBasket(model: ModelAdapter, needs: Need[], catalogues: StoreCatalogue[], budgetAed: number, instructions: string, context: CheckContext = {}): Promise<{ draft: BasketDraft; check: Check; attempts: number }> {
  // With a routing decision the AI only sees the routed store.
  const views = storeViews(needs, catalogues, context).filter((v) => !context.requiredMerchantId || v.merchantId === context.requiredMerchantId);
  const brief = {
    budgetAed, instructions,
    ...(context.requiredMerchantId && { routing: { merchantId: context.requiredMerchantId, reason: context.routingReason } }),
    needs: needs.map((n) => ({ key: n.key, name: n.name, tier: n.tier, qty: n.qty, loyal: n.loyal, pinned: n.pinned, allowed: allowedOutcomes(n), evidence: n.reason })),
    stores: views,
  };
  const messages: ChatMessage[] = [{ role: 'user', content: [{ text: JSON.stringify(brief) }] }];
  let last: { draft: BasketDraft; check: Check } | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { input, turn } = await step('engine', 'buildBasket', `ai-engine:${model.id}#buildBasket`, { attempt, budgetAed, needs: needs.length }, () =>
      model.structured!(basketSystem, messages, BASKET_TOOL, `AI engine: build basket (attempt ${attempt})`), {
      traceAs: 'ai:build_basket',
      summary: (r) => `attempt ${attempt}: ${Array.isArray(r.input?.lines) ? r.input.lines.length : 0} lines, ${Array.isArray(r.input?.cuts) ? r.input.cuts.length : 0} cuts at ${views.find((v) => v.merchantId === String(r.input?.merchantId))?.name ?? r.input?.merchantId}`,
    });
    const draft: BasketDraft = { merchantId: String(input?.merchantId), lines: input?.lines ?? [], cuts: input?.cuts ?? [], summary: String(input?.summary ?? '') };
    const check = await checkStep(draft, needs, catalogues, budgetAed, context);
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

function checkStep(draft: BasketDraft, needs: Need[], catalogues: StoreCatalogue[], budgetAed: number, context: CheckContext) {
  return step('engine', 'checkPlan', 'calculator:check.ts#checkPlan', { draft, budgetAed }, () => checkPlan(draft, needs, catalogues, budgetAed, context), {
    traceAs: 'calculator:check_plan',
    summary: (c) => (c.ok ? `ok: ${budgetVerdict(c, budgetAed)}` : `rejected (${budgetVerdict(c, budgetAed)}): ${c.issues.slice(0, 2).join('; ')}`),
  });
}

// ---------- 4. the whole plan ----------

export type BrainInput = {
  /** The AI model. Without one (Bedrock off) the household is read by the history rules and the basket by the rule planner. */
  model?: ModelAdapter; orders: Order[]; catalogues: StoreCatalogue[]; today: Date;
  lastWeekTotal: number; budget: BudgetRequest; overrides: Override[]; additions: Addition[];
  insights: Plan['insights'];
};
export type BrainResult = Omit<Plan, 'planId' | 'approvalToken' | 'sampleData' | 'routing'> & {
  chosenMerchantId: string | null; learned: Learned; summary: string; unmatchedAdditions: string[];
  check: Check | null; engine: NonNullable<Plan['engine']>; routing: Routing | null;
};

/** A request the planner cannot carry out as asked (e.g. a quantity over the limit). Reported to the user, never clamped. */
export class PlanInputError extends Error {
  readonly code: string;
  readonly field: string;
  constructor(code: string, field: string, message: string) { super(message); this.code = code; this.field = field; }
}

/** Average spend per calendar week over the latest 4 weeks that have orders (all stores, fees included). */
export function weeklySpend(orders: Order[], weeks = 4): number {
  const byWeek = new Map<string, number>();
  for (const o of orders) byWeek.set(isoWeek(o.date), r2((byWeek.get(isoWeek(o.date)) ?? 0) + o.total));
  const recent = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-weeks);
  return recent.length ? r2(recent.reduce((s, [, t]) => s + t, 0) / recent.length) : 0;
}

/** This week's needs from the household profile and the user's instructions; the rest is deferred, cut or unavailable. */
function needsFor(learned: Learned, products: ProductHistory[], overrides: Override[], additions: Addition[], catalogues: StoreCatalogue[]) {
  const { maxQtyPerLine } = limits();
  const productOf = new Map(products.map((p) => [p.sku, p]));
  const matches = (p: { name: string; category: string }, term: string) => matchScore(term, p) > 0;
  const needs: Need[] = [];
  const deferred: PlanItem[] = [];
  const blockedSkus = new Map<string, string>();
  const insightOf = new Map(learned.products.map((i) => [i.sku, i]));
  for (const insight of learned.products) {
    const p = productOf.get(insight.sku)!;
    const last = p.purchases[p.purchases.length - 1];
    const drop = overrides.some((o) => o.drop && matches(p, o.item));
    const keep = overrides.some((o) => o.keep && matches(p, o.item));
    const tier = overrides.find((o) => o.tier && matches(p, o.item))?.tier ?? insight.tier;
    const base = { itemId: insight.sku, name: p.name, qty: insight.qty, unitPrice: last.unitPrice, lineTotal: 0, tier, replaces: null };
    if (drop) { deferred.push({ ...base, reason: 'cut', note: 'Left out because you asked', nextDue: null }); blockedSkus.set(p.sku, 'you asked to leave it out'); }
    else if (insight.decision === 'due' || keep) needs.push({ key: insight.sku, name: p.name, category: p.category, parentCategory: p.parentCategory, size: p.size, sku: p.sku, qty: insight.qty, tier, loyal: insight.loyal, pinned: keep, reason: insight.reason });
    else if (insight.decision === 'not_due') deferred.push({ ...base, reason: 'deferred', note: insight.reason, nextDue: insight.nextDue });
    else if (insight.decision === 'stopped') { deferred.push({ ...base, reason: 'cut', note: `No longer bought: ${insight.reason}`, nextDue: null }); blockedSkus.set(p.sku, `the household stopped buying it (${insight.reason})`); }
    // occasional: not shown
  }

  // Additions: an existing need first, then a product from the history, then anything the stores sell.
  const unmatchedAdditions: string[] = [];
  for (const addition of additions) {
    const qty = addition.qty ?? 1;
    const tooMany = (name: string, total: number) => new PlanInputError('quantity_out_of_range', 'qty', `${total} x ${name} is over the limit of ${maxQtyPerLine} per item.`);
    const existing = needs.find((n) => matches(n, addition.item));
    if (existing) {
      if (existing.qty + qty > maxQtyPerLine) throw tooMany(existing.name, existing.qty + qty);
      existing.qty += qty; existing.pinned = true; existing.reason = 'You asked to add this';
      continue;
    }
    const known = products.find((p) => matches(p, addition.item));
    if (known) {
      const index = deferred.findIndex((d) => d.itemId === known.sku);
      if (index >= 0) deferred.splice(index, 1);
      blockedSkus.delete(known.sku); // the user asked for it again
      needs.push({ key: known.sku, name: known.name, category: known.category, parentCategory: known.parentCategory, size: known.size, sku: known.sku, qty, tier: insightOf.get(known.sku)?.tier ?? 'T3', loyal: false, pinned: true, reason: 'You asked to add this' });
      continue;
    }
    const sold = (c: StoreCatalogue) => c.items.filter((i) => i.available && matchScore(addition.item, i) > 0).sort((a, b) => a.price - b.price);
    if (!catalogues.some((c) => sold(c).length)) { unmatchedAdditions.push(addition.item); continue; }
    needs.push({ key: `add:${addition.item.toLowerCase()}`, name: addition.item, category: '', size: '', sku: '', qty, tier: 'T3', loyal: false, pinned: true, reason: 'You asked to add this', matches: sold });
  }
  return { needs, deferred, blockedSkus, unmatchedAdditions };
}

/**
 * The whole plan. The household profile comes from the AI (validated against the history) or, without
 * a model, from the history rules. The basket comes from the AI; if its basket still fails the
 * calculator after its attempts, the rule planner builds one from the same needs. Both go through
 * checkPlan, and which one was used is reported in `engine`.
 */
export async function brainPlan(input: BrainInput): Promise<BrainResult> {
  const today = input.today.toISOString().slice(0, 10);
  const products = productHistory(input.orders);
  const history = historyProfile(products, today, input.orders.length);
  const focus = householdFocus(input.orders.flatMap((o) => o.lines));
  const ai = input.model?.structured ? input.model : undefined;
  let learned: Learned = history.learned;
  let profile: 'ai' | 'history' = 'history';
  let fallbackReason = ai ? undefined : 'the AI model is not connected';
  if (ai) {
    try {
      const { corrections: _c, ...validated } = await learnHousehold(ai, products, today, history, focus);
      learned = validated;
      profile = 'ai';
    } catch (e) {
      fallbackReason = `the AI could not read the household (${(e as Error).message.slice(0, 120)})`;
    }
  }
  const budget = resolveBudget(input.budget, input.lastWeekTotal);
  const { needs, deferred, blockedSkus, unmatchedAdditions } = needsFor(learned, products, input.overrides, input.additions, input.catalogues);
  // The household's focus decides what counts as essential: for a fresh-focused household, the fresh produce it
  // buys about every week; for a long-shelf-life household, the pantry food it buys about every week.
  // Treats stay treats and household goods stay household goods.
  if (focus.label !== 'mixed') {
    const recentWeeks = [...new Set(input.orders.map((o) => isoWeek(o.date)))].sort().slice(-6);
    const regular = (sku: string) => {
      const weeks = new Set(products.find((x) => x.sku === sku)?.purchases.map((x) => isoWeek(x.date)) ?? []);
      return recentWeeks.filter((w) => weeks.has(w)).length / recentWeeks.length >= 0.8; // about every week
    };
    const wanted = focus.label === 'fresh' ? 'fresh' : 'long';
    const why = focus.label === 'fresh'
      ? `Fresh produce is a priority for this household (${Math.round(focus.freshShare * 100)}% of its spend).`
      : `Pantry staples are a priority for this household (${Math.round((1 - focus.freshShare) * 100)}% of its spend is long-shelf-life).`;
    for (const need of needs) {
      if (need.sku && shelfLife(need) === wanted && (need.tier === 'T3' || need.tier === 'T4') && !/household/i.test(need.parentCategory ?? '') && regular(need.sku)) {
        need.tier = 'T2';
        need.reason = `${why} ${need.reason}`;
      }
    }
  }
  const context: CheckContext = { blockedSkus };
  const routing = await step('engine', 'routeBasket', 'engine:routing.ts#routeBasket', { needs: needs.map((n) => ({ name: n.name, category: n.category, parentCategory: n.parentCategory, shelfLife: shelfLife(n) })) },
    () => routeBasket(needs, input.catalogues, context), { traceAs: 'engine:store_router', summary: (r) => (r ? `${r.storeName}: ${r.reason}` : 'no store has every essential') });
  if (routing) Object.assign(context, { requiredMerchantId: routing.merchantId, routingReason: routing.reason });

  let draft: BasketDraft | null = null;
  let check: Check | null = null;
  let basketBy: 'ai' | 'rules' = 'rules';
  let summary = '';
  if (ai && profile === 'ai' && routing) {
    try {
      const built = await buildBasket(ai, needs, input.catalogues, budget.aed, instructionsText(input.overrides, input.additions), context);
      if (built.check.ok) { draft = built.draft; check = built.check; basketBy = 'ai'; summary = built.draft.summary; }
      else fallbackReason = `the AI's basket failed the checks after ${built.attempts} attempts (${built.check.issues[0]})`;
    } catch (e) {
      fallbackReason = `the AI could not build a basket (${(e as Error).message.slice(0, 120)})`;
    }
  }
  if (!draft) {
    await step('guard', 'ai_basket_fallback', 'ai-engine:guard', { reason: fallbackReason, profile }, () => ({ planner: 'rules', profile }),
      { summary: () => `rule-based planner with the ${profile === 'ai' ? "AI's" : 'history'} household profile: ${fallbackReason}` });
    const { chosen } = await step('engine', 'compareStores', 'engine:fallback.ts#chooseStore', { needs: needs.map(toWant), stores: input.catalogues.map((c) => c.name) },
      () => { const r = chooseStore(needs, input.catalogues, context); return { ...r, chosen: routing ? r.choices.find((c) => c.catalogue.merchantId === routing.merchantId) ?? null : null }; }, {
        traceAs: 'engine:store_picker',
        summary: (r) => `${r.choices.map((c) => `${c.catalogue.name} AED ${c.total.toFixed(2)}${c.missingEssential ? ' (missing essentials)' : ''}`).join(' · ')} → ${r.chosen?.catalogue.name ?? 'none'} (routing)`,
      });
    if (chosen) {
      draft = await step('engine', 'fitBudget', 'engine:fallback.ts#ruleBasket', { store: chosen.catalogue.name, budgetAed: budget.aed }, () => ruleBasket(needs, chosen, budget.aed, context),
        { traceAs: 'engine:priority_fill', summary: (d) => `${d.lines.length} lines, ${d.cuts.length} cut or unavailable at ${chosen.catalogue.name}` });
      check = await checkStep(draft, needs, input.catalogues, budget.aed, context);
      if (!check.ok) {
        // The limits make this household's essentials impossible: tell the user, do not trim their basket.
        const overLimit = check.issues.find((i) => /over the (basket )?limit/.test(i));
        if (overLimit) throw new PlanInputError('basket_limit', 'limits', overLimit);
        throw new Error(`rule-based basket failed the calculator: ${check.issues.join('; ')}`);
      }
    }
  }
  const engine: BrainResult['engine'] = { basket: basketBy, profile, ...(profile === 'ai' && { model: ai!.id }), ...(basketBy === 'rules' && { fallbackReason }) };
  const avg = weeklySpend(input.orders);
  const tierRank: Record<Tier, number> = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5 };
  const sort = (items: PlanItem[]) => items.sort((a, b) => Number(a.lineTotal === 0) - Number(b.lineTotal === 0) || tierRank[a.tier] - tierRank[b.tier] || a.name.localeCompare(b.name));
  const unavailable = (name: string, qty: number, note: string, tier: Tier = 'T3', itemId = `add:${name.toLowerCase()}`): PlanItem => ({ itemId, name, qty, unitPrice: 0, lineTotal: 0, tier, reason: 'unavailable', note, replaces: null, nextDue: null });
  const notFound = unmatchedAdditions.map((term) => unavailable(term, input.additions.find((a) => a.item === term)?.qty ?? 1, 'Not sold at any nearby Careem store'));

  if (!draft || !check) {
    // No store has every essential: say so instead of inventing a basket.
    const stores = compareStores(needs.map(toWant), input.catalogues).map(({ lines: _l, ...q }) => ({ ...q, chosen: false }));
    return {
      lastWeekTotal: input.lastWeekTotal, budget, stores, estTotal: 0, withinBudget: false, shortfall: 0, monthlySavingEstimate: 0, insights: { ...input.insights, focus },
      items: sort([...needs.map((n) => unavailable(n.name, n.qty, 'No nearby store sells every essential', n.tier, n.sku || n.key)), ...notFound, ...deferred]),
      chosenMerchantId: null, learned, summary, unmatchedAdditions, check: null, engine, routing,
    };
  }

  const catalogue = input.catalogues.find((c) => c.merchantId === draft.merchantId)!;
  const itemOf = new Map(catalogue.items.map((i) => [i.itemId, i]));
  const needOf = new Map(needs.map((n) => [n.key, n]));
  const productOf = new Map(products.map((p) => [p.sku, p]));
  const lines: PlanItem[] = draft.lines.map((l) => {
    const item = itemOf.get(String(l.itemId))!;
    const need = needOf.get(l.need)!;
    return { itemId: item.itemId, name: item.name, qty: l.qty, unitPrice: item.price, lineTotal: r2(item.price * l.qty), tier: need.tier, reason: l.reason, note: l.note, replaces: l.reason === 'swapped' ? need.name : null, nextDue: null };
  });
  const cuts: PlanItem[] = draft.cuts.map((c) => {
    const need = needOf.get(c.need)!;
    if (!canSupply(need, catalogue)) return unavailable(need.name, need.qty, `Not sold at ${catalogue.name}`, need.tier, need.sku || need.key);
    const price = catalogue.items.find((i) => i.sku && i.sku === need.sku)?.price ?? productOf.get(need.sku)?.purchases.at(-1)?.unitPrice ?? 0;
    return { itemId: need.sku || need.key, name: need.name, qty: need.qty, unitPrice: price, lineTotal: 0, tier: need.tier, reason: 'cut', note: c.note, replaces: null, nextDue: null };
  });

  // Store table for the basket the user will see, priced by the calculator at every store.
  const finalWants: Want[] = draft.lines.map((l) => { const item = itemOf.get(String(l.itemId))!; const need = needOf.get(l.need)!; return { key: l.need, name: item.name, category: item.category, size: item.size, sku: item.sku, qty: l.qty, tier: need.tier }; });
  const stores = compareStores(finalWants, input.catalogues).map(({ lines: _l, ...q }) => ({ ...q, chosen: q.merchantId === draft.merchantId }));

  return {
    lastWeekTotal: input.lastWeekTotal, budget, stores, items: sort([...lines, ...cuts, ...notFound, ...deferred]),
    estTotal: check.estTotal, withinBudget: check.withinBudget, shortfall: check.shortfall,
    monthlySavingEstimate: r2((avg - check.estTotal) * 4.33), insights: { ...input.insights, focus },
    chosenMerchantId: draft.merchantId, learned, summary, unmatchedAdditions, check, engine, routing,
  };
}

export type { CatalogueItem };

