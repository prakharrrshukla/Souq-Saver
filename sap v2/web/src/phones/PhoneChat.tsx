// The chat inside a phone, styled like a Careem chat: messages flow in the screen, and the composer
// ("Type a message", suggestions, weekly budget) is pinned at the bottom. Phones only; the #desk
// dashboard keeps components/Chat.tsx.
import { useEffect, useRef } from 'react';
import type { ChatLine, FormError } from '../components/Chat';
import { EXAMPLES } from '../examples';
import { Basket } from './art';

/** Suggestions without the other-language examples: the language menu is in the screen header. */
const SUGGESTIONS = EXAMPLES.filter((e) => !e.language || e.language === 'en');

/**
 * One reply as bullet points. Line breaks or "- " bullets the model wrote are kept as they are;
 * otherwise each sentence becomes a bullet. Formatting only: the words and numbers are unchanged.
 */
export function toBullets(text: string): string[] {
  const clean = text.replace(/\*\*/g, '').trim();
  const lines = clean.split(/\n+/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return clean.split(/(?<=[.!?।۔])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean);
}

function Reply({ text, rtl }: { text: string; rtl?: boolean }) {
  const bullets = toBullets(text);
  return (
    <div className="pc-row pc-bot" dir={rtl ? 'rtl' : 'ltr'}>
      <span className="pc-avatar" aria-hidden="true"><Basket size={22} /></span>
      <div className="pc-bubble pc-bubble-bot">
        {bullets.length > 1 ? <ul>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul> : <p>{bullets[0] ?? text}</p>}
      </div>
    </div>
  );
}

/** The conversation. Keeps the newest message in view by scrolling the Souq Saver screen only. */
export function ChatMessages({ lines, busy }: { lines: ChatLine[]; busy: boolean }) {
  const last = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = last.current;
    const body = el?.closest('.ss-body');
    if (el && body) body.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior: 'smooth' });
  }, [lines.length, busy]);

  if (!lines.length && !busy) return null;
  return (
    <section className="pc-messages" aria-label="Conversation" aria-live="polite">
      {lines.map((line, i) => (
        <div key={line.id} ref={i === lines.length - 1 && !busy ? last : undefined}>
          {line.role === 'user' && <div className="pc-row pc-me"><div className="pc-bubble pc-bubble-me" dir="auto">{line.text}</div></div>}
          {line.role === 'assistant' && <Reply text={line.text} rtl={line.rtl} />}
          {line.role === 'error' && <p className="pc-error" dir="auto" role="alert">{line.text}</p>}
        </div>
      ))}
      {busy && (
        <div ref={last} className="pc-row pc-bot">
          <span className="pc-avatar" aria-hidden="true"><Basket size={22} /></span>
          <div className="pc-bubble pc-bubble-bot pc-typing" aria-label="Souq Saver is working"><span /><span /><span /></div>
        </div>
      )}
    </section>
  );
}

type ComposerProps = {
  input: string; onInput: (text: string) => void;
  budget: string; onBudget: (text: string) => void;
  busy: boolean; onSend: () => void;
  formError?: FormError | null; blocked?: string;
};

export function Composer({ input, onInput, budget, onBudget, busy, onSend, formError, blocked }: ComposerProps) {
  const budgetError = formError?.field === 'budgetAed';
  return (
    <div className="pc-composer">
      {formError && <p id="pc-form-error" className="pc-note pc-note-error" dir="auto" role="alert">{formError.message}</p>}
      {blocked && !busy && <p className="pc-note" role="status">{blocked}</p>}
      <div className="pc-suggestions" aria-label="Suggestions">
        <label className={`pc-budget${budgetError ? ' invalid' : ''}`}>
          Budget AED
          <input type="number" min="1" step="1" inputMode="decimal" value={budget} onChange={(e) => onBudget(e.target.value)} placeholder="—"
            aria-label="Weekly budget in AED (optional)" aria-invalid={budgetError} aria-describedby={budgetError ? 'pc-form-error' : undefined} />
        </label>
        {SUGGESTIONS.map((s) => <button key={s.label} type="button" className="pc-chip" onClick={() => onInput(s.text)}>{s.label}</button>)}
      </div>
      <form className="pc-form" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
        <input className="pc-input" dir="auto" value={input} onChange={(e) => onInput(e.target.value)} placeholder="Type a message" aria-label="Message"
          aria-invalid={!!formError && !budgetError} aria-describedby={formError ? 'pc-form-error' : undefined} />
        <button className="pc-send" type="submit" disabled={busy || !!blocked || (!input.trim() && !budget.trim())} aria-label="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor" /></svg>
        </button>
      </form>
    </div>
  );
}
