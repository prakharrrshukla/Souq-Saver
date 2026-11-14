// Page layout and state. No business logic here: everything shown comes from the backend.
import { useCallback, useEffect, useState } from 'react';
import type { Cart, Config, Health, Language, Plan, SseEvent, TraceEvent, XrayStep } from '../../server/src/contract.ts';
import { MOCK, approve, chat, getConfig, getHealth, reset } from './api';
import { DEFAULT_MESSAGE } from './examples';
import { Basket } from './components/Basket';
import { CartResult } from './components/CartResult';
import { Chat, type ChatLine } from './components/Chat';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Insights } from './components/Insights';
import { SampleBanner } from './components/SampleBanner';
import { StoreComparison } from './components/StoreComparison';
import { ToolSteps } from './components/ToolSteps';
import { XRay } from './components/XRay';

const newId = () => Math.random().toString(36).slice(2, 10);
const upsert = <T,>(list: T[], item: T, same: (a: T) => boolean) => (list.some(same) ? list.map((x) => (same(x) ? item : x)) : [...list, item]);

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [sessionId, setSessionId] = useState(newId);
  const [language, setLanguage] = useState<Language>('en');
  const [input, setInput] = useState(DEFAULT_MESSAGE);
  const [budget, setBudget] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [steps, setSteps] = useState<TraceEvent[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [xrayOpen, setXrayOpen] = useState(false);
  const [xraySteps, setXraySteps] = useState<XrayStep[]>([]);
  const [runId, setRunId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setConfig(await getConfig());
      setUnreachable(false);
      setHealth(await getHealth().catch(() => null));
    } catch {
      setUnreachable(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addError = (text: string) => setLines((current) => [...current, { id: newId(), role: 'error', text }]);

  const onEvent = (e: SseEvent) => {
    if (e.event === 'run') { setRunId(e.data.runId); setXraySteps([]); }
    else if (e.event === 'trace') setSteps((current) => upsert(current, e.data, (s) => s.id === e.data.id));
    else if (e.event === 'xray') setXraySteps((current) => upsert(current, e.data.step, (s) => s.stepId === e.data.step.stepId));
    else if (e.event === 'message') {
      // Chunks with the same id extend the same bubble.
      setLines((current) => {
        const existing = current.find((l) => l.id === e.data.id);
        const line: ChatLine = { id: e.data.id, role: 'assistant', text: (existing?.text ?? '') + e.data.text, rtl: e.data.rtl };
        return upsert(current, line, (l) => l.id === e.data.id);
      });
    } else if (e.event === 'plan') { setPlan(e.data); setCart(null); }
    else if (e.event === 'cart') setCart(e.data);
    else if (e.event === 'error') addError(e.data.message);
  };

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setLines((current) => [...current, { id: newId(), role: 'user', text: message }]);
    setInput('');
    setSteps([]);
    setBusy(true);
    try {
      const budgetAed = Number(budget);
      await chat({ sessionId, message, language, ...(budgetAed > 0 && { budgetAed }) }, onEvent);
    } catch {
      addError('Backend not reachable on localhost:8080. Start it with "npm run dev:backend" and try again.');
    } finally {
      setBusy(false);
      getHealth().then(setHealth).catch(() => {});
    }
  };

  const onApprove = async () => {
    if (!plan || approving) return;
    setApproving(true);
    try {
      await approve({ sessionId, planId: plan.planId, approvalToken: plan.approvalToken }, onEvent);
    } catch {
      addError('Backend not reachable on localhost:8080. Nothing was changed.');
    } finally {
      setApproving(false);
    }
  };

  const onReset = async () => {
    await reset(sessionId).catch(() => {});
    setSessionId(newId());
    setLines([]); setSteps([]); setPlan(null); setCart(null); setXraySteps([]); setRunId(null);
    setInput(DEFAULT_MESSAGE); setBudget('');
  };

  if (unreachable) {
    return (
      <main className="page">
        <div className="card unreachable" role="alert">
          <h1>Souq Saver</h1>
          <p>Backend not reachable on localhost:8080.</p>
          <p className="muted">Start it with <code>npm run dev:backend</code> from the repo root, then retry.</p>
          <button className="primary" onClick={load}>Retry</button>
        </div>
      </main>
    );
  }
  if (!config) return <main className="page"><p className="muted">Loading…</p></main>;

  return (
    <main className="page">
      <Header languages={config.languages} language={language} onLanguage={setLanguage} xrayOpen={xrayOpen} onToggleXray={() => setXrayOpen((open) => !open)} onReset={onReset} />
      <SampleBanner sampleData={config.sampleData} mock={MOCK} />
      <div className="columns">
        <Chat lines={lines} input={input} onInput={setInput} budget={budget} onBudget={setBudget} busy={busy} onSend={send}
          onExample={(text, exampleLanguage) => { setInput(text); if (exampleLanguage) setLanguage(exampleLanguage); }} />
        <div className="stack">
          <ToolSteps steps={steps} />
          {plan && <StoreComparison stores={plan.stores} />}
          {plan && <Basket plan={plan} approving={approving} approved={!!cart} onApprove={onApprove} />}
          {cart && <CartResult cart={cart} />}
          {plan && <Insights insights={plan.insights} />}
        </div>
      </div>
      {xrayOpen && <XRay liveSteps={xraySteps} liveRunId={runId} />}
      <Footer config={config} health={health} />
    </main>
  );
}
