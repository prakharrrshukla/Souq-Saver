// Offline stress: the calculator, the AI engine and the chat loop fed hostile model output.
// Every test states the SAFE behaviour context.md promises. A failing test is a finding.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, fixedTime } from '../fixtures/generate.ts';
import { startHttp } from '../sandbox/careem-mcp-ts/src/server.ts';
import type { ChatMessage, ModelAdapter, ToolSpec, Turn } from '../server/src/agent/bedrock.ts';
import { runChat } from '../server/src/agent/agent.ts';
import { newSession, type Deps } from '../server/src/agent/tools.ts';
import type { SseEvent } from '../server/src/contract.ts';
import { categorySpend, lastWeek, normaliseOrders } from '../server/src/engine/analysis.ts';
import { parseFees, parseSearch, type StoreCatalogue } from '../server/src/engine/stores.ts';
import { brainPlan, PlanInputError } from '../server/src/brain/brain.ts';
import { checkPlan, type Need } from '../server/src/brain/check.ts';
import { CareemMcp } from '../server/src/mcp/client.ts';

const TODAY = new Date('2026-11-14T08:00:00Z');
const data = build(fixedTime(TODAY));
const { orders } = normaliseOrders([data.activities.pastGroceries, data.activities.pastShops], data.details.map((d) => d.response));
const cat = (response: any, name: string, fees: { deliveryFee: number; serviceFee: number }): StoreCatalogue => {
  const p = parseSearch(response);
  return { merchantId: p.merchantId, name, type: p.domain, ...fees, items: p.items };
};
const catalogues = [
  cat(data.search.quik, 'Careem Quik Dubai Marina', { deliveryFee: 4, serviceFee: 1.5 }),
  cat(data.search.marina, 'Marina Fresh Market', parseFees(data.basketPrice.marina)),
  cat(data.search.jlt, 'JLT Organic Pantry', parseFees(data.basketPrice.jlt)),
];
const marina = catalogues[1];
const bySku = (sku: string) => marina.items.find((i) => i.sku === sku)!;
const water: Need = { key: 'water', name: 'Oasis Water 6x1.5L', category: 'Drinking Water', size: '6 x 1.5 L', sku: 'sku_oasis_water_6x1500', qty: 2, tier: 'T1', loyal: false, pinned: false, reason: '' };

// ---------------- A. calculator (check.ts) ----------------
describe('A. calculator vs hostile plans', () => {
  test('A1 rejects a line whose item is a different product category than the need (chips sold as water)', () => {
    const chips = marina.items.find((i) => i.category !== bySku('sku_oasis_water_6x1500').category && i.available)!;
    const c = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: chips.itemId, qty: 2, reason: 'kept', note: '' }], cuts: [], summary: '' }, [water], catalogues, 500);
    expect({ ok: c.ok, item: chips.name }).toMatchObject({ ok: false });
  });

  test('A2 rejects a swap labelled "kept" (the user would see "Kept" on a different product)', () => {
    const other = marina.items.find((i) => i.category === bySku('sku_oasis_water_6x1500').category && i.sku !== water.sku && i.available);
    if (!other) return; // no alternative water at Marina
    const c = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: other.itemId, qty: 2, reason: 'kept', note: '' }], cuts: [], summary: '' }, [water], catalogues, 500);
    expect(c.ok).toBe(false);
  });

  test('A3 rejects an absurd quantity (500 packs of water) when the budget happens to allow it', () => {
    const w = bySku('sku_oasis_water_6x1500');
    const c = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: w.itemId, qty: 500, reason: 'kept', note: '' }], cuts: [], summary: '' }, [water], catalogues, 99_999);
    expect(c.ok).toBe(false);
  });

  test('A4 rejects fractional and non-positive quantities', () => {
    const w = bySku('sku_oasis_water_6x1500');
    for (const qty of [1.5, 0, -3]) {
      const c = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: w.itemId, qty, reason: 'kept', note: '' }], cuts: [], summary: '' }, [{ ...water, tier: 'T3' }], catalogues, 999);
      expect(c.ok, `qty ${qty}`).toBe(false);
    }
  });

  test('A5 a store item with a missing price never yields an accepted plan with a NaN total', () => {
    const broken: StoreCatalogue = { ...marina, merchantId: 'broken', items: [{ ...bySku('sku_oasis_water_6x1500'), price: NaN }] };
    const c = checkPlan({ merchantId: 'broken', lines: [{ need: 'water', itemId: broken.items[0].itemId, qty: 2, reason: 'kept', note: '' }], cuts: [], summary: '' }, [water], [broken], 100);
    expect(c.ok && !Number.isFinite(c.estTotal)).toBe(false);
  });

  test('A6 parseSearch: an item without price.total does not become price NaN', () => {
    const p = parseSearch({ merchant_id: 1, groups: [{ name: 'Water', items: [{ id: 9, item: 'Mystery water', description: 'x (1 L)' }] }] });
    expect(Number.isFinite(p.items[0].price)).toBe(true);
  });

  test('A7 floating point: a total exactly on the budget is within budget', () => {
    const w = bySku('sku_oasis_water_6x1500');
    const exact = Math.round((w.price * 3 + marina.deliveryFee + marina.serviceFee) * 100) / 100;
    const c = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: w.itemId, qty: 3, reason: 'kept', note: '' }], cuts: [], summary: '' }, [{ ...water, qty: 3 }], catalogues, exact);
    expect(c).toMatchObject({ ok: true, withinBudget: true, shortfall: 0 });
  });
});

// ---------------- B. AI engine (brain.ts) with a hostile scripted model ----------------
const SCRIPT: Record<string, { decision: string; tier: string; qty: number; loyal?: boolean; nextDue?: string }> = {
  sku_oasis_water_6x1500: { decision: 'due', tier: 'T1', qty: 2 },
  sku_royal_basmati_5kg: { decision: 'due', tier: 'T2', qty: 1, loyal: true },
  sku_noor_sunflower_1800: { decision: 'due', tier: 'T2', qty: 1, loyal: true },
  sku_greenoat_oat_milk_1l: { decision: 'due', tier: 'T2', qty: 2 },
  sku_golden_eggs_30: { decision: 'due', tier: 'T2', qty: 1 },
  sku_khayma_bread_6: { decision: 'due', tier: 'T2', qty: 2 },
  sku_crunchos_150: { decision: 'due', tier: 'T5', qty: 1, loyal: true },
  sku_fizzup_cola_6: { decision: 'due', tier: 'T5', qty: 1 },
  sku_chocojoy_4: { decision: 'due', tier: 'T5', qty: 1 },
};
type LearnHook = (products: any[]) => any;
type BasketHook = (brief: any, attempt: number) => any;
const defaultLearn: LearnHook = (products) => ({
  products: products.map((p) => ({ sku: p.sku, reason: 'scripted', loyal: false, nextDue: null, ...(SCRIPT[p.sku] ?? { decision: 'occasional', tier: 'T4', qty: 1 }) })),
  likes: [], dislikes: [], switches: [], persona: { summary: 'Looks like a small household.', routines: [] },
});
const defaultBasket: BasketHook = (brief) => {
  const store = brief.stores.find((s: any) => s.name === 'Marina Fresh Market');
  const lines: any[] = []; const cuts: any[] = [];
  for (const need of brief.needs) {
    if (need.tier === 'T5' && !need.pinned) { cuts.push({ need: need.key, note: 'treat' }); continue; }
    lines.push({ need: need.key, itemId: store.options[need.key]?.[0]?.itemId ?? 'none', qty: need.qty, reason: 'kept', note: 'due' });
  }
  return { merchantId: store.merchantId, lines, cuts, summary: 'scripted' };
};
class Hostile implements ModelAdapter {
  readonly id = 'hostile-scripted'; readonly provider = 'test'; readonly isBedrock = true;
  basketCalls = 0;
  constructor(private learn: LearnHook = defaultLearn, private basket: BasketHook = defaultBasket) {}
  async converse(): Promise<Turn> { throw new Error('not used'); }
  async structured(_s: string, messages: ChatMessage[], tool: ToolSpec) {
    const brief = JSON.parse((messages[0].content[0] as { text: string }).text);
    const input = tool.name === 'household_insights' ? this.learn(brief.products) : this.basket(brief, ++this.basketCalls);
    const turn: Turn = { content: [{ toolUse: { toolUseId: `t${this.basketCalls}`, name: tool.name, input } }], text: '', toolCalls: [{ id: `t${this.basketCalls}`, name: tool.name, input }], stopReason: 'tool_use', modelId: this.id };
    return { input, turn };
  }
}
const plan = (model: ModelAdapter, extra: Partial<Parameters<typeof brainPlan>[0]> = {}) => brainPlan({
  model, orders, catalogues, today: TODAY, lastWeekTotal: lastWeek(orders)!.total, budget: { cutPercent: 15 }, overrides: [], additions: [],
  insights: { categorySpend: categorySpend(orders.flatMap((o) => o.lines)).categories, priceDrift: [] }, ...extra,
});

describe('B. AI engine vs hostile model output', () => {
  test('B0 sanity: a well-behaved model gets a valid in-budget plan', async () => {
    const p = await plan(new Hostile());
    expect(p.withinBudget).toBe(true);
  });

  test('B1 hallucinated SKUs from the model are dropped', async () => {
    const p = await plan(new Hostile((products) => { const l = defaultLearn(products); l.products.push({ sku: 'sku_caviar_1kg', decision: 'due', tier: 'T1', qty: 3, loyal: true, reason: 'x' }); return l; }));
    expect(p.items.some((i) => /caviar/i.test(i.itemId + i.name))).toBe(false);
  });

  test('B2 a duplicated SKU in the model answer does not sink the AI plan', async () => {
    const p = plan(new Hostile((products) => { const l = defaultLearn(products); l.products.push({ ...l.products.find((x: any) => x.sku === 'sku_oasis_water_6x1500') }); return l; }));
    await expect(p).resolves.toBeTruthy();
  });

  test('B3 an absurd learned quantity (400 packs of water a week) is not put in the basket', async () => {
    const p = await plan(new Hostile((products) => { const l = defaultLearn(products); l.products.find((x: any) => x.sku === 'sku_oasis_water_6x1500').qty = 400; return l; }));
    const w = p.items.find((i) => /water/i.test(i.name) && i.lineTotal > 0)!;
    expect({ qty: w.qty, total: p.estTotal, shortfall: p.shortfall }).toMatchObject({ qty: expect.any(Number) });
    expect(w.qty).toBeLessThanOrEqual(10);
  });

  test('B4 invalid tier / decision values from the model are normalised', async () => {
    const p = await plan(new Hostile((products) => { const l = defaultLearn(products); const c = l.products.find((x: any) => x.sku === 'sku_fizzup_cola_6'); c.tier = 'T9'; c.decision = 'maybe'; const w = l.products.find((x: any) => x.sku === 'sku_oasis_water_6x1500'); w.tier = 'essential'; return l; }));
    for (const i of p.items) expect(['T1', 'T2', 'T3', 'T4', 'T5'], `${i.name} tier ${i.tier}`).toContain(i.tier);
  });

  test('B5 end to end: the AI fills the water need with a treat and the plan is rejected', async () => {
    const p = plan(new Hostile(defaultLearn, (brief) => {
      const d = defaultBasket(brief, 1);
      const store = brief.stores.find((s: any) => s.merchantId === d.merchantId);
      const chips = marina.items.find((i) => /crunch|chip/i.test(i.name))!;
      d.lines = d.lines.map((l: any) => (l.need === 'sku_oasis_water_6x1500' ? { ...l, itemId: chips.itemId, reason: 'kept', note: 'water' } : l));
      void store;
      return d;
    }));
    const result = await p.catch((e) => e);
    const waterLine = result instanceof Error ? undefined : result.items.find((i: any) => i.tier === 'T1' && i.lineTotal > 0);
    expect(result instanceof Error || !/crunch|chip/i.test(waterLine?.name ?? ''), `T1 line became: ${waterLine?.name}`).toBe(true);
  });

  test('B6 a garbage basket answer (lines is a string) is rejected and the checked rule planner is used, disclosed', async () => {
    const p = await plan(new Hostile(defaultLearn, () => ({ merchantId: '40101', lines: 'oops', cuts: null, summary: 1 })));
    expect(p.engine).toMatchObject({ basket: 'rules', profile: 'ai' });
  });

  test('B7 a model that never fixes its plan stops after 3 attempts; the fallback is disclosed', async () => {
    const m = new Hostile(defaultLearn, (brief) => ({ ...defaultBasket(brief, 1), cuts: [], lines: [] }));
    const p = await plan(m);
    expect(m.basketCalls).toBe(3);
    expect(p.engine.fallbackReason).toMatch(/3 attempts/);
  });

  test('B8 "add 1,000,000,000 rice" is refused, never clamped', async () => {
    await expect(plan(new Hostile(), { additions: [{ item: 'rice', qty: 1_000_000_000 }] })).rejects.toBeInstanceOf(PlanInputError);
  });

  test('B9 model omits likes/dislikes/persona entirely: plan still builds', async () => {
    const p = await plan(new Hostile((products) => ({ products: defaultLearn(products).products })));
    expect(p.learned.persona.summary).toBe('');
  });
});

// ---------------- C. chat loop (agent.ts) with a scripted orchestrator ----------------
let sandbox: Awaited<ReturnType<typeof startHttp>>;
let mcp: CareemMcp;
beforeAll(async () => {
  const overridesPath = join(mkdtempSync(join(tmpdir(), 'souq-stress-')), 'o.json');
  writeFileSync(overridesPath, '{}');
  sandbox = await startHttp({ port: 0, overridesPath, quiet: true });
  mcp = new CareemMcp(sandbox.url);
});
afterAll(async () => { await mcp?.close(); await sandbox?.close(); });

class Orchestrator implements ModelAdapter {
  readonly id = 'scripted-orchestrator'; readonly provider = 'test'; readonly isBedrock = false;
  seen: ChatMessage[][] = [];
  constructor(private next: (messages: ChatMessage[], n: number) => Turn) {}
  async converse(_s: string, messages: ChatMessage[]): Promise<Turn> { this.seen.push(structuredClone(messages)); return this.next(messages, this.seen.length); }
}
const toolTurn = (name: string, input: any, id = `c${Math.random().toString(36).slice(2, 8)}`): Turn => ({ content: [{ toolUse: { toolUseId: id, name, input } }], text: '', toolCalls: [{ id, name, input }], stopReason: 'tool_use', modelId: 'x' });
const textTurn = (text: string): Turn => ({ content: [{ text }], text, toolCalls: [], stopReason: 'end_turn', modelId: 'x' });
const deps = (events: SseEvent[]): Deps => ({ mcp, sampleData: true, today: () => TODAY, emit: (e) => events.push(e) });
const consecutiveSameRole = (m: ChatMessage[]) => m.some((x, i) => i > 0 && m[i - 1].role === x.role);

describe('C. chat loop vs a misbehaving orchestrator model', () => {
  test('C1 a model stuck calling tools still gets the user a reply or an error after the turn limit', async () => {
    const events: SseEvent[] = [];
    const s = newSession('loop');
    await runChat(s, { sessionId: 'loop', message: 'cut 15%' }, new Orchestrator(() => toolTurn('compare_stores', {})), deps(events));
    expect(events.filter((e) => e.event === 'message' || e.event === 'error').length).toBeGreaterThan(0);
  });

  test('C2 after hitting the turn limit, the next request still sends a valid alternating conversation', async () => {
    const s = newSession('loop2');
    await runChat(s, { sessionId: 'loop2', message: 'cut 15%' }, new Orchestrator(() => toolTurn('compare_stores', {})), deps([]));
    const m = new Orchestrator(() => textTurn('ok'));
    await runChat(s, { sessionId: 'loop2', message: 'hello again' }, m, deps([]));
    expect(consecutiveSameRole(m.seen[0])).toBe(false);
  });

  test('C3 unknown tool and garbage tool arguments are survived and reported', async () => {
    const events: SseEvent[] = [];
    const s = newSession('garbage');
    const script = [toolTurn('cart_checkout', {}), toolTurn('plan_basket', { additions: 'rice', overrides: [{}] }), toolTurn('plan_basket', { cutPercent: 'lots' }), textTurn('done')];
    await runChat(s, { sessionId: 'garbage', message: 'x' }, new Orchestrator((_m, n) => script[n - 1]), deps(events));
    expect(events.some((e) => e.event === 'message')).toBe(true);
    // the session must still plan normally afterwards
    const ev2: SseEvent[] = [];
    await runChat(s, { sessionId: 'garbage', message: 'cut 15%' }, new Orchestrator((_m, n) => (n === 1 ? toolTurn('plan_basket', { cutPercent: 15 }) : textTurn('here'))), deps(ev2));
    expect(ev2.some((e) => e.event === 'plan')).toBe(true);
  });

  test('C4 "cut 150%" / "budget -50" is not silently turned into last week\'s full budget', async () => {
    const results: any[] = [];
    for (const input of [{ cutPercent: 150 }, { budgetAed: -50 }, { cutPercent: 100 }]) {
      const ev: SseEvent[] = [];
      await runChat(newSession('b'), { sessionId: 'b', message: 'x' }, new Orchestrator((_m, n) => (n === 1 ? toolTurn('plan_basket', input) : textTurn('k'))), deps(ev));
      const p: any = ev.find((e) => e.event === 'plan')?.data;
      results.push({ input, budget: p?.budget });
    }
    console.log('[C4] budgets:', JSON.stringify(results));
    expect(results.every((r) => r.budget?.source !== 'last_week')).toBe(true);
  });
});
