import { useEffect, useRef } from 'react';
import type { TraceEvent } from '../../../server/src/contract.ts';

const ICON = { running: '…', ok: '✓', error: '✗' } as const;

export function ToolSteps({ steps }: { steps: TraceEvent[] }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [steps]); // keep the newest step in view
  return (
    <section className="card" aria-label="Live tool steps">
      <h2>Live tool steps <span className="count">{steps.length || ''}</span></h2>
      {steps.length === 0 ? (
        <p className="muted">Each Careem MCP call and engine step appears here as it runs.</p>
      ) : (
        <ol className="steps" ref={list}>
          {steps.map((step) => (
            <li key={step.id} className={`step ${step.status}`}>
              <span className="step-icon" aria-label={step.status}>{ICON[step.status]}</span>
              <strong className="step-tool">{step.tool}</strong>
              <span className="step-summary">{step.status === 'running' ? 'running' : step.summary}</span>
              <span className="step-ms">{step.ms !== undefined ? `${step.ms} ms` : ''}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
