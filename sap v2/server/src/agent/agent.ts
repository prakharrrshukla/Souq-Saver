// The chat loop (model <-> our five tools) and the approve flow.
import { randomUUID } from 'node:crypto';
import type { ApproveRequest, ChatRequest, ErrorEvent, Language } from '../contract.ts';
import { priceCart } from '../engine/cart.ts';
import { limits } from '../limits.ts';
import { consumeToken, planFingerprint, planVerdict } from '../mcp/approval.ts';
import { McpToolError } from '../mcp/client.ts';
import { USER_INPUT_CODES, extractRequest, validateToolCall } from '../validate.ts';
import { BlockedError, step, under } from '../xray.ts';
import { conversationProblems, type Block, type ChatMessage, type ModelAdapter } from './bedrock.ts';
import { compose, ungroundedAmounts } from './reply.ts';
import { LANGUAGE_NAME, systemPrompt } from './systemPrompt.ts';
import { LANGUAGES, TEXTS, detectLanguage, isRtl } from './texts.ts';
import { TOOL_SPECS, runTool, type Deps, type Session, type ToolFailure, type TurnState } from './tools.ts';

const MAX_HISTORY = 30;

/** Drops the oldest turns, always cutting at a plain user message so tool calls keep their results. */
function trim(session: Session) {
  while (session.messages.length > MAX_HISTORY) {
    const next = session.messages.findIndex((m, i) => i > 0 && m.role === 'user' && m.content.every((b) => 'text' in b));
    if (next <= 0) break;
    session.messages.splice(0, next);
  }
}

class Deadline extends Error {}
/**
 * Resolves with the promise, or rejects with Deadline after `ms` (aborting `controller`) or as soon as
 * `controller` is aborted (the client left), so the session is released without waiting for the work.
 */
function within<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  let onAbort = () => {};
  const stop = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Deadline('request timed out')); }, Math.max(0, ms));
    onAbort = () => reject(new Deadline('request cancelled'));
    if (controller.signal.aborted) onAbort();
    else controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  return Promise.race([promise, stop]).finally(() => { clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort); });
}

type Outcome = { name: string; result: any; failed?: ToolFailure };
type Stop = 'answered' | 'exhausted' | 'timeout' | 'invalid_calls' | 'model' | 'aborted';

const STOP_ERRORS: Partial<Record<Stop, (t: (typeof TEXTS)['en']) => ErrorEvent>> = {
  exhausted: (t) => ({ message: t.loopExhausted, retryable: true, code: 'tool_loop_exhausted', kind: 'model' }),
  invalid_calls: (t) => ({ message: t.loopExhausted, retryable: true, code: 'invalid_tool_calls', kind: 'model' }),
  timeout: (t) => ({ message: t.timeout, retryable: true, code: 'timeout', kind: 'timeout' }),
  model: (t) => ({ message: t.modelDown, retryable: true, code: 'model_unavailable', kind: 'model' }),
};

export async function runChat(session: Session, request: ChatRequest, model: ModelAdapter, deps: Deps): Promise<void> {
  const L = limits();
  const hint = request.language && LANGUAGES.includes(request.language) ? request.language : session.language;
  const language: Language = detectLanguage(request.message, hint);
  session.language = language;
  const t = TEXTS[language];
  const budgetNote = typeof request.budgetAed === 'number' && request.budgetAed > 0 ? `\n[UI weekly budget: AED ${request.budgetAed}]` : '';
  const userMessage: ChatMessage = { role: 'user', content: [{ text: request.message + budgetNote }] };
  const say = (text: string) => deps.emit({ event: 'message', data: { id: randomUUID().slice(0, 8), role: 'assistant', text, language, rtl: isRtl(language) } });
  /** Only a valid Converse history is ever stored: user and assistant alternate, every toolUse has its toolResult. */
  const commit = (messages: ChatMessage[]) => {
    const next = [...session.messages, ...messages];
    if (conversationProblems(next).length) session.messages.push(userMessage, messages[messages.length - 1]);
    else session.messages = next;
    trim(session);
  };

  // 1. Explicit values in the user's own words that are out of range: refuse before planning, keep the session as it was.
  const extracted = extractRequest(request.message);
  const problem = extracted.problems[0];
  if (problem) {
    const text = t.invalid(problem.code, L);
    await step('guard', 'validate_request', 'api:validate', { message: request.message }, () => ({ rejected: problem }), { summary: () => `refused: ${problem.message}` });
    deps.emit({ event: 'error', data: { message: text, retryable: false, code: problem.code, kind: 'validation', field: problem.field } });
    say(text);
    commit([userMessage, { role: 'assistant', content: [{ text }] }]);
    return;
  }

  // 2. The model turn, with the numbers the user really gave for tools to check against.
  const turn: TurnState = { numbers: [...extracted.numbers, ...(typeof request.budgetAed === 'number' ? [request.budgetAed] : [])], rejectedItems: new Set() };
  const controller = new AbortController();
  deps.signal?.addEventListener('abort', () => controller.abort(), { once: true });
  const toolDeps: Deps = { ...deps, turn, signal: controller.signal };
  const deadline = Date.now() + limits().turnTimeoutMs;
  const pending: ChatMessage[] = [userMessage];
  const outcomes: Outcome[] = [];
  let stop: Stop = 'exhausted';
  let modelText = '';
  let invalidCalls = 0;
  try {
    for (let i = 0; i < L.maxToolTurns; i++) {
      if (controller.signal.aborted) { stop = deps.signal?.aborted ? 'aborted' : 'timeout'; break; }
      const ref: { stepId?: string } = {};
      const reply = await within(model.converse(systemPrompt(language), [...session.messages, ...pending], TOOL_SPECS, ref), deadline - Date.now(), controller);
      if (!reply.toolCalls.length) { modelText = reply.text; stop = 'answered'; break; }
      pending.push({ role: 'assistant', content: reply.content.filter((b) => 'text' in b || 'toolUse' in b) });
      const results: Block[] = [];
      for (const call of reply.toolCalls) {
        const checked = validateToolCall(call.name, call.input);
        let outcome: Outcome;
        if (checked.ok === false) {
          const error = checked.error;
          invalidCalls++;
          await step('guard', 'invalid_tool_call', 'agent:validate', { tool: call.name, input: call.input }, () => error, { summary: (e) => `${e.code}: ${e.issues.map((x) => `${x.field} ${x.message}`).join('; ').slice(0, 160)}` });
          outcome = { name: String(call.name), result: error, failed: 'validation' };
        } else {
          const { result, failed } = await within(under(ref.stepId, () => runTool(call.name, checked.input, session, toolDeps)), deadline - Date.now(), controller);
          outcome = { name: call.name, result, failed };
          if (failed === 'careem' || failed === 'internal') deps.emit({ event: 'error', data: { message: failed === 'careem' ? t.careemDown : t.genericError, retryable: true, code: failed === 'careem' ? 'careem_unavailable' : 'internal', kind: failed } });
        }
        outcomes.push(outcome);
        results.push({ toolResult: { toolUseId: call.id, content: [{ json: outcome.result }], status: outcome.failed ? 'error' : 'success' } });
      }
      pending.push({ role: 'user', content: results });
      if (invalidCalls > L.maxInvalidToolCalls) { stop = 'invalid_calls'; break; }
    }
  } catch (e) {
    stop = e instanceof Deadline ? (deps.signal?.aborted ? 'aborted' : 'timeout') : 'model';
    controller.abort();
    if (stop === 'model') console.error('[agent] model call failed:', (e as Error).message);
  }

  // 3. The reply: facts from validated tool results only.
  const done = outcomes.filter((o) => !o.failed);
  const refused = outcomes.find((o) => o.failed === 'validation' && USER_INPUT_CODES.has(o.result?.code));
  let text: string;
  if (done.length) text = [...new Set(done.map((o) => compose(o.name, o.result, language)))].join('\n\n');
  else if (refused) {
    text = t.invalid(refused.result.code, L);
    deps.emit({ event: 'error', data: { message: text, retryable: false, code: refused.result.code, kind: 'validation', field: refused.result.issues?.[0]?.field } });
  } else if (stop === 'answered') text = await modelReply(modelText, language, session, model);
  else text = stop === 'timeout' ? t.timeout : stop === 'model' ? t.modelDown : t.loopExhausted;
  const stopError = STOP_ERRORS[stop]?.(t);
  if (stopError) deps.emit({ event: 'error', data: stopError });
  say(text);

  // 4. History: the whole valid turn when the model finished, otherwise only what the user saw.
  const final: ChatMessage = { role: 'assistant', content: [{ text }] };
  commit(stop === 'answered' ? [...pending, final] : [userMessage, final]);
}

/** A reply without tool facts (greeting, refusal, off-topic). Amounts the plan does not contain are not allowed. */
async function modelReply(raw: string, language: Language, session: Session, model: ModelAdapter): Promise<string> {
  const t = TEXTS[language];
  let text = (raw || t.help).replace(/\*\*(.+?)\*\*/g, '$1');
  // Some models answer in English whatever the user wrote. One rewrite pass in the user's language.
  if (model.isBedrock && raw && language !== 'en' && detectLanguage(text, 'en') !== language) {
    try {
      const rewrite = await model.converse(
        `Rewrite the assistant reply in ${LANGUAGE_NAME[language]}. Keep every number, store name and product name exactly as written. Plain text, no markdown. Output only the rewritten reply.`,
        [{ role: 'user', content: [{ text }] }], []);
      if (rewrite.text) text = rewrite.text.replace(/\*\*(.+?)\*\*/g, '$1');
    } catch { /* keep the original reply */ }
  }
  const unsupported = ungroundedAmounts(text, session.plan);
  if (unsupported.length) {
    await step('guard', 'ungrounded_reply', 'agent:reply', { text, unsupported }, () => ({ replacedWith: 'help' }), { summary: () => `reply cited amounts not in the plan (${unsupported.join(', ')}), replaced` });
    return session.plan ? t.explain(session.plan.stores.find((s) => s.chosen)?.name ?? 'Basket', `AED ${session.plan.estTotal.toFixed(2)}`) : t.help;
  }
  return text;
}

/**
 * Approve: check and burn the one-time token (bound to this exact plan), re-check the plan, build the
 * cart at the chosen store (the only mutating call, never retried), read the exact price. Checkout is never called.
 */
export async function runApprove(session: Session | undefined, request: ApproveRequest, deps: Deps): Promise<void> {
  const t = TEXTS[session?.language ?? 'en'];
  const plan = session?.plan;
  try {
    const fingerprint = plan && plan.planId === request.planId ? planFingerprint(plan) : 'no-current-plan';
    const grant = await consumeToken(request.approvalToken, request.sessionId, request.planId, ['create_grocery_cart_with_quantities'], fingerprint);
    if (!plan || plan.planId !== request.planId) throw new BlockedError('This basket is no longer the current plan');
    const verdict = await step('approval', 'plan_verdict', 'api:approval-gate', { planId: plan.planId, estTotal: plan.estTotal, budget: plan.budget }, () => planVerdict(plan),
      { summary: (v) => (v.allowed ? 'plan re-checked: approvable' : `approval blocked (${v.code}): ${v.message}`) });
    if (!verdict.allowed) throw new BlockedError(verdict.message ?? 'This plan cannot be approved');
    const store = plan.stores.find((s) => s.chosen)!;
    const merchant_id = Number(store.merchantId);
    const items = plan.items.filter((i) => i.lineTotal > 0).map((i) => ({ keyword: i.name, catalog_item_id: i.itemId, quantity: i.qty, price: i.unitPrice }));

    const cartResponse = await deps.mcp.call('create_grocery_cart_with_quantities', { items, merchant_id }, { grant });
    const priceResponse = await deps.mcp.call('cart_get_basket_price', { merchant_id });
    const cart = await step('engine', 'priceCart', 'engine:cart.ts#priceCart',
      { plannedItems: items, fees: priceResponse.price?.fees, promo: priceResponse.price?.promo_code ?? null, totalSaving: priceResponse.price?.total_saving, note: 'The sandbox cart is stateless (fixed basket). Subtotal is our planned basket; fees and promo come from cart_get_basket_price.' },
      () => priceCart(plan, cartResponse, priceResponse, deps.sampleData),
      { summary: (c) => `cart ready at ${c.storeName}: AED ${c.total.toFixed(2)}${c.promo ? ` (promo ${c.promo.code} saves AED ${c.promo.saving.toFixed(2)})` : ''}, nothing charged` });
    plan.approvalToken = ''; // used
    deps.emit({ event: 'cart', data: cart });
  } catch (e) {
    if (!(e instanceof BlockedError) && !(e instanceof McpToolError)) console.error('[approve] failed:', e);
    const data: ErrorEvent = e instanceof BlockedError ? { message: t.approvalInvalid, retryable: false, code: 'approval_invalid', kind: 'approval' }
      : e instanceof McpToolError ? { message: t.careemDown, retryable: true, code: 'careem_unavailable', kind: 'careem' }
        : { message: t.genericError, retryable: true, code: 'internal', kind: 'internal' };
    // A failed cart call is not retried automatically; the user decides what to do next.
    deps.emit({ event: 'error', data });
  }
}
