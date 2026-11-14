// X-ray: one wrapper that records every backend step (FABLE_PROMPT_2_BACKEND.md section 2a).
// The MCP client, engine calls, agent tools, model adapter and approval gate all go through step().
// Each run is streamed (xray + trace events), kept in memory and written to .run/xray/<runId>.jsonl.
import { AsyncLocalStorage } from 'node:async_hooks';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SseEvent, XrayKind, XrayRun, XrayRunSummary, XrayStatus, XrayStep, XrayTreeNode } from './contract.ts';

export const XRAY_DIR = process.env.XRAY_DIR ?? fileURLToPath(new URL('../../.run/xray', import.meta.url));
const MAX_EVENT_BYTES = 200 * 1024;
const MAX_RUNS_IN_MEMORY = 50;

/** Thrown by a step that was refused on purpose (checkout, missing approval). Recorded as "blocked". */
export class BlockedError extends Error {}

type Emit = (event: SseEvent) => void;
type Run = { runId: string; startedAt: string; request: unknown; steps: Map<string, XrayStep>; seq: number; emit: Emit; status: XrayStatus; ms?: number };
type Context = { run: Run; parentId?: string };

const context = new AsyncLocalStorage<Context>();
const runs = new Map<string, Run>();

// ---------- redaction ----------

const SECRET_KEY = /authorization|cookie|secret|password|credential|access[-_]?key|session[-_]?token|api[-_]?key/i;
const SECRET_VALUE = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|Bearer\s+[\w.~+/-]+=*/g;
const APPROVAL_TOKEN = /tok_[A-Za-z0-9]{8,}/g;

/** Deep copy with secrets removed. Approval tokens are shown as tok_…last4. */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(APPROVAL_TOKEN, (t) => `tok_…${t.slice(-4)}`).replace(SECRET_VALUE, '[redacted]');
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[redacted]' : redact(v)]));
  }
  return value;
}

// ---------- recording ----------

function publish(run: Run, step: XrayStep) {
  run.steps.set(step.stepId, step);
  let event = step;
  const size = Buffer.byteLength(JSON.stringify(step));
  if (size > MAX_EVENT_BYTES) {
    // Full payload goes to disk; the event carries a truncated copy and the size.
    mkdirSync(join(XRAY_DIR, run.runId), { recursive: true });
    writeFileSync(join(XRAY_DIR, run.runId, `${step.stepId}.json`), JSON.stringify(step, null, 2));
    const cut = (v: unknown) => `${JSON.stringify(v).slice(0, 4000)}… [truncated, full payload in .run/xray/${run.runId}/${step.stepId}.json]`;
    event = { ...step, input: cut(step.input), output: step.output === undefined ? undefined : cut(step.output), meta: { ...step.meta, sizeBytes: size } };
  }
  mkdirSync(XRAY_DIR, { recursive: true });
  appendFileSync(join(XRAY_DIR, `${run.runId}.jsonl`), JSON.stringify(event) + '\n');
  run.emit({ event: 'xray', data: { step: event } });
}

const TRACE_KINDS: XrayKind[] = ['mcp', 'engine', 'approval', 'guard'];

function trace(run: Run, step: XrayStep, label?: string) {
  if (!TRACE_KINDS.includes(step.kind)) return;
  const tool = label ?? (step.kind === 'mcp' ? step.name : `${step.kind}:${step.name}`);
  run.emit({ event: 'trace', data: { id: step.stepId, tool, status: step.status === 'blocked' ? 'error' : step.status, summary: step.summary, ms: step.ms } });
}

export type StepOptions<T> = {
  dataOrigin?: XrayStep['dataOrigin'];
  /** One human line built from the output. */
  summary?: (output: T) => string;
  meta?: (output: T) => XrayStep['meta'];
  /** Label for the short trace event, e.g. "engine:priority_fill". */
  traceAs?: string;
};

/** Records one step: what it was, its full input, its full output and where it came from. */
export async function step<T>(kind: XrayKind, name: string, source: string, input: unknown, fn: () => T | Promise<T>, options: StepOptions<T> = {}): Promise<T> {
  const ctx = context.getStore();
  if (!ctx) return fn(); // outside a run (unit tests, scripts without X-ray)
  const { run } = ctx;
  const started = Date.now();
  const record: XrayStep = {
    runId: run.runId, stepId: randomUUID().slice(0, 8), parentId: ctx.parentId, seq: ++run.seq, kind, name, source,
    dataOrigin: options.dataOrigin ?? 'computed', status: 'running', startedAt: new Date(started).toISOString(),
    input: redact(input ?? null), summary: 'running',
  };
  publish(run, record);
  trace(run, record, options.traceAs);
  const finish = (patch: Partial<XrayStep>) => {
    const done: XrayStep = { ...record, ...patch, endedAt: new Date().toISOString(), ms: Date.now() - started };
    publish(run, done);
    trace(run, done, options.traceAs);
  };
  try {
    const output = await context.run({ run, parentId: record.stepId }, fn);
    finish({ status: 'ok', output: redact(output ?? null), summary: options.summary?.(output) ?? 'ok', meta: options.meta?.(output) });
    return output;
  } catch (e) {
    const message = (e as Error).message;
    finish({ status: e instanceof BlockedError ? 'blocked' : 'error', error: message, summary: message });
    throw e;
  }
}

/** Starts a run (one per API request) and executes fn inside it. The run id is on every step. */
export async function startRun<T>(request: unknown, emit: Emit, fn: (runId: string) => Promise<T>): Promise<T> {
  const run: Run = { runId: `run_${Date.now().toString(36)}_${randomUUID().slice(0, 6)}`, startedAt: new Date().toISOString(), request: redact(request), steps: new Map(), seq: 0, emit, status: 'running' };
  runs.set(run.runId, run);
  if (runs.size > MAX_RUNS_IN_MEMORY) runs.delete(runs.keys().next().value!);
  const started = Date.now();
  try {
    const result = await context.run({ run }, () => fn(run.runId));
    run.status = [...run.steps.values()].some((s) => s.status === 'error' || s.status === 'blocked') ? 'error' : 'ok';
    return result;
  } catch (e) {
    run.status = 'error';
    throw e;
  } finally {
    run.ms = Date.now() - started;
  }
}

/** Marks the current run as failed even though no step threw (e.g. a handled tool error). */
export const currentRunId = () => context.getStore()?.run.runId;

// ---------- reading ----------

function toRun(runId: string, startedAt: string, request: unknown, steps: XrayStep[], status?: XrayStatus, ms?: number): XrayRun {
  const ordered = [...steps].sort((a, b) => a.seq - b.seq);
  const nodes = new Map<string, XrayTreeNode>(ordered.map((s) => [s.stepId, { ...s, children: [] }]));
  const tree: XrayTreeNode[] = [];
  for (const node of nodes.values()) (node.parentId && nodes.get(node.parentId) ? nodes.get(node.parentId)!.children : tree).push(node);
  const last = ordered[ordered.length - 1];
  return {
    runId, startedAt, request, steps: ordered.length,
    ms: ms ?? (last?.endedAt ? new Date(last.endedAt).getTime() - new Date(startedAt).getTime() : undefined),
    status: status ?? (ordered.some((s) => s.status === 'error' || s.status === 'blocked') ? 'error' : ordered.some((s) => s.status === 'running') ? 'running' : 'ok'),
    ordered, tree,
  };
}

/** Latest state of every step in a saved .jsonl file (each step is written at start and at end). */
function readSaved(runId: string): XrayStep[] | undefined {
  const file = join(XRAY_DIR, `${runId}.jsonl`);
  if (!/^[\w-]+$/.test(runId) || !existsSync(file)) return undefined;
  const latest = new Map<string, XrayStep>();
  for (const line of readFileSync(file, 'utf8').split('\n')) if (line) { const s = JSON.parse(line) as XrayStep; latest.set(s.stepId, s); }
  return [...latest.values()];
}

export function getRun(runId: string): XrayRun | undefined {
  const live = runs.get(runId);
  if (live) return toRun(live.runId, live.startedAt, live.request, [...live.steps.values()], live.status, live.ms);
  const saved = readSaved(runId);
  if (!saved?.length) return undefined;
  const first = saved.reduce((a, b) => (a.seq < b.seq ? a : b));
  return toRun(runId, first.startedAt, first.kind === 'api' ? first.input : null, saved);
}

export function listRuns(limit = 30): XrayRunSummary[] {
  const ids = new Set(runs.keys());
  if (existsSync(XRAY_DIR)) for (const f of readdirSync(XRAY_DIR)) if (f.endsWith('.jsonl')) ids.add(f.slice(0, -6));
  return [...ids]
    .sort().reverse().slice(0, limit) // run ids start with a base-36 timestamp, so this is newest first
    .map((id) => getRun(id))
    .filter((r): r is XrayRun => !!r)
    .map(({ ordered: _ordered, tree: _tree, ...summary }) => summary);
}
