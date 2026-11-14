// Records one real run from the backend into src/mock.recording.json for mock mode.
// Needs the backend:  npm run dev:backend   then   npm --workspace web run record-mock
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { postSse } from '../server/src/api/sseClient.ts';
import type { Plan, SseEvent } from '../server/src/contract.ts';

const api = process.env.VITE_API_URL ?? 'http://localhost:8080/api';
const sessionId = `mock_${Date.now().toString(36)}`;

// Keep the file small: long payloads are cut, with a note. The live backend always sends them in full.
const shorten = (value: unknown) => {
  const text = JSON.stringify(value) ?? 'null';
  return text.length > 1500 ? `${text.slice(0, 1500)}… [cut in the mock recording, ${text.length} characters in the real run]` : value;
};
const slim = (events: SseEvent[]) => events.map((e) => (e.event === 'xray' ? { event: e.event, data: { step: { ...e.data.step, input: shorten(e.data.step.input), output: e.data.step.output === undefined ? undefined : shorten(e.data.step.output) } } } : e));

const config = await (await fetch(`${api}/config`)).json();
const chat = await postSse(`${api}/chat`, { sessionId, message: 'Same as last week, but cut 15%' });
const planEvent = chat.find((e) => e.event === 'plan');
if (!planEvent) throw new Error('the backend returned no plan');
const plan = planEvent.data as Plan;
const approve = await postSse(`${api}/approve`, { sessionId, planId: plan.planId, approvalToken: plan.approvalToken });
plan.approvalToken = 'tok_mock'; // the real token is spent

writeFileSync(fileURLToPath(new URL('./src/mock.recording.json', import.meta.url)), JSON.stringify({ config, chat: slim(chat), approve: slim(approve) }, null, 1) + '\n');
console.log(`recorded ${chat.length} chat events and ${approve.length} approve events`);
