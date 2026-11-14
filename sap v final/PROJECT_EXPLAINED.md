# Souq Saver: the whole project, explained from A to Z

> This file was written for v1 and still describes everything v2 keeps. For what v2 changed (the AI
> household engine, the calculator, the model and the three households), read [SAP_V2.md](SAP_V2.md) first.

This file explains everything in this folder: what the project is, what was built and in what
order, how every part works, how to run it, what the numbers are, and what is still open.
It is written so that someone who has never seen the code can follow it from top to bottom.

For a shorter version, read [README.md](README.md). For the stage script, read [demo/DEMO.md](demo/DEMO.md).

---

## Contents

1. [What Souq Saver is](#1-what-souq-saver-is)
2. [Status at a glance](#2-status-at-a-glance)
3. [How to run it](#3-how-to-run-it)
4. [What happens when you send a message](#4-what-happens-when-you-send-a-message)
5. [What was built, step by step](#5-what-was-built-step-by-step)
6. [Folder and file guide](#6-folder-and-file-guide)
7. [The sample data](#7-the-sample-data)
8. [The engine: all the maths](#8-the-engine-all-the-maths)
9. [The agent: model and tools](#9-the-agent-model-and-tools)
10. [Safety rules, enforced in code](#10-safety-rules-enforced-in-code)
11. [X-ray: seeing every step](#11-x-ray-seeing-every-step)
12. [The API](#12-the-api)
13. [The frontend](#13-the-frontend)
14. [Tests](#14-tests)
15. [The demo numbers](#15-the-demo-numbers)
16. [Decisions that differ from the written plan](#16-decisions-that-differ-from-the-written-plan)
17. [Honest limits](#17-honest-limits)
18. [What to do next](#18-what-to-do-next)
19. [Glossary](#19-glossary)

---

## 1. What Souq Saver is

Souq Saver is a grocery assistant for a household with a budget. It is built on the **Careem MCP**
(the set of tools Careem gives to AI agents) for the Careem Builders '26 hackathon in Dubai on
14 November 2026.

You type one sentence, for example:

> Same as last week, but cut 15%

Souq Saver then:

1. Reads the household's past Careem grocery orders.
2. Works out what each item costs now compared with before (**price drift**) and how often each
   item is bought (**reorder cycle**).
3. Builds this week's basket to fit the budget. Water and staples go in first. Treats are cut first.
   Things that are not due yet (like dish soap bought last week) wait.
4. Compares Careem Quik with Careem Shops supermarkets and picks the cheapest store for the whole basket.
5. Shows the basket and waits. Only when you press **Approve** does it build the cart and show the
   exact price. It never checks out, so nothing is ever charged.

It understands and answers in English, Arabic, Hindi, Urdu and Tagalog.

The planning documents that this build follows are one level up: `../FABLE_BUILD_PROMPT.md`,
`../FABLE_PROMPT_1_FRONTEND.md`, `../FABLE_PROMPT_2_BACKEND.md` and the `../context/` folder.

## 2. Status at a glance

| Part | State |
|---|---|
| Careem MCP sandbox (local copy of Careem's server) | Built. Passes all 12 of Careem's acceptance tests |
| Sample household data | Built. Seeded, so it is the same every run |
| Engine (analysis, planner, store comparison, cart price) | Built and tested |
| Approval gate and checkout block | Built and tested |
| X-ray (every step recorded) | Built and tested |
| HTTP API, every endpoint in the contract | Built and tested |
| Five languages | Built and tested (with the stub model, see below) |
| Web frontend | Built. Checked by hand in a browser: plan, approve, X-ray, Arabic right to left, mock mode, backend down |
| Tests | 68 pass |
| **Model on AWS Bedrock** | **Adapter is written but has never made a live call.** The AWS session on the build machine had expired. Until Bedrock is connected, a clearly marked rule-based **stub** answers instead. See [section 9](#9-the-agent-model-and-tools) |

## 3. How to run it

You need Node 23.6 or newer. Everything runs on your own laptop.

```bash
cd "sap v1"
npm install
npm run dev
```

Then open **http://localhost:5173**. Three things start together:

| What | Address |
|---|---|
| Web page | http://localhost:5173 |
| Backend API | http://localhost:8080/api |
| Careem MCP sandbox | http://127.0.0.1:8787/mcp |

Other commands:

| Command | What it does |
|---|---|
| `npm run dev:backend` | Sandbox and backend only, no web page |
| `npm run demo:cli` | Runs the whole demo in the terminal. Starts what it needs by itself |
| `npm run demo:cli -- --xray` | Same, and prints every step with its full input and output |
| `npm run demo:cli -- --message "نفس الأسبوع الماضي، لكن خفّض 15%"` | Any other message |
| `npm run xray -- <runId>` | Prints a saved run. Without an id it prints the latest one |
| `npm test` | Rebuilds the sample data, then runs the 68 tests |
| `npm run generate:data` | Rewrites the sample data from `fixtures/household.config.ts` |
| `npm run sandbox -- scenarios get_activities` | Lists what the sandbox can answer for one tool |
| `VITE_MOCK=true npm --workspace web run dev` | Web page alone, replaying a recorded run |

### Connecting the real model

```bash
cp .env.example .env
aws login --profile <your-profile>
aws bedrock list-foundation-models --region <region> --by-provider anthropic --query "modelSummaries[].modelId"
```

Put the profile, region and model id in `.env` (`AWS_PROFILE`, `AWS_REGION`, `BEDROCK_MODEL_ID`,
and optionally `BEDROCK_FALLBACK_MODEL_ID`). If the backend is already running you do not need to
restart it: it tries Bedrock again every 30 seconds and switches by itself. The footer of the web
page shows which model is in use.

## 4. What happens when you send a message

Here is the full path of "Same as last week, but cut 15%".

```
 You type the message in the browser
        |
        v
 POST /api/chat  ------------------------------------------------  backend (server/)
        |
        v
 The model reads the message and decides to call our tool `plan_basket` with cutPercent = 15
        |
        v
 plan_basket runs:
   1. user_info                         Careem MCP   who is the user, where is Home
   2. get_activities (past groceries)   Careem MCP   10 past orders
   3. get_activities (past shops)       Careem MCP   0 past orders
   4. groceries_get_items_details x2    Careem MCP   category and size of each item, 20 per call
   5. engine: normaliseOrders, categorySpend, priceDrift, cycles, lastWeek
   6. search_groceries_items            Careem MCP   what Careem Quik sells
   7. cart_get_basket_price             Careem MCP   Quik's delivery and service fee
   8. global_search                     Careem MCP   which supermarkets are nearby
   9. search_groceries_items + cart_get_basket_price for each supermarket
  10. engine: assignTiers, resolveBudget, selectCandidates, compareStores, fitBudget,
              compareStores again on the final basket, monthlySaving
  11. a one-time approval token is created
        |
        v
 The browser receives, as a live stream:
   - one line per step (the "Live tool steps" panel)
   - the full record of every step (the X-ray panel)
   - the plan (store comparison and basket)
   - the model's short reply in your language
```

Then you press **Approve**:

```
 POST /api/approve with the one-time token
   1. token checked and destroyed                     (cannot be used twice)
   2. create_grocery_cart_with_quantities  Careem MCP  the only call that changes anything
   3. cart_get_basket_price                Careem MCP  fees and the best promo
   4. engine: priceCart                                exact total
 The browser shows: "Cart ready at Marina Fresh Market, total AED 148.35. Nothing has been charged."
```

Checkout is never called. The code refuses to call it.

## 5. What was built, step by step

This is the order the work was done in, following the phases in the backend prompt.

**Step 1. Read the brief.** The three build prompts, the eight context files, and Careem's sandbox
package (a zip of Markdown files with no code: one file per tool, each holding the exact tool
definition and canned answers called scenarios).

**Step 2. Built the Careem MCP sandbox.** Careem ships a specification, not a server. The server
was written in TypeScript with the official MCP SDK, following Careem's `spec/BUILD.md`: it parses
the tool files, checks arguments against each tool's schema, picks the scenario whose match rule
fits the arguments, fills in placeholders such as `{{now-168h}}`, and answers over Streamable HTTP.
Careem lists 12 acceptance tests; all 12 were written and pass.

**Step 3. Generated the sample data.** Careem's test world has only two grocery orders and eight
products, which cannot show drift, cycles or priority filling. Careem's trainer said to generate
our own data in the same file pattern. A seeded generator now writes a household with 10 weekly
orders and three stores, as scenario files in Careem's format. The sandbox reads them as an extra
layer in front of Careem's own files, so Careem's files stay untouched and every number the app
shows is a real MCP answer.

**Step 4. Built X-ray first.** One wrapper function records every step. Everything written after
it goes through that wrapper, so nothing can run unrecorded.

**Step 5. Built the MCP client and the approval gate.** One function is the only door to Careem.
It adds the Home coordinates, blocks checkout, demands approval for anything that changes state,
retries read-only calls once, and never retries a call that changes state.

**Step 6. Built the engine.** Pure functions with tests: order normalisation, category spend, price
drift, cycles, tiers, budget, priority filling, store comparison, monthly saving, cart price. The
seven demo assertions from the data specification passed on the first run.

**Step 7. Built the agent.** Five high-level tools for the model, a system prompt containing Careem's
agent playbook and our rules, the Bedrock adapter, and the marked stub model.

**Step 8. Built the API.** Every endpoint in the contract, with Server-Sent Events for streaming.

**Step 9. Built the terminal demo.** `npm run demo:cli` proves the backend works with no web page.

**Step 10. Tuned the data.** The first run gave a monthly saving of only about AED 18, because last
week was an unusually expensive week compared with the four-week average. Three treats that "crept
in over the last month" were added to the history, which is a realistic story and brings the saving
to about AED 168. This is flagged in [section 16](#16-decisions-that-differ-from-the-written-plan).

**Step 11. Wrote the integration tests.** 31 tests that drive the real API against the real sandbox.

**Step 12. Built the frontend.** One page, plain CSS, no UI libraries. Checked in a real browser.

**Step 13. Wrote the documents.** README, demo script with real numbers, frontend guide, contract
notes, decisions log, and this file.

**Step 14. Checked from a fresh clone.** Cloned to an empty folder, `npm install`, `npm test`,
`npm run demo:cli`: all worked with no manual fixes.

## 6. Folder and file guide

About 3,700 lines of TypeScript, not counting tests' data or Careem's specification.

```
sap v1/
├── PROJECT_EXPLAINED.md     this file
├── README.md                short version: run, architecture, API, limits
├── package.json             the commands in section 3; npm workspaces
├── tsconfig.json            TypeScript settings (Node runs the .ts files directly, no build step)
├── vitest.config.ts         test settings
├── .env.example             the settings you copy to .env (no secrets inside)
├── scripts/dev.mjs          starts sandbox + backend + web together
│
├── sandbox/
│   ├── careem-mcp-sandbox/  Careem's own package, unchanged: spec and 42 tool files
│   └── careem-mcp-ts/       the server built from that spec
│       ├── src/spec.ts          reads tool files, picks scenarios, fills placeholders
│       ├── src/server.ts        MCP protocol and HTTP
│       ├── src/cli.ts           run, start, stop, status, logs, scenarios, scenario, reset
│       └── test/acceptance.test.ts   Careem's 12 acceptance tests
│
├── fixtures/
│   ├── household.config.ts  THE STORY: stores, products, prices, who bought what and when
│   ├── generate.ts          turns the story into Careem-format files (seeded)
│   └── out/                 the generated files the sandbox reads, plus manifest.json
│
├── server/                  the backend
│   ├── src/contract.ts      the API types, shared with the frontend
│   ├── src/xray.ts          records every step
│   ├── src/index.ts         starts the server, chooses Bedrock or the stub
│   ├── src/mcp/
│   │   ├── client.ts        the only door to Careem
│   │   └── approval.ts      one-time tokens and grants
│   ├── src/engine/          all the maths (section 8)
│   │   ├── analysis.ts      orders, category spend, price drift, cycles
│   │   ├── planner.ts       tiers, budget, candidates, priority filling, monthly saving
│   │   ├── stores.ts        store catalogues, sizes, swaps, store comparison
│   │   ├── cart.ts          exact price after approval
│   │   └── engine.test.ts   25 tests
│   ├── src/agent/
│   │   ├── agent.ts         the chat loop and the approve flow
│   │   ├── tools.ts         the five tools the model can call
│   │   ├── systemPrompt.ts  Careem's playbook plus our rules
│   │   ├── bedrock.ts       Claude on AWS Bedrock (Converse API)
│   │   ├── stub.ts          the marked stand-in used when Bedrock is not connected
│   │   └── texts.ts         language detection and fixed sentences in five languages
│   ├── src/api/
│   │   ├── server.ts        the HTTP endpoints
│   │   └── sseClient.ts     small client for the streams (used by the CLI and tests)
│   ├── scripts/
│   │   ├── demo-cli.ts      the demo in the terminal
│   │   ├── xray-print.ts    prints a saved run
│   │   └── print.ts         shared printing
│   └── test/api.test.ts     31 integration tests
│
├── web/                     the frontend (section 13)
│   ├── README.md            how to run and restyle it
│   ├── CONTRACT_NOTES.md    small points where the contract left room
│   └── src/                 App.tsx, api.ts, mock.ts, examples.ts, styles.css, components/
│
└── demo/DEMO.md             the three-minute script with real numbers
```

Files that are created when you run things and are not in git: `node_modules/`, `.env`,
`.run/` (X-ray logs, sandbox overrides), `web/dist/`.

## 7. The sample data

**It is invented.** No real person's orders are used. The file shapes are copied from Careem; the
content is made up. The app says so on every screen and in every API answer (`sampleData: true`).

### The household

A family at "Home" in Dubai Marina (Careem's test location `LOC-50001`). They have ordered from
Careem Quik every Saturday for 10 weeks.

### The stores

| Store | Id | Type | Delivery | Service fee | Note |
|---|---|---|---|---|---|
| Careem Quik Dubai Marina | 40001 | Quik | 4.00 | 1.50 | Where the household has been shopping |
| Marina Fresh Market | 40101 | Shops | 7.00 | 1.00 | Cheaper on almost everything; has a store-brand rice; FREEDEL promo |
| JLT Organic Pantry | 40201 | Shops | 9.00 | 1.50 | Pricier; does **not** sell drinking water, atta or soft drinks |

There are 32 products across the stores, with invented brand names (for example "Royal Mahal
Basmati Rice 5kg", "Oasis Springs Drinking Water 6x1.5L").

### The patterns baked into the 10 weeks

| Item | Pattern | What it shows |
|---|---|---|
| Water | every week, 2 packs | never cut |
| Basmati rice 5kg | every 3 weeks; 38.00, then 40.00, then 42.00 | price drift of +10.5%, and it is due this week |
| Atta, dal | every 2 weeks | staples that are due this week |
| Sunflower oil | every 3 weeks | due this week |
| Milk | every week; 9.50 rising to 10.50 | drift on a weekly item |
| Eggs, onions, tomatoes, bread | every week | bought so often they count as staples for this family |
| Dish soap | every 4 weeks, bought last week | **not due**: deferred, not cut |
| Sugar, laundry detergent, toilet tissue | every 5 to 6 weeks, bought recently | also not due |
| Cola | every week | treat: cut first |
| Chips | 8 of 10 weeks | treat: cut, unless you say "keep the chips" |
| Chocolate | 6 of 10 weeks | treat: cut |
| Ice cream, juice, biscuits | only in the last 5 weeks | treats that crept in: this is where the budget went |
| Salt, bananas, chicken, yogurt, tea | once each | natural noise; no cycle can be learned from one purchase |

Small natural noise is added: vegetable prices wobble by up to 50 fils, order times vary by a few
hours, and one order slipped from Saturday to Sunday.

### How it reaches the app

`fixtures/generate.ts` writes five files into `fixtures/out/tools/`, one per Careem tool it extends
(`get_activities`, `groceries_get_items_details`, `search_groceries_items`, `global_search`,
`cart_get_basket_price`). Each file holds extra scenarios in Careem's own format. The sandbox tries
these before Careem's own scenarios. Order dates are written as "now minus N hours", so the history
always ends "last Saturday" relative to the day you run it.

To change the story, edit `fixtures/household.config.ts` and run `npm run generate:data`.

## 8. The engine: all the maths

Everything in `server/src/engine/` is a pure function: same input, same output, no network, no
model. **The model never calculates anything.** Money is rounded to 2 decimals.

### analysis.ts

| Function | What it does |
|---|---|
| `normaliseOrders` | Turns Careem's order list and item details into flat lines: order, date, store, item, category, size, quantity, unit price, line total |
| `categorySpend` | Spend per category per ISO week, and the average over the latest 4 weeks |
| `priceDrift` | For each item bought at least twice: (latest price − first price) ÷ first price. Flagged above 5% |
| `cycles` | For each item: the median number of days between orders. Next due = last order + median. Due this week if that is within 7 days of today |
| `lastWeek` | The most recent order and its total as charged, fees included |
| `averageWeeklySpend` | Average total of the latest 4 orders |

### planner.ts

**Tiers.** Every item gets a tier from its category:

| Tier | What | When the basket is over budget |
|---|---|---|
| T1 | Water | never cut |
| T2 | Staples: rice, atta, oil, dal, sugar, salt | never cut; may be swapped for a cheaper equivalent |
| T3 | Fresh essentials: milk, eggs, bread, vegetables, chicken | quantity reduced first, removed only later |
| T4 | Household: dish soap, detergent, tissue | deferred when not due |
| T5 | Treats: snacks, soft drinks, juice, chocolate, ice cream | cut first |

An item found in at least 75% of orders moves up one tier (T4 to T3, T3 to T2), because it is a
staple *for this household*. Treats are never moved up automatically. If you say "keep the chips",
the chips are pinned and will not be cut or reduced.

**Budget** (`resolveBudget`). "Cut 15%" means last week's total × 0.85. "My budget is 150 dirhams"
means 150. With no budget given, last week's total is used.

**Candidates** (`selectCandidates`). This week's list is every item whose cycle says it is due, plus
anything you asked to add. Items that are not due are **deferred** and shown with their next due date.

**Priority filling** (`fitBudget`). While the basket costs more than the budget, in this order:

1. Remove treats (T5), most expensive first.
2. Swap items for a cheaper equivalent at the same store (same category, size within 25%), biggest saving first.
3. Reduce fresh essentials (T3) by one, never below one.
4. Remove household items (T4), then fresh essentials (T3), most expensive first.
5. If it still does not fit, stop and report the shortfall honestly. Water and staples stay.

Every item ends with a reason (`kept`, `swapped`, `reduced`, `deferred`, `cut`) and a short note
explaining why.

**Monthly saving** (`monthlySaving`). (Average of the last 4 weekly orders − this week's planned
total) × 4.33. It is an estimate and is labelled as one.

### stores.ts

- `parseSize` reads sizes such as "5 kg", "6 x 1.5 L", "30 pcs" so that only similar sizes are compared.
- `resolveItem` finds an item at a store: the same product if the store has it, otherwise the
  cheapest similar one in the same category, otherwise it is missing.
- `compareStores` prices the whole basket at each store: items + delivery fee + service fee. A store
  missing any T1 or T2 item is **not valid**. The cheapest valid store is chosen. One store per order.

### cart.ts

`priceCart` works out the exact total after approval: subtotal + delivery + service − promo saving.

## 9. The agent: model and tools

### The five tools

The model does not see Careem's 42 raw tools. It sees five of ours, which keeps it fast and reliable:

| Tool | What it does |
|---|---|
| `analyse_history` | Reads past orders; returns spend, drift and cycles |
| `plan_basket` | Builds the basket to a budget and picks the store. Takes `cutPercent` or `budgetAed`, `additions`, `overrides` |
| `compare_stores` | The store comparison for the current basket |
| `explain_change` | Why one item was kept, swapped, reduced, deferred or cut |
| `request_approval` | Called when the user says "approve" or "order it". It changes nothing; it tells the user to press the Approve button |

The session remembers your budget, additions and overrides, so "Keep the chips" after "cut 15%"
keeps the 15% cut.

### The system prompt

`systemPrompt.ts` contains Careem's agent playbook (from builders.careem.com) and our own rules:
never calculate, copy every number from a tool result; never claim to order or charge; always say
"nothing has been charged"; say the history is sample data; reply in the user's language; keep it short.

### The model: Bedrock, and the stub

**Intended:** Claude on AWS Bedrock through the Converse API with tool use (`bedrock.ts`). If the
main model is throttled or times out, it switches to a fallback model and records that in X-ray.

**Right now:** the AWS session on the build machine had expired and no model id was set, so the
Bedrock adapter has never made a live call. It is written against the documented API, but its first
real call still needs to be watched.

**The stub** (`stub.ts`) is what answers until Bedrock is connected. It is a small set of rules, not
an AI model. It recognises the demo requests in the five languages (cut by a percentage, set a
budget, keep or drop or add an item, why was something cut, which store is cheapest, approve) and
answers with fixed sentences filled with the engine's numbers. When it is active:

- `GET /api/config` reports `stub-rule-based (Bedrock not connected)`
- `GET /api/health` reports `bedrock: false`
- the footer of the web page shows it

The stub also has a second job that stays useful forever: the tests use it, so they never need a network.

The plan, the store comparison, the basket and the cart price are identical with either model,
because they come from the engine.

### Languages

Arabic, Urdu and Hindi are recognised by their script; Urdu is told apart from Arabic by letters
only Urdu uses. Tagalog is recognised by common words. Replies in Arabic and Urdu are marked
right-to-left. Arabic-Indic digits (١٥٪) are understood.

## 10. Safety rules, enforced in code

These are in the code, not just in the prompt, and each has a test.

| Rule | Where | How |
|---|---|---|
| Checkout can never be called | `mcp/client.ts` | `cart_checkout` and `cart_grocery_checkout` are refused for every caller, even with a valid approval |
| Changing a cart needs approval | `mcp/approval.ts`, `mcp/client.ts` | A call that changes state needs a "grant". A grant only exists after `POST /api/approve` accepted a token |
| Tokens are one-time | `mcp/approval.ts` | One use, 15 minutes, tied to one session and one plan. A reused, wrong or expired token runs nothing |
| Chat cannot approve | `agent/tools.ts` | Typing "approve" only makes the assistant say "press the Approve button" |
| Unknown tools are treated as dangerous | `mcp/client.ts` | Any tool Careem does not mark read-only needs approval |
| Calls that change state are never retried | `mcp/client.ts` | A timed-out cart call retried could act twice. Read-only calls retry once |
| No secrets recorded | `xray.ts` | Keys, tokens and credentials are removed before recording. Approval tokens show as `tok_…last4` |
| No secrets in the repo | `.gitignore`, `.env.example` | AWS credentials come only from your local AWS profile |
| Errors are calm | `agent/agent.ts`, `api/server.ts` | If Careem is down you get a friendly message in your language, never a crash |

## 11. X-ray: seeing every step

X-ray answers "what exactly did the backend do?" For every request it records each step in order:
**what it was, what went in, what came out, and where it came from.** It is the proof that the
Careem MCP calls are real, and the debugging tool.

| Kind | Example | Source shown |
|---|---|---|
| `api` | the request arriving and finishing | `api:/api/chat` |
| `model` | each model call, with messages, tool choices and token counts | `aws-bedrock:<modelId>` or `stub:…` |
| `agent-tool` | each of our five tools | `agent:tools.ts#plan_basket` |
| `mcp` | each Careem call, with full arguments and the raw answer | `careem-mcp:sandbox@127.0.0.1:8787` |
| `engine` | each engine function | `engine:analysis.ts#priceDrift` |
| `data` | where the data came from | `fixtures:seed=20261114` |
| `approval` | token issued, token checked | `api:approval-gate` |
| `guard` | blocked checkout, missing approval, a retry, a model fallback | `mcp:guard` |

Steps are nested: request → model call → tool → the Careem calls and engine functions inside it.
The demo request produces about 40 steps.

Four ways to see it:

1. **In the web page:** press the X-ray button. Click any row to see its full input and output. A
   picker reopens earlier runs.
2. **Over the API:** `GET /api/xray` lists runs; `GET /api/xray/<runId>` returns one.
3. **On disk:** `.run/xray/<runId>.jsonl`, one line per event.
4. **In the terminal:** `npm run demo:cli -- --xray`, or `npm run xray -- <runId>`.

A payload over 200 KB is saved in full on disk and shortened in the stream, with its size noted.

## 12. The API

Base address `http://localhost:8080/api`. All types are in `server/src/contract.ts`.

| Endpoint | Purpose |
|---|---|
| `GET /config` | Model id, provider, sandbox or production, `sampleData`, languages, currency |
| `GET /health` | `{ ok, mcp, bedrock }` |
| `POST /chat` | Body `{ sessionId, message, language?, budgetAed? }`. Answers as a stream |
| `POST /approve` | Body `{ sessionId, planId, approvalToken }`. Answers as a stream |
| `POST /reset` | Body `{ sessionId }`. Forgets the session and its tokens |
| `GET /xray`, `GET /xray/:runId` | X-ray runs |

Stream events, always starting with `run` and ending with `done`:

| Event | Carries |
|---|---|
| `run` | the run id |
| `trace` | one short line per step: tool name, status, summary, milliseconds |
| `xray` | the full record of a step, sent when it starts and when it ends |
| `message` | the assistant's reply, its language, and whether it is right-to-left |
| `plan` | the plan: stores, items with reasons, totals, insights, approval token |
| `cart` | after approval: store, subtotal, fees, promo, total, `charged: false` |
| `error` | a friendly message and whether trying again makes sense |
| `done` | the run id |

Try it without the web page:

```bash
curl -N -X POST localhost:8080/api/chat -H 'content-type: application/json' \
  -d '{"sessionId":"demo","message":"Same as last week, but cut 15%"}'
```

## 13. The frontend

A simple starter page in `web/`, made to be redesigned. Vite, React, TypeScript, one plain CSS file,
no UI libraries. It contains **no business logic**: it never adds up a total; it shows what the
backend sends.

Layout: chat on the left; on the right, live tool steps, store comparison, basket, cart result,
and spend and price drift. The X-ray panel opens underneath.

| Component | Shows |
|---|---|
| `Header` | Name, language switch, X-ray button, Reset |
| `SampleBanner` | The yellow "Sample data" banner |
| `Chat` | Bubbles, input, example buttons, optional weekly budget |
| `ToolSteps` | Each step as it runs, with time taken |
| `StoreComparison` | Each store's total, the "Cheapest" tag, the "Missing …" tag |
| `Basket` | Items with a coloured reason chip and note, totals, the Approve button |
| `CartResult` | "Cart ready … Nothing has been charged" |
| `Insights` | Prices that went up; weekly spend by category |
| `XRay` | Every step with expandable input and output; past runs |
| `Footer` | Model id and Careem MCP mode |

Things it does on purpose:

- The input starts with "Same as last week, but cut 15%", so the demo starts with one click.
- Example buttons fill in the same request in Arabic, Hindi, Urdu and Tagalog, and follow-ups.
- Arabic and Urdu replies are shown right to left.
- If the backend is down it says "Backend not reachable on localhost:8080" with a Retry button.
- There is no Pay or Checkout button anywhere.
- **To restyle:** change the colour, spacing and font variables at the top of `web/src/styles.css`.
- **Mock mode** (`VITE_MOCK=true`): replays a run recorded from the real backend, and the banner
  says "Mock mode: not connected to the backend".

## 14. Tests

`npm test` runs 68 tests in about one second. None of them needs the internet.

| File | Tests | What they cover |
|---|---|---|
| `sandbox/careem-mcp-ts/test/acceptance.test.ts` | 12 | Careem's own acceptance list: identity, tool list word for word, scenarios, forced outcomes, bad arguments, every scenario (including our generated ones) valid against Careem's output schemas, nothing revealing it is a local copy |
| `server/src/engine/engine.test.ts` | 25 | The maths, on the generated household with a fixed date, including the seven demo assertions |
| `server/test/api.test.ts` | 31 | The real API against the real sandbox: every endpoint, the plan's shape, X-ray completeness and nesting, masked tokens, approval once only, checkout blocked, no retry of a failed cart call, a Careem outage, all five languages |

The seven demo assertions (from `../context/06-test-data-spec.md`):

1. Rice shows about +10% drift and is swapped to the store brand.
2. Dish soap is deferred with a next-due date, not cut.
3. Cola and chocolate are cut; chips are cut unless you override.
4. Water, rice, atta, oil, milk and eggs are always in the basket.
5. Marina Fresh Market is chosen; JLT is shown as missing atta and water.
6. The estimated total is within the budget.
7. The monthly saving is computed and positive.

**What the tests do not cover:** the live Bedrock model (they use the stub), and the web page (it
was checked by hand in a browser, not by automated tests).

## 15. The demo numbers

From `npm run demo:cli`. They are the same every run because the data is seeded.

| Fact | Value |
|---|---|
| Last week's order (Careem Quik) | AED 186.15 |
| Budget after "cut 15%" | AED 158.23 |
| Average of the last 4 weekly orders | AED 194.23 |
| Chosen store | Marina Fresh Market |
| Estimated total | AED 155.35 = items 147.35 + delivery 7.00 + service 1.00 |
| Same basket at Careem Quik | AED 165.50 |
| JLT Organic Pantry | not valid: missing drinking water and atta flour |
| Rice | up 10.5% (38.00 to 42.00); swapped to the store brand at 34.00; saves AED 5.50 |
| Milk | also up 10.5% (9.50 to 10.50) |
| Not due | dish soap (5 Dec), sugar (12 Dec), laundry detergent (12 Dec), toilet tissue (19 Dec) |
| Cut first | ice cream, cola, chocolate, juice, chips, biscuits |
| Exact total after Approve | AED 148.35 (FREEDEL removes the AED 7.00 delivery fee) |
| Monthly saving, estimate | AED 168.35 |
| Charged | nothing |

## 16. Decisions that differ from the written plan

Each of these is a judgement call. They are also in the decisions log at `../context/08-risks-and-open-questions.md`.

| Decision | Why |
|---|---|
| Swaps happen **before** reducing fresh food | The written order would reduce milk before swapping rice. A swap loses nothing the family needs, and the demo assertions need rice swapped with milk kept |
| Treats are never promoted automatically | The "in 75% of orders, move up a tier" rule would save weekly cola from being cut, which contradicts the demo story. You can still pin a treat by asking |
| Three treats were added to the last month of history | To make the monthly saving about AED 168 instead of about AED 18. It is a believable story, but it was a choice made to tune the headline number. Also, the planned week leaves out items that are simply not due yet, so the formula flatters the saving. It is labelled an estimate everywhere |
| The exact total is partly ours | Careem's sandbox keeps no state: creating a cart always returns the same fixed basket. So the subtotal is our planned basket; only the fees and promo come from Careem's price call. The page says so |
| Fees before approval come from `cart_get_basket_price` | Careem's search results carry no fees. In production that call prices an existing basket, so a real fee estimate would need another source |
| The sandbox search returns each store's whole range | Careem's scenario format cannot build an answer from the search terms. The engine picks what it needs by category |
| Sample records have no `sample: true` field | Careem's output schemas reject extra fields, and the sandbox must not hint it is a local copy. The label is on our API and on screen instead |
| The comparison on screen prices the final basket | So the numbers match the basket you see. The store itself is chosen on this week's full list, before fitting |
| The sandbox serves Streamable HTTP and stdio, not the older SSE transport | Careem's spec asks for at least one transport |
| Health says `ok: false` with the stub | Honest: Bedrock is not connected |
| The page has an extra Insights panel | The data was already in the plan, and the demo script talks about spend and drift |

## 17. Honest limits

- **Sample data.** Not a real user's history. Moving to production needs the production address
  and Careem's sign-in (OAuth with PKCE). That is not built.
- **Bedrock is unproven here.** See section 9.
- **The stub is not AI.** It handles the demo requests only. Anything else gets a help message.
- **No checkout, ever.** The demo ends at an approved, priced cart. That is by design.
- **No voice.** Text only.
- **Sessions live in memory.** Restarting the backend forgets them.
- **Not built:** onboarding for brand-new users, splitting an order across stores, choosing a
  specific promo code, a second supermarket.
- **The web page has no automated tests.**
- **Kiro was not used** (team decision).

## 18. What to do next

In order of importance for the demo:

1. Run `aws login`, fill in `.env`, and watch the first real Bedrock reply. Check the footer shows
   the model id and not the stub.
2. Try the request in all five languages with the real model, and the follow-ups ("Why did you drop
   the chocolate?", "Keep the chips", "Which store is cheapest?").
3. Rehearse with `demo/DEMO.md`. Record the backup video. Do not publish it.
4. Restyle the page if there is time, starting from the variables at the top of `web/src/styles.css`.

After the event, if the project continues: Careem sign-in for production, a real fee source,
onboarding for new users, saved sessions.

## 19. Glossary

| Word | Meaning |
|---|---|
| MCP | Model Context Protocol: the standard way an AI agent calls tools |
| Careem Quik | Careem's own fast grocery delivery |
| Careem Shops | Supermarkets and specialty stores on Careem, each with a merchant id |
| Sandbox | A local copy of Careem's server that answers from prepared files. No real account, no real money |
| Scenario | One prepared answer in a sandbox tool file, chosen by the arguments of the call |
| Mutating tool | A tool that changes something real: a cart, an order, money |
| Tier | Our ranking of items by necessity, T1 (water) to T5 (treats) |
| Price drift | The same item costing more over successive orders |
| Reorder cycle | How often a household buys an item again |
| Deferred | Not in this week's basket because it is not due yet. Different from cut |
| Approval token | A one-time code the Approve button sends. Without it nothing can change a cart |
| Grant | What the backend creates after accepting a token; the permission slip for one cart call |
| X-ray | Our record of every step the backend takes |
| Stub | The rule-based stand-in for the model while Bedrock is not connected |
| SSE | Server-Sent Events: the backend streams events to the browser as they happen |
| Bedrock | Amazon's service for running AI models such as Claude |
| Converse API | Bedrock's API for chat with tool use |
