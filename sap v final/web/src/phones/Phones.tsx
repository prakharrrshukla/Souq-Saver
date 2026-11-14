// The stage: three Careem phones, one per demo household, and a fourth phone that X-rays whichever
// household phone is running. One phone runs at a time, because the Careem MCP sandbox serves one
// household at a time: before a phone's request the sandbox is switched to that phone's household.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Config, Health, PersonaKey, SseEvent, TraceEvent, XrayStep } from '../../../server/src/contract.ts';
import { ApiError, MOCK, getConfig, getHealth, getPersonas, switchPersona } from '../api';
import { Footer } from '../components/Footer';
import { HouseholdProfile } from '../components/HouseholdProfile';
import { ToolSteps } from '../components/ToolSteps';
import { XRay } from '../components/XRay';
import { Mark, StatusBar } from './art';
import { Home } from './Home';
import { SouqSaverScreen } from './SouqSaverScreen';
import { usePlanner, type RunExclusive } from './usePlanner';

type Household = { key: PersonaKey; label: string; area: string };
/** The backend's list when it answers; the same three households otherwise (mock mode). */
const DEFAULT_HOUSEHOLDS: Household[] = [
  { key: 'leonardo', label: 'Leonardo', area: 'Dubai Marina' },
  { key: 'family', label: 'Khan family', area: 'Al Barsha' },
  { key: 'single', label: 'Joy', area: 'JLT' },
];

/** What the X-ray phone shows: the latest run of the phone that is (or was last) running. */
type Feed = { phone: PersonaKey; runId: string | null; trace: TraceEvent[]; xray: XrayStep[]; status: 'switching' | 'running' | 'done' };

const PHONE_W = 390;
const PHONE_H = 844;
const upsert = <T,>(list: T[], item: T, same: (a: T) => boolean) => (list.some(same) ? list.map((x) => (same(x) ? item : x)) : [...list, item]);

/** Desktop: all four phones side by side, scaled to fit the window. Narrow screens: one full-screen phone per swipe. */
function useLayout() {
  const measure = () => {
    const mobile = window.innerWidth < 720;
    // +26: the bezel (13 px each side). 72: page header and the caption under each phone.
    const scale = Math.min((window.innerHeight - 72) / (PHONE_H + 26), (window.innerWidth - 48 - 3 * 24) / (4 * (PHONE_W + 26)), 1);
    return { mobile, scale: Math.max(scale, 0.45) };
  };
  const [layout, setLayout] = useState(measure);
  useEffect(() => {
    const onResize = () => setLayout(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return layout;
}

function Frame({ scale, mobile, label, dark, below, children }: { scale: number; mobile: boolean; label: string; dark?: boolean; below?: React.ReactNode; children: React.ReactNode }) {
  return (
    <figure className="phone-slot">
      <div className={`phone${dark ? ' phone-dark' : ''}`} style={mobile ? undefined : { zoom: scale }}>
        <div className="phone-screen">
          {children}
          <StatusBar />
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </div>
      <figcaption>{label}</figcaption>
      {below && <div className="below-phone" style={mobile ? undefined : { width: (PHONE_W + 26) * scale }}>{below}</div>}
    </figure>
  );
}

function CareemPhone({ household, index, layout, runExclusive, report, runningLabel, sampleData }: {
  household: Household; index: number; layout: { mobile: boolean; scale: number };
  runExclusive: RunExclusive; report: (phone: PersonaKey, e: SseEvent) => void; runningLabel: string | null; sampleData: boolean;
}) {
  const [splash, setSplash] = useState(true);
  const [open, setOpen] = useState(false);
  const planner = usePlanner(household.key, runExclusive, (e) => report(household.key, e));
  useEffect(() => { const t = setTimeout(() => setSplash(false), 1400); return () => clearTimeout(t); }, []);
  const blocked = runningLabel && runningLabel !== household.label ? `${runningLabel}'s phone is running. One phone at a time: watch it on the X-ray phone.` : undefined;

  return (
    <Frame scale={layout.scale} mobile={layout.mobile} label={`Phone ${index + 1} · ${household.label}, ${household.area}`}
      below={planner.plan?.insights.household?.summary ? <HouseholdProfile household={planner.plan.insights.household} /> : undefined}>
      <div className="layer layer-home" inert={open}>
        <Home name={household.label} area={household.area} plan={planner.plan} onOpenSouq={() => setOpen(true)} />
      </div>
      <div className={`layer layer-souq${open ? ' open' : ''}`} inert={!open}>
        <SouqSaverScreen name={household.label} area={household.area} planner={planner} blocked={blocked} sampleData={sampleData} onBack={() => setOpen(false)} />
      </div>
      <div className={`splash${splash ? '' : ' gone'}`} aria-hidden={!splash}>
        <Mark size={64} />
        <span className="splash-name">careem</span>
      </div>
    </Frame>
  );
}

function XrayPhone({ feed, households, layout, config, health }: {
  feed: Feed | null; households: Household[]; layout: { mobile: boolean; scale: number }; config: Config; health: Health | null;
}) {
  const index = feed ? households.findIndex((h) => h.key === feed.phone) : -1;
  const who = index >= 0 ? `Phone ${index + 1} · ${households[index].label}` : null;
  const status = !feed ? 'Waiting for a phone to run' : feed.status === 'switching' ? 'switching the sandbox household' : feed.status === 'running' ? 'running' : 'last run';
  return (
    <Frame scale={layout.scale} mobile={layout.mobile} label="Phone 4 · X-ray of the running phone" dark>
      <div className="layer xr-screen">
        <header className="xr-top">
          <strong>X-ray</strong>
          <span>Every backend step of the phone that is running</span>
        </header>
        <div className={`xr-watch${feed?.status === 'done' || !feed ? '' : ' live'}`} role="status">
          <span className="xr-dot" aria-hidden="true" />
          <span>{who ? <><strong>{who}</strong> · {status}</> : status}</span>
          {feed?.runId && <code>{feed.runId}</code>}
        </div>
        <div className="xr-body">
          <ToolSteps steps={feed?.trace ?? []} />
          <XRay liveSteps={feed?.xray ?? []} liveRunId={feed?.runId ?? null} />
          <Footer config={config} health={health} />
        </div>
      </div>
    </Frame>
  );
}

export default function Phones() {
  const layout = useLayout();
  const [config, setConfig] = useState<Config | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [households, setHouseholds] = useState<Household[]>(DEFAULT_HOUSEHOLDS);
  const [switchable, setSwitchable] = useState(false);
  const [running, setRunning] = useState<PersonaKey | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const lock = useRef<PersonaKey | null>(null);
  const served = useRef<PersonaKey | null>(null); // the household the sandbox serves now

  const load = useCallback(async () => {
    try {
      setConfig(await getConfig());
      setUnreachable(false);
      setHealth(await getHealth().catch(() => null));
      const info = await getPersonas().catch(() => null);
      if (info?.personas.length) setHouseholds(info.personas);
      setSwitchable(!MOCK && !!info?.switchable);
      served.current = info?.current ?? null;
    } catch {
      setUnreachable(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const labelOf = (key: PersonaKey) => households.find((h) => h.key === key)?.label ?? key;

  const runExclusive: RunExclusive = useCallback(async (phone, work) => {
    if (lock.current) throw new ApiError(`${labelOf(lock.current)}'s phone is running. One phone at a time.`, 'busy', 'busy');
    lock.current = phone;
    setRunning(phone);
    try {
      if (switchable && served.current !== phone) {
        setFeed({ phone, runId: null, trace: [], xray: [], status: 'switching' });
        await switchPersona(phone);
        served.current = phone;
      }
      setFeed((f) => (f?.phone === phone && f.status === 'switching' ? { ...f, status: 'running' } : { phone, runId: null, trace: [], xray: [], status: 'running' }));
      await work();
    } finally {
      lock.current = null;
      setRunning(null);
      setFeed((f) => (f ? { ...f, status: 'done' } : f));
      getHealth().then(setHealth).catch(() => {});
    }
  }, [switchable, households]); // eslint-disable-line react-hooks/exhaustive-deps

  const report = useCallback((phone: PersonaKey, e: SseEvent) => {
    setFeed((f) => {
      const current = f && f.phone === phone ? f : { phone, runId: null, trace: [], xray: [], status: 'running' as const };
      if (e.event === 'run') return { ...current, runId: e.data.runId, trace: [], xray: [], status: 'running' };
      if (e.event === 'trace') return { ...current, trace: upsert(current.trace, e.data, (s) => s.id === e.data.id) };
      if (e.event === 'xray') return { ...current, xray: upsert(current.xray, e.data.step, (s) => s.stepId === e.data.step.stepId) };
      return current;
    });
  }, []);

  if (unreachable) {
    return (
      <main className="page">
        <div className="card unreachable" role="alert">
          <h1>Souq Saver</h1>
          <p>Backend not reachable on localhost:8080.</p>
          <p className="muted">Start it with <code>npm run dev:backend</code> from the sap v final folder, then retry.</p>
          <button className="primary" onClick={load}>Retry</button>
        </div>
      </main>
    );
  }
  if (!config) return <main className="page"><p className="muted">Loading…</p></main>;

  return (
    <main className={`stage${layout.mobile ? ' mobile' : ''}`}>
      <header className="stage-head">
        <strong>Souq Saver</strong>
        <span>Three households on the Careem MCP sandbox, one phone at a time · {MOCK ? 'Mock mode: not connected to the backend' : config.sampleData ? 'Sample data' : 'Live data'}</span>
      </header>
      <div className="phones">
        {households.map((h, i) => (
          <CareemPhone key={h.key} household={h} index={i} layout={layout} runExclusive={runExclusive} report={report}
            runningLabel={running ? labelOf(running) : null} sampleData={config.sampleData} />
        ))}
        <XrayPhone feed={feed} households={households} layout={layout} config={config} health={health} />
      </div>
    </main>
  );
}
