// Local Careem MCP server: protocol + HTTP surface (spec/BUILD.md sections 3 to 6, spec/MCP_SERVER.md).
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListToolsRequestSchema, McpError,
  ReadResourceRequestSchema, isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { indexOverlay, indexTools, loadTool, render, select } from './spec.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export type Options = {
  specDir?: string;
  overlayDir?: string;
  overridesPath?: string;
  port?: number;
  host?: string;
  serverName?: string;
  serverVersion?: string;
  widgetDomain?: string;
  quiet?: boolean;
};

export function resolveOptions(o: Options = {}): Required<Options> {
  return {
    specDir: o.specDir ?? process.env.CAREEM_SPEC_DIR ?? here('../../careem-mcp-sandbox/spec'),
    overlayDir: o.overlayDir ?? process.env.CAREEM_OVERLAY_DIR ?? here('../../../fixtures/out/tools'),
    overridesPath: o.overridesPath ?? process.env.CAREEM_OVERRIDES ?? here('../../../.run/overrides.json'),
    port: o.port ?? Number(process.env.CAREEM_MCP_PORT ?? 8787),
    host: o.host ?? '127.0.0.1',
    serverName: o.serverName ?? 'careem-mcp-service',
    serverVersion: o.serverVersion ?? 'v1.0.0',
    widgetDomain: o.widgetDomain ?? 'https://careem-mcp-app.pages.dev',
    quiet: o.quiet ?? false,
  };
}

/** Everything protocol-related, independent of the transport. */
export function createCore(options: Options = {}) {
  const opt = resolveOptions(options);
  const toolPaths = indexTools(opt.specDir); // fail fast on invalid files
  const overlayPaths = indexOverlay(opt.overlayDir);
  const ajv = new Ajv2020({ useDefaults: true, strict: false });
  const definitions = new Map<string, any>();
  const validators = new Map<string, ValidateFunction>();
  for (const [name, path] of toolPaths) {
    const def = loadTool(path).definition;
    definitions.set(name, def);
    validators.set(name, ajv.compile(def.inputSchema)); // schema as loaded at startup
  }
  const toolList = [...definitions.values()].sort((a, b) => a.name.localeCompare(b.name));

  const widgetMeta = {
    ui: {
      resourceUri: 'ui://careem-mcp-app',
      csp: {
        connectDomains: [opt.widgetDomain],
        resourceDomains: [
          opt.widgetDomain,
          'https://careem.s3.eu-west-1.amazonaws.com',
          'https://d1a3f4spazzrp4.cloudfront.net',
          'https://careem-catalog-media.media.careem.com',
          'https://partner-mot-prod.media.careem.com',
        ],
        frameDomains: [],
        baseUriDomains: [],
      },
    },
    prefersBorder: false,
    domain: opt.widgetDomain,
    annotations: { ttlMs: 60000, destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  };
  const widget = { uri: 'ui://careem-mcp-app', mimeType: 'text/html;profile=mcp-app', _meta: widgetMeta };
  const widgetHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>Careem MCP App</title>
<link rel="stylesheet" href="${opt.widgetDomain}/assets/index.css">
</head>
<body>
<div id="root"></div>
<script type="module" src="${opt.widgetDomain}/assets/index.js"></script>
</body>
</html>`;

  function overrides(): Record<string, string> {
    try { return JSON.parse(readFileSync(opt.overridesPath, 'utf8')); } catch { return {}; }
  }

  const fail = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true });

  function callTool(name: string, rawArgs: unknown) {
    const path = toolPaths.get(name);
    if (!path) throw new McpError(ErrorCode.InvalidParams, `unknown tool "${name}"`);
    const args = structuredClone(rawArgs ?? {}) as Record<string, unknown>;
    const validate = validators.get(name)!;
    if (!validate(args)) return fail(`validating "arguments": ${ajv.errorsText(validate.errors, { dataVar: 'arguments' })}`);
    try {
      const file = loadTool(path, overlayPaths.get(name));
      const forced = overrides()[name];
      const scenario = select(file, args, forced);
      const value = render(scenario.template, args);
      const wasForced = !!forced && scenario.name.toLowerCase() === forced.toLowerCase();
      if (!opt.quiet) console.error(`[careem-mcp] ${name} -> ${scenario.name}${wasForced ? ' (forced)' : ''} ${JSON.stringify(args)}`);
      const isObject = !!value && typeof value === 'object' && !Array.isArray(value);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(value) }],
        ...(isObject ? { structuredContent: value as Record<string, unknown> } : {}),
        isError: scenario.isError,
      };
    } catch (e) {
      console.error(`[careem-mcp] ${name} internal error: ${(e as Error).message}`);
      return fail('internal server error');
    }
  }

  function makeServer(): Server {
    const server = new Server(
      { name: opt.serverName, version: opt.serverVersion },
      { capabilities: { tools: { listChanged: true }, resources: { listChanged: true }, logging: {} } },
    );
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolList }));
    server.setRequestHandler(CallToolRequestSchema, async (req) => callTool(req.params.name, req.params.arguments));
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [{ ...widget, name: 'ui://careem-mcp-app', description: 'Careem Widget' }],
    }));
    server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
      if (req.params.uri !== widget.uri) throw new McpError(ErrorCode.InvalidParams, `unknown resource "${req.params.uri}"`);
      return { contents: [{ ...widget, text: widgetHtml }] };
    });
    return server;
  }

  return { opt, toolList, toolPaths, overlayPaths, callTool, makeServer };
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

/** Streamable HTTP on /mcp (stateful sessions, as production) plus GET /health. */
export async function startHttp(options: Options = {}) {
  const core = createCore(options);
  const { opt } = core;
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    try {
      const path = (req.url ?? '/').split('?')[0];
      if (path === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', tools: core.toolList.length }));
        return;
      }
      if (path !== '/mcp') {
        res.writeHead(404).end();
        return;
      }
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;
      if (!transport) {
        if (req.method !== 'POST' || !isInitializeRequest(body)) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: no valid session' }, id: null }));
          return;
        }
        const created = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => { transports.set(id, created); },
        });
        created.onclose = () => { if (created.sessionId) transports.delete(created.sessionId); };
        await core.makeServer().connect(created);
        transport = created;
      }
      await transport.handleRequest(req, res, body);
    } catch (e) {
      console.error(`[careem-mcp] http error: ${(e as Error).message}`);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(opt.port, opt.host, resolve);
  });
  const port = (httpServer.address() as { port: number }).port;
  return {
    core,
    port,
    url: `http://${opt.host}:${port}/mcp`,
    close: async () => {
      for (const t of transports.values()) await t.close().catch(() => {});
      httpServer.closeAllConnections();
      await new Promise((r) => httpServer.close(r));
    },
  };
}

export async function startStdio(options: Options = {}) {
  const core = createCore(options);
  await core.makeServer().connect(new StdioServerTransport());
}
