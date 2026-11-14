// Regressions from the stress test (reliability, validation, safety). Deterministic: a scripted model
// plays Bedrock (orchestrator + AI engine), everything else is real: HTTP API, agent, engine,
// calculator, approval gate, MCP client and the local Careem MCP sandbox serving Leonardo.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startHttp } from '../../sandbox/careem-mcp-ts/src/server.ts';
import { build, fixedTime } from '../../fixtures/generate.ts';
import type { ChatMessage, ModelAdapter, ToolSpec, Turn } from '../src/agent/bedrock.ts';
import { buildApp } from '../src/api/server.ts';
import { postSse } from '../src/api/sseClient.ts';
import type { Plan, SseEvent, XrayStep } from '../src/contract.ts';
import { normaliseOrders } from '../src/engine/analysis.ts';
import { parseFees, parseSearch, type StoreCatalogue } from '../src/engine/stores.ts';
import { checkPlan, type Need } from '../src/brain/check.ts';
import { CareemMcp } from '../src/mcp/client.ts';

// ---------- an independent oracle for Bedrock Converse message sequencing ----------
/** The rules Bedrock enforces (it answers ValidationException otherwise). */
function converseProblems(messages: ChatMessage[]): string[] {
  const problems: string[] = [];
  if (messages[0]?.role !== 'user') problems.push('first message must be from the user');
  messages.forEach((m, i) => {
    if (i > 0 && messages[i - 1].role === m.role) problems.push(`messages ${i - 1} and ${i} are both ${m.role}`);
    if (!m.content.length) problems.push(`message ${i} is empty`);
    const uses = m.content.flatMap((b) => ('toolUse' in b ? [b.toolUse.toolUseId] : []));
    if (m.role === 'assistant' && uses.length) {
      const next = messages[i + 1];
      const results = next?.content.flatMap((b) => ('toolResult' in b ? [b.toolResult.toolUseId] : [])) ?? [];
      for (const id of uses) if (!results.includes(id)) problems.push(`toolUse ${id} at ${i} has no toolResult`);
    }
    if (m.role === 'user') {
      const results = m.content.flatMap((b) => ('toolResult' in b ? [b.toolResult.toolUseId] : []));
      const prevUses = messages[i - 1]?.content.flatMap((b) => ('toolUse' in b ? [b.toolUse.toolUseId] : [])) ?? [];
      for (const id of results) if (!prevUses.includes(id)) problems.push(`toolResult ${id} at ${i} has no matching toolUse`);
    }
  });
  return problems;
}

// ---------- scripted model ----------
const LEARN: Record<string, { decision: string; tier: string; qty: number; loyal?: boolean; nextDue?: string }> = {
  sku_oasis_water_6x1500: { decision: 'due', tier: 'T1', qty: 2 },
  sku_royal_basmati_5kg: { decision: 'due', tier: 'T2', qty: 1, loyal: true },
  sku_golden_sella_5kg: { decision: 'occasional', tier: 'T2', qty: 1 },
  sku_noor_sunflower_1800: { decision: 'due', tier: 'T2', qty: 1, loyal: true },
  sku_marmoom_milk_2l: { decision: 'stopped', tier: 'T2', qty: 2 },
  sku_greenoat_oat_milk_1l: { decision: 'due', tier: 'T2', qty: 2 },
  sku_golden_eggs_30: { decision: 'due', tier: 'T2', qty: 1 },
  sku_red_onions_1kg: { decision: 'due', tier: 'T2', qty: 1 },
  sku_tomatoes_1kg: { decision: 'due', tier: 'T2', qty: 1 },
  sku_khayma_bread_6: { decision: 'due', tier: 'T2', qty: 2 },
  sku_crunchos_150: { decision: 'due', tier: 'T5', qty: 1, loyal: true },
  sku_fizzup_cola_6: { decision: 'due', tier: 'T5', qty: 1 },
  sku_chocojoy_4: { decision: 'due', tier: 'T5', qty: 1 },
  sku_polar_icecream_1l: { decision: 'due', tier: 'T5', qty: 1 },
  sku_teatime_biscuits_400: { decision: 'due', tier: 'T5', qty: 1 },
  sku_sunny_juice_1500: { decision: 'due', tier: 'T5', qty: 1 },
};
type Orchestrate = (messages: ChatMessage[], call: number) => Turn | Promise<Turn>;
type Basket = (brief: any, attempt: number) => any;
let ids = 0;
const toolTurn = (name: string, input: unknown): Turn => { const id = `tu_${ids++}`; return { content: [{ toolUse: { toolUseId: id, name, input } }], text: '', toolCalls: [{ id, name, input }], stopReason: 'tool_use', modelId: 'scripted' }; };
const textTurn = (text: string): Turn => ({ content: [{ text }], text, toolCalls: [], stopReason: 'end_turn', modelId: 'scripted' });
/** First call: the given tool call; after the tool result: the given text. */
const once = (name: string, input: unknown, text = 'Done.'): Orchestrate => (messages) => (messages.at(-1)!.content.some((b) => 'toolResult' in b) ? textTurn(text) : toolTurn(name, input));

class Scripted implements ModelAdapter {
  readonly id = 'scripted-bedrock'; readonly provider = 'test'; readonly isBedrock = true;
  conversations: ChatMessage[][] = [];
  calls = 0;
  basketCalls = 0;
  orchestrate: Orchestrate;
  basket?: Basket;
  constructor(orchestrate: Orchestrate | Turn, basket?: Basket) {
    this.orchestrate = typeof orchestrate === 'function' ? orchestrate : () => orchestrate;
    this.basket = basket;
  }
  async converse(_system: string, messages: ChatMessage[], tools: ToolSpec[]): Promise<Turn> {
    if (tools.length) this.conversations.push(structuredClone(messages));
    return this.orchestrate(messages, ++this.calls);
  }
  async structured(_system: string, messages: ChatMessage[], tool: ToolSpec) {
    const brief = JSON.parse((messages[0].content[0] as { text: string }).text);
    let input: any;
    if (tool.name === 'household_insights') {
      input = {
        products: brief.products.map((p: any) => ({ sku: p.sku, reason: 'scripted from the order dates', loyal: false, nextDue: null, ...(LEARN[p.sku] ?? { decision: 'occasional', tier: 'T4', qty: 1 }) })),
        likes: ['Royal Mahal rice, never another brand'], dislikes: ['Golden Sella rice, tried once'], switches: ['Cow milk to oat milk from October'],
        persona: { summary: 'Looks like a small household in Dubai Marina that shops weekly.', routines: ['Weekly shop at Careem Quik'] },
      };
    } else {
      input = (this.basket ?? goodBasket)(brief, ++this.basketCalls);
    }
    const id = `st_${ids++}`;
    return { input, turn: { content: [{ toolUse: { toolUseId: id, name: tool.name, input } }], text: '', toolCalls: [{ id, name: tool.name, input }], stopReason: 'tool_use', modelId: this.id } as Turn };
  }
}
/** A correct basket: cheapest store option per need, cut treats until the calculator is happy. */
const goodBasket: Basket = (brief) => {
  const store = brief.stores.find((s: any) => s.name === 'Marina Fresh Market');
  const lines: any[] = []; const cuts: any[] = [];
  for (const need of brief.needs) {
    const option = store.options[need.key]?.[0];
    if (!option || (need.tier === 'T5' && !need.pinned)) cuts.push({ need: need.key, note: 'Treat cut to fit the budget' });
    else lines.push({ need: need.key, itemId: option.itemId, qty: need.qty, reason: 'kept', note: 'Due this week' });
  }
  return { merchantId: store.merchantId, lines, cuts, summary: 'scripted' };
};
/** The live failure: the AI keeps cutting what the user asked to keep. */
const cutsPinned: Basket = (brief) => {
  const d = goodBasket(brief, 1);
  for (const need of brief.needs.filter((n: any) => n.pinned)) {
    d.lines = d.lines.filter((l: any) => l.need !== need.key);
    d.cuts.push({ need: need.key, note: 'cut to fit' });
  }
  return d;
};

// ---------- harness ----------
let sandbox: Awaited<ReturnType<typeof startHttp>>;
let mcp: CareemMcp;
let current: ModelAdapter;
let app: ReturnType<typeof buildApp>;
let api: string;
let n = 0;
const sid = () => `reg_${Date.now().toString(36)}_${n++}`;

beforeAll(async () => {
  const overridesPath = join(mkdtempSync(join(tmpdir(), 'souq-reg-')), 'o.json');
  writeFileSync(overridesPath, '{}');
  sandbox = await startHttp({ port: 0, overridesPath, quiet: true });
  mcp = new CareemMcp(sandbox.url);
  current = new Scripted(textTurn('hi'));
  app = buildApp({ mcp, model: () => current });
  api = `${await app.listen({ port: 0, host: '127.0.0.1' })}/api`;
});
afterAll(async () => { await app.close(); await mcp.close(); await sandbox.close(); });

type Of<K extends SseEvent['event']> = Extract<SseEvent, { event: K }>['data'];
const all = <K extends SseEvent['event']>(ev: SseEvent[], k: K) => ev.filter((e) => e.event === k).map((e) => e.data as Of<K>);
const one = <K extends SseEvent['event']>(ev: SseEvent[], k: K) => all(ev, k)[0];
const steps = (ev: SseEvent[]) => [...new Map(all(ev, 'xray').map((x) => [x.step.stepId, x.step])).values()] as XrayStep[];
const traces = (ev: SseEvent[]) => [...new Map(all(ev, 'trace').map((t) => [t.id, t])).values()];
const chat = (sessionId: string, message: string, extra: Record<string, unknown> = {}) => postSse(`${api}/chat`, { sessionId, message, ...extra });
const approve = (sessionId: string, plan: Plan) => postSse(`${api}/approve`, { sessionId, planId: plan.planId, approvalToken: plan.approvalToken || 'tok_none' });
const inBasket = (plan: Plan) => plan.items.filter((i) => i.lineTotal > 0);
/** Tool results in the latest conversation the model saw (each snapshot already includes the earlier turns). */
const toolResults = (m: Scripted) => (m.conversations.at(-1) ?? []).flatMap((msg) => msg.content.flatMap((b) => ('toolResult' in b ? [b.toolResult] : [])));

// Leonardo's catalogues, for calculator-level checks.
const data = build(fixedTime(new Date('2026-11-14T08:00:00Z')));
normaliseOrders([data.activities.pastGroceries, data.activities.pastShops], data.details.map((d) => d.response));
const cat = (response: any, name: string, fees: { deliveryFee: number; serviceFee: number }): StoreCatalogue => { const p = parseSearch(response); return { merchantId: p.merchantId, name, type: p.domain, ...fees, items: p.items }; };
const catalogues = [cat(data.search.quik, 'Careem Quik', { deliveryFee: 4, serviceFee: 1.5 }), cat(data.search.marina, 'Marina Fresh Market', parseFees(data.basketPrice.marina)), cat(data.search.jlt, 'JLT Organic Pantry', parseFees(data.basketPrice.jlt))];
const marina = catalogues[1];
const bySku = (sku: string) => marina.items.find((i) => i.sku === sku)!;
const water: Need = { key: 'water', name: 'Oasis Water', category: 'Drinking Water', size: '6 x 1.5 L', sku: 'sku_oasis_water_6x1500', qty: 2, tier: 'T1', loyal: false, pinned: false, reason: '' };
const oat: Need = { key: 'oat', name: 'GreenOat Oat Milk', category: 'Plant Milk', size: '1 L', sku: 'sku_greenoat_oat_milk_1l', qty: 2, tier: 'T2', loyal: false, pinned: false, reason: '' };

// ======================================================================================
describe('1. household preferences survive AI failure ("120 dirhams, keep chips, add bananas")', () => {
  const request = { budgetAed: 120, overrides: [{ item: 'chips', keep: true }], additions: [{ item: 'bananas', qty: 2 }] };
  let events: SseEvent[];
  let plan: Plan;
  beforeAll(async () => {
    current = new Scripted(once('plan_basket', request), cutsPinned);
    events = await chat(sid(), 'I only have 120 dirhams, keep my chips, add 2 kg of bananas');
    plan = one(events, 'plan');
  });

  test('a plan is returned and the fallback is disclosed, not presented as AI planning', () => {
    expect(plan).toBeTruthy();
    expect(plan.engine).toMatchObject({ basket: 'rules', profile: 'ai' });
    expect(plan.engine!.fallbackReason).toMatch(/3 attempts/);
    expect(one(events, 'message').text).toMatch(/rule-based/i);
  });

  test('the validated household profile survives the fallback', () => {
    expect(plan.insights.household?.summary).toMatch(/Looks like/);
    expect(plan.insights.household?.switches.join(' ')).toMatch(/oat milk/i);
  });

  test('loyal Royal Mahal rice is never swapped, cow milk does not come back, chips are kept', () => {
    const basket = inBasket(plan);
    expect(basket.some((i) => /store brand/i.test(i.name) || /Royal Mahal/i.test(i.replaces ?? ''))).toBe(false);
    expect(basket.some((i) => /Marmoom/i.test(i.name))).toBe(false);
    expect(basket.find((i) => /Chips/i.test(i.name))).toMatchObject({ reason: 'kept' });
  });

  test('bananas are included at the requested quantity, or reported as unavailable', () => {
    const bananas = plan.items.find((i) => /banana/i.test(i.name))!;
    expect(bananas).toBeTruthy();
    expect(bananas.lineTotal > 0 ? bananas.qty : bananas.reason).toEqual(bananas.lineTotal > 0 ? 2 : 'unavailable');
  });

  test('budget honesty: within AED 120, or an honest shortfall with approval blocked', () => {
    if (plan.withinBudget) expect(plan.estTotal).toBeLessThanOrEqual(120);
    else { expect(plan.shortfall).toBeGreaterThan(0); expect(plan.approvalToken).toBe(''); expect(plan.approval?.allowed).toBe(false); }
  });

  test('the fallback basket passed the same calculator', () => {
    const checks = steps(events).filter((s) => s.name === 'checkPlan');
    expect(checks.length).toBeGreaterThanOrEqual(4); // 3 AI attempts + the fallback
    expect(checks.at(-1)!.status).toBe('ok');
  });

  test('without Bedrock (rules only), loyalty and the oat-milk switch still hold', async () => {
    current = new (class extends Scripted { readonly isBedrock = false as any; structured = undefined as any; })(once('plan_basket', { cutPercent: 15 }));
    const p = one(await chat(sid(), 'cut 15%'), 'plan');
    expect(p.engine).toMatchObject({ basket: 'rules', profile: 'history' });
    expect(inBasket(p).some((i) => /store brand/i.test(i.name) || /Marmoom/i.test(i.name))).toBe(false);
  });
});

// ======================================================================================
describe('2. quantity limits and approval safety', () => {
  test('"Add 500 bags of rice" is refused with a helpful message, before any planning', async () => {
    const m = new Scripted(once('plan_basket', { additions: [{ item: 'rice', qty: 500 }] }));
    current = m;
    const ev = await chat(sid(), 'Add 500 bags of rice and keep everything else the same');
    expect(all(ev, 'plan')).toEqual([]);
    expect(one(ev, 'error')).toMatchObject({ kind: 'validation', code: 'quantity_out_of_range' });
    expect(one(ev, 'message').text).toMatch(/20/);
  });

  test('the same quantity sent by the model as a tool argument is rejected back to the model, not clamped', async () => {
    const m = new Scripted(once('plan_basket', { additions: [{ item: 'rice', qty: 500 }] }));
    current = m;
    const ev = await chat(sid(), 'add lots of rice please');
    expect(all(ev, 'plan')).toEqual([]);
    const r = toolResults(m).at(-1)!;
    expect(r.status).toBe('error');
    expect(JSON.stringify(r.content)).toMatch(/quantity_out_of_range/);
  });

  test('an over-budget plan gets no approval token, and approving it builds nothing', async () => {
    current = new Scripted(once('plan_basket', { budgetAed: 20 }));
    const s = sid();
    const p = one(await chat(s, 'My budget is 20 AED'), 'plan');
    expect(p.withinBudget).toBe(false);
    expect(p.approvalToken).toBe('');
    expect(p.approval).toMatchObject({ allowed: false, code: 'over_budget' });
    expect(all(await approve(s, p), 'cart')).toEqual([]);
  });

  test('a within-budget plan can still be approved exactly once', async () => {
    current = new Scripted(once('plan_basket', { cutPercent: 15 }));
    const s = sid();
    const p = one(await chat(s, 'cut 15%'), 'plan');
    expect(p.approval?.allowed).toBe(true);
    expect(all(await approve(s, p), 'cart')).toHaveLength(1);
    expect(all(await approve(s, p), 'cart')).toHaveLength(0);
  });
});

// ======================================================================================
describe('3. a product must actually satisfy the need', () => {
  const draft = (need: string, itemId: string, reason: 'kept' | 'swapped' | 'reduced' = 'kept', qty = 2) => ({ merchantId: marina.merchantId, lines: [{ need, itemId, qty, reason, note: '' }], cuts: [], summary: '' });
  test('chips cannot satisfy water', () => {
    const c = checkPlan(draft('water', bySku('sku_crunchos_150').itemId), [water], catalogues, 999);
    expect(c.ok).toBe(false);
    expect(c.issues.join(' ')).toMatch(/does not match/);
  });
  test('rice cannot satisfy water, and atta cannot satisfy rice', () => {
    const rice: Need = { key: 'rice', name: 'Royal Mahal', category: 'Basmati Rice', size: '5 kg', sku: 'sku_royal_basmati_5kg', qty: 1, tier: 'T2', loyal: false, pinned: false, reason: '' };
    expect(checkPlan(draft('water', bySku('sku_royal_basmati_5kg').itemId), [water], catalogues, 999).ok).toBe(false);
    expect(checkPlan(draft('rice', bySku('sku_chakki_atta_5kg').itemId, 'swapped', 1), [rice], catalogues, 999).ok).toBe(false);
  });
  test('a discontinued product (cow milk) cannot come back as a swap for oat milk', () => {
    const c = checkPlan(draft('oat', bySku('sku_marmoom_milk_2l').itemId, 'swapped'), [oat], catalogues, 999, { blockedSkus: new Map([['sku_marmoom_milk_2l', 'replaced by oat milk']]) });
    expect(c.ok).toBe(false);
  });
  test('a different product labelled "kept" is rejected (it must say swapped)', () => {
    const rice: Need = { key: 'rice', name: 'Royal Mahal', category: 'Basmati Rice', size: '5 kg', sku: 'sku_royal_basmati_5kg', qty: 1, tier: 'T2', loyal: false, pinned: false, reason: '' };
    const c = checkPlan(draft('rice', bySku('sku_marina_basmati_5kg').itemId, 'kept', 1), [rice], catalogues, 999);
    expect(c.ok).toBe(false);
  });
  test('two needs on the same product are rejected (no double counting); duplicate catalogue rows collapse', () => {
    const w2: Need = { ...water, key: 'water2' };
    const id = bySku('sku_oasis_water_6x1500').itemId;
    const c = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: id, qty: 2, reason: 'kept', note: '' }, { need: 'water2', itemId: id, qty: 2, reason: 'kept', note: '' }], cuts: [], summary: '' }, [water, w2], catalogues, 999);
    expect(c.ok).toBe(false);
    const parsed = parseSearch({ merchant_id: 1, groups: [{ name: 'Water', items: [{ id: 5, item: 'A (1 L)', price: { total: 2 } }] }, { name: 'Water', items: [{ id: 5, item: 'A (1 L)', price: { total: 2 } }] }] });
    expect(parsed.items).toHaveLength(1);
  });
  test('quantities above the per-line limit are rejected by the calculator', () => {
    expect(checkPlan(draft('water', bySku('sku_oasis_water_6x1500').itemId, 'kept', 500), [{ ...water, qty: 500 }], catalogues, 99_999).ok).toBe(false);
  });
  test('an item without a price is never sellable', () => {
    const p = parseSearch({ merchant_id: 1, groups: [{ name: 'Water', items: [{ id: 9, item: 'Mystery', description: 'x (1 L)' }] }] });
    expect(p.items[0]?.available ?? false).toBe(false);
  });
});

// ======================================================================================
describe('4. malformed tool calls are corrected within the turn, and never break the session', () => {
  test('unknown tool + invalid arguments get structured errors; a valid retry plans; the next message works', async () => {
    const script: Turn[] = [toolTurn('cart_checkout', {}), toolTurn('plan_basket', { additions: 'rice', overrides: [{}] }), toolTurn('plan_basket', { cutPercent: 'lots' }), toolTurn('plan_basket', { cutPercent: 15 }), textTurn('Here it is.')];
    const m = new Scripted((_msgs, call) => script[call - 1] ?? textTurn('ok'));
    current = m;
    const s = sid();
    const ev = await chat(s, 'cut 15%');
    expect(one(ev, 'plan')).toBeTruthy();
    const errors = toolResults(m).filter((r) => r.status === 'error').map((r) => JSON.stringify(r.content));
    expect(errors[0]).toMatch(/unknown_tool/);
    expect(errors[1]).toMatch(/invalid_arguments/);
    expect(errors[1]).toMatch(/additions/);
    for (const c of m.conversations) expect(converseProblems(c)).toEqual([]);

    current = new Scripted(once('plan_basket', { overrides: [{ item: 'chips', keep: true }] }));
    expect(one(await chat(s, 'keep the chips'), 'plan')).toBeTruthy();
  });

  test('a model that keeps sending invalid calls is stopped after a bounded number of retries', async () => {
    const m = new Scripted(() => toolTurn('plan_basket', { cutPercent: 'lots' }));
    current = m;
    const ev = await chat(sid(), 'cut 15%');
    expect(m.calls).toBeLessThanOrEqual(4);
    expect(one(ev, 'message')).toBeTruthy();
  });
});

// ======================================================================================
describe('5. tool-loop exhaustion and timeouts recover without Reset', () => {
  test('after 8 tool turns the user gets a reply, and the next message is sent as a valid Bedrock conversation', async () => {
    const s = sid();
    current = new Scripted(() => toolTurn('compare_stores', {}));
    const ev = await chat(s, 'which store is cheapest?');
    expect(one(ev, 'message')?.text).toBeTruthy();
    expect(one(ev, 'error')).toMatchObject({ code: 'tool_loop_exhausted' });
    const next = new Scripted(textTurn('Hello again.'));
    current = next;
    const ev2 = await chat(s, 'hello');
    expect(all(ev2, 'error')).toEqual([]);
    expect(converseProblems(next.conversations[0])).toEqual([]);
  });

  test('a hung model call times out with a clear message, releases the session, and the next message works', async () => {
    const s = sid();
    process.env.SOUQ_TURN_TIMEOUT_MS = '300';
    try {
      current = new Scripted(() => new Promise<Turn>(() => {}));
      const ev = await chat(s, 'cut 15%');
      expect(one(ev, 'error')).toMatchObject({ code: 'timeout', kind: 'timeout' });
      expect(one(ev, 'message')?.text).toBeTruthy();
    } finally { delete process.env.SOUQ_TURN_TIMEOUT_MS; }
    const next = new Scripted(textTurn('Back.'));
    current = next;
    const ev2 = await chat(s, 'hello');
    expect(all(ev2, 'error')).toEqual([]);
    expect(converseProblems(next.conversations[0])).toEqual([]);
  });
});

describe('5b. a client that disconnects mid-planning releases the session at once', () => {
  test('the next request on the same session is not told to wait', async () => {
    const s = sid();
    const slow = new Scripted(once('plan_basket', { cutPercent: 15 }));
    const structured = slow.structured.bind(slow);
    slow.structured = async (...args) => { await new Promise((r) => setTimeout(r, 1500)); return structured(...args); };
    current = slow;
    const ctrl = new AbortController();
    const r = await fetch(`${api}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: s, message: 'cut 15%' }), signal: ctrl.signal });
    await r.body!.getReader().read(); ctrl.abort();
    await new Promise((res) => setTimeout(res, 300));
    current = new Scripted(textTurn('Hello.'));
    expect(all(await chat(s, 'hello'), 'error')).toEqual([]);
  });
});

describe('5c. limits that make the essentials impossible give an honest answer, not a crash', () => {
  test('SOUQ_MAX_BASKET_AED=50', async () => {
    process.env.SOUQ_MAX_BASKET_AED = '50';
    try {
      current = new Scripted(once('plan_basket', { cutPercent: 15 }));
      const ev = await chat(sid(), 'cut 15%');
      expect(all(ev, 'error').filter((e) => e.kind === 'internal')).toEqual([]);
      expect(one(ev, 'error')).toMatchObject({ kind: 'validation', code: 'basket_limit' });
    } finally { delete process.env.SOUQ_MAX_BASKET_AED; }
  });
});

// ======================================================================================
describe('6. structured API errors', () => {
  const post = async (body: unknown) => { const r = await fetch(`${api}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  test('too-long message and excessive budget are validation errors with a code and a field', async () => {
    expect(await post({ sessionId: 's', message: 'x'.repeat(4001) })).toMatchObject({ status: 400, body: { kind: 'validation', code: 'message_too_long', field: 'message' } });
    expect(await post({ sessionId: 's', message: 'hi', budgetAed: 250000 })).toMatchObject({ status: 400, body: { kind: 'validation', code: 'budget_out_of_range', field: 'budgetAed' } });
    expect(await post({ sessionId: 's', message: 'hi', budgetAed: 'abc' })).toMatchObject({ status: 400, body: { code: 'budget_out_of_range', field: 'budgetAed' } });
  });
});

// ======================================================================================
describe('7. trace summaries tell the truth about the budget', () => {
  test('an accepted over-budget plan never says "within"', async () => {
    current = new Scripted(once('plan_basket', { budgetAed: 20 }));
    const ev = await chat(sid(), 'my budget is 20 AED');
    const summaries = traces(ev).map((t) => t.summary).concat(steps(ev).map((s) => s.summary)).filter((s) => /AED/.test(s));
    expect(summaries.filter((s) => /within/i.test(s))).toEqual([]);
    expect(summaries.some((s) => /cannot meet|over budget by/i.test(s))).toBe(true);
  });
});

// ======================================================================================
describe('8. the reply is grounded in the validated plan', () => {
  test('a budget the user never gave is refused, and invented claims are not shown', async () => {
    const script: Orchestrate = (messages, call) => (call === 1 ? toolTurn('plan_basket', { budgetAed: 1000 })
      : call === 2 ? toolTurn('plan_basket', {})
        : textTurn('I swapped your rice for a cheaper brand and saved AED 50. Your budget is AED 1000.'));
    current = new Scripted(script);
    const ev = await chat(sid(), 'Build the biggest basket possible');
    const p = one(ev, 'plan');
    expect(p.budget.aed).not.toBe(1000);
    const text = one(ev, 'message').text;
    expect(text).not.toMatch(/1000|AED 50\b|saved AED 50/);
    expect(text).toContain(p.estTotal.toFixed(2));
    if (!p.items.some((i) => i.reason === 'swapped')) expect(text).not.toMatch(/swapp/i);
  });

  test('a greeting with a quoted example ("cut 15%") is not mistaken for a claim', async () => {
    current = new Scripted(textTurn('Hi! Tell me a budget, for example "cut 15%", and I will plan your basket.'));
    expect(one(await chat(sid(), 'hello'), 'message').text).toMatch(/Tell me a budget/);
  });
});

// ======================================================================================
describe('9. invalid budgets and cuts are rejected, previous state kept', () => {
  test('"cut 150%" and "budget -50 AED" are refused without planning; the earlier budget is kept', async () => {
    const s = sid();
    current = new Scripted(once('plan_basket', { budgetAed: 170 }));
    const first = one(await chat(s, 'My budget is 170 AED'), 'plan');
    expect(first.budget).toEqual({ aed: 170, source: 'absolute' });
    for (const [message, code] of [['cut 150%', 'cut_out_of_range'], ['my budget is -50 AED', 'budget_out_of_range'], ['cut 0%', 'cut_out_of_range']]) {
      current = new Scripted(once('plan_basket', { cutPercent: 150 }));
      const ev = await chat(s, message);
      expect(all(ev, 'plan'), message).toEqual([]);
      expect(one(ev, 'error'), message).toMatchObject({ kind: 'validation', code });
    }
    current = new Scripted(once('plan_basket', {}));
    expect(one(await chat(s, 'plan my basket again'), 'plan').budget).toEqual({ aed: 170, source: 'absolute' });
  });

  test('"budget 1,000 AED" is one thousand, not a refusal', async () => {
    current = new Scripted(once('plan_basket', { budgetAed: 1000 }));
    const p = one(await chat(sid(), 'My budget is 1,000 AED'), 'plan');
    expect(p.budget).toEqual({ aed: 1000, source: 'absolute' });
  });

  test('a number that is not a budget ("add 2 bananas") cannot become the budget', async () => {
    current = new Scripted(once('plan_basket', { budgetAed: 2, additions: [{ item: 'bananas', qty: 2 }] }));
    const ev = await chat(sid(), 'add 2 bananas');
    expect(one(ev, 'plan')?.budget.aed ?? 'refused').not.toBe(2);
  });

  test('out-of-range tool arguments are rejected back to the model and do not change the budget', async () => {
    const m = new Scripted(once('plan_basket', { cutPercent: 150 }));
    current = m;
    const ev = await chat(sid(), 'cut my basket a lot');
    expect(all(ev, 'plan')).toEqual([]);
    expect(JSON.stringify(toolResults(m).at(-1)!.content)).toMatch(/cut_out_of_range/);
  });
});
