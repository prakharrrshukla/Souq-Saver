# Souq Saver v2

> **Version 2.** Same frontend as v1; the backend now runs an AI household engine on AWS Bedrock with a
> calculator that checks every number, and three demo households. What changed: [SAP_V2.md](SAP_V2.md). Flowchart in time order: [FLOWCHART.md](FLOWCHART.md). Everything from A to Z: [context.md](context.md).

A budget-aware household grocery agent on the Careem MCP, built at Careem Builders '26 (14 Nov 2026, Dubai).

You say "Same as last week, but cut 15%". Souq Saver reads the household's Careem order history, learns
price drift and reorder cycles, fills this week's basket by necessity (water and staples first, treats
last), picks the cheapest store for the whole basket, and waits for your approval. Nothing is ever charged.

**New here? Read [PROJECT_EXPLAINED.md](PROJECT_EXPLAINED.md): the whole project from A to Z.**

> **Sample data.** The demo runs on an invented household in Careem's exact response format, served
> through the local Careem MCP sandbox. Every API response says `sampleData: true` and the UI shows a banner.

## Run it

Needs Node 23.6 or newer (built on Node 26). Everything runs on localhost.

```bash
npm install
npm run dev            # sandbox :8787 + backend :8080 + web :5173  ->  open http://localhost:5173
npm run dev:backend    # sandbox + backend only
npm run demo:cli       # the whole demo in the terminal, no UI (starts what it needs)
npm run demo:cli -- --xray     # same, printing every step with full input and output
npm run xray -- <runId>        # pretty-print a saved run (no id: the latest)
npm test               # regenerates the data, then 68 tests
npm run generate:data  # rewrite fixtures/out from fixtures/household.config.ts (seeded)
```

### Connecting the model (AWS Bedrock)

The agent's model is Claude on AWS Bedrock (Converse API with tool use). Credentials come from your
local AWS profile only; nothing secret is in this repo.

```bash
cp .env.example .env
aws login --profile <your-profile>          # or: aws sso login
aws bedrock list-foundation-models --region $AWS_REGION --by-provider anthropic --query "modelSummaries[].modelId"
aws bedrock list-inference-profiles --region $AWS_REGION --query "inferenceProfileSummaries[].inferenceProfileId"
# put the Claude Sonnet id (or its inference profile) in BEDROCK_MODEL_ID and Haiku in BEDROCK_FALLBACK_MODEL_ID
```

`GET /api/config` reports the model id in use, and the UI footer shows it.

**If Bedrock is not reachable** (no credentials, no model id), the backend starts with a clearly marked
**stub model**: a small rule-based stand-in (`server/src/agent/stub.ts`) that recognises the demo requests
in the five languages. It is not AI. Config then reports `stub-rule-based (Bedrock not connected)` and
`GET /api/health` reports `bedrock: false`. The backend retries Bedrock every 30 seconds and switches by
itself. All numbers come from the engine either way. Tests always use the stub so they never need a network.

## Architecture

```
 Browser  http://localhost:5173   (web/: React, plain CSS)
    |  POST /api/chat, /api/approve  (Server-Sent Events)      GET /api/config, /health, /xray
    v
 Backend  http://localhost:8080   (server/: Fastify, TypeScript)
    |-- agent/agent.ts      chat loop ----------------------> AWS Bedrock (Claude, Converse + tool use)
    |      | the model can call five tools only                 (or the marked stub while access is pending)
    |      v
    |-- agent/tools.ts      analyse_history, plan_basket, compare_stores, explain_change, request_approval
    |      |-- engine/analysis.ts   spend by category, price drift, reorder cycles      (pure, tested)
    |      |-- engine/planner.ts    tiers, budget, priority filling, monthly saving     (pure, tested)
    |      |-- engine/stores.ts     Quik vs Shops comparison, cheaper swaps             (pure, tested)
    |      '-- engine/cart.ts       exact price of the approved cart                    (pure, tested)
    |-- mcp/approval.ts     one-time approval tokens -> grants for mutating tools
    |-- mcp/client.ts       the only door to Careem: coordinates, checkout block, approval check, retry rules
    |      v
    |   Careem MCP (Streamable HTTP)   http://127.0.0.1:8787/mcp   (sandbox/careem-mcp-ts, built from Careem's spec)
    |      '-- fixtures/out/tools      generated household scenarios, read by the sandbox
    '-- xray.ts             every step recorded: streamed, kept in memory, written to .run/xray/<runId>.jsonl
```

One sentence: a web chat app calls Claude on AWS Bedrock; the model uses our planning tools, which call
the Careem MCP for history, catalogues and baskets; all the money maths is tested code; and anything that
touches a cart needs the user's approval.

### What a request does

`"Same as last week, but cut 15%"` produces these real Careem MCP calls, visible live in the UI:

`user_info` → `get_activities` (past groceries, past shops) → `groceries_get_items_details` (batches of 20)
→ engine analysis → `search_groceries_items` (Quik) → `global_search` → `search_groceries_items` per Shops
merchant → `cart_get_basket_price` per store (fees) → engine: tiers, candidates, store picker, priority
fill, monthly saving → plan with a one-time approval token.

Approve: token checked and burned → `create_grocery_cart_with_quantities` → `cart_get_basket_price` →
exact total. `cart_checkout` and `cart_grocery_checkout` are never called.

### Planner rules

| Tier | Examples | When over budget |
|---|---|---|
| T1 Water | drinking water | never cut |
| T2 Staples | rice, atta, oil, dal, sugar, salt | never cut; may swap to a cheaper equivalent |
| T3 Fresh essentials | milk, eggs, bread, vegetables | reduce quantity, then remove |
| T4 Household | dish soap, detergent, tissue | deferred when the cycle says not due |
| T5 Treats | snacks, soft drinks, chocolate | cut first |

- An item in at least 75% of orders moves up one tier (T4 to T3, T3 to T2). Treats are never promoted
  automatically; "keep the chips" pins them.
- Fit order: cut T5 (most expensive first) → cheaper swaps (same category, size within 25%, biggest saving
  first) → reduce T3 → remove T4, then T3. If it still does not fit, the shortfall is shown.
- Store choice: whole basket at each store, items + delivery + service fee. A store missing a T1 or T2
  item is not valid. One store per order.
- Monthly saving = (average of the last 4 weekly orders − planned week) × 4.33. It is an estimate and
  is labelled as one (the planned week leaves out items that are not due yet).

### Safety, enforced in code

- **Checkout is blocked** in `mcp/client.ts` for every caller, with or without approval.
- **Mutating tools need a grant.** A grant only exists after `POST /api/approve` consumed a valid token:
  one use, 15 minutes, bound to the session and plan. Any tool the server does not mark read-only is
  treated as mutating. Typing "approve" in chat cannot change a cart.
- **Mutating calls are never retried.** Read-only calls retry once.
- **Secrets are redacted** from X-ray; approval tokens show as `tok_…last4`, session ids as `…last4`.
- **Only valid plans can be approved.** A token is issued only when the plan passes `planVerdict`
  (`mcp/approval.ts`): one store, whole-number quantities within the limits, line totals and the total
  that add up, and a total within the budget. An over-budget plan shows the shortfall and Approve stays
  off until the budget changes. The token is bound to a fingerprint of the exact plan, and the plan is
  re-checked on approval.

### One calculator for every planning path

The AI's basket and the rule-based fallback both go through `checkPlan` (`brain/check.ts`). It decides
from catalogue data, never from the planner's own claim, whether a product satisfies a need: the same
product, or the same category with a compatible pack size (water cannot become chips, rice cannot become
atta). It also rejects a swap of a brand-loyal product, a swap into a product the household stopped
buying or the user left out, a "kept" label on a different product, two needs on one product, and
quantities or totals over the limits. Every need ends as kept, swapped, reduced, cut or unavailable;
items not due are deferred.

If the AI's basket still fails after 3 attempts, the rule planner (`brain/fallback.ts`) builds one from
the same needs, so the household profile, loyalty, switches and the user's instructions carry over. The
plan's `engine` field, the chat reply and the basket card say so. Without Bedrock, the household is read
by plain rules from the order history (`brain/history.ts`), which also validate the AI's reading.

### Limits

Enforced at the API, the tools, the planner, the calculator and approval (`server/src/limits.ts`).
Requests outside them are refused with a message, never clamped.

| Limit | Default | Variable |
|---|---|---|
| Units of one product per line | 20 | `SOUQ_MAX_QTY_PER_LINE` |
| Products per basket (and additions per request) | 40 | `SOUQ_MAX_DISTINCT_ITEMS` |
| Basket total, fees included | AED 2,000 | `SOUQ_MAX_BASKET_AED` |
| Weekly budget | AED 1 to 5,000 | `SOUQ_MIN_BUDGET_AED`, `SOUQ_MAX_BUDGET_AED` |
| "Cut N%" | 1% to 90% | `SOUQ_MIN_CUT_PERCENT`, `SOUQ_MAX_CUT_PERCENT` |
| Message length | 4,000 characters | `SOUQ_MAX_MESSAGE_CHARS` |
| Model turns per request | 8 | `SOUQ_MAX_TOOL_TURNS` |
| Invalid tool calls the model may correct per request | 3 | `SOUQ_MAX_INVALID_TOOL_CALLS` |
| Time per chat request | 240 s | `SOUQ_TURN_TIMEOUT_MS` |

Explicit values in the user's words ("cut 150%", "budget -50 AED", "500 bags") are checked before
planning; the previous budget is kept. The model may only pass a budget the user actually gave.

### The chat loop

Every tool call is validated against a runtime schema (`server/src/validate.ts`) before it runs; a bad
call gets a structured error back so the model can fix it. The conversation stored for the next turn is
always valid for Bedrock (user and assistant alternate, every tool use has its result): a turn that
times out, hits the turn limit or fails keeps only the user's message and the reply they saw. Facts in
the reply (budget, store, totals, savings, item changes, approval) are rendered from the validated plan
in the user's language; model prose that cites amounts the plan does not contain is replaced.

## API (base `http://localhost:8080/api`)

Types: [server/src/contract.ts](server/src/contract.ts), shared with the frontend.

| Endpoint | Returns |
|---|---|
| `GET /config` | `{ modelId, modelProvider, mcpMode, sampleData, languages, currency }` |
| `GET /health` | `{ ok, mcp, bedrock }` |
| `POST /chat` `{ sessionId, message, language?, budgetAed? }` | SSE: `run`, `trace`, `xray`, `message`, `plan`, `error`, `done` |
| `POST /approve` `{ sessionId, planId, approvalToken }` | SSE: `run`, `trace`, `xray`, `cart`, `error`, `done` |
| `POST /reset` `{ sessionId }` | `{ ok, sampleData }` |
| `GET /xray` | `{ runs: [{ runId, startedAt, request, steps, ms, status }], sampleData }` |
| `GET /xray/:runId` | the run with `ordered` steps and a `tree` |

```bash
curl -N -X POST localhost:8080/api/chat -H 'content-type: application/json' \
  -d '{"sessionId":"demo","message":"Same as last week, but cut 15%"}'
```

Errors: every 4xx/5xx body is `{ error, code, kind, field?, sampleData }` (`ApiErrorBody`), and SSE
`error` events carry `code` and `kind` too. `kind` is one of `validation`, `model`, `careem`, `timeout`,
`approval`, `busy`, `internal`; the web app only says "backend not reachable" when the request itself
could not be sent. Examples: `message_too_long` (field `message`), `budget_out_of_range` (field
`budgetAed`), `cut_out_of_range`, `quantity_out_of_range`, `tool_loop_exhausted`, `timeout`,
`approval_invalid`.

## X-ray

Every step the backend takes is recorded once, by one wrapper (`xray.step`): what it was, full input,
full output, and the source.

| Kind | Source looks like |
|---|---|
| `api` | `api:/api/chat` |
| `model` | `aws-bedrock:<modelId>` (or `stub:…`) |
| `agent-tool` | `agent:tools.ts#plan_basket` |
| `mcp` | `careem-mcp:sandbox@127.0.0.1:8787` |
| `engine` | `engine:analysis.ts#priceDrift` |
| `data` | `fixtures:seed=20261114` |
| `approval` | `api:approval-gate` |
| `guard` | `mcp:guard` (blocked checkout, missing approval, read-only retry, model fallback) |

See it live in the UI (X-ray button), over SSE, at `GET /api/xray/:runId`, in `.run/xray/*.jsonl`, or
with `npm run demo:cli -- --xray`.

## Sample data

`fixtures/household.config.ts` is the story; `fixtures/generate.ts` (seed 20261114) writes scenario
files in Careem's tool-file format to `fixtures/out/tools`. The sandbox reads that folder as an overlay
in front of Careem's own scenarios, so every number on screen is a real MCP response. Careem's files
in `sandbox/careem-mcp-sandbox` are untouched, and the generated scenarios pass Careem's own
acceptance checks (output schema, no hint of being a local copy).

The household: 10 weekly Quik orders; rice up 10.5% (38.00 to 42.00); dish soap every 4 weeks and
bought last week; treats creeping in over the last month; last week AED 186.15.


## Demo users (three households)

All invented, all in Careem's response format, all served by the local Careem MCP sandbox.

| Switch with | Household | What the AI engine has to work out from the orders |
|---|---|---|
| `npm run persona -- leonardo` | Leonardo DiCappuccino, Dubai Marina (Careem's sandbox user) | Brand-loyal rice and oil, cow milk to oat milk, monthly Marina top-ups, holiday week |
| `npm run persona -- family` | The Khan family (6), Al Barsha | New baby (diapers, more milk and eggs), monthly bulk staples at Marina, guest week |
| `npm run persona -- single` | Joy Dela Cruz, JLT | Switched from noodles, cola and chips to healthy food, coffee beans from JLT Organic Pantry, away one week |

**In the app:** click **Household: Leonardo | Khan family | Joy** in the header (sandbox only). It switches the household and starts a fresh chat. From a terminal, `npm run persona -- <name>` does the same (then press Reset). `npm test` always regenerates Leonardo.

## AI engine (V2)

`server/src/brain/`: the model (Bedrock, `BEDROCK_MODEL_ID`) learns the household and builds the basket;
`check.ts` (the calculator) adds up every plan and sends problems back for the AI to fix. Chosen model:
`openai.gpt-oss-120b-1:0` (backup `mistral.ministral-3-8b-instruct`), picked with
`server/scripts/eval-models.ts` as the lightest model that read all three households correctly.

## Repository

```
../context/              planning pack (one level up, with the build prompts)
PROJECT_EXPLAINED.md     everything explained from A to Z
sandbox/careem-mcp-sandbox   Careem's no-code package (spec only, unchanged)
sandbox/careem-mcp-ts    the sandbox server built from that spec, with its 12 acceptance tests
fixtures/                seeded generator, story config, generated scenario files
server/                  backend: mcp/, engine/, agent/, api/, xray.ts, contract.ts, scripts/, test/
web/                     frontend (see web/README.md)
demo/DEMO.md             demo script with the real numbers
```

Sandbox CLI: `npm run sandbox -- scenarios get_activities`, `npm run sandbox -- scenario <tool> <name>`,
`npm run sandbox -- reset` (forces outcomes through `.run/overrides.json`, no restart).

## Honest limits

- **Sample data.** Not a real user's history. Production needs only the MCP URL and OAuth (PKCE); not built.
- **The sandbox cart keeps no state.** `create_grocery_cart_with_quantities` always answers with a fixed
  basket. So after approval the subtotal is our planned basket, and the fees and promo come from
  `cart_get_basket_price`. The UI and X-ray say so.
- **The sandbox search is static.** It returns each store's whole range whatever the search terms; the
  engine picks what it needs by category.
- **Fees before approval** are read with `cart_get_basket_price` per store. In production that prices
  an existing basket, so a fee estimate there would need a different source.
- **No checkout, ever.** The demo ends at an approved, priced cart.
- **No voice.** Text in English, Arabic, Hindi, Urdu and Tagalog.
- **The stub model is not AI.** It covers the demo requests only. With Bedrock connected the model
  writes the replies; the numbers are the same.
- **Bedrock was not verified on the build machine** (the AWS session had expired): the adapter is
  written against the Converse API but its first live call still has to be watched.
- **Not built:** onboarding for new users, splitting an order across stores, choosing a promo code,
  sessions that survive a restart (they are in memory).
- **Kiro was not used** (team decision).

## Judging criteria

| Criterion | Where to look |
|---|---|
| Innovation (25) | Priority filling by tier, cycles that defer instead of cut, whole-basket store choice: `server/src/engine/` |
| Technical execution (30) | Real MCP client and tool calls, Bedrock tool use, approval gate in code, X-ray of every step, 68 tests |
| Impact (25) | Monthly saving estimate from the household's own history; five languages |
| UX (10) | One screen, live tool steps, right-to-left replies, "Nothing has been charged" |
| Pitch (10) | `demo/DEMO.md` |
