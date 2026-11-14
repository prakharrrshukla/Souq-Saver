import { useEffect, useState } from 'react';
import type { XrayRunSummary, XrayStep } from '../../../server/src/contract.ts';
import { getRun, listRuns } from '../api';

type Props = { liveSteps: XrayStep[]; liveRunId: string | null };

/** Depth of each step in the parent/child tree, for indentation. */
function depths(steps: XrayStep[]): Map<string, number> {
  const byId = new Map(steps.map((s) => [s.stepId, s]));
  const depth = new Map<string, number>();
  const of = (s: XrayStep): number => {
    if (!depth.has(s.stepId)) depth.set(s.stepId, s.parentId && byId.has(s.parentId) ? of(byId.get(s.parentId)!) + 1 : 0);
    return depth.get(s.stepId)!;
  };
  steps.forEach(of);
  return depth;
}

function Json({ label, value }: { label: string; value: unknown }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <details className="json" open>
      <summary>{label} <button className="text-button" onClick={(e) => { e.preventDefault(); copy(); }}>{copied ? 'Copied' : 'Copy'}</button></summary>
      <pre>{text}</pre>
    </details>
  );
}

export function XRay({ liveSteps, liveRunId }: Props) {
  const [runs, setRuns] = useState<XrayRunSummary[]>([]);
  const [selected, setSelected] = useState<string>('live');
  const [saved, setSaved] = useState<XrayStep[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [problem, setProblem] = useState('');

  // Refresh the run list when the panel opens and whenever a new run starts.
  useEffect(() => { listRuns().then((r) => setRuns(r.runs)).catch(() => setRuns([])); }, [liveRunId]);

  useEffect(() => {
    if (selected === 'live') return;
    setProblem('');
    getRun(selected).then((run) => setSaved(run.ordered)).catch(() => { setSaved([]); setProblem('Could not load this run.'); });
  }, [selected]);

  const steps = selected === 'live' ? liveSteps : saved;
  const depth = depths(steps);
  const toggle = (id: string) => setOpen((current) => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next; });

  return (
    <section className="card xray" aria-label="X-ray">
      <div className="xray-head">
        <h2>X-ray <span className="muted">every backend step, in order</span></h2>
        <label>
          Run{' '}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="live">Current run{liveRunId ? ` (${liveRunId})` : ''}</option>
            {runs.map((run) => (
              <option key={run.runId} value={run.runId}>{new Date(run.startedAt).toLocaleTimeString()} · {run.steps} steps · {run.status} · {run.runId}</option>
            ))}
          </select>
        </label>
      </div>
      {problem && <p className="chat-error">{problem}</p>}
      {steps.length === 0 && !problem && <p className="muted">No steps yet. Send a message and they appear here live.</p>}
      <ol className="xray-steps">
        {steps.map((step) => (
          <li key={step.stepId} style={{ marginInlineStart: `${(depth.get(step.stepId) ?? 0) * 20}px` }}>
            <button className={`xray-row ${step.status}`} aria-expanded={open.has(step.stepId)} onClick={() => toggle(step.stepId)}>
              <span className="xray-seq">#{step.seq}</span>
              <span className={`badge kind-${step.kind}`}>{step.kind}</span>
              <strong>{step.name}</strong>
              <span className="xray-source">{step.source}</span>
              <span className="badge origin">{step.dataOrigin}</span>
              <span className={`badge status-${step.status}`}>{step.status}</span>
              <span className="xray-ms">{step.ms !== undefined ? `${step.ms} ms` : ''}</span>
              <span className="xray-summary">{step.summary}</span>
            </button>
            {open.has(step.stepId) && (
              <div className="xray-detail">
                {step.error && <p className="chat-error">Error: {step.error}</p>}
                <Json label="Input" value={step.input} />
                {step.output !== undefined && <Json label="Output" value={step.output} />}
                {step.meta && <Json label="Meta" value={step.meta} />}
                <p className="muted small">started {step.startedAt}{step.endedAt ? ` · ended ${step.endedAt}` : ''} · step {step.stepId}{step.parentId ? ` · parent ${step.parentId}` : ''}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
