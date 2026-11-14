# Build Prompt for Fable: Souq Saver

You are building **Souq Saver** for the Careem Builders '26 hackathon (Dubai, 14 Nov 2026). Code freeze is **18:00 GST**. Demo is 3 minutes plus 2 minutes of jury Q&A. Work autonomously through the phases below, commit after each phase, and keep the app runnable at every commit.

**Read first, in this order:** `context/README.md`, `context/02-judging-criteria.md`, `context/03-product-spec.md`, `context/04-careem-mcp-reference.md`, `context/05-architecture-and-build-plan.md`, `context/06-test-data-spec.md`. They are the source of truth. This file is the build order and the rules. If this file and a context file disagree, this file wins.

---

## 0. Non-negotiable rules

1. **Never call checkout.** `cart_checkout` and `cart_grocery_checkout` are blocked in code. Not in the demo, not in tests, not ever.
2. **Mutating tools need approval, enforced in code.** `create_grocery_cart_with_quantities`, `cart_add_item(s)`, `cart_update_item`, `cart_delete_items`, `cart_delete_basket`, `cart_reschedule_basket`, `cart_reorder`, `save_new_address` and any other mutating tool run only with a one-time approval token issued when the user clicks **Approve**. A prompt instruction alone is not enough.
3. **Never retry a mutating call.** Read-only calls may retry once.
4. **All money maths is deterministic TypeScript with tests.** The model never calculates totals, drift, cycles or budgets. It only understands requests, picks our tools and explains results.
5. **Sample data is labelled.** The UI shows a "Sample data" banner. Never present it as a real user's history.
6. **No secrets in the repo.** AWS credentials come from the local AWS profile only. Commit a `.env.example`, never `.env`. Add `.env`, `node_modules`, `.run/`, `dist/` to `.gitignore` before the first commit.
7. **No AI attribution** in commit messages, PR text or files. No `Co-Authored-By` lines.
8. **Do not use Kiro.** Team decision.
9. **Everything is built today.** Do not import pre-written project code. Careem's sandbox package and public libraries are fine.
10. **Do not publish the demo or video anywhere** (T&C 6.3). Push code only to this repo.

---

## 1. Stack and environment

- **Language:** TypeScript everywhere, Node 25 (installed). npm workspaces.
- **MCP client:** official `@modelcontextprotocol/sdk`, Streamable HTTP transport.
- **Model:** Claude on **AWS Bedrock** via `@aws-sdk/client-bedrock-runtime`, **Converse API** with tool use.
  - Primary: Claude Sonnet 5.5. Fallback: Claude Haiku 5.5.
  - Get the exact model ID at runtime setup: `aws bedrock list-foundation-models --region $AWS_REGION --by-provider anthropic --query "modelSummaries[].modelId"`. If Sonnet 5.5 needs an inference profile, use it. Use the closest available Claude model if neither is enabled, and say so in the README.
- **Server:** Node HTTP (Fastify or Express) with Server-Sent Events for the live trace.
- **Web UI:** Vite + React + TypeScript, single page.
- **Tests:** Vitest.

`.env.example`:
```
AWS_PROFILE=            # set by the user locally, never committed with a value
AWS_REGION=             # e.g. us-east-1
BEDROCK_MODEL_ID=       # filled after listing models
BEDROCK_FALLBACK_MODEL_ID=
CAREEM_MCP_URL=http://127.0.0.1:8787/mcp
DEMO_MODE=true          # blocks checkout and enables sample banner
PORT=3000
```

**Inputs from the user (ask only if missing):** AWS region, AWS profile name. Never ask for keys in chat. If Bedrock is not ready, build everything else first and use a stub model adapter that is clearly marked, then switch when access arrives.

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
   src/api/               routes, SSE, approval tokens
/web                      React chat UI
/demo                     DEMO.md (script), notes for the backup video
README.md                 how to run, architecture, honest limits
.env.example
```

---

## 3. Build phases (with deadlines)

### Phase 1: Sandbox and plumbing (target 10:45)
1. Download https://builders.careem.com/sandbox/careem-mcp-sandbox.zip into `/sandbox`, unzip, read `careem-mcp-sandbox/README.md`, and build the sandbox **in TypeScript** exactly as its `spec/BUILD.md` says. Run its acceptance tests. Start it on `http://127.0.0.1:8787/mcp`.
2. Write `server/src/mcp/client.ts`: connect, `listTools()`, log the count, `call(tool, args)` wrapper that adds Home coordinates (25.0866, 55.1474) when missing, emits a trace event `{id, tool, argsSummary, resultSummary, ms, ok}`, retries read-only calls once, never retries mutating calls, and throws on blocked tools.
3. Bedrock hello-world through the adapter.
4. **Done when:** a script prints the tool list, calls `user_info` and `get_activities`, and gets a Bedrock reply.

### Phase 2: Generated sample data (target 11:30)
Laith (Careem, MCP trainer) confirmed: **take the sandbox's fake data and generate random data inspired by it, in the same file pattern.**
1. Read `spec/FORMAT.md`, `spec/FIXTURES.md`, and the tool files for `get_activities` (user), `search_groceries_items`, `groceries_get_items_details`, `create_grocery_cart_with_quantities`, `global_search` (all under `spec/tools/groceries/` or `spec/tools/user/`), and `cart_get_basket_price` (`spec/tools/cart/`).
2. Write `fixtures/generate.ts`, **seeded** (same output every run), that produces responses in exactly those shapes: same field names, nesting, id styles, AED currency, merchant ids 40001 (Quik Dubai Marina), 40101 (Marina Fresh Market), 40201 (JLT Organic Pantry).
3. Bake in the story from `context/06-test-data-spec.md`: 10 weekly orders; rice drifts ~+10% and has a cheaper store-brand swap; dish soap every 4 weeks, bought last week; cola and chocolate frequent; chips 8 of 10 weeks; JLT lacks atta and water; last week's total ≈ AED 186.
4. Serve the generated data **through the sandbox** (preferred, so every number on screen is a real MCP response), by writing scenario/tool files the sandbox reads, following `spec/FORMAT.md`. If the sandbox format makes that impossible in time, load fixtures in the server's data layer instead, keep identical shapes, and record the choice in `context/08`.
5. Remember the sandbox is stateless: cart creation returns a fixed basket. The UI shows our planned basket and labels the sandbox cart response as sample.
6. **Done when:** `get_activities` through MCP returns 10 orders with the story patterns.

### Phase 3: Engine (target 13:30) — use your strongest reasoning here
Implement in `server/src/engine/`, all pure functions, typed, tested.

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
- Fit loop: while over budget: remove T5 (highest price first); defer T4 not due; reduce T3 qty by 1 then remove; T1/T2 never removed, only swapped to cheaper equivalent (same category, size within ±25%). If still over, return an honest shortfall.
- Every change carries a reason: `swapped | reduced | deferred | cut | kept`.
- Monthly saving = (4-week avg weekly spend − planned weekly) × 4.33, labelled estimate.

**stores.ts**
- Quik: `search_groceries_items` without `merchant_id` (response carries merchant id).
- Shops: `global_search`, then `search_groceries_items` with each `merchant_id`.
- Per store: cheapest acceptable variant per item, `estTotal = items + delivery + service`, list missing items. Any missing T1/T2 disqualifies the store. Pick lowest valid total. One store per order.

**Tests (must pass, from `context/06`):** rice drift ≈ +10% and swapped; dish soap deferred; cola and chocolate cut; water, rice, atta, oil, milk, eggs always kept; Marina Fresh Market chosen and JLT shown missing atta and water; estimated total ≤ budget; monthly saving > 0.

### Phase 4: Agent and API (target 14:30)
1. Expose **five high-level tools** to the model (not the 50 raw MCP tools): `analyse_history`, `plan_basket({budgetAed?|cutPercent?, additions?, overrides?})`, `compare_stores`, `explain_change({item})`, `request_approval`.
2. System prompt: paste Careem's agent playbook (https://builders.careem.com/docs/agent-playbook.md) plus our rules: reply in the user's language (Arabic, English, Hindi, Urdu, Tagalog), explain changes by tier, never claim to check out, say "nothing has been charged", be honest that data is sample.
3. API: `POST /chat` (streams model text + trace via SSE), `POST /approve` (consumes a one-time token, then calls `create_grocery_cart_with_quantities` and `cart_get_basket_price`, returns exact total with promo).
4. **Done when:** "Same as last week, cut 15%" in English returns a plan with store comparison and reasons, end to end.

### Phase 5: Web UI (target 15:30)
- One screen. Left: chat, language picker, budget field. Right, stacked: **Live tool steps** (real Careem tool names, timing), **Spend and drift**, **Store comparison**, **Basket** with reason chips.
- **Approve** button → shows "Cart ready at <store>, total AED X. Nothing has been charged."
- Sample-data banner. Footer shows `Model: <BEDROCK_MODEL_ID> on AWS Bedrock` and `Careem MCP: sandbox`.
- `dir="rtl"` for Arabic and Urdu messages. Readable contrast, large buttons, works on a laptop projector.

### Phase 6: Languages, polish, README (target 16:30)
- Test the main request in all five languages. Pre-write the Arabic demo line.
- `README.md`: what it is, architecture diagram (text), how to run (sandbox, server, web), honest limits (sample data, no voice, no checkout, stateless sandbox cart), judging-criteria mapping.
- `demo/DEMO.md`: copy the script from `context/07-demo-and-pitch.md` with the real numbers from our data.

### Phase 7: Hardening (16:30 to 17:15)
- Run all tests. Kill and restart everything from a clean clone using only README steps.
- Simulate failures with sandbox triggers (`trigger_upstream_down`, merchant 99999) and make the UI show a calm error.
- Confirm checkout is unreachable (test asserts the wrapper throws).

### Phase 8: Freeze (by 17:45)
- Final commit and push. Tell the team the exact run commands and the numbers the demo will show (last week total, budget, chosen store, exact total, monthly saving).
- The humans record the backup video at 17:15; keep the app stable from then on.

---

## 4. Cut order if late (cut from the top of this list first)
1. Spend and drift charts (show as a simple table instead)
2. `explain_change` tool
3. Tagalog and Hindi testing (keep Arabic + English)
4. Fallback model switching
5. Second Shops merchant comparison beyond Quik vs Marina

**Never cut:** the approval lock, the store comparison, priority filling, the live tool-steps panel, the sample-data label.

---

## 5. Definition of done
- [ ] `npm run dev` (or documented equivalent) starts sandbox, server and web.
- [ ] "Same as last week, cut 15%" shows live Careem tool calls, store comparison, tiered basket with reasons, monthly saving.
- [ ] Approve builds the cart and shows the exact price; checkout is impossible.
- [ ] Arabic request works with right-to-left display.
- [ ] Model runs on AWS Bedrock and its ID is on screen.
- [ ] All engine tests pass.
- [ ] README explains how to run and the honest limits.
- [ ] Pushed to `main` with no secrets and no AI attribution.
