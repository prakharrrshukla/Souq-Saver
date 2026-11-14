// The whole demo in the terminal, with no UI:
//   "Same as last week, but cut 15%"  ->  trace, plan, store comparison  ->  Approve  ->  exact price.
// Starts its own Careem MCP sandbox and backend if they are not already running.
//   npm run demo:cli                     add  -- --xray   to print every step with full input and output
//   npm run demo:cli -- --message "نفس الأسبوع الماضي، لكن خفّض 15%" --language ar
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Cart, Config, Plan, SseEvent } from '../src/contract.ts';
import { postSse } from '../src/api/sseClient.ts';
import { aed, printStep } from './print.ts';

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const showXray = args.includes('--xray');
const message = flag('message') ?? 'Same as last week, but cut 15%';
const language = flag('language');

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const up = async (url: string) => (await fetch(url).catch(() => null))?.ok ?? false;

let closeSandbox = async () => {};
if (!(await up('http://127.0.0.1:8787/health'))) {
  const { startHttp } = await import('../../sandbox/careem-mcp-ts/src/server.ts');
  const sandbox = await startHttp({ quiet: true });
  closeSandbox = sandbox.close;
  console.log(`Started Careem MCP sandbox at ${sandbox.url}`);
}
let api = `http://localhost:${process.env.PORT ?? 8080}/api`;
let closeApi = async () => {};
if (!(await up(`${api}/config`))) {
  const [{ buildApp }, { CareemMcp }, { chooseModel }] = await Promise.all([import('../src/api/server.ts'), import('../src/mcp/client.ts'), import('../src/index.ts')]);
  const mcp = new CareemMcp();
  const app = buildApp({ mcp, model: await chooseModel() });
  api = `${await app.listen({ port: 0, host: '127.0.0.1' })}/api`;
  closeApi = async () => { await app.close(); await mcp.close(); };
  console.log(`Started backend at ${api}`);
}

const config = (await (await fetch(`${api}/config`)).json()) as Config;
const health = await (await fetch(`${api}/health`)).json();
console.log(`\nModel: ${config.modelId} on ${config.modelProvider} · Careem MCP: ${config.mcpMode} · sampleData: ${config.sampleData}`);
console.log(`Health: ${JSON.stringify(health)}`);
if (config.sampleData) console.log('NOTE: sample data in Careem\'s format, served through the Careem MCP sandbox.\n');

const onEvent = (e: SseEvent) => {
  if (e.event === 'run') console.log(`run ${e.data.runId}`);
  else if (e.event === 'trace' && e.data.status !== 'running' && !showXray) console.log(`  ${e.data.status === 'ok' ? '✓' : '✗'} ${e.data.tool.padEnd(38)} ${String(e.data.ms ?? '').padStart(5)} ms  ${e.data.summary}`);
  else if (e.event === 'xray' && e.data.step.status !== 'running' && showXray) printStep(e.data.step);
  else if (e.event === 'message') console.log(`\nAssistant (${e.data.language}${e.data.rtl ? ', rtl' : ''}): ${e.data.text}`);
  else if (e.event === 'error') console.log(`\nERROR: ${e.data.message} (retryable: ${e.data.retryable})`);
};

const sessionId = `cli_${Date.now().toString(36)}`;
console.log(`You: ${message}`);
const chat = await postSse(`${api}/chat`, { sessionId, message, ...(language && { language }) }, onEvent);
const plan = chat.find((e): e is Extract<SseEvent, { event: 'plan' }> => e.event === 'plan')?.data as Plan | undefined;

let failed = !plan;
if (plan) {
  console.log(`\nSTORE COMPARISON (final basket, fees included)`);
  for (const s of plan.stores) {
    console.log(`  ${s.chosen ? '>' : ' '} ${s.name.padEnd(26)} ${aed(s.estTotal).padStart(11)}  items ${aed(s.itemsTotal)} + delivery ${aed(s.deliveryFee)} + service ${aed(s.serviceFee)}${s.chosen ? '  [Cheapest]' : ''}${s.valid ? '' : `  [Missing ${s.missing.join(', ')}]`}`);
  }
  console.log(`\nBASKET  (last week ${aed(plan.lastWeekTotal)} · budget ${aed(plan.budget.aed)}${plan.budget.cutPercent ? ` = cut ${plan.budget.cutPercent}%` : ''})`);
  for (const i of plan.items) {
    console.log(`  ${i.tier} ${i.reason.padEnd(8)} ${String(i.qty).padStart(2)} x ${i.name.padEnd(46)} ${(i.lineTotal ? aed(i.lineTotal) : '-').padStart(10)}  ${i.note}`);
  }
  console.log(`  Estimated total ${aed(plan.estTotal)} · ${plan.withinBudget ? 'within budget' : `over budget by ${aed(plan.shortfall)}`} · monthly saving estimate ${aed(plan.monthlySavingEstimate)}`);
  console.log(`  Price drift: ${plan.insights.priceDrift.map((d) => `${d.name} +${d.driftPct}%`).join(', ')}`);

  console.log(`\nYou press Approve (planId ${plan.planId})`);
  const approve = await postSse(`${api}/approve`, { sessionId, planId: plan.planId, approvalToken: plan.approvalToken }, onEvent);
  const cart = approve.find((e): e is Extract<SseEvent, { event: 'cart' }> => e.event === 'cart')?.data as Cart | undefined;
  if (cart) {
    console.log(`\nCART READY at ${cart.storeName} (basket ${cart.basketId})`);
    console.log(`  subtotal ${aed(cart.subtotal)} + delivery ${aed(cart.deliveryFee)} + service ${aed(cart.serviceFee)}${cart.promo ? ` - promo ${cart.promo.code} ${aed(cart.promo.saving)}` : ''}`);
    console.log(`  EXACT TOTAL ${aed(cart.total)} · charged: ${cart.charged} · Nothing has been charged. Checkout is never called.`);
  } else failed = true;
  console.log(`\nX-ray: npm run xray -- ${chat[0].event === 'run' ? chat[0].data.runId : ''}   (files in .run/xray)`);
}
await closeApi();
await closeSandbox();
process.exit(failed ? 1 : 0);
