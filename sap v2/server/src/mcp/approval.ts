// Approval gate. A mutating Careem tool can only run with a Grant, and a Grant only exists
// after POST /api/approve consumed a valid one-time token. Enforced here in code, not in the prompt.
import { randomBytes } from 'node:crypto';
import { BlockedError, step } from '../xray.ts';

const SOURCE = 'api:approval-gate';
const TTL_MS = 15 * 60 * 1000;

type Token = { sessionId: string; planId: string; expiresAt: number; used: boolean };
export type Grant = { sessionId: string; planId: string; remaining: Set<string> };

const tokens = new Map<string, Token>();
const liveGrants = new WeakSet<Grant>(); // only grants created by consumeToken() count

/** Issued with every plan; the UI sends it back when the user presses Approve. */
export function issueToken(sessionId: string, planId: string): Promise<string> {
  return step('approval', 'issue_token', SOURCE, { sessionId, planId }, () => {
    const token = `tok_${randomBytes(16).toString('hex')}`;
    tokens.set(token, { sessionId, planId, expiresAt: Date.now() + TTL_MS, used: false });
    return token;
  }, { summary: () => 'one-time approval token issued (valid 15 min)' });
}

/** Checks and burns the token. The grant allows each listed mutating tool exactly once. */
export function consumeToken(token: string, sessionId: string, planId: string, tools: string[]): Promise<Grant> {
  return step('approval', 'check_token', SOURCE, { approvalToken: token, sessionId, planId, tools }, () => {
    const entry = tokens.get(token);
    if (!entry || entry.sessionId !== sessionId || entry.planId !== planId) throw new BlockedError('Approval token is invalid for this plan');
    if (entry.used) throw new BlockedError('Approval token was already used');
    if (entry.expiresAt < Date.now()) throw new BlockedError('Approval token has expired');
    entry.used = true;
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
