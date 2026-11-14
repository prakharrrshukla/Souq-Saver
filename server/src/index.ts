// Starts the backend on localhost. Reads .env from the repo root if it exists.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BedrockModel, type ModelAdapter } from './agent/bedrock.ts';
import { StubModel } from './agent/stub.ts';
import { buildApp } from './api/server.ts';
import { CareemMcp } from './mcp/client.ts';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

/**
 * MODEL_ADAPTER=auto (default): use Bedrock when a hello-world call works, otherwise the marked
 * stub, and keep trying Bedrock in the background. bedrock: fail loudly. stub: never call Bedrock.
 */
export async function chooseModel(): Promise<() => ModelAdapter> {
  const mode = (process.env.MODEL_ADAPTER ?? 'auto').toLowerCase();
  const modelId = process.env.BEDROCK_MODEL_ID;
  const stub = new StubModel();
  if (mode === 'stub') return () => stub;
  const bedrock = modelId ? new BedrockModel({ modelId, fallbackModelId: process.env.BEDROCK_FALLBACK_MODEL_ID }) : undefined;
  const probe = async () => {
    if (!bedrock) throw new Error('BEDROCK_MODEL_ID is not set');
    return bedrock.hello();
  };
  let current: ModelAdapter = stub;
  try {
    console.log(`[model] Bedrock hello-world (${modelId}): "${await probe()}"`);
    current = bedrock!;
  } catch (e) {
    if (mode === 'bedrock') throw e;
    console.warn(`[model] Bedrock is not reachable (${(e as Error).message}).`);
    console.warn('[model] USING THE STUB MODEL (rule-based, not AI). Run `aws login`, set BEDROCK_MODEL_ID in .env; the server switches by itself.');
    const timer = setInterval(async () => {
      try { await probe(); current = bedrock!; clearInterval(timer); console.log(`[model] Bedrock is reachable, switched to ${modelId}`); } catch { /* keep the stub */ }
    }, 30_000);
    timer.unref();
  }
  return () => current;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mcp = new CareemMcp();
  try {
    console.log(`[mcp] connected to ${mcp.url} (${mcp.mode}), ${await mcp.connect()} tools`);
  } catch (e) {
    console.warn(`[mcp] Careem MCP is not reachable at ${mcp.url} yet (${(e as Error).message}). Will connect on first use.`);
  }
  const model = await chooseModel();
  const app = buildApp({ mcp, model });
  const port = Number(process.env.PORT ?? 8080);
  await app.listen({ port, host: '127.0.0.1' });
  console.log(`[api] http://localhost:${port}/api  model: ${model().id} (${model().provider})`);
}
