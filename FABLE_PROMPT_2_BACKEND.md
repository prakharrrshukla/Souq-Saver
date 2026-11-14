# Fable Prompt 2 of 2: Backend and Architecture

**Repository:** https://github.com/prakharrrshukla/Souq-Saver (branch `main`). Clone it, work in it, and push every phase commit there:

```bash
git clone https://github.com/prakharrrshukla/Souq-Saver.git
```

You are building the **backend and full architecture of Souq Saver** for the Careem Builders '26 hackathon (Dubai, 14 Nov 2026). Code freeze is **18:00 GST**. Demo is 3 minutes plus 2 minutes of jury Q&A.

**Scope of this prompt:** everything except the web UI: Careem MCP sandbox, generated sample data, engine, AI agent on AWS Bedrock, HTTP API. The backend must be **fully developed, tested and usable without any frontend**. The minimalist frontend is built separately from `FABLE_PROMPT_1_FRONTEND.md` and will be reworked later by the team. It talks to this backend **only** through the API contract in section 4, so honour that contract exactly.

Work autonomously through the phases below, commit after each phase, and keep the project runnable at every commit.

**Read first, in this order:** `context/README.md`, `context/02-judging-criteria.md`, `context/03-product-spec.md`, `context/04-careem-mcp-reference.md`, `context/05-architecture-and-build-plan.md`, `context/06-test-data-spec.md`. They are the source of truth for the product. This file is the build order and the rules. If this file and a context file disagree, this file wins.

---

## 0. Non-negotiable rules

1. **Never call checkout.** `cart_checkout` and `cart_grocery_checkout` are blocked in code. Not in the demo, not in tests, not ever.
2. **Mutating tools need approval, enforced in code.** `create_grocery_cart_with_quantities`, `cart_add_item(s)`, `cart_update_item`, `cart_delete_items`, `cart_delete_basket`, `cart_reschedule_basket`, `cart_reorder`, `save_new_address` and any other mutating tool run only with a one-time approval token issued by `POST /api/approve`. A prompt instruction alone is not enough.
3. **Never retry a mutating call.** Read-only calls may retry once.
4. **All money maths is deterministic TypeScript with tests.** The model never calculates totals, drift, cycles or budgets. It only understands requests, picks our tools and explains results.
5. **Sample data is labelled.** Every API response carries `sampleData: true` while fixtures are in use. Never present it as a real user's history.
6. **No secrets in the repo.** AWS credentials come from the local AWS profile only. Commit a `.env.example`, never `.env`. Add `.env`, `node_modules`, `.run/`, `dist/` to `.gitignore` before the first commit.
7. **No AI attribution** in commit messages, PR text or files. No `Co-Authored-By` lines.
8. **Do not use Kiro.** Team decision.
9. **Everything is built today.** Do not import pre-written project code. Careem's sandbox package and public libraries are fine.
10. **Do not publish the demo or video anywhere** (T&C 6.3). Push code only to this repo.
11. **Do not touch `/web`** except to agree the API contract. The frontend belongs to Prompt 1 and the team.
12. **X-ray everything (see section 2a).** Every step the backend takes is recorded with exactly what it was, what came in, what went out, and where it came from. No step may run without an X-ray record. The backend must be **fully functional**, not stubbed, except the clearly marked Bedrock stub while access is pending.

---

## 1. Stack and environment

- **Language:** TypeScript everywhere, Node 25 (installed). npm workspaces: `server`, `web`, `fixtures`, plus the sandbox in `/sandbox`.
- **MCP client:** official `@modelcontextprotocol/sdk`, Streamable HTTP transport.
- **Model:** Claude on **AWS Bedrock** via `@aws-sdk/client-bedrock-runtime`, **Converse API** with tool use.
  - Primary: Claude Sonnet 5.5. Fallback: Claude Haiku 5.5.
  - Find the exact model ID: `aws bedrock list-foundation-models --region $AWS_REGION --by-provider anthropic --query "modelSummaries[].modelId"`. If Sonnet 5.5 needs an inference profile, use it. If neither is enabled, use the closest available Claude model and say so in the README.
- **Server:** Fastify (or Express) on `http://localhost:8080`, Server-Sent Events for streaming.
- **Tests:** Vitest (unit for engine, integration for API).
- **Localhost only.** Everything runs on one laptop. CORS allows `http://localhost:5173` (the frontend dev server).

`.env.example`:
```
AWS_PROFILE=            # set by the user locally, never committed with a value
AWS_REGION=             # e.g. us-east-1
BEDROCK_MODEL_ID=       # filled after listing models
BEDROCK_FALLBACK_MODEL_ID=
CAREEM_MCP_URL=http://127.0.0.1:8787/mcp
DEMO_MODE=true          # blocks checkout, sets sampleData flag
PORT=8080
WEB_ORIGIN=http://localhost:5173
```

**Inputs from the user (ask only if missing):** AWS region, AWS profile name. Never ask for keys in chat. If Bedrock is not ready, build everything else first behind a clearly marked stub model adapter, then switch when access arrives.

---

## 2. Repository layout

```
/context                  planning pack (do not rewrite; append decisions to 08)
/sandbox                  Careem MCP sandbox, built from Careem's package
/fixtures
   generate.ts            seeded generator
   household.config.ts    the demo story (items, prices, cycles)
   out/                   generated files in Careem's exact format
/server
   src/mcp/               client wrapper, mutating-tool list, trace events
   src/engine/            analysis.ts, planner.ts, stores.ts (+ *.test.ts)
   src/agent/             bedrock.ts, systemPrompt.ts, tools.ts
   src/api/               routes, SSE, approval tokens, contract types
   src/contract.ts        API types shared with /web (exported, no runtime deps)
   scripts/demo-cli.ts    runs the full demo flow in the terminal
/web                      frontend (Prompt 1, not this prompt)
/demo                     DEMO.md (script with real numbers)
README.md                 how to run, architecture, honest limits
.env.example
```

Root `package.json` scripts: `dev` (sandbox + server + web together), `dev:backend` (sandbox + server only), `test`, `generate:data`, `demo:cli`.

---

## 2a. X-ray (step-by-step transparency)

**Goal:** for every request, anyone can see each step the backend took, in order: **what the step was, what came in, what went out, and the source**. It is our proof of real Careem MCP and Bedrock integration for the judges, and our debugging tool today.

### What gets an X-ray record (every one of these, no exceptions)
| Kind | Examples | Source value |
|---|---|---|
| `api` | `POST /api/chat` received, response finished | `api:/api/chat` |
| `model` | Each Bedrock Converse call: messages sent, tool calls chosen, text returned, tokens, latency | `aws-bedrock:<modelId>` |
| `agent-tool` | Each of our 5 high-level tools the model calls (`plan_basket` …) | `agent:tools.ts#plan_basket` |
| `mcp` | Each Careem MCP call: tool name, full arguments, full raw response | `careem-mcp:sandbox@127.0.0.1:8787` (or production URL) |
| `engine` | Each engine function: `normaliseOrders`, `categorySpend`, `priceDrift`, `cycles`, `assignTiers`, `fitBudget`, `compareStores`, `monthlySaving` | `engine:analysis.ts#priceDrift` (file#function) |
| `data` | Where data came from: generated fixtures vs Careem's original sandbox data | `fixtures:seed=<seed>` or `careem-sandbox:FIXTURES.md` |
| `approval` | Token issued, token checked (valid / invalid / reused), mutating call allowed or blocked | `api:approval-gate` |
| `guard` | Blocked tool attempts (checkout), retries, fallbacks | `mcp:guard` |

### XrayStep schema (in `server/src/contract.ts`)
```ts
type XrayStep = {
  runId: string;          // one per /api/chat or /api/approve request
  stepId: string;
  parentId?: string;      // nesting: model call → agent tool → mcp/engine steps
  seq: number;            // order within the run
  kind: 'api'|'model'|'agent-tool'|'mcp'|'engine'|'data'|'approval'|'guard';
  name: string;           // e.g. "get_activities", "priceDrift", "Bedrock Converse"
  source: string;         // see table above
  dataOrigin: 'sample'|'live'|'computed';
  status: 'running'|'ok'|'error'|'blocked';
  startedAt: string;      // ISO
  endedAt?: string;
  ms?: number;
  input: unknown;         // full input (arguments, request, function params)
  output?: unknown;       // full output (raw MCP response, function result, model reply)
  summary: string;        // one human line: "10 orders, AED 1,842 total"
  error?: string;
  meta?: { tokensIn?: number; tokensOut?: number; retries?: number; sizeBytes?: number };
};
```

### Rules
- Capture **full** inputs and outputs. If a payload is over 200 KB, store it in full on disk and put a truncated copy plus `sizeBytes` in the event.
- **Redact secrets** (auth headers, tokens, AWS credentials) before recording. Approval tokens are shown as `tok_…last4`.
- Implemented once, as a wrapper (`xray.step(kind, name, source, input, fn)`), used by the MCP client, engine entry points, agent tools, Bedrock adapter and approval gate. No hand-written logging scattered around.
- Every run is also written to `.run/xray/<runId>.jsonl` (git-ignored) so it can be replayed after the demo.
- The existing `trace` event (section 4) is the short view of the same steps; `xray` is the full view.

### X-ray in the API (added to section 4)
- `POST /api/chat` and `POST /api/approve` also stream `xray` events: `{ "step": XrayStep }`, sent at step start (`running`) and step end (`ok|error|blocked`).
- `GET /api/xray/:runId` returns all steps of a run, ordered, as a tree.
- `GET /api/xray` lists recent runs `{ runId, startedAt, request, steps, ms, status }`.
- Every SSE stream starts with `{ "event": "run", "data": { "runId": "..." } }`.

### X-ray in the terminal
- `npm run demo:cli -- --xray` prints each step as it happens: `#seq kind name ← source (ms)` then indented `IN:` and `OUT:` JSON (pretty, truncated at 40 lines with a pointer to the `.jsonl` file).
- `npm run xray -- <runId>` pretty-prints a saved run.

### Tests
- A `/api/chat` run produces X-ray steps for: the API request, at least one Bedrock call, `get_activities`, `search_groceries_items`, `global_search`, `priceDrift`, `fitBudget`, `compareStores`, in a valid parent/child tree with increasing `seq`.
- No step has a missing `source`, `input`, or end status.
- A blocked checkout attempt produces a `guard` step with `status: "blocked"`.
- No secret strings appear in any X-ray output.

---

## 3. Build phases (with deadlines)

### Phase 1: Sandbox and plumbing (target 10:45)
1. Download https://builders.careem.com/sandbox/careem-mcp-sandbox.zip into `/sandbox`, unzip, read `careem-mcp-sandbox/README.md`, and build the sandbox **in TypeScript** exactly as its `spec/BUILD.md` says. Run its acceptance tests. Start it on `http://127.0.0.1:8787/mcp`.
2. `server/src/xray.ts` first (section 2a): the step wrapper, run context, SSE emitter, `.jsonl` writer, secret redaction. Every later piece uses it.
3. `server/src/mcp/client.ts`: connect, `listTools()`, log the count, `call(tool, args)` wrapper that adds Home coordinates (25.0866, 55.1474) when missing, emits a trace event (see section 4), retries read-only calls once, never retries mutating calls, and throws on blocked tools.
4. Bedrock hello-world through the adapter.
5. **Done when:** a script prints the tool list, calls `user_info` and `get_activities`, and gets a Bedrock reply, and every one of those calls appears as an X-ray step with full input, output and source.

### Phase 2: Generated sample data (target 11:30)
Laith (Careem, MCP trainer) confirmed: **take the sandbox's fake data and generate random data inspired by it, in the same file pattern.**

**You create your own fake data.** Careem's sandbox data is the *template*, not the data:
- **Copy from Careem:** the file pattern only: field names, nesting, types, id formats, currency, how scenario files are laid out.
- **Invent yourself:** the household's order history, products, brands, sizes, prices, dates, quantities, promos and any extra merchants. Make it realistic for a Dubai family (AED prices, products sold in UAE supermarkets) and varied, not a copy of Careem's 8 products and 2 orders.
- Keep Careem's existing ids where the sandbox depends on them (user, Home LOC-50001 and its coordinates, merchants 40001, 40101, 40201). New items and orders get new ids in the same style.
- The story below is the minimum the data must contain; add natural noise around it (occasional extra items, small price wobbles, a skipped week) so it looks real.

1. Read `spec/FORMAT.md`, `spec/FIXTURES.md`, and the tool files for `get_activities` (`spec/tools/user/`), `search_groceries_items`, `groceries_get_items_details`, `create_grocery_cart_with_quantities`, `global_search` (`spec/tools/groceries/`), and `cart_get_basket_price` (`spec/tools/cart/`).
2. Write `fixtures/generate.ts`, **seeded** (same output every run), producing responses in exactly those shapes: same field names, nesting, id styles, AED currency, merchant ids 40001 (Quik Dubai Marina), 40101 (Marina Fresh Market), 40201 (JLT Organic Pantry).
3. Bake in the story from `context/06-test-data-spec.md`: 10 weekly orders; rice drifts ~+10% and has a cheaper store-brand swap; dish soap every 4 weeks, bought last week; cola and chocolate frequent; chips 8 of 10 weeks; JLT lacks atta and water; last week's total ≈ AED 186.
4. Serve the generated data **through the sandbox** (preferred, so every number on screen is a real MCP response), by writing scenario/tool files the sandbox reads, following `spec/FORMAT.md`. If that is impossible in time, load fixtures in the server's data layer instead, keep identical shapes, and record the choice in `context/08`.
5. The sandbox is stateless: cart creation returns a fixed basket. The API returns our planned basket and labels the sandbox cart response as sample.
6. **Done when:** `get_activities` through MCP returns 10 orders with the story patterns.

### Phase 3: Engine (target 13:30) — use your strongest reasoning here
All pure functions in `server/src/engine/`, typed, tested.

**analysis.ts**
- Normalise order lines: `{orderId, date, merchantId, merchantName, itemId, name, category, qty, unitPrice, lineTotal}`. Use `groceries_get_items_details` (batches of 20) for category when missing.
- `categorySpend`: per ISO week and 4-week average.
- `priceDrift`: per item `(latest - first) / first`; flag > 5%.
- `cycles`: median days between orders (min 2 orders); `nextDue = last + median`; `dueThisWeek = nextDue <= today + 7`.
- `lastWeek`: most recent order total.

**planner.ts**
- Tiers: T1 water; T2 rice, atta, oil, dal, sugar, salt; T3 milk, eggs, bread, onions, tomatoes, vegetables; T4 household; T5 snacks, soft drinks, chocolate. Promote items in ≥ 75% of orders by one tier. User overrides pin a tier.
- Budget: absolute (AED) or relative (`cutPercent` of last week).
- Candidates = due this week + user additions; not-due items are **deferred** with next-due date.
- Fit loop: while over budget: remove T5 (highest price first); defer T4 not due; reduce T3 qty by 1 then remove; T1/T2 never removed, only swapped to a cheaper equivalent (same category, size within ±25%). If still over, return an honest shortfall.
- Every item carries a reason: `kept | swapped | reduced | deferred | cut`, plus a short human note.
- Monthly saving = (4-week avg weekly spend − planned weekly) × 4.33, labelled estimate.

**stores.ts**
- Quik: `search_groceries_items` without `merchant_id` (response carries merchant id).
- Shops: `global_search`, then `search_groceries_items` with each `merchant_id`.
- Per store: cheapest acceptable variant per item, `estTotal = items + delivery + service`, list missing items. Any missing T1/T2 disqualifies the store. Pick lowest valid total. One store per order.

**Tests (must pass, from `context/06`):** rice drift ≈ +10% and swapped; dish soap deferred; cola and chocolate cut; water, rice, atta, oil, milk, eggs always kept; Marina Fresh Market chosen and JLT shown missing atta and water; estimated total ≤ budget; monthly saving > 0.

### Phase 4: Agent and API (target 14:30)
1. Expose **five high-level tools** to the model (not the 50 raw MCP tools): `analyse_history`, `plan_basket({budgetAed?|cutPercent?, additions?, overrides?})`, `compare_stores`, `explain_change({item})`, `request_approval`.
2. System prompt: Careem's agent playbook (https://builders.careem.com/docs/agent-playbook.md) plus our rules: reply in the user's language (Arabic, English, Hindi, Urdu, Tagalog), explain changes by tier, never claim to check out, say "nothing has been charged", be honest that data is sample. Keep replies short (demo-friendly).
3. Conversation state per `sessionId` in memory (last plan, overrides, language).
4. Implement the API exactly as section 4.
5. `scripts/demo-cli.ts`: runs "Same as last week, cut 15%", prints trace, plan and store comparison, then approves and prints the exact price. This proves the backend works with no UI.
6. **Done when:** `npm run demo:cli` completes end to end, and the integration tests for every endpoint pass.

### Phase 5: Languages and robustness (target 15:30)
- The main request works in all five languages (integration test per language checks a plan is returned and the reply is in that language's script).
- Calm, structured errors: sandbox triggers (`trigger_upstream_down`, merchant 99999) return an `error` SSE event with a user-friendly message, never a crash.
- Bedrock fallback model switch on throttling or timeout.

### Phase 6: README and demo numbers (target 16:30)
- `README.md`: what it is, architecture diagram (text), how to run (`npm run dev`, `npm run dev:backend`, `npm run demo:cli`), API summary, honest limits (sample data, no voice, no checkout, stateless sandbox cart), judging-criteria mapping.
- `demo/DEMO.md`: script from `context/07-demo-and-pitch.md` filled with the real numbers from our data (last week total, budget, chosen store, estimated and exact totals, monthly saving).

### Phase 7: Hardening (16:30 to 17:15)
- All tests green. Fresh clone → README steps → working, with no manual fixes.
- Test asserts the MCP wrapper throws on `cart_checkout` and `cart_grocery_checkout`.
- Test asserts mutating calls fail without a valid approval token and that tokens are single-use.

### Phase 8: Freeze (by 17:45)
- Final commit and push. Report the exact run commands and the demo numbers to the team. Keep the backend stable from 17:15 (backup video recording).

---

## 4. API contract (shared with the frontend)

Base URL: `http://localhost:8080/api`. All JSON. Types live in `server/src/contract.ts` and are imported by `/web`. **Do not change these shapes without updating both prompts.**

### `GET /api/config`
```json
{ "modelId": "string", "modelProvider": "AWS Bedrock", "mcpMode": "sandbox", "sampleData": true,
  "languages": ["en","ar","hi","ur","tl"], "currency": "AED" }
```

### `GET /api/health`
`{ "ok": true, "mcp": true, "bedrock": true }`

### `POST /api/chat` → Server-Sent Events
Request: `{ "sessionId": "string", "message": "string", "language"?: "en|ar|hi|ur|tl", "budgetAed"?: number }`

Events, in any order, ending with `done`:
| event | data |
|---|---|
| `trace` | `{ "id": "string", "tool": "get_activities", "status": "running|ok|error", "summary": "10 orders", "ms": 120 }` (real Careem tool names, or `engine:priority_fill`, `engine:store_picker` for our steps) |
| `message` | `{ "role": "assistant", "text": "string", "language": "ar", "rtl": true }` (may stream as several chunks with the same `id`) |
| `plan` | `Plan` object (below) |
| `error` | `{ "message": "user-friendly text", "retryable": true }` |
| `run` | `{ "runId": "string" }` (first event of every stream) |
| `xray` | `{ "step": XrayStep }` (section 2a; at start and end of every step) |
| `done` | `{ "runId": "string" }` |

### `GET /api/xray/:runId` and `GET /api/xray`
Full X-ray of one run (ordered steps as a tree) and the list of recent runs. See section 2a.

### `Plan`
```json
{
  "planId": "string",
  "sampleData": true,
  "lastWeekTotal": 186.15,
  "budget": { "aed": 158.23, "source": "cut_percent", "cutPercent": 15 },
  "stores": [
    { "merchantId": "40101", "name": "Marina Fresh Market", "type": "shops",
      "itemsTotal": 141.70, "deliveryFee": 7, "serviceFee": 0, "estTotal": 148.70,
      "missing": [], "valid": true, "chosen": true }
  ],
  "items": [
    { "itemId": "string", "name": "Basmati rice 5kg (store brand)", "qty": 1, "unitPrice": 34.00,
      "lineTotal": 34.00, "tier": "T2", "reason": "swapped", "note": "Rice up 10% since August; store brand saves AED 5.50",
      "replaces": "Basmati rice 5kg (brand A)", "nextDue": null }
  ],
  "estTotal": 148.70,
  "withinBudget": true,
  "shortfall": 0,
  "monthlySavingEstimate": 192,
  "insights": { "categorySpend": [ { "category": "Staples", "weeklyAvg": 52.3 } ],
                "priceDrift": [ { "name": "Basmati rice 5kg", "driftPct": 10.5 } ] },
  "approvalToken": "one-time string"
}
```
(Numbers are illustrative; real values come from the generated data.)

### `POST /api/approve`
Request: `{ "sessionId": "string", "planId": "string", "approvalToken": "string" }`
Response, streamed as SSE with the same `trace` / `error` / `done` events plus:
| event | data |
|---|---|
| `cart` | `{ "merchantId": "40101", "storeName": "Marina Fresh Market", "basketId": "string", "subtotal": 141.70, "deliveryFee": 7, "serviceFee": 0, "promo": { "code": "FREEDEL", "saving": 7 }, "total": 141.70, "charged": false, "sampleData": true }` |

Rules: invalid, reused or expired token → `error` event, nothing mutating runs. Calls `create_grocery_cart_with_quantities` then `cart_get_basket_price`. Never checkout. `charged` is always `false`.

### `POST /api/reset`
`{ "sessionId": "string" }` clears the session (for demo restarts).

---

## 5. Cut order if late (cut from the top first)
1. `explain_change` tool
2. Tagalog and Hindi tests (keep Arabic and English)
3. Fallback model switching
4. `insights` block in the plan (send empty arrays)

**Never cut:** the approval lock, checkout block, store comparison, priority filling, trace events, X-ray, `sampleData` flag, the API contract.

---

## 6. Definition of done
- [ ] `npm run dev:backend` starts sandbox and server; `GET /api/health` is all true.
- [ ] `npm run demo:cli` shows trace, plan, store comparison, then approved cart with exact price.
- [ ] Every endpoint in section 4 works and has an integration test.
- [ ] X-ray: every step of a run (API, Bedrock, agent tools, every Careem MCP call, every engine function, approval, guards) shows what it was, full input, full output and source, live over SSE, via `GET /api/xray/:runId`, in `.run/xray/*.jsonl`, and with `npm run demo:cli -- --xray`.
- [ ] All engine tests pass.
- [ ] Checkout is impossible; mutating calls need a single-use token.
- [ ] Arabic request returns an Arabic reply with `rtl: true`.
- [ ] Model runs on AWS Bedrock and `GET /api/config` reports its ID.
- [ ] README explains how to run and the honest limits; `demo/DEMO.md` has real numbers.
- [ ] Pushed to `main` with no secrets and no AI attribution.
