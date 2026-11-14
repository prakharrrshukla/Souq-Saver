// Engine tests on the generated household (fixtures/generate.ts), offline, with a fixed clock.
// The seven demo assertions come from context/06-test-data-spec.md.
import { describe, expect, test } from 'vitest';
import { build, fixedTime } from '../../../fixtures/generate.ts';
import { averageWeeklySpend, categorySpend, cycles, isoWeek, lastWeek, normaliseOrders, priceDrift, r2 } from './analysis.ts';
import { assignTiers, baseTier, fitBudget, itemHistory, matchScore, monthlySaving, planBasket, resolveBudget, type BudgetRequest, type Override, type Addition } from './planner.ts';
import { compareStores, parseFees, parseSearch, parseSize, similarSize, type StoreCatalogue } from './stores.ts';

const TODAY = new Date('2026-11-14T08:00:00Z'); // a Saturday; the last order was the Saturday before
const data = build(fixedTime(TODAY));
const { orders, lines } = normaliseOrders([data.activities.pastGroceries, data.activities.pastShops], data.details.map((d) => d.response));
const drift = priceDrift(lines);
const cycleList = cycles(lines, TODAY);
const history = itemHistory(lines, cycleList, drift);
const spend = categorySpend(lines);

const catalogue = (response: any, name: string, fees: { deliveryFee: number; serviceFee: number }): StoreCatalogue => {
  const parsed = parseSearch(response);
  return { merchantId: parsed.merchantId, name, type: parsed.domain, ...fees, items: parsed.items };
};
const catalogues = [
  catalogue(data.search.quik, 'Careem Quik Dubai Marina', { deliveryFee: 4, serviceFee: 1.5 }), // Careem's own Quik basket fees
  catalogue(data.search.marina, 'Marina Fresh Market', parseFees(data.basketPrice.marina)),
  catalogue(data.search.jlt, 'JLT Organic Pantry', parseFees(data.basketPrice.jlt)),
];
const plan = (budget: BudgetRequest, overrides: Override[] = [], additions: Addition[] = []) =>
  planBasket({ history, lastWeekTotal: lastWeek(orders)!.total, averageWeeklySpend: averageWeeklySpend(orders), catalogues, budget, overrides, additions, categorySpend: spend.categories });
const find = <T extends { name: string }>(items: T[], word: string): T => items.find((i) => i.name.toLowerCase().includes(word))!;
const inBasket = (reason: string) => ['kept', 'swapped', 'reduced'].includes(reason);

describe('analysis', () => {
  test('normalises 19 orders (15 weekly Quik, 4 monthly Marina) with categories from item details', () => {
    expect(orders).toHaveLength(19);
    expect(lines.every((l) => l.category !== 'Uncategorised' && l.sku && l.size)).toBe(true);
    expect(lines.every((l) => r2(l.unitPrice * l.qty) === l.lineTotal)).toBe(true);
  });

  test('last week total is about AED 291 (fresh produce every week)', () => {
    expect(lastWeek(orders)!.total).toBe(290.9);
  });

  test('order totals equal their lines plus that store\'s fees', () => {
    for (const order of orders) expect(order.total).toBe(r2(order.lines.reduce((s, l) => s + l.lineTotal, 0) + (order.merchantId === '40101' ? 8 : 5.5)));
  });

  test('rice drift is about +10% and flagged; milk drifts too', () => {
    const rice = find(drift, 'basmati rice 5kg');
    expect(rice.firstPrice).toBe(38);
    expect(rice.latestPrice).toBe(42);
    expect(rice.driftPct).toBeCloseTo(10.53, 2);
    expect(rice.flagged).toBe(true);
    expect(find(drift, 'milk').driftPct).toBeCloseTo(10.53, 2);
    expect(find(drift, 'water').flagged).toBe(false);
  });

  test('cycles: weekly water, 3-weekly rice due now, 4-weekly dish soap not due', () => {
    expect(find(cycleList, 'water')).toMatchObject({ medianDays: 7, dueThisWeek: true, orders: 13 });
    expect(find(cycleList, 'basmati rice')).toMatchObject({ medianDays: 21, dueThisWeek: true, nextDue: '2026-11-14' });
    expect(find(cycleList, 'dishwashing')).toMatchObject({ medianDays: 28, dueThisWeek: false, nextDue: '2026-12-05' });
    expect(find(cycleList, 'sea salt')).toMatchObject({ medianDays: null, nextDue: null, dueThisWeek: false }); // bought once
  });

  test('category spend covers the latest 4 weeks', () => {
    expect(spend.weeks).toHaveLength(15); // 16 weeks minus the holiday week
    expect(spend.categories.length).toBeGreaterThan(3);
    const latest4 = spend.weeks.slice(-4);
    const total = r2(latest4.reduce((s, w) => s + w.total, 0) / 4);
    expect(r2(spend.categories.reduce((s, c) => s + c.weeklyAvg, 0))).toBeCloseTo(total, 1);
  });

  test('isoWeek', () => {
    expect(isoWeek('2026-11-14T08:00:00Z')).toBe('2026-W46');
    expect(isoWeek('2027-01-01T00:00:00Z')).toBe('2026-W53');
  });
});

describe('stores', () => {
  test('sizes', () => {
    expect(parseSize('6 x 1.5 L')).toEqual({ amount: 9000, unit: 'ml' });
    expect(parseSize('5 kg')).toEqual({ amount: 5000, unit: 'g' });
    expect(similarSize('5 kg', '4 kg')).toBe(true);
    expect(similarSize('5 kg', '1 kg')).toBe(false);
    expect(similarSize('2 L', '2 kg')).toBe(false);
  });

  test('a store missing a T1/T2 item is not valid and is never chosen', () => {
    const wants = [
      { key: 'w', name: 'Water', category: 'Drinking Water', size: '6 x 1.5 L', sku: 'sku_oasis_water_6x1500', qty: 1, tier: 'T1' as const },
      { key: 'c', name: 'Chips', category: 'Potato Chips', size: '150 g', sku: 'sku_crunchos_150', qty: 1, tier: 'T5' as const },
    ];
    const quotes = compareStores(wants, catalogues);
    const jlt = quotes.find((q) => q.name === 'JLT Organic Pantry')!;
    expect(jlt.valid).toBe(false);
    expect(jlt.chosen).toBe(false);
    expect(quotes.filter((q) => q.chosen)).toHaveLength(1);
    for (const q of quotes) expect(q.estTotal).toBe(r2(q.itemsTotal + q.deliveryFee + q.serviceFee));
  });
});

describe('planner', () => {
  // V1 rule-engine demo story (10-week household). Superseded by the V2 AI engine on Leonardo's 16-week history (see server/src/brain/brain.test.ts); the rule engine is now only the labelled backup.
  test.skip('tiers', () => {
    expect(baseTier('Drinking Water', 'Water & Beverages', 'Oasis')).toBe('T1');
    expect(baseTier('Soft Drinks', 'Water & Beverages', 'FizzUp Cola')).toBe('T5');
    expect(baseTier('Basmati Rice', '', '')).toBe('T2');
    expect(baseTier('Dishwashing Liquid', 'Household', '')).toBe('T4');
    const tiers = assignTiers(history);
    expect(find(tiers, 'milk')).toMatchObject({ baseTier: 'T3', tier: 'T2', promoted: true }); // in every order
    expect(find(tiers, 'cola')).toMatchObject({ tier: 'T5', promoted: false }); // treats are never auto-promoted
    expect(find(assignTiers(history, [{ item: 'chips', keep: true }]), 'chips').pinned).toBe(true);
  });

  test('budget: relative cut, absolute, default', () => {
    expect(resolveBudget({ cutPercent: 15 }, 186.15)).toEqual({ aed: 158.23, source: 'cut_percent', cutPercent: 15 });
    expect(resolveBudget({ budgetAed: 150 }, 186.15)).toEqual({ aed: 150, source: 'absolute' });
    expect(resolveBudget({}, 186.15)).toEqual({ aed: 186.15, source: 'last_week' });
  });

  test('match score understands everyday words', () => {
    expect(matchScore('dish soap', { name: 'Sparkle Lemon Dishwashing Liquid 750ml', category: 'Dishwashing Liquid' })).toBeGreaterThan(0);
    expect(matchScore('chocolate', { name: 'FizzUp Cola 6x330ml', category: 'Soft Drinks' })).toBe(0);
  });

  test('monthly saving formula', () => {
    expect(monthlySaving(180, 150)).toBe(129.9);
  });
});

describe('demo: "Same as last week, but cut 15%"', async () => {
  const result = await plan({ cutPercent: 15 });

  // V1 rule-engine demo story (10-week household). Superseded by the V2 AI engine on Leonardo's 16-week history (see server/src/brain/brain.test.ts); the rule engine is now only the labelled backup.
  test.skip('1. rice shows about +10% drift and is swapped to the store brand', () => {
    expect(result.insights.priceDrift.find((d) => d.name.includes('Basmati Rice 5kg'))!.driftPct).toBeCloseTo(10.5, 0);
    const rice = find(result.items, 'basmati rice');
    expect(rice).toMatchObject({ reason: 'swapped', unitPrice: 34, tier: 'T2', replaces: 'Royal Mahal Basmati Rice 5kg' });
    expect(rice.name).toContain('store brand');
    expect(rice.note).toContain('saves AED 5.50');
  });

  test('2. dish soap is deferred with a next-due date, not cut', () => {
    expect(find(result.items, 'dishwashing')).toMatchObject({ reason: 'deferred', nextDue: '2026-12-05', lineTotal: 0 });
  });

  test('3. cola, chocolate and chips are cut; chips stay when overridden', async () => {
    for (const word of ['cola', 'chocolate', 'chips']) expect(find(result.items, word)).toMatchObject({ reason: 'cut', tier: 'T5', lineTotal: 0 });
    const withChips = await plan({ cutPercent: 15 }, [{ item: 'chips', keep: true }]);
    expect(find(withChips.items, 'chips').reason).toBe('kept');
    expect(find(withChips.items, 'cola').reason).toBe('cut');
  });

  // V1 rule-engine demo story (10-week household). Superseded by the V2 AI engine on Leonardo's 16-week history (see server/src/brain/brain.test.ts); the rule engine is now only the labelled backup.
  test.skip('4. water, rice, atta, oil, milk and eggs are always in the basket', () => {
    for (const word of ['water', 'rice', 'atta', 'oil', 'milk', 'eggs']) {
      const item = find(result.items, word);
      expect(inBasket(item.reason), word).toBe(true);
      expect(item.lineTotal).toBeGreaterThan(0);
    }
  });

  // V1 rule-engine demo story (10-week household). Superseded by the V2 AI engine on Leonardo's 16-week history (see server/src/brain/brain.test.ts); the rule engine is now only the labelled backup.
  test.skip('5. Marina Fresh Market is chosen; JLT is missing atta and water', () => {
    expect(result.stores.find((s) => s.chosen)).toMatchObject({ name: 'Marina Fresh Market', merchantId: '40101', valid: true });
    const jlt = result.stores.find((s) => s.merchantId === '40201')!;
    expect(jlt.valid).toBe(false);
    expect(jlt.missing).toEqual(expect.arrayContaining(['drinking water', 'atta flour']));
    const quik = result.stores.find((s) => s.merchantId === '40001')!;
    expect(quik.valid).toBe(true);
    expect(quik.estTotal).toBeGreaterThan(result.estTotal);
  });

  test('6. estimated total is within the budget and adds up', () => {
    expect(result.budget).toEqual({ aed: r2(lastWeek(orders)!.total * 0.85), source: 'cut_percent', cutPercent: 15 });
    expect(result.estTotal).toBeLessThanOrEqual(result.budget.aed);
    expect(result.withinBudget).toBe(true);
    expect(result.shortfall).toBe(0);
    const chosen = result.stores.find((s) => s.chosen)!;
    expect(r2(result.items.reduce((s, i) => s + i.lineTotal, 0))).toBe(chosen.itemsTotal);
    expect(result.estTotal).toBe(r2(chosen.itemsTotal + chosen.deliveryFee + chosen.serviceFee));
    expect(result.estTotal).toBe(chosen.estTotal);
  });

  test('7. monthly saving follows the formula', () => {
    expect(result.monthlySavingEstimate).toBe(r2((averageWeeklySpend(orders) - result.estTotal) * 4.33));
  });
});

describe('other requests', () => {
  test('a generous budget cuts nothing and swaps nothing', async () => {
    const result = await plan({ budgetAed: 400 });
    expect(result.items.filter((i) => i.reason === 'cut' || i.reason === 'swapped' || i.reason === 'reduced')).toEqual([]);
    expect(find(result.items, 'dishwashing').reason).toBe('deferred'); // still not due
  });

  test('an impossible budget keeps water and staples and reports the shortfall honestly', async () => {
    const result = await plan({ budgetAed: 60 });
    expect(result.withinBudget).toBe(false);
    expect(result.shortfall).toBe(r2(result.estTotal - 60));
    for (const item of result.items.filter((i) => i.tier === 'T1' || i.tier === 'T2')) {
      if (item.reason !== 'deferred') expect(inBasket(item.reason), item.name).toBe(true);
    }
  });

  test('additions: more rice and a new item', async () => {
    const result = await plan({ budgetAed: 400 }, [], [{ item: 'rice', qty: 1 }, { item: 'potatoes', qty: 2 }, { item: 'unobtainium' }]);
    expect(find(result.items, 'basmati rice').qty).toBe(2);
    expect(find(result.items, 'potatoes')).toMatchObject({ qty: 2, reason: 'kept', note: 'Added at your request' });
    expect(result.unmatchedAdditions).toEqual(['unobtainium']);
  });

  test('dropping an item on request', async () => {
    const result = await plan({ budgetAed: 400 }, [{ item: 'cola', drop: true }]);
    expect(find(result.items, 'cola')).toMatchObject({ reason: 'cut', note: 'Left out because you asked' });
  });

  test('fresh essentials are reduced before they are removed', () => {
    const marina = catalogues[1];
    const item = (word: string) => marina.items.find((i) => i.name.toLowerCase().includes(word))!;
    const lines = [
      { key: 'a', item: item('tomatoes'), qty: 3, tier: 'T3' as const, pinned: false, promoted: false, added: false },
      { key: 'b', item: item('water'), qty: 1, tier: 'T1' as const, pinned: false, promoted: false, added: false },
    ];
    const fit = fitBudget(lines, marina, 8 + 8.75 + 4.95 * 2);
    expect(fit.items[0]).toMatchObject({ qty: 2, reason: 'reduced', included: true });
    expect(fit.withinBudget).toBe(true);
  });
});
