# 03. Product Spec

## Problem

Gulf households spend a large share of income on groceries, prices drift up quietly, and the cheapest store changes from week to week. Careem already knows what a household buys, but nobody turns that history into a plan that fits a budget. When money is tight, people cut the wrong things or overpay for convenience.

## Who it is for

- **Primary:** an existing Careem grocery customer with a monthly budget (families, shared flats, workers sending money home).
- **Secondary:** a brand-new Careem user, served by a short onboarding until history builds up.
- Languages: Arabic, English, Hindi, Urdu, Tagalog.

## The submitted idea (as entered)

A budget-aware household agent for Careem. It analyses order history through the Careem MCP to model spend by category, price drift and consumption cycles. It builds a weekly grocery basket to a set budget, swapping in cheaper equivalents and timing reorders. It reports projected monthly savings. Nothing is charged without confirmation. Multilingual voice and chat. "Same as last week, cut 15%" returns a repriced cart.

## Feature list (final, 12 build features)

| # | Feature | What it does | Must or nice |
|---|---|---|---|
| F1 | History analysis | Pull up to 105 past grocery and shops orders with `get_activities`, enrich items with `groceries_get_items_details` (category, price, promos) | Must |
| F2 | Category spend | Spend by category per week and month | Must |
| F3 | Price drift | Per item, price change across orders; flag items that rose | Must |
| F4 | Consumption cycles | Per item, median days between orders; predict next due date | Must |
| F5 | Budget target | User sets a weekly budget, or a relative cut ("cut 15%") from last week's total | Must |
| F6 | Priority filling | Fill basket by necessity tier, cut from the bottom when over budget | Must |
| F7 | Cheaper swaps | Swap an item for a cheaper equivalent (same category, similar size), with the saving shown | Must |
| F8 | Deals and promos | Prefer items on discount (`on_discount`, Quik deals); best promo applied by `cart_get_basket_price` | Must |
| F9 | Store choice | Compare Quik vs Shops merchants for the whole basket, including delivery and service fees, pick the cheapest | Must (team marked "extremely important") |
| F10 | Confirmation gate | Show the basket, store, estimated total; build the cart only after "Approve"; show the exact total from `cart_get_basket_price` | Must, never cut |
| F11 | Savings report | Projected monthly saving vs last month's pattern, plus reorder dates | Must |
| F12 | Five languages (text) | Understand and reply in Arabic, English, Hindi, Urdu, Tagalog | Must |

## Scope decisions (firm)

| Decision | Status |
|---|---|
| Build on the local sandbox with labelled fixture data | Yes |
| Switch to real order history only if production works for us | Optional, see 08 |
| Voice | **Cut.** Say so honestly in the demo. |
| Checkout on stage | **No.** Demo ends at an approved, priced cart. |
| Promo advisor (pick specific promo codes) | Out. No tool exists to apply a chosen code; best promo is automatic. |
| Splitting one order across stores | Out. One store per order. |
| Rides | Out. |
| Our own web chat app, not a Careem clone or inside the Careem app | Yes |
| Show tool-call steps live | Yes |
| Run on localhost, backup video | Yes |

**Build rule:** build one full flow end to end first, then add features. Cut from the bottom of the "nice" list. Never cut the confirmation gate.

## Priority tiers (F6)

Default tiers, personalised per household from history and user overrides:

| Tier | Examples | Behaviour when over budget |
|---|---|---|
| T1 Water | Drinking water | Never cut |
| T2 Staples | Rice, wheat flour (atta), cooking oil, dal/lentils, sugar, salt | Never cut, may swap to cheaper |
| T3 Fresh essentials | Milk, eggs, bread, onions, tomatoes, vegetables | Reduce quantity before cutting |
| T4 Household | Dish soap, detergent, tissue | Defer if not due this week (cycle says so) |
| T5 Treats | Snacks, soft drinks, chocolate | Cut first |

Personalisation:
- An item bought in almost every order is promoted one tier (it is a household staple for them).
- A user override ("chips are essential for us") pins a tier.
- Items not due by consumption cycle are deferred, not cut, and shown with their next due date.

## Store choice (F9)

1. Search Quik for the list (`search_groceries_items` without `merchant_id`). The Quik response returns its `merchant_id` and can suggest up to 3 Shops fallback merchants.
2. Find Shops merchants with `global_search`, then search each one with `search_groceries_items` and its `merchant_id`.
3. For each store, compute: sum of item prices x quantities + delivery fee + service fee. Mark missing essentials.
4. A store missing any T1 or T2 item is disqualified unless the user accepts the gap.
5. Pick the lowest total. Show the comparison table.
6. After approval, build the basket at that store only and get the exact total from `cart_get_basket_price` (subtotal + delivery + service minus the best promo).

## Conversations the agent must handle

- "Same as last week, cut 15%." Budget = last week's total x 0.85.
- "My budget this week is 150 dirhams."
- "We have guests on Friday, add more rice and chicken."
- "Why did you drop the chocolate?" Explain with tier and budget.
- "Keep the chips." Override, re-plan.
- "Which store is cheapest?" Show the comparison.
- "Approve." Build the cart, show the exact price, stop.
- Each of the above in the five languages.

## New users (pitch answer)

| When | What works |
|---|---|
| Day 1 | Basket, budget, priority filling, store choice via 30-second onboarding (household size, staples, budget) plus Quik top-picks fallback |
| Week 2 | "Same as last week", category spend, first price drift |
| Weeks 2 to 3 | Cycles for fast-moving items |
| Week 4 | Personalised tiers |
| Weeks 6 to 8 | Slow-item cycles, reliable drift |

Line: "Useful on day one, learns your habits in about four weeks, fully personalised in about two months."

## What the agent never does

- Never checks out without explicit approval. On stage, never checks out at all.
- Never retries a mutating call after a timeout. It tells the user and checks first.
- Never presents sample data as the user's real history.
