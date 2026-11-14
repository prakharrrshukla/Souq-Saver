// The five high-level tools the model can call. Each one talks to the Careem MCP through the
// client wrapper and runs the engine; the model never sees the 42 raw Careem tools.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Language, Plan, SseEvent } from '../contract.ts';
import { averageWeeklySpend, categorySpend, cycles, lastWeek, normaliseOrders, priceDrift, type CategorySpend, type Drift, type Order } from '../engine/analysis.ts';
import { itemHistory, matchScore, planBasket, type Addition, type BudgetRequest, type HistoryItem, type Override, type Runner } from '../engine/planner.ts';
import { parseFees, parseSearch, type StoreCatalogue } from '../engine/stores.ts';
import { issueToken } from '../mcp/approval.ts';
import { McpToolError, type CareemMcp } from '../mcp/client.ts';
import { step } from '../xray.ts';
import type { ChatMessage, ModelAdapter, ToolSpec } from './bedrock.ts';
import { brainPlan, type Learned } from '../brain/brain.ts';

export type Analysis = { orders: Order[]; history: HistoryItem[]; drift: Drift[]; spend: CategorySpend; lastWeekTotal: number; lastWeekDate: string; averageWeeklySpend: number };
export type Session = {
  id: string; language: Language; messages: ChatMessage[];
  analysis?: Analysis; budget: BudgetRequest; overrides: Override[]; additions: Addition[]; plan?: Plan;
  /** What the AI engine learned about the household (V2). */
  learned?: Learned; engine?: 'ai' | 'rules';
};
export const newSession = (id: string): Session => ({ id, language: 'en', messages: [], budget: {}, overrides: [], additions: [] });

/** `brain`: the AI household engine's model (Claude on Bedrock). Without it the rule-based engine runs, labelled as such. */
export type Deps = { mcp: CareemMcp; emit: (event: SseEvent) => void; sampleData: boolean; today?: () => Date; brain?: ModelAdapter };

const TIER = { type: 'string', enum: ['T1', 'T2', 'T3', 'T4', 'T5'] };
export const TOOL_SPECS: ToolSpec[] = [
  { name: 'analyse_history', description: "Read the household's past Careem grocery orders and return spend by category, price drift per item and reorder cycles. Sample data in the demo.", inputSchema: { type: 'object', properties: {} } },
  {
    name: 'plan_basket',
    description: "Build this week's grocery basket to a budget, fill it by necessity tier, and pick the cheapest store for the whole basket. Analyses history itself if needed. Budget, additions and overrides from earlier calls are remembered; pass only what changed. Returns the plan; the app shows it with an Approve button.",
    inputSchema: {
      type: 'object',
      properties: {
        budgetAed: { type: 'number', description: 'Absolute weekly budget in AED, e.g. 150' },
        cutPercent: { type: 'number', description: "Cut relative to last week's total, e.g. 15 for 'cut 15%'" },
        additions: { type: 'array', description: 'Items the user wants added this week', items: { type: 'object', properties: { item: { type: 'string', description: 'short English item word, e.g. "rice"' }, qty: { type: 'integer' } }, required: ['item'] } },
        overrides: { type: 'array', description: 'User decisions about specific items', items: { type: 'object', properties: { item: { type: 'string', description: 'short English item word, e.g. "chips"' }, keep: { type: 'boolean', description: 'true: never cut or reduce this item' }, drop: { type: 'boolean', description: 'true: leave this item out' }, tier: TIER }, required: ['item'] } },
      },
    },
  },
  { name: 'compare_stores', description: 'Compare Careem Quik and Careem Shops merchants for the current basket: items total, delivery fee, service fee, missing items, and which store is chosen.', inputSchema: { type: 'object', properties: {} } },
  { name: 'explain_change', description: 'Explain why one item was kept, swapped, reduced, deferred or cut in the current basket.', inputSchema: { type: 'object', properties: { item: { type: 'string', description: 'short English item word, e.g. "chocolate"' } }, required: ['item'] } },
  { name: 'request_approval', description: 'Call when the user wants to approve, order, pay or check out. Returns what the user must do: press the Approve button. This tool does not change anything.', inputSchema: { type: 'object', properties: {} } },
];

const SEED = (() => {
  try { return JSON.parse(readFileSync(fileURLToPath(new URL('../../../fixtures/out/manifest.json', import.meta.url)), 'utf8')).seed as number; } catch { return undefined; }
})();

/** Runs one engine function as an X-ray step: engine:<file>#<function>. */
const engine: Runner = (fn, file, input, run, summary) =>
  step('engine', fn, `engine:${file}#${fn}`, input, run, { summary, traceAs: fn === 'fitBudget' ? 'engine:priority_fill' : fn === 'compareStores' ? 'engine:store_picker' : undefined });

async function analyse(session: Session, deps: Deps): Promise<Analysis> {
  const { mcp } = deps;
  await step('data', 'order_history_source', mcp.mode === 'sandbox' ? `fixtures:seed=${SEED ?? 'unknown'}` : 'careem-mcp:production',
    { mcpUrl: mcp.url, mode: mcp.mode }, () => ({
      sampleData: deps.sampleData,
      origin: mcp.mode === 'sandbox' ? 'Generated sample household (fixtures/generate.ts) in Careem response format, served by the local Careem MCP sandbox' : "The signed-in user's Careem account",
    }), { dataOrigin: mcp.mode === 'sandbox' ? 'sample' : 'live', summary: (o) => o.origin });

  await mcp.call('user_info');
  const pages: any[] = [];
  for (const activity_type of ['groceries', 'shops']) {
    let next_cursor: string | undefined;
    for (let page = 0; page < 3; page++) { // 35 per page, up to 105 orders
      const response = await mcp.call('get_activities', { activity_status: 'past', activity_type, ...(next_cursor && { next_cursor }) });
      pages.push(response);
      next_cursor = response.paging?.has_next ? response.paging.next_cursor : undefined;
      if (!next_cursor) break;
    }
  }

  // Item details (category, size) in batches of 20 per merchant.
  const idsByMerchant = new Map<number, Set<number>>();
  for (const page of pages) for (const a of page.past_activities ?? []) for (const item of a.data?.items ?? []) {
    if (!['groceries', 'shops'].includes(a.type)) continue;
    idsByMerchant.set(a.data.merchant_id, (idsByMerchant.get(a.data.merchant_id) ?? new Set()).add(item.item_id));
  }
  const detailPages: any[] = [];
  for (const [merchant_id, ids] of idsByMerchant) {
    const sorted = [...ids].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 20) detailPages.push(await mcp.call('groceries_get_items_details', { merchant_id, item_ids: sorted.slice(i, i + 20) }));
  }

  const today = deps.today?.() ?? new Date();
  const { orders, lines } = await engine('normaliseOrders', 'analysis.ts', { activityPages: pages, detailPages }, () => normaliseOrders(pages, detailPages),
    (r) => `${r.orders.length} orders, ${r.lines.length} lines, AED ${r.orders.reduce((s, o) => s + o.total, 0).toFixed(2)} total`);
  if (!orders.length) throw new McpToolError('get_activities', 'no past grocery orders found for this account');
  const spend = await engine('categorySpend', 'analysis.ts', { lines }, () => categorySpend(lines), (s) => s.categories.slice(0, 3).map((c) => `${c.category} AED ${c.weeklyAvg.toFixed(2)}/wk`).join(', '));
  const drift = await engine('priceDrift', 'analysis.ts', { lines }, () => priceDrift(lines), (d) => `${d.filter((x) => x.flagged).length} items up more than 5%: ${d.filter((x) => x.flagged).map((x) => `${x.name} +${x.driftPct}%`).join(', ')}`);
  const cycleList = await engine('cycles', 'analysis.ts', { lines, today: today.toISOString() }, () => cycles(lines, today), (c) => `${c.filter((x) => x.dueThisWeek).length} items due this week, ${c.filter((x) => x.nextDue && !x.dueThisWeek).length} not due`);
  const last = (await engine('lastWeek', 'analysis.ts', { orders: orders.map((o) => ({ orderId: o.orderId, date: o.date, total: o.total })) }, () => lastWeek(orders), (l) => `last order ${l!.date}: AED ${l!.total.toFixed(2)}`))!;

  session.analysis = { orders, history: itemHistory(lines, cycleList, drift), drift, spend, lastWeekTotal: last.total, lastWeekDate: last.date, averageWeeklySpend: averageWeeklySpend(orders) };
  return session.analysis;
}

const feeFromText = (text: unknown) => Number(/(\d+(?:\.\d+)?)/.exec(String(text ?? ''))?.[1] ?? 0);

async function loadCatalogues(terms: string[], mcp: CareemMcp): Promise<StoreCatalogue[]> {
  const fees = async (merchant_id: number, fallbackDelivery = 0) => {
    try { return parseFees(await mcp.call('cart_get_basket_price', { merchant_id })); } catch { return { deliveryFee: fallbackDelivery, serviceFee: 0 }; }
  };
  const catalogues: StoreCatalogue[] = [];
  // Careem Quik: no merchant_id; the response says which dark store answered.
  const quik = parseSearch(await mcp.call('search_groceries_items', { search_terms: terms }));
  catalogues.push({ merchantId: quik.merchantId, name: quik.merchantName ?? 'Careem Quik', type: 'quik', ...(await fees(Number(quik.merchantId))), items: quik.items });
  // Careem Shops: find merchants, then search each one.
  const shops = await mcp.call('global_search', { query: 'supermarket groceries' });
  for (const merchant of shops.merchants ?? []) {
    if (merchant.is_closed) continue;
    try {
      const found = parseSearch(await mcp.call('search_groceries_items', { search_terms: terms, merchant_id: merchant.id }));
      catalogues.push({ merchantId: String(merchant.id), name: merchant.title, type: 'shops', ...(await fees(merchant.id, feeFromText(merchant.secondary_info))), items: found.items });
    } catch (e) {
      if (!(e instanceof McpToolError)) throw e; // one store failing must not sink the comparison
    }
  }
  return catalogues;
}

const mergeBy = <T extends { item: string }>(existing: T[], incoming: T[] = []) => [...existing.filter((e) => !incoming.some((i) => i.item.toLowerCase() === e.item.toLowerCase())), ...incoming];

async function plan(session: Session, input: any, deps: Deps) {
  const analysis = session.analysis ?? (await analyse(session, deps));
  if (typeof input.cutPercent === 'number') session.budget = { cutPercent: input.cutPercent };
  else if (typeof input.budgetAed === 'number') session.budget = { budgetAed: input.budgetAed };
  session.overrides = mergeBy(session.overrides, input.overrides);
  session.additions = mergeBy(session.additions, input.additions);

  const terms = [...new Set([...analysis.history.map((h) => h.category.toLowerCase()), ...session.additions.map((a) => a.item.toLowerCase())])];
  const catalogues = await loadCatalogues(terms, deps.mcp);
  const insights = {
    categorySpend: analysis.spend.categories,
    priceDrift: analysis.history.filter((h) => (h.driftPct ?? 0) > 5).map((h) => ({ name: h.name, driftPct: h.driftPct! })).sort((a, b) => b.driftPct - a.driftPct),
  };

  // V2: the AI household engine decides, the calculator checks. Rules only if the AI is unavailable or fails.
  let result: { chosenMerchantId: string | null; unmatchedAdditions: string[] } & Omit<Plan, 'planId' | 'approvalToken' | 'sampleData'>;
  let aiSummary: string | undefined;
  session.engine = 'rules';
  if (deps.brain?.structured) {
    try {
      const ai = await brainPlan({
        model: deps.brain, orders: analysis.orders, catalogues, today: deps.today?.() ?? new Date(), lastWeekTotal: analysis.lastWeekTotal,
        budget: session.budget, overrides: session.overrides, additions: session.additions, insights,
      });
      const { learned, summary, ...rest } = ai;
      session.learned = learned;
      session.engine = 'ai';
      aiSummary = summary;
      result = rest;
    } catch (e) {
      await step('guard', 'ai_engine_fallback', 'ai-engine:guard', { reason: (e as Error).message }, () => ({ usingRules: true }),
        { summary: () => `AI engine unavailable (${(e as Error).message.slice(0, 80)}), using the rule-based engine` });
    }
  }
  if (session.engine === 'rules') {
    const rules = await planBasket({
      history: analysis.history, lastWeekTotal: analysis.lastWeekTotal, averageWeeklySpend: analysis.averageWeeklySpend, catalogues,
      budget: session.budget, overrides: session.overrides, additions: session.additions, categorySpend: analysis.spend.categories,
    }, engine);
    const { chosen: chosenQuote, actions: _actions, ...shape } = rules;
    result = { ...shape, chosenMerchantId: chosenQuote?.merchantId ?? null };
  }

  const { chosenMerchantId, unmatchedAdditions, ...shape } = result!;
  const chosen = shape.stores.find((s) => s.merchantId === chosenMerchantId && s.chosen) ?? null;
  const planId = `plan_${randomUUID().slice(0, 8)}`;
  const approvalToken = chosen ? await issueToken(session.id, planId) : '';
  session.plan = { planId, sampleData: deps.sampleData, ...shape, approvalToken };
  deps.emit({ event: 'plan', data: session.plan });
  return {
    planId, store: chosen?.name ?? null, estTotal: result!.estTotal, budget: result!.budget, withinBudget: result!.withinBudget, shortfall: result!.shortfall,
    lastWeekTotal: result!.lastWeekTotal, monthlySavingEstimate: result!.monthlySavingEstimate,
    items: result!.items.map(({ name, qty, unitPrice, lineTotal, tier, reason, note, replaces, nextDue }) => ({ name, qty, unitPrice, lineTotal, tier, reason, note, replaces, nextDue })),
    stores: result!.stores.map(({ name, estTotal, itemsTotal, deliveryFee, serviceFee, valid, missing, chosen: isChosen }) => ({ name, estTotal, itemsTotal, deliveryFee, serviceFee, valid, missing, chosen: isChosen })),
    priceDrift: result!.insights.priceDrift, itemsNotFound: unmatchedAdditions,
    engine: session.engine === 'ai' ? 'AI household engine (Claude on Bedrock), totals checked by the calculator' : 'rule-based engine',
    ...(session.learned && session.engine === 'ai' && { learned: { likes: session.learned.likes, dislikes: session.learned.dislikes, switches: session.learned.switches }, aiSummary }),
    sampleData: deps.sampleData, charged: false, next: 'The app shows this basket with an Approve button. Nothing has been charged.',
  };
}

const HANDLERS: Record<string, (session: Session, input: any, deps: Deps) => Promise<unknown>> = {
  analyse_history: async (session, _input, deps) => {
    const a = await analyse(session, deps);
    return {
      orders: a.orders.length, firstOrder: a.orders[0].date.slice(0, 10), lastOrder: a.lastWeekDate, lastWeekTotal: a.lastWeekTotal, averageWeeklySpend4Weeks: a.averageWeeklySpend,
      categorySpend: a.spend.categories, priceDrift: a.drift.map(({ name, firstPrice, latestPrice, driftPct, flagged }) => ({ name, firstPrice, latestPrice, driftPct, flagged })),
      cycles: a.history.filter((h) => h.medianDays).map((h) => ({ name: h.name, everyDays: h.medianDays, nextDue: h.nextDue, dueThisWeek: h.dueThisWeek })),
      sampleData: deps.sampleData,
    };
  },
  plan_basket: plan,
  compare_stores: async (session, _input, deps) => {
    if (!session.plan) await plan(session, {}, deps);
    return { stores: session.plan!.stores, rule: 'A store missing water or a staple is not valid. One store per order. Totals include delivery and service fees.', sampleData: deps.sampleData };
  },
  explain_change: async (session, input, deps) => {
    if (!session.plan) await plan(session, {}, deps);
    const term = String(input.item ?? '');
    const scored = session.plan!.items.map((item) => ({ item, score: matchScore(term, { name: `${item.name} ${item.replaces ?? ''}`, category: '' }) })).sort((a, b) => b.score - a.score)[0];
    if (!scored || scored.score === 0) return { found: false, item: term };
    const { name, tier, reason, note, qty, unitPrice, nextDue, replaces } = scored.item;
    return { found: true, name, tier, reason, note, qty, unitPrice, nextDue, replaces, budget: session.plan!.budget, estTotal: session.plan!.estTotal };
  },
  request_approval: async (session) => {
    if (!session.plan?.approvalToken) return { error: 'There is no basket to approve yet.', kind: 'no_plan' };
    const store = session.plan.stores.find((s) => s.chosen)!;
    return { status: 'waiting_for_user', store: store.name, estTotal: session.plan.estTotal, instruction: 'The user must press the Approve button in the app. Chat cannot change the cart. Nothing is charged and nothing is ever checked out.', charged: false };
  },
};

/** Runs one tool as an X-ray "agent-tool" step. Errors come back as data so the model can explain them. */
export async function runTool(name: string, input: any, session: Session, deps: Deps): Promise<{ result: any; failed?: 'careem' | 'internal' }> {
  const handler = HANDLERS[name];
  if (!handler) return { result: { error: `unknown tool ${name}`, kind: 'internal' }, failed: 'internal' };
  try {
    const result = await step('agent-tool', name, `agent:tools.ts#${name}`, input ?? {}, () => handler(session, input ?? {}, deps), {
      summary: (r: any) => (r?.store ? `basket at ${r.store}, est. AED ${Number(r.estTotal).toFixed(2)}` : r?.error ?? 'ok'),
    });
    return { result };
  } catch (e) {
    const careem = e instanceof McpToolError;
    if (!careem) console.error(`[agent] tool ${name} failed:`, e);
    return { result: { error: careem ? `Careem tool ${e.tool} failed: ${e.message}` : 'internal error', kind: careem ? 'careem' : 'internal', retryable: true, nothingChanged: true }, failed: careem ? 'careem' : 'internal' };
  }
}
