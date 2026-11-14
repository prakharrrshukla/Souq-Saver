# 05. Architecture and Build Plan

## Design principles

1. **Maths in code, language in the model.** Spend, drift, cycles, tiers, budget fitting and store comparison are deterministic functions with tests. The model (Bedrock) understands the request, chooses tools and explains the result. Judges can trust numbers that come from code.
2. **Confirmation enforced in code.** Mutating tools are behind a server-side gate that needs an approval token from the UI. A prompt alone is not enough.
3. **Same code for sandbox and production.** Only the MCP URL and auth change, matching Careem's contract.
4. **Every tool call is visible.** The backend streams each MCP call (name, arguments summary, result summary, time) to the UI.

## System diagram

```
 Browser (web chat UI, localhost)
   |  chat messages, budget, language, Approve
   v
 Backend API (Node/TypeScript or Python)
   |-- Agent loop  ---------------------> AWS Bedrock (Claude, tool use)
   |      | tool calls
   |      v
   |-- Tool router
   |      |-- Analysis engine (pure code): spend, drift, cycles, tiers
   |      |-- Planner (pure code): budget fit, swaps, deferrals, store choice
   |      |-- Confirmation gate (mutating calls need approval token)
   |      v
   |-- Careem MCP client (Streamable HTTP)
   |        |-- local sandbox http://127.0.0.1:8787/mcp  (+ our fixtures)
   |        '-- production https://mcp.careemapis.com/mcp (OAuth PKCE, optional)
   '-- Event stream (SSE/WebSocket) -> UI trace panel
```

Optional: host the agent on Amazon Bedrock AgentCore if time allows; otherwise run locally and say AgentCore is the deployment path.

## Where each judged tool shows up

| Tool | Where | How we show it |
|---|---|---|
| Careem MCP | MCP client, every data call | Live trace panel with real tool names |
| AWS Bedrock | Agent loop model | Model id in the UI footer and the architecture slide |
| Kiro | Spec-driven generation of a module (suggested: planner or UI) | `.kiro/` spec files committed; one line in the pitch |
| Claude Code | Building the sandbox and glue code | Mention only if asked |

## Components

### 1. Careem MCP client
- Official MCP SDK, Streamable HTTP.
- `listTools()` at startup; log the count (expect 50 in production, fewer in sandbox if Rides missing).
- Wrapper `call(tool, args)` that: adds coordinates, records timing, emits a trace event, retries read-only tools once on failure, **never** retries mutating tools.
- Mutating tool list (hard-coded): `create_grocery_cart_with_quantities`, `cart_add_item`, `cart_add_items`, `cart_update_item`, `cart_delete_items`, `cart_delete_basket`, `cart_reschedule_basket`, `cart_reorder`, `cart_checkout`, `cart_grocery_checkout`, `save_new_address`, `box_create_order`, `create_ride`, `cancel_ride`, `apply_promotion_code`.
- Checkout tools are blocked entirely in demo mode.

### 2. Data layer
- Source A: `get_activities(past, groceries)` and `(past, shops)`, paging with `next_cursor`, up to 105.
- Source B: our fixture file (see 06) merged in, every record tagged `sample: true`.
- Enrichment: `groceries_get_items_details` in batches of 20 for category and current price.
- Normalised order line: `{order_id, date, merchant_id, merchant_name, item_id, name, category, qty, unit_price, line_total}`.

### 3. Analysis engine
- **Category spend:** sum `line_total` by category per ISO week; average of last 4 weeks.
- **Price drift:** per item, first vs latest unit price; drift % = (latest - first) / first. Flag > 5%.
- **Consumption cycle:** per item, median gap in days between orders (needs at least 2 orders). Next due = last order date + median gap. Due this week if next due <= today + 7.
- **Last week's basket:** most recent order (or orders in the last 7 days) and its total.
- **Tier assignment:** category to default tier map; promote items present in >= 75% of orders; apply user overrides.

### 4. Planner
Input: candidate items (due this week + user additions), budget, tiers, store catalogues.

```
for each candidate store:
    resolve each item with search_groceries_items (store's merchant_id or Quik)
    for each item: pick cheapest acceptable variant (same category, size within +-25%)
    mark missing items
    est_total = sum(price x qty) + delivery_fee + service_fee
    if missing any T1/T2: store invalid (unless user accepts)
choose valid store with lowest est_total

fit to budget at chosen store:
    sort items by tier (T5 first) then by price desc
    while est_total > budget:
        T5: remove item
        T4 not due: defer
        T3: reduce qty by 1 (min 1), then remove
        T1/T2: never removed; try a cheaper swap only
    if still over budget: report the shortfall honestly, do not drop T1/T2
```

Output: chosen store, comparison table, final list with reasons per change (swapped, reduced, deferred, cut), estimated total, saving vs last week.

Savings projection: (last 4-week average weekly spend - planned weekly spend) x 4.33 = monthly saving. Label as an estimate.

### 5. Confirmation gate
- Planner result shown with an **Approve** button.
- Approve sends a one-time token. Only then: `create_grocery_cart_with_quantities` (items, merchant_id, coords), then `cart_get_basket_price` (exact total, promo applied).
- UI shows "Cart ready at <store>, total AED X. Nothing has been charged."
- Sandbox note: cart creation returns a fixed basket; our UI shows our planned list and labels the sandbox response as sample.

### 6. Agent loop (Bedrock)
- Model: Claude on Bedrock via the Converse API with tool use. **[VERIFY region and model access with the AWS team]**
- System prompt: Careem agent playbook + our rules (never checkout, confirm mutating, honest about sample data, reply in the user's language, explain changes by tier).
- Tools exposed to the model are **our** high-level tools, not all 50 MCP tools: `analyse_history`, `plan_basket(budget|cut_percent, additions, overrides)`, `compare_stores`, `explain_change(item)`, `request_approval`. Each calls the MCP client and engine. This keeps the model reliable and fast.
- Language: model detects language, replies in it; UI switches to right-to-left for Arabic and Urdu.

### 7. Web UI
- One page. Left: chat with language picker and budget field. Right: tabs or stacked cards: Tool steps (live), Spend and drift, Store comparison, Basket.
- Approve button, "nothing charged" line, sample-data banner when fixtures are in use.

## Suggested repository layout

```
/context            this folder
/sandbox            Careem sandbox built on the day (or link/instructions)
/fixtures           our sample order history and catalogue additions
/server
   mcp/             MCP client wrapper and trace events
   engine/          analysis.ts, planner.ts (+ tests)
   agent/           Bedrock loop, system prompt, tool definitions
   api/             HTTP + SSE endpoints
/web                chat UI
/.kiro              Kiro specs
/demo               script, backup video link
README.md
```

## Build order (10:00 to 18:00)

| Slot | Goal | Done when |
|---|---|---|
| 10:00 to 10:45 | Sandbox running; MCP client lists tools; Bedrock hello-world | `get_activities` returns data in our code; Bedrock replies |
| 10:45 to 12:00 | Fixtures loaded; analysis engine (spend, drift, cycles) | Numbers print for the sample household |
| 12:00 to 13:30 | Planner: tiers, budget fit, swaps, store comparison | "Cut 15%" returns a planned basket with reasons |
| 13:30 to 14:30 | Agent loop with high-level tools; minimal chat UI | Full flow works end to end in English |
| 14:30 to 15:30 | Approve gate, cart creation, basket price; trace panel | Demo flow complete |
| 15:30 to 16:30 | Five languages, RTL, UI polish, Kiro spec committed | Arabic request works |
| 16:30 to 17:15 | Production attempt (optional), tests, bug fixes | |
| 17:15 to 17:45 | Record backup video; rehearse demo twice | Video saved locally |
| 17:45 to 18:00 | Freeze, push, final check | Code freeze |

## Split of work

| Person | Owns |
|---|---|
| Sameer | History analysis, budget logic, planner, store comparison, savings maths, fixtures |
| Prakhar | Agent setup on Bedrock, Careem MCP connection, multilingual chat, UI |
| Both | Integration testing, demo, backup video, jury Q&A |

Interface between the two halves: the planner exposes `plan_basket(input) -> PlanResult` (JSON). Both sides agree on this schema at 10:45.
