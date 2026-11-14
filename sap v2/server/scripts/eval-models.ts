// Runs the V2 AI household engine on Leonardo's sample history with several Bedrock models and
// scores each one against what the data clearly shows. Needs AWS credentials in the environment.
// Usage: PERSONA=leonardo|family|single node server/scripts/eval-models.ts <modelId> [<modelId> ...]
import { build, fixedTime } from '../../fixtures/generate.ts';
import { BedrockModel } from '../src/agent/bedrock.ts';
import { brainPlan } from '../src/brain/brain.ts';
import { categorySpend, lastWeek, normaliseOrders } from '../src/engine/analysis.ts';
import { parseFees, parseSearch, type StoreCatalogue } from '../src/engine/stores.ts';

const TODAY = new Date('2026-11-14T08:00:00Z');
const PERSONA = (process.env.PERSONA ?? 'leonardo') as 'leonardo' | 'family' | 'single';
const data = build(fixedTime(TODAY), PERSONA);
const { orders } = normaliseOrders([data.activities.pastGroceries, data.activities.pastShops], data.details.map((d) => d.response));
const cat = (r: any, name: string, fees: { deliveryFee: number; serviceFee: number }): StoreCatalogue => { const p = parseSearch(r); return { merchantId: p.merchantId, name, type: p.domain, ...fees, items: p.items }; };
const catalogues = [cat(data.search.quik, 'Careem Quik Dubai Marina', { deliveryFee: 4, serviceFee: 1.5 }), cat(data.search.marina, 'Marina Fresh Market', parseFees(data.basketPrice.marina)), cat(data.search.jlt, 'JLT Organic Pantry', parseFees(data.basketPrice.jlt))];

// What the history clearly shows (fixtures/household.config.ts). Each is one point.
const LEONARDO: [string, (d: any) => boolean][] = [
  ['water due, T1', (d) => d.sku_oasis_water_6x1500?.decision === 'due' && d.sku_oasis_water_6x1500?.tier === 'T1'],
  ['rice due', (d) => d.sku_royal_basmati_5kg?.decision === 'due'],
  ['rice loyal', (d) => d.sku_royal_basmati_5kg?.loyal === true],
  ['cow milk stopped', (d) => d.sku_marmoom_milk_2l?.decision === 'stopped'],
  ['oat milk due', (d) => d.sku_greenoat_oat_milk_1l?.decision === 'due'],
  ['atta not due', (d) => d.sku_chakki_atta_5kg?.decision === 'not_due'],
  ['dish soap not due', (d) => d.sku_sparkle_dish_750?.decision === 'not_due'],
  ['tissue not due', (d) => d.sku_softcloud_12?.decision === 'not_due'],
  ['Golden Sella not bought again', (d) => ['occasional', 'stopped'].includes(d.sku_golden_sella_5kg?.decision)],
  ['eggs tray due', (d) => d.sku_golden_eggs_30?.decision === 'due'],
  ['cola is T5', (d) => d.sku_fizzup_cola_6?.tier === 'T5'],
  ['chips are T5', (d) => d.sku_crunchos_150?.tier === 'T5'],
];

const high = (t: string) => t === 'T1' || t === 'T2';
const FAMILY: [string, (d: any) => boolean][] = [
  ['water due, T1', (d) => d.sku_oasis_water_6x1500?.decision === 'due' && d.sku_oasis_water_6x1500?.tier === 'T1'],
  ['10kg rice due (monthly run)', (d) => d.sku_royal_basmati_10kg?.decision === 'due'],
  ['rice loyal', (d) => d.sku_royal_basmati_10kg?.loyal === true],
  ['10kg atta due', (d) => d.sku_chakki_atta_10kg?.decision === 'due'],
  ['ghee not due', (d) => d.sku_ghee_1l?.decision === 'not_due'],
  ['diapers due and essential', (d) => d.sku_diapers_44?.decision === 'due' && high(d.sku_diapers_44?.tier)],
  ['milk qty grew to 4', (d) => d.sku_marmoom_milk_2l?.qty === 4],
  ['chicken qty 3, not the guest week 6', (d) => d.sku_valley_chicken_1kg?.qty === 3],
  ['tea not due', (d) => d.sku_tea_dust_900?.decision === 'not_due'],
  ['Golden Sella not bought again', (d) => ['occasional', 'stopped'].includes(d.sku_golden_sella_5kg?.decision)],
  ['cola is T5', (d) => d.sku_fizzup_cola_6?.tier === 'T5'],
];
const SINGLE: [string, (d: any) => boolean][] = [
  ['oat milk due', (d) => d.sku_greenoat_oat_milk_1l?.decision === 'due'],
  ['noodles stopped', (d) => d.sku_instant_noodles_5?.decision === 'stopped'],
  ['cola stopped', (d) => d.sku_fizzup_cola_6?.decision === 'stopped'],
  ['chips stopped', (d) => d.sku_crunchos_150?.decision === 'stopped'],
  ['sparkling water due', (d) => d.sku_sparkling_water_6?.decision === 'due'],
  ['chicken breast due, qty 2', (d) => d.sku_chicken_breast_500?.decision === 'due' && d.sku_chicken_breast_500?.qty === 2],
  ['brown rice due', (d) => d.sku_brown_rice_2kg?.decision === 'due'],
  ['coffee beans not due (bought 9 days ago, every 21)', (d) => d.sku_coffee_beans_250?.decision === 'not_due'],
  ['coffee beans loyal', (d) => d.sku_coffee_beans_250?.loyal === true],
  ['eggs due', (d) => d.sku_eggs_12?.decision === 'due'],
];
const EXPECT = { leonardo: LEONARDO, family: FAMILY, single: SINGLE }[PERSONA];

for (const modelId of process.argv.slice(2)) {
  const model = new BedrockModel({ modelId, region: process.env.AWS_REGION ?? 'us-east-1', timeoutMs: 120_000 });
  const started = Date.now();
  try {
    const plan = await brainPlan({ model, orders, catalogues, today: TODAY, lastWeekTotal: lastWeek(orders)!.total, budget: { cutPercent: 15 }, overrides: [], additions: [], insights: { categorySpend: categorySpend(orders.flatMap((o) => o.lines)).categories, priceDrift: [] } });
    const by = Object.fromEntries(plan.learned.products.map((p) => [p.sku, p]));
    const passed = EXPECT.filter(([, ok]) => ok(by));
    const store = plan.stores.find((s) => s.chosen)?.name;
    console.log(JSON.stringify({ persona: PERSONA, modelId, ok: true, seconds: Math.round((Date.now() - started) / 1000), score: `${passed.length}/${EXPECT.length}`, missed: EXPECT.filter(([, ok]) => !ok(by)).map(([n]) => n), store, estTotal: plan.estTotal, switches: plan.learned.switches, basket: plan.items.filter((i) => i.lineTotal > 0).map((i) => `${i.qty}x ${i.name.split(' ').slice(0, 3).join(' ')}${i.reason === 'kept' ? '' : ` (${i.reason})`}`), milk: plan.items.filter((i) => /milk/i.test(i.name)).map((i) => `${i.name.split(' ').slice(0, 2).join(' ')}: ${i.reason}`) }));
  } catch (e) {
    console.log(JSON.stringify({ persona: PERSONA, modelId, ok: false, seconds: Math.round((Date.now() - started) / 1000), error: (e as Error).message.slice(0, 200) }));
  }
}
