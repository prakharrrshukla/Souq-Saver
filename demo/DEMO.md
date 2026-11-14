# Demo script (3 minutes) with the real numbers

Numbers below come from the generated household (seed 20261114) and are checked by the tests.
Run `npm run demo:cli` to print them again.

| Fact | Value |
|---|---|
| Last week's order (Careem Quik) | AED 186.15 |
| Budget after "cut 15%" | AED 158.23 |
| Chosen store | Marina Fresh Market (Careem Shops, 40101) |
| Estimated total there | AED 155.35 (items 147.35 + delivery 7.00 + service 1.00) |
| Same basket at Careem Quik | AED 165.50 |
| JLT Organic Pantry | not valid: missing drinking water and atta flour |
| Rice | Royal Mahal Basmati 5kg up 10.5% (38.00 to 42.00); swapped to store brand at 34.00, saves AED 5.50 |
| Not due | dish soap (5 Dec), sugar (12 Dec), laundry detergent (12 Dec), toilet tissue (19 Dec) |
| Cut first | cola, chocolate, chips, ice cream, juice, biscuits |
| Exact total after Approve | AED 148.35 (promo FREEDEL saves the AED 7.00 delivery) |
| Monthly saving (estimate) | about AED 168 |
| Charged | nothing |

## Before going on stage

1. `npm run dev`, open http://localhost:5173, check the footer shows the Bedrock model id (not the stub).
2. Press Reset. The input already says "Same as last week, but cut 15%".
3. Have the backup video ready at the same timestamps.

## Script

| Time | Who | Say and do |
|---|---|---|
| 0:00 to 0:25 | Speaker 1 | **Problem.** "Groceries are the biggest weekly bill for most households here. Prices creep up, the cheapest store changes every week, and when money is tight people cut the wrong things. Careem already knows what you buy. Souq Saver turns that history into a plan that fits your budget." |
| 0:25 to 0:40 | Speaker 1 | Point at the yellow banner. "This is sample history in Careem's exact format, running through the Careem MCP sandbox." |
| 0:40 to 1:30 | Speaker 2 | Press send on **"Same as last week, but cut 15%"**. The tool steps fill in: `user_info`, `get_activities`, `groceries_get_items_details`, analysis, Quik search, `global_search`, Shops searches, store picker, priority fill. "Last week was AED 186.15, so the budget is AED 158.23. Rice has gone up 10.5%." |
| 1:30 to 2:10 | Speaker 2 | Store comparison: "Marina Fresh Market is cheapest at AED 155.35, Quik is AED 165.50, and JLT is out because it has no water or atta." Basket: "Water and staples kept. Rice swapped to the store brand, saving AED 5.50. Dish soap is not due until 5 December, so it waits. Treats are cut first." Optional: click "Why no chocolate?". |
| 2:10 to 2:30 | Speaker 2 | Click **Approve basket**. `create_grocery_cart_with_quantities`, then `cart_get_basket_price`. "Cart ready, AED 148.35 with free delivery applied. Nothing has been charged; checkout always needs the user." |
| 2:30 to 2:45 | Speaker 1 | Click the **العربية** example and send. The reply is Arabic, right to left. "Arabic, English, Hindi, Urdu, Tagalog." Optional: open X-ray and expand one Careem call. |
| 2:45 to 3:00 | Speaker 1 | **Close.** "Built today on Careem MCP and AWS Bedrock. About AED 168 a month saved for this household, as an estimate. Works for every Careem user from day one." |

## If asked

- **Is this real data?** Sample history in Careem's response format through the official sandbox package. Production needs the URL and OAuth.
- **How do you stop it ordering by mistake?** Checkout is blocked in code. Cart changes need a one-time token that only the Approve button sends. Mutating calls are never retried. Show the X-ray `approval` and `guard` steps.
- **Is the exact total real?** The sandbox cart keeps no state, so the subtotal is our planned basket; fees and the promo come from `cart_get_basket_price`. We say so on screen.
- **Who does the maths?** Tested TypeScript, never the model. `npm test` runs 68 tests.
- **How is the monthly saving worked out?** (Average of the last 4 weekly orders, AED 194.23, minus this week's AED 155.35) × 4.33. An estimate: the planned week leaves out items that are not due yet.
- **Why not Kiro?** We built with Claude Code to move fastest in one day; the product runs on Bedrock and the Careem MCP.

Do not publish the demo or the video (T&C 6.3).
