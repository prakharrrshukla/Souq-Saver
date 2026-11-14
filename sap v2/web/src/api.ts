// All calls to the backend. The UI holds no business logic: it shows what these return.
import type { ApproveRequest, ChatRequest, Config, Health, PersonaInfo, PersonaKey, SseEvent, XrayList, XrayRun } from '../../server/src/contract.ts';
import { mockApprove, mockChat, mockConfig, mockHealth, mockRun, mockRuns } from './mock';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
/** Mock mode: only with VITE_MOCK=true. Replays a recorded run instead of calling the backend. */
export const MOCK = import.meta.env.VITE_MOCK === 'true';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  return response.json();
}

/** POST with a JSON body, read the Server-Sent Events from the response stream. */
async function postStream(path: string, body: unknown, onEvent: (event: SseEvent) => void): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok || !response.body) throw new Error(`${path} answered ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.*)$/m.exec(frame)?.[1];
      const data = /^data: (.*)$/m.exec(frame)?.[1];
      if (event && data) onEvent({ event, data: JSON.parse(data) } as SseEvent);
    }
  }
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
  const response = await fetch(`${API_URL}/persona`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ persona }) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `switch failed (${response.status})`);
}

export async function reset(sessionId: string): Promise<void> {
  if (MOCK) return;
  await fetch(`${API_URL}/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
}

/** AED amounts always show 2 decimals. Formatting only, never arithmetic. */
export const aed = (amount: number) => `AED ${amount.toFixed(2)}`;
