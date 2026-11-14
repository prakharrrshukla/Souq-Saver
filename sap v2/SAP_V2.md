# Souq Saver v2: what changed from v1

SAP V2 keeps the v1 frontend exactly as it was and rebuilds the backend around an **AI household
engine**. In v1 every decision came from fixed rules. In v2 an AI model on AWS Bedrock makes the
judgements, and a calculator written in code checks every number.

For how to run it, read [README.md](README.md). Everything v1 already had (the web app, the Careem MCP
client, the approval gate, X-ray, the local Careem MCP sandbox) is explained in
[PROJECT_EXPLAINED.md](PROJECT_EXPLAINED.md), which still applies.

## In one paragraph

You type a request in your own words, in English, Arabic, Hindi, Urdu or Tagalog, for example
"I only have 120 dirhams this week, keep my chips, add 2 kg of bananas". The orchestrator agent reads
the household's history through the Careem MCP. The AI engine learns what this household likes,
dislikes, has switched away from, and what is due this week. It then builds the basket at the cheapest
suitable store. The calculator adds up every plan with the stores' real prices and fees and sends any
problem back, and the AI revises its plan. You see the basket, the reasons for every item and the store
comparison, and nothing is charged until you approve.

## How a request flows (in order)

| # | Who | What happens |
|---|---|---|
| 1 | Web chat | You type any request |
| 2 | Orchestrator (AI on Bedrock) | Understands the request: budget, cut %, items to keep, add or drop |
| 3 | Careem MCP | `user_info`, `get_activities` (groceries and shops), `groceries_get_items_details` |
| 4 | AI engine: learn the household | For every product: due / not due (with date) / stopped / occasional, tier T1 to T5, usual quantity, brand loyalty, with evidence. Also likes, dislikes and switches |
| 5 | Careem MCP | `search_groceries_items` (Quik), `global_search`, search and `cart_get_basket_price` per Careem Shops store |
| 6 | AI engine: build the basket | Picks one store; keeps, swaps, reduces or cuts each need; writes a note per item |
| 7 | Calculator (code) | Checks prices, fees, budget, loyalty, essentials, every need exactly once. Rejects with reasons; the AI revises (up to 3 tries) |
| 8 | Web chat | Basket, store comparison, reasons, Approve button |
| 9 | Approve | One-time token, then `create_grocery_cart_with_quantities` and `cart_get_basket_price`. Checkout is never called |

## What the AI decides, and what it does not

| The AI decides | The calculator (code) decides |
|---|---|
| What the household likes and dislikes | Every total, fee and saving |
| Switches (e.g. cow milk to oat milk) | Whether a plan fits the budget |
| What is due this week, from purchase rhythms | Whether an item is really sold at that store |
| How essential each product is for this family | Rule checks: no loyal swaps, no cutting water or staples, nothing the user asked to keep is cut |
| Which swaps are acceptable, which store to use | Purchase gaps in days, handed to the AI as facts |

Everything the AI sees comes from Careem MCP responses. It is never given labels such as "this is a
switch"; it has to work them out from dates, quantities, prices and stores.

## The model

The hackathon AWS account blocks Anthropic models (a one-time use-case form is required), so v2 uses
another provider's model. About 25 Bedrock models were tested on the real task with
`server/scripts/eval-models.ts`:

| Model | Result |
|---|---|
| **OpenAI gpt-oss-120b** (`openai.gpt-oss-120b-1:0`) | **Chosen.** Read all three households correctly (Leonardo 12/12, Khan family 11/11, Joy 10/10). About 5B active parameters, 20 to 60 s per request |
| Mistral Ministral 3 8B | Backup model. Lightest, but misses some due items |
| Moonshot Kimi K2 Thinking | Accurate but very large and slow |
| Amazon Nova, Google Gemma 3, Qwen3, gpt-oss-20b | Missed key judgements or broke the rules |

Set in `.env` (never committed): `AWS_*` credentials, `AWS_REGION=us-east-1`,
`BEDROCK_MODEL_ID=openai.gpt-oss-120b-1:0`, `BEDROCK_FALLBACK_MODEL_ID=mistral.ministral-3-8b-instruct`.
Without Bedrock the app runs the v1 rule-based engine and labels it as such.

## Three demo households

All invented, all in Careem's exact response format, all served by the local Careem MCP sandbox.

| Switch with | Household | What the AI has to work out |
|---|---|---|
| `npm run persona -- leonardo` | Leonardo DiCappuccino, Dubai Marina (Careem's sandbox user), 16 weeks | Loyal to Royal Mahal rice and Noor oil; tried Golden Sella once and dropped it; cow milk to oat milk in week 11; monthly atta and dal at Marina Fresh Market; bulk water buy; away in week 12 |
| `npm run persona -- family` | The Khan family (6), Al Barsha, 14 weeks | New baby from week 8 (diapers, more milk and eggs); monthly bulk rice, atta and dal at Marina; guest week with double chicken and cola |
| `npm run persona -- single` | Joy Dela Cruz, JLT, 12 weeks | Switched from noodles, cola and chips to healthy food in week 7; coffee beans only from JLT Organic Pantry; away in week 9 |

After switching, press Reset in the app. `npm test` always regenerates Leonardo.

## Safety, unchanged from v1 and still enforced in code

- Checkout is blocked for every caller.
- Cart changes need a one-time token that only the Approve button sends.
- Mutating calls are never retried.
- If the budget cannot be met without breaking the household's rules, the shortfall is shown honestly.

## New and changed files

| File | What |
|---|---|
| `server/src/brain/brain.ts` | The AI household engine: learn the household, build the basket, revise |
| `server/src/brain/check.ts` | The calculator |
| `server/src/brain/brain.test.ts` | Engine and calculator tests with a scripted model |
| `server/scripts/eval-models.ts` | Scores any Bedrock model on any household |
| `server/src/agent/bedrock.ts` | Structured (forced tool) calls, retries, fallback model |
| `server/src/agent/tools.ts`, `agent.ts`, `texts.ts` | AI engine wiring, reply-language rewrite, language detection |
| `server/src/mcp/client.ts` | Home coordinates follow the selected household |
| `fixtures/household.config.ts`, `fixtures/personas.ts`, `fixtures/generate.ts` | Three households, Shops orders, per-household `user_info` |

## Tests

`npm test`: 69 pass. Five v1 demo-story tests are skipped on purpose: they check v1's rule engine on its
old 10-week story, which the v2 AI engine replaces.

## Honest limits

- Sample data only; real Careem accounts are not connected (the team chose the sandbox).
- AWS session keys expire about every hour; paste fresh ones into `.env` before the demo.
- A request takes 20 to 60 seconds, and the AI can judge borderline items differently between runs.
- No voice, no checkout, no splitting an order across stores, no promo-code choice.
