// Approval gate. A mutating Careem tool can only run with a Grant, and a Grant only exists
// after POST /api/approve consumed a valid one-time token. Enforced here in code, not in the prompt.
// A token is only issued for a plan that passes planVerdict, and it is bound to that exact plan.
import { createHash, randomBytes } from 'node:crypto';
import type { Plan } from '../contract.ts';
import { r2 } from '../engine/analysis.ts';
import { limits } from '../limits.ts';
import { BlockedError, step } from '../xray.ts';

const SOURCE = 'api:approval-gate';
const TTL_MS = 15 * 60 * 1000;

type Token = { sessionId: string; planId: string; fingerprint?: string; expiresAt: number; used: boolean };
export type Grant = { sessionId: string; planId: string; remaining: Set<string> };

const tokens = new Map<string, Token>();
const liveGrants = new WeakSet<Grant>(); // only grants created by consumeToken() count

type Approvable = Pick<Plan, 'planId' | 'items' | 'stores' | 'estTotal' | 'budget' | 'withinBudget' | 'shortfall'>;

/** Hash of everything the cart would be built from. Any change after the token was issued invalidates it. */
export function planFingerprint(plan: Approvable): string {
  const store = plan.stores.find((s) => s.chosen);
  const lines = plan.items.filter((i) => i.lineTotal > 0).map((i) => [i.itemId, i.qty, i.unitPrice, i.lineTotal]);
  return createHash('sha256').update(JSON.stringify([plan.planId, store?.merchantId, store?.deliveryFee, store?.serviceFee, lines, plan.estTotal, plan.budget.aed])).digest('hex');
}

/** Whether this exact plan may be approved: one store, sane lines, totals that add up, within the limits and the budget. */
export function planVerdict(plan: Approvable): NonNullable<Plan['approval']> {
  const L = limits();
  const store = plan.stores.find((s) => s.chosen);
  if (!store) return { allowed: false, code: 'no_store', message: 'No nearby store has every essential, so there is nothing to approve.' };
  const lines = plan.items.filter((i) => i.lineTotal > 0);
  if (!lines.length) return { allowed: false, code: 'invalid_plan', message: 'The basket is empty.' };
  if (lines.length > L.maxDistinctItems) return { allowed: false, code: 'limits', message: `The basket has more than ${L.maxDistinctItems} products.` };
  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > L.maxQtyPerLine) return { allowed: false, code: 'limits', message: `${line.name}: ${line.qty} is outside 1 to ${L.maxQtyPerLine} per item.` };
    if (!(line.unitPrice > 0) || Math.abs(r2(line.unitPrice * line.qty) - line.lineTotal) > 0.005) return { allowed: false, code: 'invalid_plan', message: `${line.name}: the line total does not match its price.` };
  }
  const total = r2(lines.reduce((s, l) => s + l.lineTotal, 0) + store.deliveryFee + store.serviceFee);
  if (Math.abs(total - plan.estTotal) > 0.005) return { allowed: false, code: 'invalid_plan', message: 'The basket total does not add up.' };
  if (plan.estTotal > L.maxBasketAed) return { allowed: false, code: 'limits', message: `Baskets over AED ${L.maxBasketAed} cannot be approved here.` };
  if (!plan.withinBudget || plan.estTotal > plan.budget.aed) {
    return { allowed: false, code: 'over_budget', message: `Over your budget by AED ${r2(plan.estTotal - plan.budget.aed).toFixed(2)}. Raise the budget or remove items to approve.` };
  }
  return { allowed: true };
}

/** Issued with every plan that passes planVerdict; the UI sends it back when the user presses Approve. */
export function issueToken(sessionId: string, planId: string, fingerprint?: string): Promise<string> {
  return step('approval', 'issue_token', SOURCE, { sessionId, planId }, () => {
    const token = `tok_${randomBytes(16).toString('hex')}`;
    tokens.set(token, { sessionId, planId, fingerprint, expiresAt: Date.now() + TTL_MS, used: false });
    return token;
  }, { summary: () => 'one-time approval token issued (valid 15 min)' });
}

/** Checks and burns the token. The grant allows each listed mutating tool exactly once. */
export function consumeToken(token: string, sessionId: string, planId: string, tools: string[], fingerprint?: string): Promise<Grant> {
  return step('approval', 'check_token', SOURCE, { approvalToken: token, sessionId, planId, tools }, () => {
    const entry = tokens.get(token);
    if (!entry || entry.sessionId !== sessionId || entry.planId !== planId) throw new BlockedError('Approval token is invalid for this plan');
    if (entry.used) throw new BlockedError('Approval token was already used');
    if (entry.expiresAt < Date.now()) throw new BlockedError('Approval token has expired');
    entry.used = true;
    if (entry.fingerprint !== fingerprint) throw new BlockedError('The basket changed after it was approved');
    const grant: Grant = { sessionId, planId, remaining: new Set(tools) };
    liveGrants.add(grant);
    return grant;
  }, { summary: (g) => `valid: ${[...g.remaining].join(', ')} allowed once` });
}

/** Called by the MCP client before a mutating call. True at most once per tool per grant. */
export function useGrant(grant: Grant | undefined, tool: string): boolean {
  return !!grant && liveGrants.has(grant) && grant.remaining.delete(tool);
}

export function clearTokens(sessionId: string) {
  for (const [token, entry] of tokens) if (entry.sessionId === sessionId) tokens.delete(token);
}
