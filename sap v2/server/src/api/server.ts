// HTTP API on localhost:8080, exactly as in FABLE_PROMPT_2_BACKEND.md section 4.
import Fastify, { type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import type { ApproveRequest, ChatRequest, Config, Health, ResetRequest, SseEvent } from '../contract.ts';
import { runApprove, runChat } from '../agent/agent.ts';
import type { ModelAdapter } from '../agent/bedrock.ts';
import { LANGUAGES } from '../agent/texts.ts';
import { newSession, type Deps, type Session } from '../agent/tools.ts';
import { clearTokens } from '../mcp/approval.ts';
import type { CareemMcp } from '../mcp/client.ts';
import { getRun, listRuns, startRun, step } from '../xray.ts';

export type AppOptions = {
  mcp: CareemMcp;
  /** A getter, so the server can switch from the stub to Bedrock without a restart. */
  model: () => ModelAdapter;
  webOrigin?: string;
  demoMode?: boolean;
  today?: () => Date;
};

export function buildApp(options: AppOptions) {
  const { mcp } = options;
  const origin = options.webOrigin ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  const sampleData = mcp.mode === 'sandbox' || (options.demoMode ?? process.env.DEMO_MODE !== 'false');
  const sessions = new Map<string, Session>();
  const busy = new Set<string>(); // one request at a time per session
  const app = Fastify({ logger: false });
  app.register(cors, { origin: [origin, origin.replace('localhost', '127.0.0.1')] });

  /** Runs one request as an X-ray run and streams its events. Always starts with "run" and ends with "done". */
  async function stream(reply: FastifyReply, path: string, body: { sessionId: string }, work: (deps: Deps) => Promise<void>) {
    reply.hijack();
    reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': origin });
    const emit = (e: SseEvent) => { if (!reply.raw.writableEnded) reply.raw.write(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`); };
    let id = '';
    try {
      await startRun({ method: 'POST', path, body }, emit, async (runId) => {
        id = runId;
        emit({ event: 'run', data: { runId } });
        let events = 0;
        const current = options.model();
        const deps: Deps = { mcp, sampleData, today: options.today, brain: current.isBedrock ? current : undefined, emit: (e) => { events++; emit(e); } };
        await step('api', `POST ${path}`, `api:${path}`, body, async () => {
          if (busy.has(body.sessionId)) {
            deps.emit({ event: 'error', data: { message: 'The previous request for this session is still running. Please wait a moment.', retryable: true } });
          } else {
            busy.add(body.sessionId);
            try { await work(deps); } finally { busy.delete(body.sessionId); }
          }
          return { streamedEvents: events, sampleData };
        }, { summary: (o) => `response finished, ${o.streamedEvents} events streamed` });
      });
    } catch (e) {
      console.error(`[api] ${path} failed:`, e);
      emit({ event: 'error', data: { message: 'Something went wrong on our side. Nothing was changed. Please try again.', retryable: true } });
    }
    emit({ event: 'done', data: { runId: id } });
    reply.raw.end();
  }

  const bad = (reply: FastifyReply, message: string) => reply.code(400).send({ error: message, sampleData });
  const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 4000;

  app.get('/api/config', async (): Promise<Config> => ({
    modelId: options.model().id, modelProvider: options.model().provider, mcpMode: mcp.mode, sampleData, languages: LANGUAGES, currency: 'AED',
  }));

  app.get('/api/health', async (): Promise<Health> => {
    const mcpOk = await mcp.healthy();
    const bedrock = options.model().isBedrock;
    return { ok: mcpOk && bedrock, mcp: mcpOk, bedrock };
  });

  app.post('/api/chat', async (request, reply) => {
    const body = (request.body ?? {}) as Partial<ChatRequest>;
    if (!isText(body.sessionId) || !isText(body.message)) return bad(reply, 'sessionId and message are required');
    if (body.language !== undefined && !LANGUAGES.includes(body.language)) return bad(reply, `language must be one of ${LANGUAGES.join(', ')}`);
    if (body.budgetAed !== undefined && !(typeof body.budgetAed === 'number' && body.budgetAed > 0 && body.budgetAed < 100000)) return bad(reply, 'budgetAed must be a positive number');
    const chat: ChatRequest = { sessionId: body.sessionId, message: body.message.trim(), language: body.language, budgetAed: body.budgetAed };
    if (!sessions.has(chat.sessionId)) sessions.set(chat.sessionId, newSession(chat.sessionId));
    await stream(reply, '/api/chat', chat, (deps) => runChat(sessions.get(chat.sessionId)!, chat, options.model(), deps));
  });

  app.post('/api/approve', async (request, reply) => {
    const body = (request.body ?? {}) as Partial<ApproveRequest>;
    if (!isText(body.sessionId) || !isText(body.planId) || !isText(body.approvalToken)) return bad(reply, 'sessionId, planId and approvalToken are required');
    const approve: ApproveRequest = { sessionId: body.sessionId, planId: body.planId, approvalToken: body.approvalToken };
    await stream(reply, '/api/approve', approve, (deps) => runApprove(sessions.get(approve.sessionId), approve, deps));
  });

  app.post('/api/reset', async (request, reply) => {
    const body = (request.body ?? {}) as Partial<ResetRequest>;
    if (!isText(body.sessionId)) return bad(reply, 'sessionId is required');
    sessions.delete(body.sessionId);
    clearTokens(body.sessionId);
    return { ok: true, sampleData };
  });

  app.get('/api/xray', async () => ({ runs: listRuns(), sampleData }));

  app.get('/api/xray/:runId', async (request, reply) => {
    const run = getRun((request.params as { runId: string }).runId);
    return run ? { ...run, sampleData } : reply.code(404).send({ error: 'run not found', sampleData });
  });

  return app;
}
