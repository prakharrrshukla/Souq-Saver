// The calculator next to the AI engine. Pure code, no model: it adds up the AI's basket with the
// store's real prices and fees and lists every rule the plan breaks. The AI revises until this passes.
import type { Reason, Tier } from '../contract.ts';
import { r2 } from '../engine/analysis.ts';
import type { CatalogueItem, StoreCatalogue } from '../engine/stores.ts';

/** Something the household needs this week, as decided by the AI engine. */
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

export function checkPlan(draft: BasketDraft, needs: Need[], catalogues: StoreCatalogue[], budgetAed: number): Check {
  const issues: string[] = [];
  const catalogue = catalogues.find((c) => c.merchantId === draft.merchantId);
  if (!catalogue) return { ok: false, issues: [`merchantId ${draft.merchantId} is not one of the stores`], itemsTotal: 0, estTotal: 0, withinBudget: false, shortfall: 0 };

  const itemOf = new Map(catalogue.items.map((i) => [i.itemId, i]));
  const needOf = new Map(needs.map((n) => [n.key, n]));
  const seen = new Map<string, number>();
  let itemsTotal = 0;

  for (const line of draft.lines) {
    const need = needOf.get(line.need);
    const item = itemOf.get(String(line.itemId));
    seen.set(line.need, (seen.get(line.need) ?? 0) + 1);
    if (!need) { issues.push(`line for unknown need "${line.need}"`); continue; }
    if (!item || !item.available) { issues.push(`${need.name}: itemId ${line.itemId} is not sold at ${catalogue.name}`); continue; }
    if (!Number.isInteger(line.qty) || line.qty < 1) issues.push(`${need.name}: quantity must be a whole number of at least 1`);
    if (need.pinned && line.qty < need.qty) issues.push(`${need.name}: the user asked to keep it, do not reduce it`);
    if (need.loyal && need.sku && item.sku !== need.sku) issues.push(`${need.name}: the household is loyal to this product, do not swap it`);
    if ((need.tier === 'T1' || need.tier === 'T2') && line.qty < need.qty) issues.push(`${need.name}: ${need.tier} quantity must not be reduced`);
    itemsTotal += item.price * Math.max(0, line.qty);
  }
  for (const cut of draft.cuts) {
    const need = needOf.get(cut.need);
    seen.set(cut.need, (seen.get(cut.need) ?? 0) + 1);
    if (!need) { issues.push(`cut for unknown need "${cut.need}"`); continue; }
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
  const withinBudget = estTotal <= budgetAed;
  if (!withinBudget) {
    // Over budget is only acceptable when nothing allowed is left to cut: every remaining line is
    // water (T1), a staple (T2) or something the user asked to keep. T3, T4 and T5 may all be cut.
    const stillCuttable = draft.lines.filter((line) => {
      const need = needOf.get(line.need);
      return !!need && !need.pinned && need.tier !== 'T1' && need.tier !== 'T2';
    }).map((line) => needOf.get(line.need)!.name);
    if (stillCuttable.length) {
      issues.push(`total AED ${estTotal.toFixed(2)} (items ${itemsTotal.toFixed(2)} + delivery ${catalogue.deliveryFee.toFixed(2)} + service ${catalogue.serviceFee.toFixed(2)}) is over the budget of AED ${budgetAed.toFixed(2)} by AED ${r2(estTotal - budgetAed).toFixed(2)}; still cuttable: ${stillCuttable.join(', ')}`);
    }
  }
  return { ok: issues.length === 0, issues, itemsTotal, estTotal, withinBudget, shortfall: r2(Math.max(0, estTotal - budgetAed)) };
}
