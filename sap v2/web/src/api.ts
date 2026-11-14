// All calls to the backend. The UI holds no business logic: it shows what these return.
import type { ApiErrorBody, ApproveRequest, ChatRequest, Config, ErrorKind, Health, PersonaInfo, PersonaKey, SseEvent, XrayList, XrayRun } from '../../server/src/contract.ts';
import { mockApprove, mockChat, mockConfig, mockHealth, mockRun, mockRuns } from './mock';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
/** Mock mode: only with VITE_MOCK=true. Replays a recorded run instead of calling the backend. */
export const MOCK = import.meta.env.VITE_MOCK === 'true';

/** A failed request, with the backend's code and field when it answered. kind "network" means it could not be reached. */
export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly code: string;
  readonly field?: string;
  constructor(message: string, kind: ErrorKind, code: string, field?: string) {
    super(message);
    this.kind = kind; this.code = code; this.field = field;
  }
}
export const UNREACHABLE = 'Backend not reachable on localhost:8080. Start it with "npm run dev:backend" and try again.';

async function request(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, init); } catch { throw new ApiError(UNREACHABLE, 'network', 'unreachable'); }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    throw new ApiError(body?.error ?? `The server answered ${response.status}.`, body?.kind ?? (response.status >= 500 ? 'internal' : 'validation'), body?.code ?? `http_${response.status}`, body?.field);
  }
  return response;
}

async function getJson<T>(path: string): Promise<T> {
  return (await request(path)).json();
}

/** POST with a JSON body, read the Server-Sent Events from the response stream. */
async function postStream(path: string, body: unknown, onEvent: (event: SseEvent) => void): Promise<void> {
  const response = await request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const dropped = () => new ApiError('The connection dropped before the answer finished. Nothing was changed. Please try again.', 'network', 'stream_interrupted');
  if (!response.body) throw dropped();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try { chunk = await reader.read(); } catch { throw dropped(); }
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.*)$/m.exec(frame)?.[1];
      const data = /^data: (.*)$/m.exec(frame)?.[1];
      if (!event || !data) continue;
      if (event === 'done') finished = true;
      onEvent({ event, data: JSON.parse(data) } as SseEvent);
    }
  }
  if (!finished) throw dropped();
}

export const getConfig = (): Promise<Config> => (MOCK ? mockConfig() : getJson('/config'));
export const getHealth = (): Promise<Health> => (MOCK ? mockHealth() : getJson('/health'));
export const chat = (request: ChatRequest, onEvent: (e: SseEvent) => void) => (MOCK ? mockChat(onEvent) : postStream('/chat', request, onEvent));
export const approve = (request: ApproveRequest, onEvent: (e: SseEvent) => void) => (MOCK ? mockApprove(onEvent) : postStream('/approve', request, onEvent));
export const listRuns = (): Promise<XrayList> => (MOCK ? mockRuns() : getJson('/xray'));
export const getRun = (runId: string): Promise<XrayRun> => (MOCK ? mockRun(runId) : getJson(`/xray/${encodeURIComponent(runId)}`));

export const getPersonas = (): Promise<PersonaInfo> =>
  (MOCK ? Promise.resolve({ current: null, personas: [], switchable: false }) : getJson('/persona'));

export async function switchPersona(persona: PersonaKey): Promise<void> {
  await request('/persona', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ persona }) });
}

export async function reset(sessionId: string): Promise<void> {
  if (MOCK) return;
  await request('/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
}

/** AED amounts always show 2 decimals. Formatting only, never arithmetic. */
export const aed = (amount: number) => `AED ${amount.toFixed(2)}`;
