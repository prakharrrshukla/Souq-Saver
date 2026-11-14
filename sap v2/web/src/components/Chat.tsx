import { useEffect, useRef } from 'react';
import { EXAMPLES } from '../examples';
import type { Language } from '../../../server/src/contract.ts';

export type ChatLine = { id: string; role: 'user' | 'assistant' | 'error'; text: string; rtl?: boolean };
/** An input the backend refused, shown next to the field it concerns. */
export type FormError = { message: string; field?: string };

type Props = {
  lines: ChatLine[];
  input: string;
  onInput: (text: string) => void;
  budget: string;
  onBudget: (text: string) => void;
  busy: boolean;
  onSend: () => void;
  onExample: (text: string, language?: Language) => void;
  formError?: FormError | null;
};

export function Chat({ lines, input, onInput, budget, onBudget, busy, onSend, onExample, formError }: Props) {
  const budgetError = formError?.field === 'budgetAed';
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [lines]);

  return (
    <section className="card chat" aria-label="Chat">
      <h2>Chat</h2>
      <div className="chat-lines">
        {lines.length === 0 && <p className="muted">Ask for this week's basket. The first example is ready to send.</p>}
        {lines.map((line) =>
          line.role === 'error' ? (
            <p key={line.id} className="chat-error" dir="auto" role="alert">{line.text}</p>
          ) : (
            <div key={line.id} className={`bubble ${line.role}`} dir={line.role === 'assistant' ? (line.rtl ? 'rtl' : 'ltr') : 'auto'}>
              {line.text}
            </div>
          ),
        )}
        {busy && <p className="muted">Working…</p>}
        <div ref={end} />
      </div>

      <div className="examples" aria-label="Example messages">
        {EXAMPLES.map((example) => (
          <button key={example.label} className="chip-button" onClick={() => onExample(example.text, example.language)}>{example.label}</button>
        ))}
      </div>

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
        <input className="chat-input" dir="auto" value={input} onChange={(e) => onInput(e.target.value)} placeholder="Type a message" aria-label="Message"
          aria-invalid={!!formError && !budgetError} aria-describedby={formError ? 'form-error' : undefined} />
        <button className="primary" type="submit" disabled={busy || !input.trim()} aria-label="Send">→</button>
      </form>
      {formError && <p id="form-error" className="field-error" dir="auto" role="alert">{formError.message}</p>}
      <label className="budget">
        Weekly budget (optional)
        <span className="budget-field">
          AED <input type="number" min="1" step="1" inputMode="decimal" value={budget} onChange={(e) => onBudget(e.target.value)} placeholder="e.g. 150"
            aria-invalid={budgetError} aria-describedby={budgetError ? 'form-error' : undefined} />
        </span>
      </label>
    </section>
  );
}
