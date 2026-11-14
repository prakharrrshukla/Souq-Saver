# 07. Demo and Pitch

Format: 3 minutes of demo, then 2 minutes of jury Q&A. Scored mainly under Pitch (10) but it is also how judges see Technical Execution and Impact.

## Three-minute script

| Time | Who | What is said or shown |
|---|---|---|
| 0:00 to 0:25 | Speaker 1 | **Problem.** "Groceries are the biggest weekly bill for most households here. Prices creep up, the cheapest store changes every week, and when money is tight people cut the wrong things. Careem already knows what you buy. Souq Saver turns that history into a plan that fits your budget." |
| 0:25 to 0:40 | Speaker 1 | Show the app. Point at the sample-data banner: "This is sample history in Careem's exact format, running through the Careem MCP sandbox." |
| 0:40 to 1:30 | Speaker 2 | Type: **"Same as last week, but cut 15%."** Trace panel lights up: `user_info`, `get_activities`, `groceries_get_items_details`, analysis, Quik search, `global_search`, Shops search, priority fill, store picker. Show spend by category and the rice price drift. |
| 1:30 to 2:10 | Speaker 2 | Store comparison: Marina Fresh Market cheapest, Quik close, JLT missing essentials. Basket: water and staples kept, rice swapped to store brand, dish soap not due, cola and chocolate cut. "Why did you drop the chocolate?" (optional, one line). |
| 2:10 to 2:30 | Speaker 2 | Click **Approve**. `create_grocery_cart_with_quantities`, then `cart_get_basket_price` with promo. "Cart ready, AED X. Nothing has been charged; checkout always needs the user." |
| 2:30 to 2:45 | Speaker 1 | Same request in Arabic (pre-typed). Reply in Arabic, right-to-left. "Arabic, English, Hindi, Urdu, Tagalog." |
| 2:45 to 3:00 | Speaker 1 | **Close.** "Built today on Careem MCP and AWS Bedrock. About AED 190 a month saved for this household. Works for every Careem user from day one." |

Fallback: if anything fails live, switch to the backup video at the same timestamp and keep talking.

## Architecture in one sentence

"A web chat app calls Claude on AWS Bedrock; the model uses our planning tools, which call the Careem MCP for history, catalogues and baskets; all the money maths runs in tested code, and anything that touches a cart needs the user's approval."

## Lines mapped to the scoresheet

| Criterion | Line to say |
|---|---|
| Innovation (25) | "It doesn't just list groceries. It solves the budget: necessities first, cheapest store for the whole basket, cuts from the bottom." |
| Technical (30) | "Every step you saw was a real Careem MCP tool call. The model runs on Bedrock, and all the money maths is tested code." |
| Impact (25) | "Groceries are weekly for millions of Careem users. Useful on day one, fully personalised in about two months." |
| UX (10) | "One screen, your language, and nothing happens without your approval." |
| Pitch (10) | Stay on time. One flow, one number, one close. |

## Jury Q&A (prepared answers)

**Is this real data?**
Sample history in Careem's exact response format, through the official sandbox. The same code points at production by changing the URL and adding OAuth. (If production worked: show the real cart in the Careem app.)

**What about new users with no history?**
Day one: 30-second onboarding plus Quik top picks. Week 2: "same as last week". Week 4: personalised tiers. About two months: fully personalised.

**Why not just reorder last week?**
Reorder copies last week, including price rises and things you don't need yet. We reprice, swap, defer items not due and pick the cheapest store.

**How do you stop it ordering by mistake?**
Mutating tools are behind a code-level approval gate, not just a prompt. Checkout is never called in this demo. Mutating calls are never retried after a timeout.

**Why one store per order?**
Careem baskets are per merchant, and two deliveries usually cost more in fees than they save. Splitting is future work.

**What about promo codes?**
`cart_get_basket_price` applies the best promo automatically. There is no tool to force a specific code, so we don't pretend to.

**Where is voice?**
Planned; we cut it to make the core flow solid today. Text works in five languages now.

**How does it scale?**
Analysis is per household and cheap: up to 105 orders, simple statistics. The model is only used for language and explanation. Deploys on Bedrock AgentCore.

**How do you make money for Careem?**
Higher retention and basket frequency for budget-sensitive users; store choice drives volume to Shops merchants as well as Quik.

**Why didn't you use Kiro?**
We built with Claude Code to move fastest in one day. The product itself runs on AWS Bedrock and the Careem MCP, which is where the integration matters.

## Backup video

- Record the full flow at 17:15, screen plus voice, under 3 minutes.
- Save locally and on a phone. Do not upload publicly (T&C 6.3).
