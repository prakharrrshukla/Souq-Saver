// Pretty-prints a saved X-ray run:  npm run xray -- <runId>   (no id: the latest run)
import { getRun, listRuns } from '../src/xray.ts';
import type { XrayTreeNode } from '../src/contract.ts';
import { printStep } from './print.ts';

const runId = process.argv[2] ?? listRuns(1)[0]?.runId;
const run = runId ? getRun(runId) : undefined;
if (!run) {
  console.error(runId ? `No saved run "${runId}" in .run/xray` : 'No saved runs yet. Run the demo first: npm run demo:cli');
  process.exit(1);
}
console.log(`Run ${run.runId} · started ${run.startedAt} · ${run.steps} steps · ${run.ms ?? '?'} ms · ${run.status}`);
console.log(`Request: ${JSON.stringify(run.request)}\n`);
const walk = (nodes: XrayTreeNode[], depth: number) => { for (const node of nodes) { printStep(node, depth); walk(node.children, depth + 1); } };
walk(run.tree, 0);
