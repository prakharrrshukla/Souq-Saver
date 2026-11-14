// Mock mode (VITE_MOCK=true): replays events recorded from the real backend, so the UI can be
// worked on without it. The recording matches the contract exactly because it is a real run:
//   run -> trace/xray -> message -> plan -> done, then approve: run -> trace/xray -> cart -> done.
// Re-record after a contract change:  npm run dev:backend  then  npm --workspace web run record-mock
import type { Config, Health, SseEvent, XrayList, XrayRun, XrayStep } from '../../server/src/contract.ts';
import recording from './mock.recording.json';

const { config, chat, approve } = recording as unknown as { config: Config; chat: SseEvent[]; approve: SseEvent[] };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function replay(events: SseEvent[], onEvent: (event: SseEvent) => void) {
  for (const event of events) {
    await wait(event.event === 'xray' ? 15 : event.event === 'trace' ? 60 : 150);
    onEvent(event);
  }
}

const runOf = (events: SseEvent[]): XrayRun => {
  const steps = [...new Map(events.flatMap((e) => (e.event === 'xray' ? [[e.data.step.stepId, e.data.step] as [string, XrayStep]] : []))).values()];
  const first = events[0];
  return {
    runId: first.event === 'run' ? first.data.runId : 'mock', startedAt: steps[0]?.startedAt ?? '', request: steps[0]?.input, steps: steps.length,
    ms: steps[0]?.ms, status: 'ok', ordered: steps, tree: [],
  };
};

export const mockConfig = async (): Promise<Config> => config;
export const mockHealth = async (): Promise<Health> => ({ ok: false, mcp: false, bedrock: false });
export const mockChat = (onEvent: (event: SseEvent) => void) => replay(chat, onEvent);
export const mockApprove = (onEvent: (event: SseEvent) => void) => replay(approve, onEvent);
export const mockRuns = async (): Promise<XrayList> => ({
  runs: [chat, approve].map(runOf).map(({ ordered: _ordered, tree: _tree, ...summary }) => summary),
  sampleData: true,
});
export const mockRun = async (runId: string): Promise<XrayRun> => [chat, approve].map(runOf).find((r) => r.runId === runId) ?? runOf(chat);
