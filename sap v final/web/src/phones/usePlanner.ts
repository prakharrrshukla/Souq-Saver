// One phone's Souq Saver session: conversation, budget, plan, cart. It lives in the phone, not in the
// Souq Saver screen, so Back to Home and opening Souq Saver again keeps the basket and the chat.
// Same flow as the dashboard (Desk.tsx); every number shown comes from the backend.
import { useRef, useState } from 'react';
import type { Cart, Language, PersonaKey, Plan, SseEvent } from '../../../server/src/contract.ts';
import { ApiError, UNREACHABLE, approve, chat, reset } from '../api';
import type { ChatLine, FormError } from '../components/Chat';

/** Runs a request for this phone's household: waits for no other phone, switches the sandbox household if needed. */
export type RunExclusive = (phone: PersonaKey, work: () => Promise<void>) => Promise<void>;

const newId = () => Math.random().toString(36).slice(2, 10);
const upsert = <T,>(list: T[], item: T, same: (a: T) => boolean) => (list.some(same) ? list.map((x) => (same(x) ? item : x)) : [...list, item]);

export function usePlanner(phone: PersonaKey, runExclusive: RunExclusive, report: (event: SseEvent) => void) {
  const [sessionId, setSessionId] = useState(newId);
  const [language, setLanguage] = useState<Language>('en');
  const [input, setInput] = useState('');
  const [budget, setBudget] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  /** What was just sent, so a refused message goes back into the box instead of being lost. */
  const sent = useRef<{ lineId: string; message: string; budget: string } | null>(null);

  const addError = (text: string) => setLines((current) => [...current, { id: newId(), role: 'error', text }]);
  const rejectInput = (error: FormError, notSent = false) => {
    const last = sent.current;
    if (last) {
      if (notSent) setLines((current) => current.filter((l) => l.id !== last.lineId));
      setInput(last.message);
      setBudget(last.budget);
    }
    setFormError(error);
  };

  const onEvent = (e: SseEvent) => {
    report(e); // the X-ray phone shows the same events
    if (e.event === 'message') {
      setLines((current) => {
        const existing = current.find((l) => l.id === e.data.id);
        return upsert(current, { id: e.data.id, role: 'assistant', text: (existing?.text ?? '') + e.data.text, rtl: e.data.rtl }, (l) => l.id === e.data.id);
      });
    } else if (e.event === 'plan') { setPlan(e.data); setCart(null); }
    else if (e.event === 'cart') setCart(e.data);
    else if (e.event === 'error') { if (e.data.kind === 'validation') rejectInput({ message: e.data.message, field: e.data.field }); else addError(e.data.message); }
  };

  const send = async () => {
    // The budget field alone is enough: it plans the whole basket within it.
    const message = input.trim() || (budget.trim() ? `Plan this week's basket within my budget of AED ${budget.trim()}` : '');
    if (!message || busy) return;
    const lineId = newId();
    sent.current = { lineId, message, budget };
    setLines((current) => [...current, { id: lineId, role: 'user', text: message }]);
    setInput('');
    setFormError(null);
    setBusy(true);
    try {
      const budgetAed = budget.trim() === '' ? undefined : Number(budget);
      await runExclusive(phone, () => chat({ sessionId, message, language, ...(budgetAed !== undefined && { budgetAed }) }, onEvent));
    } catch (e) {
      if (e instanceof ApiError && (e.kind === 'validation' || e.kind === 'busy')) rejectInput({ message: e.message, field: e.field }, true);
      else addError(e instanceof ApiError ? e.message : UNREACHABLE);
    } finally {
      setBusy(false);
    }
  };

  const onApprove = async () => {
    if (!plan || approving) return;
    setApproving(true);
    try {
      await runExclusive(phone, () => approve({ sessionId, planId: plan.planId, approvalToken: plan.approvalToken }, onEvent));
    } catch (e) {
      addError(e instanceof ApiError ? e.message : UNREACHABLE);
    } finally {
      setApproving(false);
    }
  };

  const newChat = async () => {
    if (busy || approving) return;
    await reset(sessionId).catch(() => {});
    setSessionId(newId());
    setLines([]); setPlan(null); setCart(null); setFormError(null);
    setInput(''); setBudget('');
  };

  return { language, setLanguage, input, setInput, budget, setBudget, lines, plan, cart, busy, approving, formError, send, onApprove, newChat };
}

export type Planner = ReturnType<typeof usePlanner>;
