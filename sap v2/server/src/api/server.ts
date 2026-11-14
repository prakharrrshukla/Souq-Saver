// HTTP API on localhost:8080, exactly as in FABLE_PROMPT_2_BACKEND.md section 4.
import Fastify, { type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { readFileSync } from 'node:fs';
import type { ApiErrorBody, ApproveRequest, ChatRequest, Config, ErrorKind, Health, PersonaInfo, PersonaKey, ResetRequest, SseEvent } from '../contract.ts';
import { writeFixtures } from '../../../fixtures/generate.ts';
import { runApprove, runChat } from '../agent/agent.ts';
import type { ModelAdapter } from '../agent/bedrock.ts';
import { LANGUAGES } from '../agent/texts.ts';
import { newSession, type Deps, type Session } from '../agent/tools.ts';
import { limits } from '../limits.ts';
import { clearTokens } from '../mcp/approval.ts';
import { checkBudget } from '../validate.ts';
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
  /** The demo household each session was built on, so switching households no longer wipes every session. */
  const households = new Map<string, PersonaKey | null>();
  /** A session only runs on the household it started on; if the sandbox now serves another one, it is dropped with its tokens. */
  const sessionFor = (id: string): Session | undefined => {
    if (sessions.has(id) && households.get(id) !== currentPersona()) { sessions.delete(id); households.delete(id); clearTokens(id); }
    return sessions.get(id);
  };
  const app = Fastify({ logger: false });
  app.register(cors, { origin: [origin, origin.replace('localhost', '127.0.0.1')] });

  /** Runs one request as an X-ray run and streams its events. Always starts with "run" and ends with "done". */
  async function stream(reply: FastifyReply, path: string, body: { sessionId: string }, work: (deps: Deps) => Promise<void>) {
    reply.hijack();
    reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': origin });
    const emit = (e: SseEvent) => { if (!reply.raw.writableEnded && !reply.raw.destroyed) reply.raw.write(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`); };
    // The client went away before the answer finished: stop the turn, save nothing half-done.
    const left = new AbortController();
    reply.raw.on('close', () => { if (!reply.raw.writableEnded) left.abort(); });
    let id = '';
    try {
      await startRun({ method: 'POST', path, body }, emit, async (runId) => {
        id = runId;
        emit({ event: 'run', data: { runId } });
        let events = 0;
        const current = options.model();
        const deps: Deps = { mcp, sampleData, today: options.today, brain: current.isBedrock ? current : undefined, signal: left.signal, emit: (e) => { events++; emit(e); } };
        await step('api', `POST ${path}`, `api:${path}`, body, async () => {
          if (busy.has(body.sessionId)) {
            deps.emit({ event: 'error', data: { message: 'The previous request for this session is still running. Please wait a moment.', retryable: true, code: 'busy', kind: 'busy' } });
          } else {
            busy.add(body.sessionId);
            try { await work(deps); } finally { busy.delete(body.sessionId); }
          }
          return { streamedEvents: events, sampleData };
        }, { summary: (o) => `response finished, ${o.streamedEvents} events streamed` });
      });
    } catch (e) {
      console.error(`[api] ${path} failed:`, e);
      emit({ event: 'error', data: { message: 'Something went wrong on our side. Nothing was changed. Please try again.', retryable: true, code: 'internal', kind: 'internal' } });
    }
    emit({ event: 'done', data: { runId: id } });
    reply.raw.end();
  }

  const fail = (reply: FastifyReply, status: number, kind: ErrorKind, code: string, message: string, field?: string) =>
    reply.code(status).send({ error: message, code, kind, ...(field && { field }), sampleData } satisfies ApiErrorBody);
  const bad = (reply: FastifyReply, code: string, message: string, field?: string) => fail(reply, 400, 'validation', code, message, field);
  const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const isId = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;

  // Fastify's own errors (malformed JSON, body too large, wrong content type) in the same shape.
  app.setErrorHandler((error: { statusCode?: number; code?: string; message: string }, _request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) { console.error('[api] unhandled error:', error); return fail(reply, 500, 'internal', 'internal', 'Something went wrong on our side. Nothing was changed.'); }
    const code = status === 413 ? 'body_too_large' : status === 415 ? 'unsupported_media_type' : error.code === 'FST_ERR_CTP_INVALID_JSON_BODY' || /JSON/i.test(error.message) ? 'invalid_json' : 'bad_request';
    return fail(reply, status, 'validation', code, status === 413 ? 'The request is too large.' : code === 'invalid_json' ? 'The request body is not valid JSON.' : error.message);
  });
  app.setNotFoundHandler((_request, reply) => fail(reply, 404, 'validation', 'not_found', 'There is no such endpoint.'));

  app.get('/api/config', async (): Promise<Config> => ({
    modelId: options.model().id, modelProvider: options.model().provider, mcpMode: mcp.mode, sampleData, languages: LANGUAGES, currency: 'AED',
  }));

  app.get('/api/health', async (): Promise<Health> => {
    const mcpOk = await mcp.healthy();
    const bedrock = options.model().isBedrock;
    return { ok: mcpOk && bedrock, mcp: mcpOk, bedrock };
  });

  app.post('/api/chat', async (request, reply) => {
    const body = (isObject(request.body) ? request.body : {}) as Partial<ChatRequest>;
    const { maxMessageChars } = limits();
    if (!isId(body.sessionId)) return bad(reply, 'missing_field', 'sessionId is required.', 'sessionId');
    if (typeof body.message !== 'string' || !body.message.trim()) return bad(reply, 'missing_field', 'Please type a message.', 'message');
    if (body.message.length > maxMessageChars) return bad(reply, 'message_too_long', `Messages can be up to ${maxMessageChars} characters; this one has ${body.message.length}. Please shorten it.`, 'message');
    if (body.language !== undefined && !LANGUAGES.includes(body.language)) return bad(reply, 'invalid_language', `language must be one of ${LANGUAGES.join(', ')}.`, 'language');
    if (body.budgetAed !== undefined) { const e = checkBudget(body.budgetAed); if (e) return bad(reply, e.code, e.message, e.field); }
    const chat: ChatRequest = { sessionId: body.sessionId, message: body.message.trim(), language: body.language, budgetAed: body.budgetAed };
    if (!sessionFor(chat.sessionId)) { sessions.set(chat.sessionId, newSession(chat.sessionId)); households.set(chat.sessionId, currentPersona()); }
    await stream(reply, '/api/chat', chat, (deps) => runChat(sessions.get(chat.sessionId)!, chat, options.model(), deps));
  });

  app.post('/api/approve', async (request, reply) => {
    const body = (isObject(request.body) ? request.body : {}) as Partial<ApproveRequest>;
    const { sessionId, planId, approvalToken } = body;
    if (!isId(sessionId)) return bad(reply, 'missing_field', 'sessionId is required.', 'sessionId');
    if (!isId(planId)) return bad(reply, 'missing_field', 'planId is required.', 'planId');
    if (!isId(approvalToken)) return bad(reply, 'missing_field', 'approvalToken is required.', 'approvalToken');
    const approve: ApproveRequest = { sessionId, planId, approvalToken };
    await stream(reply, '/api/approve', approve, (deps) => runApprove(sessionFor(approve.sessionId), approve, deps));
  });

  app.post('/api/reset', async (request, reply) => {
    const body = (isObject(request.body) ? request.body : {}) as Partial<ResetRequest>;
    if (!isId(body.sessionId)) return bad(reply, 'missing_field', 'sessionId is required.', 'sessionId');
    sessions.delete(body.sessionId);
    households.delete(body.sessionId);
    clearTokens(body.sessionId);
    return { ok: true, sampleData };
  });

  // Demo households (sandbox only): the same as `npm run persona -- <key>`, from a button in the app.
  const PERSONAS: PersonaInfo['personas'] = [
    { key: 'leonardo', label: 'Leonardo', area: 'Dubai Marina' },
    { key: 'family', label: 'Khan family', area: 'Al Barsha' },
    { key: 'single', label: 'Joy', area: 'JLT' },
  ];
  const manifest = new URL('../../../fixtures/out/manifest.json', import.meta.url);
  const currentPersona = (): PersonaKey | null => {
    try { return JSON.parse(readFileSync(manifest, 'utf8')).persona ?? 'leonardo'; } catch { return null; }
  };

  app.get('/api/persona', async (): Promise<PersonaInfo> => ({ current: currentPersona(), personas: PERSONAS, switchable: mcp.mode === 'sandbox' }));

  app.post('/api/persona', async (request, reply) => {
    const key = ((isObject(request.body) ? request.body : {}) as { persona?: string }).persona;
    if (mcp.mode !== 'sandbox') return fail(reply, 403, 'validation', 'not_sandbox', 'Households can only be switched on the sandbox.');
    if (!PERSONAS.some((p) => p.key === key)) return bad(reply, 'invalid_persona', `persona must be one of ${PERSONAS.map((p) => p.key).join(', ')}.`, 'persona');
    if (busy.size) return fail(reply, 409, 'busy', 'busy', 'A request is still running. Try again in a moment.');
    if (key === currentPersona()) return { ok: true, current: key, sampleData };
    // Sessions are kept: each is bound to its own household (sessionFor), so a plan for another household still cannot be approved here.
    const result = writeFixtures(key as PersonaKey);
    console.log(`[persona] switched to ${result.user} (${result.persona})`);
    return { ok: true, current: result.persona, user: result.user, sampleData };
  });

  app.get('/api/xray', async () => ({ runs: listRuns(), sampleData }));

  app.get('/api/xray/:runId', async (request, reply) => {
    const run = getRun((request.params as { runId: string }).runId);
    return run ? { ...run, sampleData } : fail(reply, 404, 'validation', 'not_found', 'run not found');
  });

  return app;
}
