// Minimal Server-Sent Events client for POST endpoints (used by the demo CLI and the tests).
import type { SseEvent } from '../contract.ts';

export async function postSse(url: string, body: unknown, onEvent: (event: SseEvent) => void = () => {}): Promise<SseEvent[]> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok || !response.body) throw new Error(`${url} answered ${response.status}: ${await response.text()}`);
  const events: SseEvent[] = [];
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.*)$/m.exec(frame)?.[1];
      const data = /^data: (.*)$/m.exec(frame)?.[1];
      if (!event || !data) continue; // comments such as ": keepalive"
      const parsed = { event, data: JSON.parse(data) } as SseEvent;
      events.push(parsed);
      onEvent(parsed);
    }
  }
  return events;
}
