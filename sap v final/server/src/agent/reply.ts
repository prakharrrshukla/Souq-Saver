// What the user reads. Facts (budget, store, totals, fees, savings, item changes, approval status)
// are rendered from the validated tool results with fixed sentences in the user's language; model
// prose is only used for replies without facts, and is replaced if it cites amounts the plan does not have.
import type { Language, Plan } from '../contract.ts';
import { westernDigits } from '../validate.ts';
import { TEXTS } from './texts.ts';

const inBasket = (reason: string) => reason === 'kept' || reason === 'swapped' || reason === 'reduced';
// Cut by the planner this week (not products the household stopped buying, or ones the user left out).
const plannedCut = (item: { reason: string; note: string }) => item.reason === 'cut' && !/^No longer bought|^Left out because you asked/.test(item.note);

/** One tool result as a short reply, in the user's language, from fixed sentences. */
export function compose(tool: string, result: any, language: Language): string {
  const t = TEXTS[language];
  if (result?.error) return result.kind === 'careem' ? t.careemDown : result.kind === 'no_plan' ? t.needPlan : t.genericError;
  if (tool === 'plan_basket') {
    if (!result.store) return t.noStore;
    const items: any[] = result.items ?? [];
    return t.plan({
      store: result.store, total: result.estTotal, budget: result.budget.aed, withinBudget: result.withinBudget, shortfall: result.shortfall,
      cut: items.filter((i) => plannedCut(i) && i.tier === 'T5').map((i) => i.name),
      removed: items.filter((i) => plannedCut(i) && i.tier !== 'T5').map((i) => i.name),
      swapped: items.filter((i) => i.reason === 'swapped').map((i) => `${i.replaces} → ${i.name}`),
      deferred: items.filter((i) => i.reason === 'deferred').map((i) => `${i.name} (${i.nextDue})`),
      unavailable: items.filter((i) => i.reason === 'unavailable').map((i) => i.name),
      saving: result.monthlySavingEstimate,
      engine: result.engine?.basket === 'ai' ? 'ai' : result.engine?.profile === 'ai' ? 'fallback' : 'rules',
      approvable: result.approval?.allowed !== false,
      routing: result.routing?.rule,
      focus: result.focus,
    });
  }
  if (tool === 'compare_stores') return t.stores((result.stores ?? []).map((s: any) => ({ name: s.name, total: s.estTotal, valid: s.valid, missing: s.missing, chosen: s.chosen })));
  if (tool === 'explain_change') return result.found ? t.explain(result.name, `${result.note}${inBasket(result.reason) ? '' : ` (${result.reason})`}`) : t.explainUnknown(result.item);
  if (tool === 'request_approval') {
    if (result.status === 'blocked') return result.code === 'over_budget' ? t.approvalBlocked(result.shortfall) : t.noStore;
    return t.approval(result.store);
  }
  if (tool === 'analyse_history') return t.analysis(result.orders, result.lastWeekTotal, (result.priceDrift ?? []).filter((d: any) => d.flagged).map((d: any) => `${d.name} +${d.driftPct}%`));
  return t.help;
}

const MONEY_OR_PERCENT = /(\d+(?:[.,]\d+)?)\s*(?:%|٪|aed|dhs?|dirhams?|درهم|दिरहम|درہم)|(?:aed|dhs?)\s*(\d+(?:[.,]\d+)?)/gi;

/** Amounts and percentages in model prose that the current plan does not contain. */
export function ungroundedAmounts(text: string, plan: Plan | undefined): number[] {
  const known = new Set<number>();
  if (plan) {
    for (const n of [plan.estTotal, plan.budget.aed, plan.budget.cutPercent ?? -1, plan.shortfall, plan.monthlySavingEstimate, plan.lastWeekTotal]) known.add(Math.round(n * 100));
    for (const s of plan.stores) for (const n of [s.estTotal, s.itemsTotal, s.deliveryFee, s.serviceFee]) known.add(Math.round(n * 100));
    for (const i of plan.items) for (const n of [i.unitPrice, i.lineTotal]) known.add(Math.round(n * 100));
    for (const d of plan.insights.priceDrift) known.add(Math.round(d.driftPct * 100));
  }
  // Quoted text is an example for the user ("try 'cut 15%'"), not a claim.
  const claims = westernDigits(text).replace(/"[^"]*"|“[^”]*”|«[^»]*»|(?<!\w)'[^']*'(?!\w)/g, '');
  const found = [...claims.matchAll(MONEY_OR_PERCENT)].map((m) => Number((m[1] ?? m[2]).replace(',', '.')));
  return found.filter((n) => !known.has(Math.round(n * 100)));
}
