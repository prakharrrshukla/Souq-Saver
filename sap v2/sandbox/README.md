# Careem MCP sandbox

- `careem-mcp-sandbox/` is Careem's no-code package (https://builders.careem.com/sandbox/careem-mcp-sandbox.zip), unchanged.
- `careem-mcp-ts/` is the server built from its `spec/BUILD.md` in TypeScript with the official MCP SDK.
  It reads the spec from `../careem-mcp-sandbox/spec` (set `CAREEM_SPEC_DIR` to move it).

```bash
npm run sandbox                  # run in the foreground on http://127.0.0.1:8787/mcp
npm run sandbox -- start | stop | status | logs
npm run sandbox -- --stdio       # for clients that spawn a process
npm run sandbox -- scenarios [tool]
npm run sandbox -- scenario <tool> <scenario>      # force an outcome; omit the scenario to clear it
npm run sandbox -- reset
npx vitest run sandbox           # the 12 acceptance tests of BUILD.md section 7
```

Connect a client: `claude mcp add --transport http careem-mcp http://127.0.0.1:8787/mcp`, or
`{"mcpServers":{"careem-mcp":{"url":"http://127.0.0.1:8787/mcp"}}}`. Health: `GET /health`.

One addition to Careem's spec: an overlay folder (`fixtures/out/tools`, or `CAREEM_OVERLAY_DIR`) with
files in the same tool-file format that hold extra scenarios. They are tried before the tool's own
scenarios. That is how the generated household is served. Legacy SSE (`/sse`) is not served; Streamable
HTTP and stdio are.
