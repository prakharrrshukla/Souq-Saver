// Stress round 2: attacks on the new code (validation, limits, fallback, grounding, timeouts, households).
// Every test states the SAFE behaviour context.md promises. A failing test is a finding.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startHttp } from '../sandbox/careem-mcp-ts/src/server.ts';
import { writeFixtures } from '../fixtures/generate.ts';
import type { ChatMessage, ModelAdapter, ToolSpec, Turn } from '../server/src/agent/bedrock.ts';
import { conversationProblems } from '../server/src/agent/bedrock.ts';
import { StubModel } from '../server/src/agent/stub.ts';
import { buildApp } from '../server/src/api/server.ts';
import { postSse } from '../server/src/api/sseClient.ts';
import type { Plan, SseEvent, XrayStep } from '../server/src/contract.ts';
import { CareemMcp } from '../server/src/mcp/client.ts';
import { extractRequest } from '../server/src/validate.ts';

const MANIFEST = new URL('../fixtures/out/manifest.json', import.meta.url);
const originalPersona = JSON.parse(readFileSync(MANIFEST, 'utf8')).persona ?? 'leonardo';

let ids = 0;
const toolTurn = (name: string, input: unknown): Turn => { const id = `t${ids++}`; return { content: [{ toolUse: { toolUseId: id, name, input } }], text: '', toolCalls: [{ id, name, input }], stopReason: 'tool_use', modelId: 's' }; };
const textTurn = (text: string): Turn => ({ content: [{ text }], text, toolCalls: [], stopReason: 'end_turn', modelId: 's' });
type Orchestrate = (messages: ChatMessage[], call: number) => Turn | Promise<Turn>;
const once = (name: string, input: unknown, text = 'Done.'): Orchestrate => (m) => (m.at(-1)!.content.some((b) => 'toolResult' in b) ? textTurn(text) : toolTurn(name, input));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Plays Bedrock: scripted orchestrator; the AI engine learns "everything due, loyal to nothing" and builds a sane basket. */
class Scripted implements ModelAdapter {
  readonly id = 'scripted'; readonly provider = 'test'; readonly isBedrock = true;
  conversations: ChatMessage[][] = [];
  calls = 0;
  orchestrate: Orchestrate;
  learnDelayMs: number;
  constructor(orchestrate: Orchestrate | Turn, learnDelayMs = 0) { this.orchestrate = typeof orchestrate === 'function' ? orchestrate : () => orchestrate; this.learnDelayMs = learnDelayMs; }
  async converse(_s: string, messages: ChatMessage[], tools: ToolSpec[]) { if (tools.length) this.conversations.push(structuredClone(messages)); return this.orchestrate(messages, ++this.calls); }
  async structured(_s: string, messages: ChatMessage[], tool: ToolSpec) {
    const brief = JSON.parse((messages[0].content[0] as { text: string }).text);
    if (this.learnDelayMs) await sleep(this.learnDelayMs);
    let input: any;
    if (tool.name === 'household_insights') {
      input = { products: brief.products.map((p: any) => ({ sku: p.sku, decision: p.timesBought > 2 && p.daysSinceLast < 40 ? 'due' : 'occasional', tier: 'T3', qty: 1, loyal: false, nextDue: null, reason: 'scripted' })), likes: [], dislikes: [], switches: [], persona: { summary: 'Looks like a household.', routines: [] } };
    } else {
      const store = brief.stores.find((s: any) => s.calculatorCheck.validForEssentials) ?? brief.stores[0];
      const lines: any[] = []; const cuts: any[] = [];
      for (const need of brief.needs) {
        const option = store.options[need.key]?.[0];
        if (!option || need.allowed.includes('cut')) cuts.push({ need: need.key, note: 'cut' });
        else lines.push({ need: need.key, itemId: option.itemId, qty: need.qty, reason: 'kept', note: 'kept' });
      }
      input = { merchantId: store.merchantId, lines, cuts, summary: 's' };
    }
    const id = `s${ids++}`;
    return { input, turn: { content: [{ toolUse: { toolUseId: id, name: tool.name, input } }], text: '', toolCalls: [{ id, name: tool.name, input }], stopReason: 'tool_use', modelId: 's' } as Turn };
  }
}

let sandbox: Awaited<ReturnType<typeof startHttp>>;
let mcp: CareemMcp;
let current: ModelAdapter;
let app: ReturnType<typeof buildApp>;
let api: string;
let n = 0;
const sid = (p = 'r2') => `${p}_${Date.now().toString(36)}_${n++}`;
beforeAll(async () => {
  const o = join(mkdtempSync(join(tmpdir(), 'souq-r2-')), 'o.json'); writeFileSync(o, '{}');
  sandbox = await startHttp({ port: 0, overridesPath: o, quiet: true });
  mcp = new CareemMcp(sandbox.url);
  current = new StubModel();
  app = buildApp({ mcp, model: () => current });
  api = `${await app.listen({ port: 0, host: '127.0.0.1' })}/api`;
});
afterAll(async () => { writeFixtures(originalPersona); await app.close(); await mcp.close(); await sandbox.close(); });

type Of<K extends SseEvent['event']> = Extract<SseEvent, { event: K }>['data'];
const all = <K extends SseEvent['event']>(ev: SseEvent[], k: K) => ev.filter((e) => e.event === k).map((e) => e.data as Of<K>);
const one = <K extends SseEvent['event']>(ev: SseEvent[], k: K) => all(ev, k)[0];
const steps = (ev: SseEvent[]) => [...new Map(all(ev, 'xray').map((x) => [x.step.stepId, x.step])).values()] as XrayStep[];
const chat = (s: string, message: string, extra: Record<string, unknown> = {}) => postSse(`${api}/chat`, { sessionId: s, message, ...extra });
const basket = (p: Plan) => p.items.filter((i) => i.lineTotal > 0);
const withEnv = async <T>(vars: Record<string, string>, fn: () => Promise<T>) => {
  const old = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try { return await fn(); } finally { for (const [k, v] of Object.entries(old)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
};

// =====================================================================================
describe('R1. number extraction: no false refusals, no misses', () => {
  const ok: string[] = [
    'I spent 9000 AED last year on groceries, cut 15% please',
    'budget: 5000 AED', 'budget 1 AED', 'cut 90%', 'cut 1%', 'add 20 bags of rice', 'budget 120.50 AED',
    'my flat is 1501, cut 15%', 'deliver on 2026-11-20, budget 150 AED', 'add 6 x 1.5 L water',
    'budget 1,000 AED', 'I have 2 kids, budget 300 dirhams', 'ميزانيتي ١٢٠ درهم', 'बजट 150 दिरहम', 'say it costs AED 0',
  ];
  for (const m of ok) test(`accepted: ${m}`, () => expect(extractRequest(m).problems).toEqual([]));

  const bad: [string, string][] = [
    ['budget 5001 AED', 'budget_out_of_range'], ['cut 90.5%', 'cut_out_of_range'], ['add 21 bags of rice', 'quantity_out_of_range'],
    ['خفّض ١٥٠٪', 'cut_out_of_range'], ['१५०% कम करो', 'cut_out_of_range'], ['cut -15%', 'cut_out_of_range'],
    ['budget 0 AED', 'budget_out_of_range'], ['budget −50 AED', 'budget_out_of_range'], ['my budget is 100000 dirhams', 'budget_out_of_range'],
    ['add 500 x eggs', 'quantity_out_of_range'], ['I only have 9999 AED', 'budget_out_of_range'],
  ];
  for (const [m, code] of bad) test(`refused: ${m}`, () => expect(extractRequest(m).problems[0]?.code).toBe(code));

  test('values are extracted correctly (grounding uses them)', () => {
    expect(extractRequest('budget 1,000 AED').budgetAed).toBe(1000);
    expect(extractRequest('ميزانيتي ١٢٠ درهم').budgetAed).toBe(120);
    expect(extractRequest('cut 12.5%').cutPercent).toBe(12.5);
  });
});

// =====================================================================================
describe('R2. limits at their exact boundaries through the API', () => {
  test('budget field: 1 and 5000 accepted, 0.99 and 5000.01 refused, NaN-like refused', async () => {
    const status = async (budgetAed: unknown) => (await fetch(`${api}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: sid(), message: 'plan', budgetAed }) })).status;
    current = new StubModel();
    expect(await status(1)).toBe(200);
    expect(await status(5000)).toBe(200);
    for (const v of [0.99, 5000.01, null, '150', -1, 1e309]) expect(await status(v), String(v)).toBe(400);
  });
  test('message of exactly 4000 chars is accepted, 4001 refused', async () => {
    const status = async (len: number) => (await fetch(`${api}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: sid(), message: 'a'.repeat(len) }) })).status;
    expect(await status(4000)).toBe(200);
    expect(await status(4001)).toBe(400);
  });
  test('41 additions in one tool call are refused back to the model (too_many_items)', async () => {
    const m = new Scripted(once('plan_basket', { additions: Array.from({ length: 41 }, (_, i) => ({ item: `thing${i}` })) }));
    current = m;
    const ev = await chat(sid(), 'add all of these');
    expect(all(ev, 'plan')).toEqual([]);
    expect(one(ev, 'error')).toMatchObject({ kind: 'validation', code: 'too_many_items' });
  });
  test('20 of one item through the model is allowed; 21 is refused', async () => {
    // Potatoes: not in this household's history, so the addition is the whole quantity.
    current = new Scripted(once('plan_basket', { additions: [{ item: 'potatoes', qty: 20 }] }));
    const p = one(await chat(sid(), 'add 20 bags of potatoes'), 'plan');
    expect(basket(p).find((i) => /potato/i.test(i.name))?.qty ?? 'unavailable').toBe(20);
    current = new Scripted(once('plan_basket', { additions: [{ item: 'potatoes', qty: 21 }] }));
    expect(one(await chat(sid(), 'add potatoes, lots'), 'error')).toMatchObject({ code: 'quantity_out_of_range' });
  });
});

// =====================================================================================
describe('R3. tiny configured limits must give an honest answer, never a crash', () => {
  test('SOUQ_MAX_BASKET_AED=50: essentials cost more than the limit', async () => {
    await withEnv({ SOUQ_MAX_BASKET_AED: '50' }, async () => {
      current = new StubModel();
      const ev = await chat(sid(), 'cut 15%');
      const generic = all(ev, 'error').filter((e) => e.code === 'internal');
      expect(generic, JSON.stringify(all(ev, 'error'))).toEqual([]);
      const p = one(ev, 'plan');
      if (p) expect(p.approval?.allowed).toBe(false);
    });
  });
  test('SOUQ_MAX_QTY_PER_LINE=1: the household usually buys 2 packs of water', async () => {
    await withEnv({ SOUQ_MAX_QTY_PER_LINE: '1' }, async () => {
      current = new StubModel();
      const ev = await chat(sid(), 'cut 15%');
      expect(all(ev, 'error').filter((e) => e.code === 'internal'), JSON.stringify(all(ev, 'error'))).toEqual([]);
      expect(one(ev, 'message')?.text).toBeTruthy();
    });
  });
});

// =====================================================================================
describe('R4. grounding loopholes', () => {
  test('a number from another part of the message ("2 bananas") cannot become the budget', async () => {
    current = new Scripted(once('plan_basket', { budgetAed: 2, additions: [{ item: 'bananas', qty: 2 }] }));
    const ev = await chat(sid(), 'add 2 bananas');
    const p = one(ev, 'plan');
    expect(p?.budget.aed ?? 'no plan').not.toBe(2);
  });
  test('a harmless model greeting is not replaced just because it mentions an example percentage', async () => {
    current = new Scripted(textTurn('Hi! Tell me a budget, for example "cut 15%", and I will plan your basket.'));
    const ev = await chat(sid(), 'hello');
    expect(one(ev, 'message').text).toMatch(/Tell me a budget/);
  });
  test('tool arguments sent as a JSON string are accepted', async () => {
    current = new Scripted(once('plan_basket', '{"cutPercent":15}'));
    expect(one(await chat(sid(), 'cut 15%'), 'plan')).toBeTruthy();
  });
});

// =====================================================================================
describe('R5. timeouts and disconnects in the middle of planning', () => {
  test('timeout while the AI engine is still learning: nothing half-done is saved, next request is clean', async () => {
    const s = sid();
    await withEnv({ SOUQ_TURN_TIMEOUT_MS: '400' }, async () => {
      current = new Scripted(once('plan_basket', { cutPercent: 15 }), 1500);
      const ev = await chat(s, 'cut 15%');
      expect(one(ev, 'error')).toMatchObject({ code: 'timeout' });
      expect(all(ev, 'plan')).toEqual([]);
    });
    await sleep(2000); // the abandoned plan finishes in the background now
    const probe = new Scripted(once('request_approval', {}));
    current = probe;
    const ev2 = await chat(s, 'approve');
    expect(one(ev2, 'message').text).toMatch(/no basket yet/i);
    expect(conversationProblems(probe.conversations[0])).toEqual([]);
  });
  test('client disconnects mid-planning: the session is released and the next request works', async () => {
    const s = sid();
    current = new Scripted(once('plan_basket', { cutPercent: 15 }), 800);
    const ctrl = new AbortController();
    const r = await fetch(`${api}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: s, message: 'cut 15%' }), signal: ctrl.signal });
    await r.body!.getReader().read(); ctrl.abort();
    await sleep(1500);
    current = new Scripted(once('plan_basket', { cutPercent: 15 }));
    const ev = await chat(s, 'cut 15%');
    expect(all(ev, 'error')).toEqual([]);
    expect(one(ev, 'plan')).toBeTruthy();
  });
});

// =====================================================================================
describe('R6. load on the AI path (scripted Bedrock), no cross-session leakage', () => {
  test('30 parallel sessions with different budgets each get their own budget back', async () => {
    current = new Scripted((m, _c) => {
      const text = (m.findLast((x) => x.role === 'user' && x.content.some((b) => 'text' in b))!.content[0] as { text: string }).text;
      const budget = Number(/(\d+) AED/.exec(text)![1]);
      return m.at(-1)!.content.some((b) => 'toolResult' in b) ? textTurn('ok') : toolTurn('plan_basket', { budgetAed: budget });
    });
    const t = Date.now();
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => chat(sid('load'), `budget ${100 + i} AED`).then((ev) => ({ i, p: one(ev, 'plan') }))));
    console.log(`[R6] 30 parallel AI-path chats: ${Date.now() - t} ms`);
    for (const { i, p } of results) expect(p?.budget.aed, `session ${i}`).toBe(100 + i);
  });
});

// =====================================================================================
describe('R7. the other households through the rule planner (no AI)', () => {
  test('Joy: noodles, cola and chips stopped; they must not be in the basket', async () => {
    writeFixtures('single');
    current = new StubModel();
    const p = one(await chat(sid(), 'plan my basket for this week'), 'plan');
    expect(p).toBeTruthy();
    expect(basket(p).filter((i) => /noodle|cola|chips/i.test(i.name)).map((i) => i.name)).toEqual([]);
    console.log('[R7] Joy:', basket(p).map((i) => `${i.qty}x ${i.name}`).join(', '), '| store', p.stores.find((s) => s.chosen)?.name, '| AED', p.estTotal);
  });
  test('Khan family: diapers are an essential, cow milk (still bought) stays, approve works when within budget', async () => {
    writeFixtures('family');
    current = new StubModel();
    const s = sid();
    const ev = await chat(s, 'cut 10%');
    const p = one(ev, 'plan');
    expect(p).toBeTruthy();
    const diapers = p.items.find((i) => /diaper/i.test(i.name));
    if (diapers) expect(diapers.tier).toBe('T2');
    expect(basket(p).some((i) => /Long Life/i.test(i.name))).toBe(true); // switched from fresh milk when the baby came
    console.log('[R7] Khan:', basket(p).map((i) => `${i.qty}x ${i.name}`).join(', '), '| AED', p.estTotal, 'budget', p.budget.aed, p.approval);
    if (p.approval?.allowed) expect(all(await postSse(`${api}/approve`, { sessionId: s, planId: p.planId, approvalToken: p.approvalToken }), 'cart')).toHaveLength(1);
    writeFixtures(originalPersona);
  });
});

// =====================================================================================
describe('R8. odd but legal requests', () => {
  test('"add caviar": not sold anywhere, reported as not available, never invented', async () => {
    current = new Scripted(once('plan_basket', { additions: [{ item: 'caviar', qty: 1 }] }));
    const ev = await chat(sid(), 'add caviar');
    const p = one(ev, 'plan');
    expect(p.items.find((i) => /caviar/i.test(i.name))).toMatchObject({ reason: 'unavailable', lineTotal: 0 });
    expect(one(ev, 'message').text).toMatch(/not available/i);
  });
  test('"drop the water": the user can leave out an essential; the plan stays valid', async () => {
    current = new StubModel();
    const p = one(await chat(sid(), 'drop the water this week'), 'plan');
    expect(basket(p).some((i) => /water/i.test(i.name))).toBe(false);
    expect(p.approval?.allowed ?? false).toBe(p.withinBudget);
  });
  test('keep then drop the same item across turns: the latest instruction wins', async () => {
    const s = sid();
    current = new Scripted(once('plan_basket', { overrides: [{ item: 'chips', keep: true }] }));
    await chat(s, 'keep the chips');
    current = new Scripted(once('plan_basket', { overrides: [{ item: 'chips', drop: true }] }));
    const p = one(await chat(s, 'actually drop the chips'), 'plan');
    expect(basket(p).some((i) => /chips/i.test(i.name))).toBe(false);
  });
  test('a model that returns nothing at all (no text, no tool) still gets the user a reply', async () => {
    current = new Scripted({ content: [], text: '', toolCalls: [], stopReason: 'end_turn', modelId: 's' });
    const ev = await chat(sid(), 'hi');
    expect(one(ev, 'message').text.length).toBeGreaterThan(0);
  });
});
