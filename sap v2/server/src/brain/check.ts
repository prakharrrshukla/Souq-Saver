// The calculator next to the AI engine. Pure code, no model: it adds up a basket with the store's real
// prices and fees and lists every rule the plan breaks. Every planning path (the AI's basket and the
// rule-based fallback) goes through checkPlan. Compatibility between a need and a product is decided
// here from catalogue data (category, size, product id), never from the planner's own claim.
import type { Reason, Tier } from '../contract.ts';
import { r2 } from '../engine/analysis.ts';
import { similarSize, type CatalogueItem, type StoreCatalogue } from '../engine/stores.ts';
import { limits, type Limits } from '../limits.ts';

/** Something the household needs this week, as decided by the AI engine (or the history rules). */
export type Need = {
  key: string; name: string; category: string; size: string; sku: string; qty: number; tier: Tier;
  loyal: boolean; pinned: boolean; reason: string;
  /** For user additions with no history: which store items could satisfy it. */
  matches?: (catalogue: StoreCatalogue) => CatalogueItem[];
};

export type BasketDraft = {
  merchantId: string;
  lines: { need: string; itemId: string; qty: number; reason: Extract<Reason, 'kept' | 'swapped' | 'reduced'>; note: string }[];
  cuts: { need: string; note: string }[];
  summary: string;
};

/** ok with withinBudget false: every allowed cut is already made, so the remaining shortfall is reported, not hidden. */
export type Check = { ok: boolean; issues: string[]; itemsTotal: number; estTotal: number; withinBudget: boolean; shortfall: number };

export type CheckContext = {
  /** Products the household stopped buying or the user asked to leave out (sku -> why). They cannot come back as a swap. */
  blockedSkus?: Map<string, string>;
  limits?: Limits;
};

/** Store items that can satisfy a need: the same product, or the same category with a compatible pack size. */
export function compatibleItems(need: Need, catalogue: StoreCatalogue): CatalogueItem[] {
  const priced = (i: CatalogueItem) => i.available && Number.isFinite(i.price) && i.price > 0;
  const sellable = catalogue.items.filter(priced);
  if (!need.category) return need.matches?.(catalogue).filter(priced) ?? [];
  return sellable.filter((i) => (need.sku && i.sku === need.sku) || (i.category === need.category.toLowerCase() && similarSize(need.size, i.size)));
}

/** One wording for every summary (trace, X-ray, chat): within budget, over by X, or cannot meet it. */
export function budgetVerdict(c: Pick<Check, 'ok' | 'estTotal' | 'withinBudget' | 'shortfall'>, budgetAed: number): string {
  if (c.withinBudget) return `AED ${c.estTotal.toFixed(2)}, within the AED ${budgetAed.toFixed(2)} budget`;
  if (c.ok) return `AED ${c.estTotal.toFixed(2)}, cannot meet the AED ${budgetAed.toFixed(2)} budget: AED ${c.shortfall.toFixed(2)} short after every allowed cut`;
  return `AED ${c.estTotal.toFixed(2)}, over budget by AED ${c.shortfall.toFixed(2)}`;
}

const REASONS = ['kept', 'swapped', 'reduced'];

export function checkPlan(draft: BasketDraft, needs: Need[], catalogues: StoreCatalogue[], budgetAed: number, context: CheckContext = {}): Check {
  const L = context.limits ?? limits();
  const issues: string[] = [];
  const fail = (issue: string): Check => ({ ok: false, issues: [issue], itemsTotal: 0, estTotal: 0, withinBudget: false, shortfall: 0 });
  const catalogue = catalogues.find((c) => c.merchantId === String(draft.merchantId));
  if (!catalogue) return fail(`merchantId ${draft.merchantId} is not one of the stores`);
  if (!Array.isArray(draft.lines) || !Array.isArray(draft.cuts)) return fail('lines and cuts must both be lists');

  const itemOf = new Map(catalogue.items.map((i) => [i.itemId, i]));
  const needOf = new Map(needs.map((n) => [n.key, n]));
  const seen = new Map<string, number>();
  const usedBy = new Map<string, string>(); // itemId -> need key, so one product is never counted for two needs
  const counted: { need: Need; qty: number }[] = [];
  let itemsTotal = 0;

  for (const line of draft.lines) {
    if (!line || typeof line.need !== 'string') { issues.push('every line needs a "need" key'); continue; }
    const need = needOf.get(line.need);
    const item = itemOf.get(String(line.itemId));
    seen.set(line.need, (seen.get(line.need) ?? 0) + 1);
    if (!need) { issues.push(`line for unknown need "${line.need}"`); continue; }
    if (!item || !item.available || !(Number.isFinite(item.price) && item.price > 0)) { issues.push(`${need.name}: itemId ${line.itemId} is not sold at ${catalogue.name}`); continue; }
    const exact = !!need.sku && item.sku === need.sku;
    if (!exact && !compatibleItems(need, catalogue).some((i) => i.itemId === item.itemId)) {
      issues.push(`${need.name}: ${item.name} does not match this need (different product type or pack size)`);
      continue;
    }
    if (!exact && item.sku && context.blockedSkus?.has(item.sku)) issues.push(`${need.name}: ${item.name} cannot be used, ${context.blockedSkus.get(item.sku)}`);
    if (!Number.isInteger(line.qty) || line.qty < 1) issues.push(`${need.name}: quantity must be a whole number of at least 1`);
    else if (line.qty > L.maxQtyPerLine) issues.push(`${need.name}: quantity ${line.qty} is over the limit of ${L.maxQtyPerLine} per item`);
    else if (line.qty > need.qty) issues.push(`${need.name}: quantity ${line.qty} is more than the ${need.qty} needed`);
    if (!REASONS.includes(line.reason)) issues.push(`${need.name}: reason must be kept, swapped or reduced`);
    else if (line.reason === 'kept' && need.sku && !exact) issues.push(`${need.name}: ${item.name} is a different product, so the reason is "swapped", not "kept"`);
    else if (line.reason === 'swapped' && exact) issues.push(`${need.name}: it is the same product, so the reason is "kept", not "swapped"`);
    else if (line.reason === 'reduced' && line.qty >= need.qty) issues.push(`${need.name}: marked reduced but the quantity is not lower than ${need.qty}`);
    else if (line.reason === 'kept' && line.qty < need.qty) issues.push(`${need.name}: the quantity is lower than ${need.qty}, so the reason is "reduced"`);
    if (need.pinned && line.qty < need.qty) issues.push(`${need.name}: the user asked to keep it, do not reduce it`);
    if (need.loyal && need.sku && !exact) issues.push(`${need.name}: the household is loyal to this product, do not swap it`);
    if ((need.tier === 'T1' || need.tier === 'T2') && line.qty < need.qty) issues.push(`${need.name}: ${need.tier} quantity must not be reduced`);
    const other = usedBy.get(item.itemId);
    if (other && other !== line.need) { issues.push(`${item.name} is used for two needs ("${other}" and "${line.need}"): combine them`); continue; }
    usedBy.set(item.itemId, line.need);
    counted.push({ need, qty: line.qty });
    itemsTotal += item.price * Math.max(0, Math.min(line.qty, L.maxQtyPerLine));
  }
  if (draft.lines.length > L.maxDistinctItems) issues.push(`${draft.lines.length} products is over the limit of ${L.maxDistinctItems} per basket`);

  for (const cut of draft.cuts) {
    if (!cut || typeof cut.need !== 'string') { issues.push('every cut needs a "need" key'); continue; }
    const need = needOf.get(cut.need);
    seen.set(cut.need, (seen.get(cut.need) ?? 0) + 1);
    if (!need) { issues.push(`cut for unknown need "${cut.need}"`); continue; }
    const soldHere = compatibleItems(need, catalogue).length > 0;
    if (!soldHere && (need.tier === 'T1' || need.tier === 'T2') && catalogues.some((c) => compatibleItems(need, c).length > 0)) {
      issues.push(`${need.name}: ${catalogue.name} does not sell it; choose a store that sells every essential`);
      continue;
    }
    if (!soldHere) continue; // unavailable here (and essentials unavailable everywhere): reported, not a cut
    if (need.pinned) issues.push(`${need.name}: the user asked to keep it, it cannot be cut`);
    if (need.tier === 'T1' || need.tier === 'T2') issues.push(`${need.name}: ${need.tier} essentials cannot be cut`);
  }
  for (const need of needs) {
    const count = seen.get(need.key) ?? 0;
    if (count === 0) issues.push(`${need.name} (need "${need.key}") is missing: add it as a line or a cut`);
    if (count > 1) issues.push(`${need.name} (need "${need.key}") appears ${count} times`);
  }

  itemsTotal = r2(itemsTotal);
  const estTotal = r2(itemsTotal + catalogue.deliveryFee + catalogue.serviceFee);
  if (estTotal > L.maxBasketAed) issues.push(`total AED ${estTotal.toFixed(2)} is over the basket limit of AED ${L.maxBasketAed}`);
  const withinBudget = estTotal <= budgetAed;
  if (!withinBudget) {
    // Over budget is only acceptable when nothing allowed is left to cut: every remaining line is
    // water (T1), a staple (T2) or something the user asked to keep. T3, T4 and T5 may all be cut.
    const stillCuttable = counted.filter(({ need }) => !need.pinned && need.tier !== 'T1' && need.tier !== 'T2').map(({ need }) => need.name);
    if (stillCuttable.length) {
      issues.push(`total AED ${estTotal.toFixed(2)} (items ${itemsTotal.toFixed(2)} + delivery ${catalogue.deliveryFee.toFixed(2)} + service ${catalogue.serviceFee.toFixed(2)}) is over the budget of AED ${budgetAed.toFixed(2)} by AED ${r2(estTotal - budgetAed).toFixed(2)}; still cuttable: ${stillCuttable.join(', ')}`);
    }
  }
  return { ok: issues.length === 0, issues, itemsTotal, estTotal, withinBudget, shortfall: r2(Math.max(0, estTotal - budgetAed)) };
}
