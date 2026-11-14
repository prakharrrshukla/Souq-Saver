# Building careem-mcp from this folder

This is the implementation spec for running **careem-mcp** locally from this folder. Any
language works; use an official MCP SDK (TypeScript `@modelcontextprotocol/sdk`, Python `mcp`,
Go `github.com/modelcontextprotocol/go-sdk`, …) for the protocol and implement the logic below —
roughly 300–500 lines. Everything needed is in this folder.

Where this spec says "the reference implementation", it means the Go server that ships next to
this folder (`server/` in the same project). You don't need it — it is only a tie-breaker.

## 1. Goal

A local MCP server that an MCP client cannot tell apart from production careem-mcp:

- the same server identity, tools (names, titles, descriptions, annotations, input and output
  schemas, `_meta`) and widget resource as production;
- every `tools/call` answered with one of the tool's scenarios from this folder, in exactly the
  shape production returns;
- **nothing in anything a client can observe** — server info, tool list, resources, results —
  hints that it is a local copy. Scenario control (§6) happens out-of-band, never through MCP.

It makes no network calls and needs no credentials. Non-goals: OAuth, state between calls
(adding an item does not change what `cart_get_basket` returns — scenarios are static unless
chosen by arguments or forced).

## 2. Parsing the folder

Load every `tools/**/*.md` except `README.md`. File order does not matter. For each file:

1. **Frontmatter** — the file starts with `---\n … \n---\n`. Read flat `key: value` lines;
   strip surrounding quotes and any trailing ` # comment`. `tool` (required) is the tool name;
   `domain` is informational.
2. **Sections** — split the rest into sections at lines starting with `## ` that are **not**
   inside a fenced code block (a line starting with ```` ``` ```` toggles "inside a fence"). A
   section runs until the next such heading or end of file. Ignore text before the first
   section and any section whose title is not one of:
   - `Definition` — contains one fenced block whose info string is `json tool`. Its content is
     the MCP `Tool` object to advertise (`name`, `title`, `description`, `inputSchema`,
     `outputSchema`, `annotations`, `_meta`). `name` must equal the frontmatter `tool`.
   - `Scenario: <name>` — one covered by scenarios outcome (see below). Keep file order.
   - Everything else (`Flow`, notes, …) is documentation for humans/agents.
3. **Scenario** blocks — fenced blocks matching
   `^```json[ \t]+(match|response|error)[ \t]*\n(.*?)^```[ \t]*$` (multi-line, dot matches
   newline):
   - `json match` (0 or 1): a JSON object, the selection rule. Absent ⇒ this is a **default**
     scenario.
   - exactly one of `json response` (normal result) or `json error` (result with
     `isError: true`). The content is a **JSON template** (placeholders below); it must be
     valid JSON after rendering.

At startup, fail fast (message names the file and scenario) when: frontmatter/`tool` missing,
no `Definition`, no scenario, a scenario without a response block or with more than one
response/error block, invalid JSON (render each template once with empty arguments to check),
duplicate tool names. Every tool file has at least one default scenario.

Re-read the files on every call so edits apply without a restart. If a file has become invalid
by then, that call returns `isError: true` with the parse error as its text; the server keeps
running. (The tool **list** is fixed at startup.)

## 3. Protocol behaviour

### initialize

Answer exactly like production (see [MCP_SERVER.md](MCP_SERVER.md)):

- `serverInfo`: `{ "name": "careem-mcp-service", "version": "v1.0.0" }` — no `title` (make both
  configurable);
- **no `instructions`**;
- `capabilities`: `tools` and `resources` (plus whatever your SDK adds, e.g. `logging`);
- `protocolVersion`: whatever your SDK negotiates.

### tools/list

Every `json tool` definition **verbatim** — `name`, `title`, `description`, `inputSchema`,
`outputSchema`, `annotations` and `_meta` exactly as in the file — and nothing else. Order is not
significant (the reference implementation sorts by name, as the go-sdk does).

(Optional flags: drop `outputSchema`, or drop `_meta` together with the widget resource.)

### resources/list and resources/read

Serve the ChatGPT widget resource `ui://careem-mcp-app` exactly as [MCP_SERVER.md](MCP_SERVER.md)
"Resources" describes, with the production widget domain `https://careem-mcp-app.pages.dev`
(configurable). Tool `_meta.ui.resourceUri` points at it, so ChatGPT renders the same widget.

### tools/call

```
handle(name, arguments):
  tool = definitions[name]
      → unknown: JSON-RPC error, code -32602, message containing 'unknown tool "<name>"'
        (some SDKs prefix their own text — that's fine)
  args = arguments or {}
  apply inputSchema defaults to args, then validate args against inputSchema
      (JSON Schema draft 2020-12; use the schema loaded at startup)
      → invalid: result { isError: true, content: [text: 'validating "arguments": <validator message>'] }
        (only the prefix is specified; the validator's wording is yours)
  file = parse(file of name)                    → parse error: { isError: true, text: "internal server error" }
  scenario = select(file, args, overrides()[name])
  value = render(scenario.template, args)       → render error: { isError: true, text: "internal server error" }
  log to stderr: tool, scenario name, args      (details of any internal error go here, never to the client)
  return {
    content: [ { type: "text", text: JSON.stringify(value) } ],
    structuredContent: value       (whenever value is a JSON object — also for `json error`),
    isError: scenario came from a `json error` block
  }
```

This mirrors production: business failures are **not** `isError` — they are normal results
whose object carries an `"error"` string (e.g. `{ "error": "rideId is required" }`). See
[MCP_SERVER.md](MCP_SERVER.md) for the few cases where production does set `isError`.

### Scenario selection

```
select(file, args, forced):
  if forced and file has a scenario named forced (case-insensitive): return it
  (a forced name that no longer exists is ignored)
  for scenario in file.scenarios (file order):
      if scenario.match is set and matches(scenario.match, args): return it
  return the first scenario without a match block
```

`matches(want, got)` — `want` is the match object, `got` the arguments. Let
`text(got)` be `got` itself when it is a string, otherwise its compact JSON encoding
(`5` → `"5"`, `true` → `"true"`, `{"a":1}` → `"{\"a\":1}"`).

| `want` | matches when |
| --- | --- |
| object | `got` is an object and **every** key of `want` is present in `got` and matches recursively (extra keys in `got` are fine) |
| array | `got` is an array and **every** element of `want` matches **some** element of `got` (so `[]` matches any array) |
| `"*"` | `got` is present and not `null` |
| `"~text"` | `got` is not `null` and `text(got)` contains `text`, case-insensitive |
| `"=text"` | `got` is not `null` and `text(got)` equals `text`, case-insensitive (use this to match a literal `*` or a value starting with `~`) |
| any other string | `got` is not `null` and `text(got)` equals it, case-insensitive (so `"5"` matches `5`) |
| number / boolean / null | JSON-equal (`null` matches only an explicit `null`) |

A key that is absent from the arguments never matches (not even `null`).

### Placeholders

Templates contain `{{ expr }}` (spaces inside the braces allowed). Replace each before parsing
the JSON:

| expr | value |
| --- | --- |
| `args.a.b.0.c` | walk the arguments by key / array index; anything missing → `null` |
| `now`, `now+15m`, `now-2h`, `now+1h30m` | current UTC time ± a Go-style duration (units `ms s m h`, combinable), RFC 3339 **whole seconds** (`2026-10-05T12:00:00Z`) |
| `now+2h@20m` | as above, then rounded **down** to a multiple of the duration after `@` (e.g. 20-minute slot boundaries) |
| `now+24h\|date`, `\|weekday`, `\|hhmm`, `\|daylabel` | the time formatted in the fixture zone **Asia/Dubai**: `2026-10-07`, `Wednesday`, `04:20`, `Fri, 9th Oct` (combinable with `@`: `now+2h@20m\|hhmm`) |
| `unix`, `unix+30m` | unix seconds (number) |
| `unixms`, `unixms+30m` | unix milliseconds (number) |
| `uuid` | random UUID v4 |
| `rand:MIN-MAX` | random integer in the inclusive range (non-negative integers only) |

Unknown expressions are an error. There is no escape for a literal `{{`. **Context matters:**

- placeholder **inside a JSON string** (`"id": "ride {{args.rideId}}"`) → insert as text: a
  string value as its characters, any other value as its compact JSON text — in both cases
  **JSON-string-escaped** (quotes, backslashes, control characters) so the result stays valid;
- placeholder **as a bare value** (`"qty": {{args.qty}}`) → insert the JSON encoding
  (`3`, `"abc"`, `null`, `{…}`).

Decide "inside a string" by scanning the template once and tracking unescaped `"` characters.

## 4. Transports

Serve at least one; all three is best.

| Transport | Address |
| --- | --- |
| Streamable HTTP | `http://127.0.0.1:8787/mcp` (port configurable; bind to localhost by default; stateful sessions, as production) |
| Legacy SSE | `GET http://127.0.0.1:8787/sse`; the POST endpoint for messages is whatever your SDK announces in the `endpoint` event |
| stdio | `--stdio` flag; logs must go to **stderr** only |

Also `GET /health` → `{ "status": "ok", "tools": <number of tools> }`.

## 5. Logging

One line per call to stderr: tool name, chosen scenario (marked when forced), compact
arguments. This is how developers see what their agent actually did.

## 6. Forcing scenarios (out-of-band)

Developers force a tool into a scenario through a JSON file, **never** through MCP:

- path: `<project>/.run/overrides.json` (configurable);
- content: `{ "<tool>": "<scenario name>", … }`;
- re-read on **every** call (a missing or invalid file means "no overrides"), so it works the same
  over HTTP and stdio and takes effect immediately;
- a forced name that doesn't exist in the tool's file is ignored.

Provide a small CLI for it (the reference: `./careem-mcp.sh scenario <tool> <scenario>`,
`./careem-mcp.sh scenario <tool>` to clear one, `./careem-mcp.sh reset`, and
`./careem-mcp.sh scenarios [tool]` to list them), validating scenario names against the files.

## 7. Acceptance tests

Run these against your server (any MCP client or the MCP Inspector). `N` is the number of
files in `tools/` (also listed in [SOURCE.md](SOURCE.md)). Start with an empty overrides file.

1. `initialize` → `serverInfo == {"name": "careem-mcp-service", "version": "v1.0.0"}`, no
   `instructions`, no `title`.
2. `tools/list` returns exactly `N` tools, each equal (as JSON) to its file's definition, including
   `outputSchema` and `_meta`. `resources/list` returns `ui://careem-mcp-app`.
3. `food_get_restaurant_menu {"restaurant_id": 30104, "latitude": 25.0866, "longitude": 55.1474}` → `isError == false`,
   `structuredContent.restaurant.id == 30104`, `restaurant.name.value == "Morning Syrniki Café"`.
4. `food_get_restaurant_menu {"restaurant_id": 30101, "latitude": 25.0866, "longitude": 55.1474}` →
   `restaurant.name.value == "Shawarma Station"` (chosen by `restaurant_id`).
5. `food_get_restaurant_menu {"restaurant_id": 1, "latitude": 25.0866, "longitude": 55.1474}` → `isError == false`,
   `error == "failed to get restaurant menu: unexpected response status 404"` (default scenario:
   the exact text production returns for an unknown restaurant).
6. `food_get_restaurant_menu {"restaurant_id": "x", "latitude": 25.0866, "longitude": 55.1474}` → `isError == true`, text
   starts with `validating "arguments"`; `{}` → `isError == true` (`restaurant_id` is required).
7. `food_merchant_search {"query": "sushi", "latitude": 25.0866, "longitude": 55.1474}` → `restaurants[0].id == 30102`;
   the same with `"query": "NOPE"` → `restaurants == []` (default scenario);
   `{"query": "sushi", "longitude": 55.1474}` (no `latitude`) → `isError == true`.
8. `reverse_geocode {"latitude": 25.0866, "longitude": 55.1474}` →
   `location.locationUuid == "LOC-50001"`; `{"latitude": 91, "longitude": 55}` → has `error`
   (exact-number match).
9. Write `{"food_get_restaurant_menu": "upstream-unavailable"}` to the overrides file, then
   `food_get_restaurant_menu {"restaurant_id": 30104, "latitude": 25.0866, "longitude": 55.1474}` → has `error`; write `{}` →
   test 3 passes again (no restart in between).
10. `tools/call` of `does_not_exist` → JSON-RPC error `-32602`.
11. Every non-`json error` scenario of every tool — rendered directly (as if forced) with sample
    arguments built from the input schema and overlaid with its match block, as described in
    [FORMAT.md](FORMAT.md) "Keeping scenarios honest" — validates against that tool's
    `outputSchema`.
12. No string a client can observe (server info, tool list, resources, any scenario response)
    contains "mock", "sandbox", "sbx", "fake", "dummy" or `example.com`.

## 8. Connecting clients

| Client | Config |
| --- | --- |
| Claude Code | `claude mcp add --transport http careem-mcp http://127.0.0.1:8787/mcp` |
| Claude Desktop | `{"mcpServers":{"careem-mcp":{"command":"<your binary>","args":["--stdio"]}}}` |
| Codex | `[mcp_servers.careem-mcp]` with `command` / `args = ["--stdio"]` in `~/.codex/config.toml` |
| Cursor / VS Code / Windsurf | `{"mcpServers":{"careem-mcp":{"url":"http://127.0.0.1:8787/mcp"}}}` |
| ChatGPT (Developer mode) | public HTTPS tunnel to the server (`cloudflared tunnel --url http://127.0.0.1:8787`), connector URL `https://<tunnel>/mcp`, no auth. If your SDK enforces Host-header checks (DNS-rebinding protection, e.g. the Python SDK on localhost), allow the tunnel's host. |
| MCP Inspector | `npx @modelcontextprotocol/inspector` → Streamable HTTP → `http://127.0.0.1:8787/mcp` |
