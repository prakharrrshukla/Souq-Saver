// Terminal printing shared by demo-cli.ts and xray-print.ts.
import type { XrayStep } from '../src/contract.ts';

const MAX_LINES = 40;

function block(label: string, value: unknown, runId: string): string {
  const lines = JSON.stringify(value, null, 2).split('\n');
  const shown = lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), `… ${lines.length - MAX_LINES} more lines in .run/xray/${runId}.jsonl`] : lines;
  return `     ${label} ${shown.join('\n         ')}`;
}

/** `#seq kind name ← source (ms)` then indented IN and OUT JSON, truncated at 40 lines. */
export function printStep(step: XrayStep, depth = 0) {
  const indent = '  '.repeat(depth);
  const text = [
    `#${step.seq} ${step.kind} ${step.name} ← ${step.source} (${step.ms ?? '?'} ms) [${step.status}] ${step.dataOrigin} · ${step.summary}`,
    block('IN: ', step.input, step.runId),
    step.error ? `     ERR: ${step.error}` : block('OUT:', step.output, step.runId),
  ].join('\n');
  console.log(text.split('\n').map((line) => indent + line).join('\n'));
}

export const aed = (n: number) => `AED ${n.toFixed(2)}`;
