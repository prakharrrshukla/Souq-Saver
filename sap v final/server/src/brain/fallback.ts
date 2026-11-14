// The rule-based basket planner. Used when the AI's basket fails the calculator after its attempts,
// or when Bedrock is not connected. It works from the same household needs as the AI (so loyalty,
// switches and the user's instructions carry over) and its draft goes through the same checkPlan.
import type { Tier } from '../contract.ts';
import { r2 } from '../engine/analysis.ts';
import { TIER_LABEL } from '../engine/planner.ts';
import type { CatalogueItem, StoreCatalogue } from '../engine/stores.ts';
import { compatibleItems, type BasketDraft, type CheckContext, type Need } from './check.ts';

const essential = (tier: Tier) => tier === 'T1' || tier === 'T2';

/** The product to buy for a need at a store: the same product if sold, else (not for loyal needs) the cheapest compatible one. */
function pick(need: Need, catalogue: StoreCatalogue, context: CheckContext): CatalogueItem | null {
  const options = compatibleItems(need, catalogue);
  const exact = options.find((i) => need.sku && i.sku === need.sku);
  if (exact || need.loyal) return exact ?? null;
  return options.filter((i) => !(i.sku && context.blockedSkus?.has(i.sku))).sort((a, b) => a.price - b.price)[0] ?? null;
}

export type StoreChoice = { catalogue: StoreCatalogue; picks: Map<string, CatalogueItem | null>; total: number; missingEssential: number; missingPinned: number; missingOther: number };

/** Every store priced for the whole list. A store missing an essential that another store sells is not valid. */
export function chooseStore(needs: Need[], catalogues: StoreCatalogue[], context: CheckContext): { choices: StoreChoice[]; chosen: StoreChoice | null } {
  const soldSomewhere = (need: Need) => catalogues.some((c) => pick(need, c, context));
  const choices = catalogues.map((catalogue) => {
    const picks = new Map(needs.map((n) => [n.key, pick(n, catalogue, context)]));
    const missing = needs.filter((n) => !picks.get(n.key));
    const total = r2(needs.reduce((sum, n) => sum + (picks.get(n.key)?.price ?? 0) * n.qty, 0) + catalogue.deliveryFee + catalogue.serviceFee);
    return {
      catalogue, picks, total,
      missingEssential: missing.filter((n) => essential(n.tier) && soldSomewhere(n)).length,
      missingPinned: missing.filter((n) => n.pinned).length,
      missingOther: missing.filter((n) => !essential(n.tier) && !n.pinned).length,
    };
  });
  const chosen = choices.filter((c) => c.missingEssential === 0)
    .sort((a, b) => a.missingPinned - b.missingPinned || a.missingOther - b.missingOther || a.total - b.total)[0] ?? null;
  return { choices, chosen };
}

type Line = { need: Need; item: CatalogueItem; qty: number; reason: 'kept' | 'swapped' | 'reduced'; note: string; included: boolean };

/**
 * Fits the list to the budget at the chosen store, cutting from the bottom:
 *   1. cut treats (T5), most expensive first
 *   2. swap to a cheaper compatible product, only where the household is not loyal
 *   3. reduce fresh food (T3) by one, never below one
 *   4. cut household items (T4), then fresh food (T3)
 * Water (T1), staples (T2) and anything the user asked to keep are never cut or reduced.
 */
export function ruleBasket(needs: Need[], choice: StoreChoice, budgetAed: number, context: CheckContext): BasketDraft {
  const { catalogue, picks } = choice;
  const fees = catalogue.deliveryFee + catalogue.serviceFee;
  const lines: Line[] = [];
  const cuts: BasketDraft['cuts'] = [];
  for (const need of needs) {
    const item = picks.get(need.key);
    if (!item) { cuts.push({ need: need.key, note: `Not sold at ${catalogue.name}` }); continue; }
    const swapped = !!need.sku && item.sku !== need.sku;
    const note = need.pinned ? (need.reason === 'You asked to add this' ? 'Added at your request' : 'Kept because you asked')
      : essential(need.tier) ? `${TIER_LABEL[need.tier]} (${need.tier}): never cut` : `${TIER_LABEL[need.tier]} (${need.tier}): due this week`;
    lines.push({ need, item, qty: need.qty, reason: swapped ? 'swapped' : 'kept', note: swapped ? `${item.name} instead of ${need.name} (not sold here)` : note, included: true });
  }
  const total = () => r2(lines.filter((l) => l.included).reduce((sum, l) => sum + l.item.price * l.qty, 0) + fees);
  const over = () => total() > budgetAed;
  const byCost = (a: Line, b: Line) => b.item.price * b.qty - a.item.price * a.qty || a.item.name.localeCompare(b.item.name);
  const open = (tier: Tier) => lines.filter((l) => l.included && !l.need.pinned && l.need.tier === tier).sort(byCost);
  const cut = (line: Line, note: string) => { line.included = false; cuts.push({ need: line.need.key, note }); };

  for (const line of open('T5')) if (over()) cut(line, `${TIER_LABEL.T5} (T5): cut first to fit the budget`);
  if (over()) {
    const swaps = lines.filter((l) => l.included && !l.need.loyal)
      .map((line) => ({ line, to: compatibleItems(line.need, catalogue).filter((i) => i.price < line.item.price && !(i.sku && context.blockedSkus?.has(i.sku))).sort((a, b) => a.price - b.price)[0] }))
      .filter((s): s is { line: Line; to: CatalogueItem } => !!s.to)
      .sort((a, b) => (b.line.item.price - b.to.price) * b.line.qty - (a.line.item.price - a.to.price) * a.line.qty);
    for (const { line, to } of swaps) {
      if (!over()) break;
      line.note = `${to.name} instead of ${line.item.name} saves AED ${r2((line.item.price - to.price) * line.qty).toFixed(2)}`;
      line.item = to;
      line.reason = 'swapped';
    }
  }
  while (over()) {
    const reducible = open('T3').find((l) => l.qty > 1);
    if (!reducible) break;
    reducible.qty -= 1;
    reducible.reason = 'reduced';
    reducible.note = `Reduced from ${reducible.need.qty} to ${reducible.qty} to fit the budget`;
  }
  for (const tier of ['T4', 'T3'] as const) for (const line of open(tier)) if (over()) cut(line, `${TIER_LABEL[tier]} (${tier}): removed to fit the budget after treats and swaps`);

  return {
    merchantId: catalogue.merchantId,
    lines: lines.filter((l) => l.included).map((l) => ({ need: l.need.key, itemId: l.item.itemId, qty: l.qty, reason: l.reason, note: l.note })),
    cuts,
    summary: 'Built by the rule-based planner from the household profile.',
  };
}
