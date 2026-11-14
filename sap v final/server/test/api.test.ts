// Integration tests: real HTTP API -> agent (stub model, so no network) -> real MCP client ->
// local Careem MCP sandbox serving the generated household. One test per contract endpoint and rule.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startHttp } from '../../sandbox/careem-mcp-ts/src/server.ts';
import type { Cart, Language, Plan, SseEvent, XrayRun, XrayStep, XrayTreeNode } from '../src/contract.ts';
import { StubModel } from '../src/agent/stub.ts';
import { buildApp } from '../src/api/server.ts';
import { postSse } from '../src/api/sseClient.ts';
import { consumeToken, issueToken, type Grant } from '../src/mcp/approval.ts';
import { BLOCKED_TOOLS, CareemMcp, McpToolError } from '../src/mcp/client.ts';
import { BlockedError, XRAY_DIR, startRun } from '../src/xray.ts';

const overridesPath = join(mkdtempSync(join(tmpdir(), 'souq-saver-')), 'overrides.json');
let sandbox: Awaited<ReturnType<typeof startHttp>>;
let mcp: CareemMcp;
let app: ReturnType<typeof buildApp>;
let api: string;
let n = 0;
const session = () => `test_${Date.now().toString(36)}_${n++}`;

beforeAll(async () => {
  writeFileSync(overridesPath, '{}');
  sandbox = await startHttp({ port: 0, overridesPath, quiet: true });
  mcp = new CareemMcp(sandbox.url);
  const model = new StubModel();
  app = buildApp({ mcp, model: () => model });
  api = `${await app.listen({ port: 0, host: '127.0.0.1' })}/api`;
});
afterAll(async () => {
  await app.close();
  await mcp.close();
  await sandbox.close();
});

type Of<K extends SseEvent['event']> = Extract<SseEvent, { event: K }>['data'];
const all = <K extends SseEvent['event']>(events: SseEvent[], kind: K) => events.filter((e) => e.event === kind).map((e) => e.data as Of<K>);
const one = <K extends SseEvent['event']>(events: SseEvent[], kind: K) => all(events, kind)[0];
const chat = (sessionId: string, message: string, extra: Record<string, unknown> = {}) => postSse(`${api}/chat`, { sessionId, message, ...extra });
const approve = (sessionId: string, plan: Plan, approvalToken = plan.approvalToken) => postSse(`${api}/approve`, { sessionId, planId: plan.planId, approvalToken });
/** Final state of every step in a stream (each step is sent at start and at end). */
const finalSteps = (events: SseEvent[]) => [...new Map(all(events, 'xray').map((x) => [x.step.stepId, x.step])).values()].sort((a, b) => a.seq - b.seq);
const get = async (path: string) => { const r = await fetch(`${api}${path}`); return { status: r.status, body: await r.json() }; };

describe('GET endpoints', () => {
  test('GET /api/config', async () => {
    const { body } = await get('/config');
    expect(body).toEqual({ modelId: expect.any(String), modelProvider: expect.any(String), mcpMode: 'sandbox', sampleData: true, languages: ['en', 'ar', 'hi', 'ur', 'tl'], currency: 'AED' });
  });

  test('GET /api/health reports each dependency honestly', async () => {
    const { body } = await get('/health');
    expect(body).toEqual({ ok: false, mcp: true, bedrock: false }); // the stub model is not Bedrock
  });

  test('CORS allows the frontend origin', async () => {
    const r = await fetch(`${api}/config`, { headers: { origin: 'http://localhost:5173' } });
    expect(r.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
});

describe('POST /api/chat: "Same as last week, but cut 15%"', () => {
  const sessionId = session();
  let events: SseEvent[];
  let plan: Plan;
  let steps: XrayStep[];

  beforeAll(async () => {
    events = await chat(sessionId, 'Same as last week, but cut 15%');
    plan = one(events, 'plan');
    steps = finalSteps(events);
  });

  test('stream starts with run, ends with done, and has no error', () => {
    expect(events[0].event).toBe('run');
    expect(events[events.length - 1]).toEqual({ event: 'done', data: { runId: one(events, 'run').runId } });
    expect(all(events, 'error')).toEqual([]);
  });

  // V1 rule-engine demo story (10-week household). Superseded by the V2 AI engine on Leonardo's 16-week history (see server/src/brain/brain.test.ts); the rule engine is now only the labelled backup.
  test.skip('plan follows the contract and tells the demo story', () => {
    expect(plan).toMatchObject({ sampleData: true, lastWeekTotal: 186.15, budget: { aed: 158.23, source: 'cut_percent', cutPercent: 15 }, withinBudget: true, shortfall: 0 });
    expect(plan.planId).toBeTruthy();
    expect(plan.approvalToken).toMatch(/^tok_/);
    expect(plan.estTotal).toBeLessThanOrEqual(plan.budget.aed);
    expect(plan.monthlySavingEstimate).toBeGreaterThan(0);
    expect(plan.stores.find((s) => s.chosen)).toMatchObject({ merchantId: '40101', name: 'Marina Fresh Market', type: 'shops', valid: true });
    expect(plan.stores.find((s) => s.merchantId === '40201')).toMatchObject({ valid: false, chosen: false });
    expect(plan.stores.find((s) => s.merchantId === '40001')).toMatchObject({ type: 'quik', valid: true });
    const reason = (word: string) => plan.items.find((i) => i.name.toLowerCase().includes(word))!.reason;
    expect(reason('store brand')).toBe('swapped');
    expect(reason('dishwashing')).toBe('deferred');
    expect(reason('cola')).toBe('cut');
    expect(reason('water')).toBe('kept');
    expect(plan.insights.priceDrift.length).toBeGreaterThan(0);
    expect(plan.insights.categorySpend.length).toBeGreaterThan(0);
    for (const item of plan.items) expect(Object.keys(item).sort()).toEqual(['itemId', 'lineTotal', 'name', 'nextDue', 'note', 'qty', 'reason', 'replaces', 'tier', 'unitPrice']);
  });

  test('assistant message is English, left to right, and honest', () => {
    const message = one(events, 'message');
    expect(message).toMatchObject({ role: 'assistant', language: 'en', rtl: false });
    expect(message.text).toContain('Careem Quik Dubai Marina');
    expect(message.text).toMatch(/fresh produce/);
    expect(message.text).toMatch(/sample data/i);
    expect(message.text).toMatch(/nothing has been charged/i);
  });

  test('trace events use real Careem tool names and engine labels', () => {
    const tools = new Set(all(events, 'trace').map((t) => t.tool));
    for (const tool of ['user_info', 'get_activities', 'groceries_get_items_details', 'search_groceries_items', 'global_search', 'engine:priority_fill', 'engine:store_picker']) expect(tools, tool).toContain(tool);
    for (const t of all(events, 'trace')) expect(['running', 'ok', 'error']).toContain(t.status);
  });

  test('X-ray covers every kind of step in a valid tree with increasing seq', () => {
    const names = steps.map((s) => `${s.kind}:${s.name}`);
    for (const required of ['api:POST /api/chat', 'agent-tool:plan_basket', 'data:order_history_source', 'mcp:get_activities', 'mcp:search_groceries_items', 'mcp:global_search', 'engine:priceDrift', 'engine:fitBudget', 'engine:compareStores', 'approval:issue_token']) {
      expect(names, required).toContain(required);
    }
    expect(steps.filter((s) => s.kind === 'model').length).toBeGreaterThanOrEqual(1);
    expect(steps.map((s) => s.seq)).toEqual(steps.map((_, i) => i + 1));
    const byId = new Map(steps.map((s) => [s.stepId, s]));
    const root = steps[0];
    expect(root).toMatchObject({ kind: 'api', source: 'api:/api/chat' });
    expect(root.parentId).toBeUndefined();
    for (const s of steps.slice(1)) {
      expect(byId.has(s.parentId!), `${s.name} has a parent`).toBe(true);
      expect(byId.get(s.parentId!)!.seq).toBeLessThan(s.seq);
    }
    // model call -> agent tool -> mcp / engine
    const tool = steps.find((s) => s.kind === 'agent-tool')!;
    expect(byId.get(tool.parentId!)!.kind).toBe('model');
    expect(byId.get(steps.find((s) => s.name === 'get_activities')!.parentId!)!.kind).toBe('agent-tool');
  });

  test('no X-ray step is missing its source, input or end status', () => {
    for (const s of steps) {
      expect(s.source, s.name).toBeTruthy();
      expect(s.input, s.name).toBeDefined();
      expect(s.status, s.name).toBe('ok');
      expect(s.endedAt && s.ms !== undefined, s.name).toBeTruthy();
      expect(s.summary, s.name).toBeTruthy();
      expect(['sample', 'live', 'computed']).toContain(s.dataOrigin);
    }
    expect(steps.find((s) => s.name === 'get_activities')).toMatchObject({ dataOrigin: 'sample', source: expect.stringMatching(/^careem-mcp:sandbox@127\.0\.0\.1:\d+$/) });
    expect(steps.find((s) => s.name === 'priceDrift')!.source).toBe('engine:analysis.ts#priceDrift');
    expect(steps.find((s) => s.name === 'order_history_source')!.source).toMatch(/^fixtures:seed=\d+$/);
    expect(steps.find((s) => s.name === 'plan_basket')!.source).toBe('agent:tools.ts#plan_basket');
  });

  test('MCP steps carry full arguments (with Home coordinates) and the raw response', () => {
    const activities = steps.find((s) => s.name === 'get_activities')!;
    expect(activities.input).toEqual({ activity_status: 'past', activity_type: 'groceries' });
    expect((activities.output as any).past_activities).toHaveLength(15);
    expect(steps.find((s) => s.name === 'global_search')!.input).toMatchObject({ latitude: 25.0866, longitude: 55.1474 });
  });

  test('no secrets in X-ray: the approval token is masked everywhere', () => {
    const dump = JSON.stringify(all(events, 'xray'));
    expect(dump).not.toContain(plan.approvalToken);
    expect(dump).toContain(`tok_…${plan.approvalToken.slice(-4)}`);
    expect(readFileSync(join(XRAY_DIR, `${one(events, 'run').runId}.jsonl`), 'utf8')).not.toContain(plan.approvalToken);
    expect(dump).not.toMatch(/AKIA|ASIA[A-Z0-9]{16}|aws_secret|Bearer /);
  });

  test('GET /api/xray/:runId returns the run as ordered steps and a tree; GET /api/xray lists it', async () => {
    const { runId } = one(events, 'run');
    const { status, body } = await get(`/xray/${runId}`);
    const run = body as XrayRun;
    expect(status).toBe(200);
    expect(run).toMatchObject({ runId, status: 'ok', steps: steps.length });
    expect(run.ordered.map((s) => s.stepId)).toEqual(steps.map((s) => s.stepId));
    const count = (nodes: XrayTreeNode[]): number => nodes.reduce((sum, node) => sum + 1 + count(node.children), 0);
    expect(run.tree).toHaveLength(1);
    expect(count(run.tree)).toBe(steps.length);
    const list = (await get('/xray')).body.runs as { runId: string; steps: number; status: string; request: unknown }[];
    expect(list.find((r) => r.runId === runId)).toMatchObject({ steps: steps.length, status: 'ok', request: expect.objectContaining({ path: '/api/chat' }) });
    expect((await get('/xray/run_does_not_exist')).status).toBe(404);
  });

  test('follow-ups: explain, compare, keep, and "approve" typed in chat never touches the cart', async () => {
    const why = await chat(sessionId, 'Why did you drop the chocolate?');
    expect(one(why, 'message').text).toMatch(/ChocoJoy.*cut first/i);
    const stores = await chat(sessionId, 'Which store is cheapest?');
    expect(one(stores, 'message').text).toMatch(/Chosen for the whole basket: Careem Quik Dubai Marina/);
    const keep = await chat(sessionId, 'Keep the chips.');
    const kept = one(keep, 'plan');
    expect(kept.items.find((i) => i.name.includes('Chips'))).toMatchObject({ reason: 'kept', note: 'Kept because you asked' });
    expect(kept.budget).toEqual(plan.budget); // the earlier budget is remembered
    expect(kept.shortfall).toBe(Math.round(Math.max(0, kept.estTotal - kept.budget.aed) * 100) / 100);
    const typed = await chat(sessionId, 'Approve');
    expect(one(typed, 'message').text).toMatch(/press the Approve button/i);
    expect(finalSteps(typed).some((s) => s.kind === 'mcp')).toBe(false);
  });
});

describe('POST /api/approve', () => {
  test('builds the cart once, prices it, never charges; the token is single-use', async () => {
    const sessionId = session();
    const plan = one(await chat(sessionId, 'Same as last week, but cut 15%'), 'plan');
    const events = await approve(sessionId, plan);
    expect(events[0].event).toBe('run');
    expect(events[events.length - 1].event).toBe('done');
    const cart: Cart = one(events, 'cart');
    const store = plan.stores.find((s) => s.chosen)!;
    expect(store).toMatchObject({ type: 'quik' }); // fresh produce in the basket: Careem Quik
    expect(cart).toMatchObject({ merchantId: store.merchantId, storeName: store.name, subtotal: store.itemsTotal, deliveryFee: store.deliveryFee, serviceFee: store.serviceFee, charged: false, sampleData: true });
    expect(cart.total).toBeCloseTo(store.itemsTotal + store.deliveryFee + store.serviceFee - (cart.promo?.saving ?? 0), 2);
    const steps = finalSteps(events);
    expect(steps.filter((s) => s.kind === 'mcp').map((s) => s.name)).toEqual(['create_grocery_cart_with_quantities', 'cart_get_basket_price']);
    expect(steps.some((s) => BLOCKED_TOOLS.has(s.name) && s.kind === 'mcp')).toBe(false); // checkout is never called
    expect(steps.find((s) => s.name === 'check_token')).toMatchObject({ kind: 'approval', status: 'ok', source: 'api:approval-gate' });
    const sent = steps.find((s) => s.name === 'create_grocery_cart_with_quantities')!.input as any;
    expect(sent.merchant_id).toBe(Number(store.merchantId));
    expect(sent.items).toHaveLength(plan.items.filter((i) => i.lineTotal > 0).length);

    // Same token again: refused, and nothing mutating runs.
    const again = await approve(sessionId, plan);
    expect(one(again, 'error')).toMatchObject({ retryable: false });
    expect(all(again, 'cart')).toEqual([]);
    const againSteps = finalSteps(again);
    expect(againSteps.find((s) => s.name === 'check_token')).toMatchObject({ status: 'blocked', error: 'Approval token was already used' });
    expect(againSteps.some((s) => s.kind === 'mcp')).toBe(false);
    expect(again[again.length - 1].event).toBe('done');
  });

  test('an invalid token, or a token for another session, runs nothing', async () => {
    const sessionId = session();
    const plan = one(await chat(sessionId, 'My budget this week is 300 dirhams'), 'plan');
    expect(plan.budget).toEqual({ aed: 300, source: 'absolute' });
    expect(plan.approvalToken).toMatch(/^tok_/);
    for (const events of [await approve(sessionId, plan, 'tok_0000000000000000'), await postSse(`${api}/approve`, { sessionId: session(), planId: plan.planId, approvalToken: plan.approvalToken })]) {
      expect(one(events, 'error')).toBeTruthy();
      expect(all(events, 'cart')).toEqual([]);
      expect(finalSteps(events).some((s) => s.kind === 'mcp')).toBe(false);
    }
  });
});

describe('POST /api/reset and request validation', () => {
  test('reset clears the session and its approval tokens', async () => {
    const sessionId = session();
    const plan = one(await chat(sessionId, 'Same as last week, but cut 15%'), 'plan');
    const r = await fetch(`${api}/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    expect(await r.json()).toEqual({ ok: true, sampleData: true });
    const events = await approve(sessionId, plan);
    expect(one(events, 'error')).toBeTruthy();
    expect(all(events, 'cart')).toEqual([]);
  });

  test('bad requests get a 400 with a clear message, not a crash', async () => {
    for (const [path, body] of [['/chat', { sessionId: 's' }], ['/chat', { sessionId: 's', message: 'hi', language: 'xx' }], ['/chat', { sessionId: 's', message: 'hi', budgetAed: -5 }], ['/approve', { sessionId: 's' }], ['/reset', {}]] as const) {
      const r = await fetch(`${api}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      expect(r.status, path).toBe(400);
      expect((await r.json()).error).toBeTruthy();
    }
  });

  test('the weekly budget field is used when the message has no budget', async () => {
    const plan = one(await chat(session(), 'Plan my basket for this week', { budgetAed: 165 }), 'plan');
    expect(plan.budget).toEqual({ aed: 165, source: 'absolute' });
  });
});

describe('five languages', () => {
  const cases: [Language, string, RegExp, boolean][] = [
    ['en', 'Same as last week, but cut 15%', /^[\x00-\x7F→…]+$/, false],
    ['ar', 'نفس الأسبوع الماضي، لكن خفّض 15%', /[؀-ۿ]/, true],
    ['hi', 'पिछले हफ़्ते जैसा, पर 15% कम कर दो', /[ऀ-ॿ]/, false],
    ['ur', 'پچھلے ہفتے جیسا، مگر 15٪ کم کر دیں', /[ٹےںہ]/, true],
    ['tl', 'Gaya ng nakaraang linggo, pero bawasan ng 15%', /Narito ang basket/, false],
  ];
  test.each(cases)('%s: plan returned and reply in that language', async (language, message, script, rtl) => {
    const events = await chat(session(), message); // no language hint: detected from the text
    const plan = one(events, 'plan');
    expect(plan.budget).toEqual({ aed: Math.round(plan.lastWeekTotal * 0.85 * 100) / 100, source: 'cut_percent', cutPercent: 15 });
    const reply = one(events, 'message');
    expect(reply).toMatchObject({ language, rtl });
    expect(reply.text).toMatch(script);
  });

  test('Arabic-Indic digits are understood', async () => {
    expect(one(await chat(session(), 'نفس الأسبوع الماضي، لكن خفّض ١٥٪'), 'plan').budget.cutPercent).toBe(15);
  });
});

describe('robustness', () => {
  test('Careem outage: a calm error event, a read-only retry, no crash, nothing changed', async () => {
    writeFileSync(overridesPath, JSON.stringify({ get_activities: 'upstream-unavailable' }));
    try {
      const events = await chat(session(), 'نفس الأسبوع الماضي، لكن خفّض 15%');
      expect(one(events, 'error')).toMatchObject({ retryable: true, message: expect.stringMatching(/[؀-ۿ]/) }); // in the user's language
      expect(all(events, 'plan')).toEqual([]);
      expect(events[events.length - 1].event).toBe('done');
      const steps = finalSteps(events);
      expect(steps.filter((s) => s.name === 'get_activities').map((s) => s.status)).toEqual(['error', 'error']); // one retry, then stop
      expect(steps.find((s) => s.name === 'retry_read_only')).toMatchObject({ kind: 'guard', source: 'mcp:guard' });
      expect(one(events, 'message').text).toBeTruthy();
    } finally {
      writeFileSync(overridesPath, '{}');
    }
    expect(one(await chat(session(), 'Same as last week, but cut 15%'), 'plan')).toBeTruthy(); // works again straight away
  });

  test('magic trigger: merchant 99999 is a tool error, not a crash', async () => {
    await expect(mcp.call('groceries_get_items_details', { merchant_id: 99999, item_ids: [1] })).resolves.toMatchObject({ items: [{ error: expect.stringContaining('503') }] });
    await expect(mcp.call('get_activities', { next_cursor: 'trigger_upstream_down' })).rejects.toBeInstanceOf(McpToolError);
  });
});

describe('safety rails in the MCP wrapper', () => {
  const inRun = async <T>(fn: () => Promise<T>) => {
    const steps = new Map<string, XrayStep>();
    let error: unknown;
    await startRun({ test: true }, (e) => { if (e.event === 'xray') steps.set(e.data.step.stepId, e.data.step); }, () => fn().catch((e) => { error = e; }));
    return { error, steps: [...steps.values()] };
  };

  test.each([...BLOCKED_TOOLS])('%s is blocked, even with a valid approval', async (tool) => {
    const token = await issueToken('s-checkout', 'p-checkout');
    const grant = await consumeToken(token, 's-checkout', 'p-checkout', [tool]);
    const { error, steps } = await inRun(() => mcp.call(tool, { basket_id: 6000003, total_price: 10 }, { grant }));
    expect(error).toBeInstanceOf(BlockedError);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ kind: 'guard', name: tool, source: 'mcp:guard', status: 'blocked' });
  });

  test('a mutating call without a valid grant is blocked and never reaches Careem', async () => {
    const args = { items: [{ keyword: 'milk', catalog_item_id: '4010101', quantity: 1 }], merchant_id: 40101 };
    const forged = { sessionId: 's', planId: 'p', remaining: new Set(['create_grocery_cart_with_quantities']) } as Grant;
    for (const options of [{}, { grant: forged }]) {
      const { error, steps } = await inRun(() => mcp.call('create_grocery_cart_with_quantities', args, options));
      expect(error).toBeInstanceOf(BlockedError);
      expect(steps.map((s) => `${s.kind}:${s.status}`)).toEqual(['guard:blocked']);
    }
    for (const tool of ['cart_add_item', 'cart_update_item', 'cart_delete_items', 'cart_delete_basket', 'cart_reschedule_basket', 'cart_reorder', 'save_new_address', 'box_create_order']) {
      expect(mcp.isMutating(tool), tool).toBe(true);
      await expect(mcp.call(tool, {})).rejects.toBeInstanceOf(BlockedError);
    }
    expect(mcp.isMutating('get_activities')).toBe(false);
  });

  test('a grant allows each tool exactly once', async () => {
    const token = await issueToken('s-once', 'p-once');
    const grant = await consumeToken(token, 's-once', 'p-once', ['create_grocery_cart_with_quantities']);
    const args = { items: [{ keyword: 'milk', catalog_item_id: '4010101', quantity: 1 }], merchant_id: 40101 };
    await expect(mcp.call('create_grocery_cart_with_quantities', args, { grant })).resolves.toMatchObject({ page: 'create_grocery_cart_with_quantities' });
    await expect(mcp.call('create_grocery_cart_with_quantities', args, { grant })).rejects.toBeInstanceOf(BlockedError);
    await expect(consumeToken(token, 's-once', 'p-once', ['create_grocery_cart_with_quantities'])).rejects.toThrow('already used');
  });

  test('a failed mutating call is never retried', async () => {
    writeFileSync(overridesPath, JSON.stringify({ create_grocery_cart_with_quantities: 'missing-merchant' }));
    try {
      const token = await issueToken('s-noretry', 'p-noretry');
      const grant = await consumeToken(token, 's-noretry', 'p-noretry', ['create_grocery_cart_with_quantities']);
      const { error, steps } = await inRun(() => mcp.call('create_grocery_cart_with_quantities', { items: [{ keyword: 'milk', catalog_item_id: '1', quantity: 1 }], merchant_id: 40101 }, { grant }));
      expect(error).toBeInstanceOf(McpToolError);
      expect(steps.map((s) => `${s.kind}:${s.name}:${s.status}`)).toEqual(['mcp:create_grocery_cart_with_quantities:error']);
    } finally {
      writeFileSync(overridesPath, '{}');
    }
  });
});
