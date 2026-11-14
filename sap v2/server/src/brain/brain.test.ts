// V2 AI engine tests, offline. A scripted stand-in plays the model so we can test the plumbing:
// what the AI is shown, how its answers become a plan, and that the calculator rejects a plan
// that is over budget or breaks a rule and the AI gets to revise it. The real judgement comes
// from Claude on Bedrock and is checked live, not here.
import { describe, expect, test } from 'vitest';
import { build, fixedTime } from '../../../fixtures/generate.ts';
import type { ChatMessage, ModelAdapter, ToolSpec, Turn } from '../agent/bedrock.ts';
import { categorySpend, lastWeek, normaliseOrders } from '../engine/analysis.ts';
import { parseFees, parseSearch, type StoreCatalogue } from '../engine/stores.ts';
import { brainPlan, productHistory, weeklySpend } from './brain.ts';
import { checkPlan, type Need } from './check.ts';

const TODAY = new Date('2026-11-14T08:00:00Z');
const data = build(fixedTime(TODAY));
const { orders } = normaliseOrders([data.activities.pastGroceries, data.activities.pastShops], data.details.map((d) => d.response));
const catalogue = (response: any, name: string, fees: { deliveryFee: number; serviceFee: number }): StoreCatalogue => {
  const parsed = parseSearch(response);
  return { merchantId: parsed.merchantId, name, type: parsed.domain, ...fees, items: parsed.items };
};
const catalogues = [
  catalogue(data.search.quik, 'Careem Quik Dubai Marina', { deliveryFee: 4, serviceFee: 1.5 }),
  catalogue(data.search.marina, 'Marina Fresh Market', parseFees(data.basketPrice.marina)),
  catalogue(data.search.jlt, 'JLT Organic Pantry', parseFees(data.basketPrice.jlt)),
];

// What a correct reading of Leonardo's history looks like (the story in fixtures/household.config.ts).
const SCRIPT: Record<string, { decision: string; tier: string; qty: number; loyal?: boolean; nextDue?: string }> = {
  sku_oasis_water_6x1500: { decision: 'due', tier: 'T1', qty: 2 },
  sku_royal_basmati_5kg: { decision: 'due', tier: 'T2', qty: 1, loyal: true },
  sku_golden_sella_5kg: { decision: 'occasional', tier: 'T2', qty: 1 },
  sku_noor_sunflower_1800: { decision: 'due', tier: 'T2', qty: 1, loyal: true },
  sku_chakki_atta_5kg: { decision: 'not_due', tier: 'T2', qty: 2, nextDue: '2026-12-02' },
  sku_desi_toor_dal_1kg: { decision: 'not_due', tier: 'T2', qty: 2, nextDue: '2026-12-02' },
  sku_wadi_sugar_2kg: { decision: 'not_due', tier: 'T2', qty: 1, nextDue: '2026-12-12' },
  sku_marmoom_milk_2l: { decision: 'stopped', tier: 'T2', qty: 2 },
  sku_greenoat_oat_milk_1l: { decision: 'due', tier: 'T2', qty: 2 },
  sku_golden_eggs_30: { decision: 'due', tier: 'T2', qty: 1 },
  sku_eggs_12: { decision: 'occasional', tier: 'T3', qty: 1 },
  sku_red_onions_1kg: { decision: 'due', tier: 'T2', qty: 1 },
  sku_tomatoes_1kg: { decision: 'due', tier: 'T2', qty: 1 },
  sku_khayma_bread_6: { decision: 'due', tier: 'T2', qty: 2 },
  sku_sparkle_dish_750: { decision: 'not_due', tier: 'T4', qty: 1, nextDue: '2026-12-05' },
  sku_brightwash_3l: { decision: 'not_due', tier: 'T4', qty: 1, nextDue: '2026-12-12' },
  sku_softcloud_12: { decision: 'not_due', tier: 'T4', qty: 1, nextDue: '2026-12-19' },
  sku_crunchos_150: { decision: 'due', tier: 'T5', qty: 1, loyal: true },
  sku_fizzup_cola_6: { decision: 'due', tier: 'T5', qty: 1 },
  sku_chocojoy_4: { decision: 'due', tier: 'T5', qty: 1 },
  sku_polar_icecream_1l: { decision: 'due', tier: 'T5', qty: 1 },
  sku_teatime_biscuits_400: { decision: 'due', tier: 'T5', qty: 1 },
  sku_sunny_juice_1500: { decision: 'due', tier: 'T5', qty: 1 },
};

/** Plays the model: answers household_insights from SCRIPT; first basket keeps every treat (over budget), the revision cuts them. */
class ScriptedModel implements ModelAdapter {
  readonly id = 'scripted-test-model';
  readonly provider = 'test';
  readonly isBedrock = true;
  basketCalls = 0;
  shown: any[] = [];
  async converse(): Promise<Turn> { throw new Error('not used'); }
  async structured(_system: string, messages: ChatMessage[], tool: ToolSpec) {
    const brief = JSON.parse((messages[0].content[0] as { text: string }).text);
    this.shown.push(brief);
    let input: any;
    if (tool.name === 'household_insights') {
      input = { products: brief.products.map((p: any) => ({ sku: p.sku, reason: 'scripted', loyal: false, nextDue: null, ...(SCRIPT[p.sku] ?? { decision: 'occasional', tier: 'T4', qty: 1 }) })), likes: ['Royal Mahal rice'], dislikes: ['Golden Sella rice'], switches: ['Cow milk to oat milk in week 11'], persona: { summary: 'Looks like a small household in Dubai Marina that shops weekly at Careem Quik.', routines: ['Weekly Saturday shop at Careem Quik', 'Monthly staples at Marina Fresh Market', 'Extra 1', 'Extra 2', 'Extra 3'] } };
    } else {
      this.basketCalls++;
      const store = brief.stores.find((s: any) => s.name === 'Marina Fresh Market');
      const cutTreats = this.basketCalls > 1;
      const lines: any[] = [];
      const cuts: any[] = [];
      for (const need of brief.needs) {
        if (cutTreats && need.tier === 'T5') { cuts.push({ need: need.key, note: 'Treat cut to fit the budget' }); continue; }
        const option = store.options[need.key][0];
        lines.push({ need: need.key, itemId: option.itemId, qty: need.qty, reason: 'kept', note: 'Due this week' });
      }
      input = { merchantId: store.merchantId, lines, cuts, summary: 'scripted' };
    }
    const toolUseId = `t${this.shown.length}`;
    const turn: Turn = { content: [{ toolUse: { toolUseId, name: tool.name, input } }], text: '', toolCalls: [{ id: toolUseId, name: tool.name, input }], stopReason: 'tool_use', modelId: this.id };
    return { input, turn };
  }
}

const run = (model: ScriptedModel, overrides: any[] = []) => brainPlan({
  model, orders, catalogues, today: TODAY, lastWeekTotal: lastWeek(orders)!.total, budget: { cutPercent: 15 }, overrides, additions: [],
  insights: { categorySpend: categorySpend(orders.flatMap((o) => o.lines)).categories, priceDrift: [] },
});

describe('V2 AI engine', () => {
  test('the AI sees one record per product across Quik and Shops, from Careem data only', () => {
    const products = productHistory(orders);
    const atta = products.find((p) => p.sku === 'sku_chakki_atta_5kg')!;
    expect(atta.purchases.every((x) => x.store === 'Marina Fresh Market')).toBe(true);
    expect(products.find((p) => p.sku === 'sku_greenoat_oat_milk_1l')!.purchases.length).toBe(5);
    expect(new Set(products.map((p) => p.sku)).size).toBe(products.length);
  });

  test('an over-budget plan is rejected by the calculator and the AI revises it', async () => {
    const model = new ScriptedModel();
    const plan = await run(model);
    expect(model.basketCalls).toBe(2);
    expect(plan.withinBudget).toBe(true);
    expect(plan.estTotal).toBeLessThanOrEqual(158.23);
    expect(plan.stores.find((s) => s.chosen)!.name).toBe('Marina Fresh Market');
    const sum = plan.items.reduce((s, i) => s + i.lineTotal, 0) + 7 + 1;
    expect(plan.estTotal).toBeCloseTo(sum, 2);
  });

  test('the AI writes a household profile for the screen (summary and at most 4 routines)', async () => {
    const plan = await run(new ScriptedModel());
    expect(plan.learned.persona.summary).toMatch(/Looks like/);
    expect(plan.learned.persona.routines).toHaveLength(4);
    expect(plan.learned.switches[0]).toMatch(/oat milk/);
  });

  test('the switch is respected: oat milk in the basket, cow milk shown as no longer bought', async () => {
    const plan = await run(new ScriptedModel());
    expect(plan.items.find((i) => /oat milk/i.test(i.name))!.lineTotal).toBeGreaterThan(0);
    const cow = plan.items.find((i) => /Marmoom/.test(i.name))!;
    expect(cow.lineTotal).toBe(0);
    expect(cow.note).toMatch(/No longer bought/);
    expect(plan.items.find((i) => /atta/i.test(i.name))).toMatchObject({ reason: 'deferred', nextDue: '2026-12-02' });
  });

  test('monthly saving counts calendar weeks, so Marina top-ups are not treated as separate weeks', () => {
    expect(weeklySpend(orders)).toBeGreaterThan(180);
  });

  test('calculator rules: loyal items cannot be swapped, essentials cannot be cut, every need once', () => {
    const marina = catalogues[1];
    const rice: Need = { key: 'rice', name: 'Royal Mahal Basmati Rice 5kg', category: 'Basmati Rice', size: '5 kg', sku: 'sku_royal_basmati_5kg', qty: 1, tier: 'T2', loyal: true, pinned: false, reason: '' };
    const water: Need = { key: 'water', name: 'Water', category: 'Drinking Water', size: '6 x 1.5 L', sku: 'sku_oasis_water_6x1500', qty: 2, tier: 'T1', loyal: false, pinned: false, reason: '' };
    const storeBrand = marina.items.find((i) => i.sku === 'sku_marina_basmati_5kg')!;
    const check = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'rice', itemId: storeBrand.itemId, qty: 1, reason: 'swapped', note: '' }], cuts: [{ need: 'water', note: '' }], summary: '' }, [rice, water], catalogues, 500);
    expect(check.ok).toBe(false);
    expect(check.issues.join(' ')).toMatch(/loyal/);
    expect(check.issues.join(' ')).toMatch(/cannot be cut/);
  });

  test('calculator: over budget is accepted only once nothing allowed is left to cut, and the shortfall is reported', () => {
    const marina = catalogues[1];
    const water: Need = { key: 'water', name: 'Water', category: 'Drinking Water', size: '6 x 1.5 L', sku: 'sku_oasis_water_6x1500', qty: 2, tier: 'T1', loyal: false, pinned: false, reason: '' };
    const cola: Need = { key: 'cola', name: 'Cola', category: 'Soft Drinks', size: '6 x 330 ml', sku: 'sku_fizzup_cola_6', qty: 1, tier: 'T5', loyal: false, pinned: false, reason: '' };
    const waterItem = marina.items.find((i) => i.sku === 'sku_oasis_water_6x1500')!;
    const colaItem = marina.items.find((i) => i.sku === 'sku_fizzup_cola_6')!;
    const keepsCola = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: waterItem.itemId, qty: 2, reason: 'kept', note: '' }, { need: 'cola', itemId: colaItem.itemId, qty: 1, reason: 'kept', note: '' }], cuts: [], summary: '' }, [water, cola], catalogues, 10);
    expect(keepsCola.ok).toBe(false);
    expect(keepsCola.issues.join(' ')).toMatch(/still cuttable: Cola/);
    const cutAll = checkPlan({ merchantId: marina.merchantId, lines: [{ need: 'water', itemId: waterItem.itemId, qty: 2, reason: 'kept', note: '' }], cuts: [{ need: 'cola', note: 'treat' }], summary: '' }, [water, cola], catalogues, 10);
    expect(cutAll).toMatchObject({ ok: true, withinBudget: false });
    expect(cutAll.shortfall).toBeCloseTo(cutAll.estTotal - 10, 2);
  });
});

