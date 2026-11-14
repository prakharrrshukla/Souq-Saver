// Live check of the household distinction on Bedrock: Leonardo (fresh produce) vs the Khan family
// (long-shelf-life pantry). Run: node --env-file=.env stress/live-households.ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.XRAY_DIR ??= mkdtempSync(join(tmpdir(), 'souq-live-xray-'));
const { startHttp } = await import('../sandbox/careem-mcp-ts/src/server.ts');
const { writeFixtures } = await import('../fixtures/generate.ts');
const { BedrockModel } = await import('../server/src/agent/bedrock.ts');
const { buildApp } = await import('../server/src/api/server.ts');
const { postSse } = await import('../server/src/api/sseClient.ts');
const { CareemMcp } = await import('../server/src/mcp/client.ts');

const model = new BedrockModel({ modelId: process.env.BEDROCK_MODEL_ID!, fallbackModelId: process.env.BEDROCK_FALLBACK_MODEL_ID });
const overridesPath = join(mkdtempSync(join(tmpdir(), 'souq-live-')), 'o.json');
writeFileSync(overridesPath, '{}');
const sandbox = await startHttp({ port: 0, overridesPath, quiet: true });
const mcp = new CareemMcp(sandbox.url);
const app = buildApp({ mcp, model: () => model });
const api = `${await app.listen({ port: 0, host: '127.0.0.1' })}/api`;

const runs: [string, string, string][] = [['leonardo', '250', ''], ['leonardo', 'cut 15%', ''], ['family', '400', ''], ['family', 'cut 15%', '']];
for (const persona of ['leonardo', 'family'] as const) {
  writeFixtures(persona);
  const mine = runs.filter((r) => r[0] === persona);
  await Promise.all(mine.map(async ([, message], i) => {
    const t = Date.now();
    const ev = (await postSse(`${api}/chat`, { sessionId: `${persona}_${i}`, message })) as { event: string; data: any }[];
    const p = ev.find((e) => e.event === 'plan')?.data;
    const reply = ev.find((e) => e.event === 'message')?.data.text ?? '';
    console.log(`\n## ${persona} "${message}" (${Math.round((Date.now() - t) / 1000)} s)`);
    console.log('errors:', ev.filter((e) => e.event === 'error').map((e) => e.data.code));
    if (!p) { console.log('reply:', reply); return; }
    console.log(`engine: basket ${p.engine?.basket}, profile ${p.engine?.profile} | focus ${JSON.stringify(p.insights.focus)} | ${p.routing?.rule} -> ${p.routing?.storeName}`);
    console.log(`budget ${p.budget.aed} (${p.budget.source}) | est ${p.estTotal} | within ${p.withinBudget} | approval ${p.approval?.allowed}`);
    console.log('AI profile:', p.insights.household?.summary);
    console.log('basket:', p.items.filter((x: any) => x.lineTotal > 0).map((x: any) => `${x.qty}x ${x.name} [${x.tier}]`).join('; '));
    console.log('reply:', reply.slice(0, 500));
  }));
}
writeFixtures('leonardo');
await app.close(); await mcp.close(); await sandbox.close();
