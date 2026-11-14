// The chat loop (model <-> our five tools) and the approve flow.
import { randomUUID } from 'node:crypto';
import type { ApproveRequest, ChatRequest, Language } from '../contract.ts';
import { priceCart } from '../engine/cart.ts';
import { consumeToken } from '../mcp/approval.ts';
import { McpToolError } from '../mcp/client.ts';
import { BlockedError, step, under } from '../xray.ts';
import type { Block, ModelAdapter } from './bedrock.ts';
import { LANGUAGE_NAME, systemPrompt } from './systemPrompt.ts';
import { LANGUAGES, TEXTS, detectLanguage, isRtl } from './texts.ts';
import { TOOL_SPECS, runTool, type Deps, type Session } from './tools.ts';

const MAX_TURNS = 8; // generous tool-loop limit, as the Careem playbook asks
const MAX_HISTORY = 30;

/** Drops the oldest turns, always cutting at a plain user message so tool calls keep their results. */
function trim(session: Session) {
  while (session.messages.length > MAX_HISTORY) {
    const next = session.messages.findIndex((m, i) => i > 0 && m.role === 'user' && m.content.every((b) => 'text' in b));
    if (next <= 0) break;
    session.messages.splice(0, next);
  }
}

export async function runChat(session: Session, request: ChatRequest, model: ModelAdapter, deps: Deps): Promise<void> {
  const hint = request.language && LANGUAGES.includes(request.language) ? request.language : session.language;
  const language: Language = detectLanguage(request.message, hint);
  session.language = language;
  const budgetNote = typeof request.budgetAed === 'number' && request.budgetAed > 0 ? `\n[UI weekly budget: AED ${request.budgetAed}]` : '';
  const checkpoint = session.messages.length;
  session.messages.push({ role: 'user', content: [{ text: request.message + budgetNote }] });

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const ref: { stepId?: string } = {};
      const reply = await model.converse(systemPrompt(language), session.messages, TOOL_SPECS, ref);
      session.messages.push({ role: 'assistant', content: reply.content });
      if (!reply.toolCalls.length) {
        let text = reply.text || TEXTS[language].help;
        // Some models answer in English whatever the user wrote. One rewrite pass in the user's language.
        if (model.isBedrock && reply.text && language !== 'en' && detectLanguage(text, 'en') !== language) {
          try {
            const rewrite = await model.converse(
              `Rewrite the assistant reply in ${LANGUAGE_NAME[language]}. Keep every number, store name and product name exactly as written. Plain text, no markdown. Output only the rewritten reply.`,
              [{ role: 'user', content: [{ text }] }], []);
            if (rewrite.text) { text = rewrite.text; session.messages[session.messages.length - 1] = { role: 'assistant', content: [{ text }] }; }
          } catch { /* keep the original reply */ }
        }
        text = text.replace(/\*\*(.+?)\*\*/g, '$1');
        const replyLanguage = detectLanguage(text, language);
        deps.emit({ event: 'message', data: { id: randomUUID().slice(0, 8), role: 'assistant', text, language: replyLanguage, rtl: isRtl(replyLanguage) } });
        break;
      }
      const results: Block[] = [];
      for (const call of reply.toolCalls) {
        const { result, failed } = await under(ref.stepId, () => runTool(call.name, call.input, session, deps));
        if (failed) deps.emit({ event: 'error', data: { message: failed === 'careem' ? TEXTS[language].careemDown : TEXTS[language].genericError, retryable: true } });
        results.push({ toolResult: { toolUseId: call.id, content: [{ json: result }], status: failed ? 'error' : 'success' } });
      }
      session.messages.push({ role: 'user', content: results });
    }
    trim(session);
  } catch (e) {
    // The model call itself failed: forget this exchange so the conversation stays valid.
    session.messages.length = checkpoint;
    console.error('[agent] model call failed:', (e as Error).message);
    deps.emit({ event: 'error', data: { message: TEXTS[language].modelDown, retryable: true } });
  }
}

/**
 * Approve: check and burn the one-time token, build the cart at the chosen store (the only
 * mutating call, never retried), read the exact price. Checkout is never called.
 */
export async function runApprove(session: Session | undefined, request: ApproveRequest, deps: Deps): Promise<void> {
  const t = TEXTS[session?.language ?? 'en'];
  const plan = session?.plan;
  try {
    const grant = await consumeToken(request.approvalToken, request.sessionId, request.planId, ['create_grocery_cart_with_quantities']);
    if (!plan || plan.planId !== request.planId) throw new BlockedError('This basket is no longer the current plan');
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
    const message = e instanceof BlockedError ? t.approvalInvalid : e instanceof McpToolError ? t.careemDown : t.genericError;
    // A failed cart call is not retried automatically; the user decides what to do next.
    deps.emit({ event: 'error', data: { message, retryable: !(e instanceof BlockedError) } });
  }
}
