# 06. Test Data Spec

The Careem sandbox test world has only 2 grocery orders, a Quik store with 8 products, and no rice, atta or most vegetables. That cannot show drift, cycles or priority filling. We add our own fixtures on the day, **in Careem's exact response format** (copy shapes from `spec/FIXTURES.md` and the tool files in the sandbox package). Every fixture record carries `sample: true` and the UI shows a "Sample data" banner.

These fixtures are written during the hackathon, from this spec.

## Household

- Persona: the sandbox user (Leonardo DiCappuccino), Home in Dubai Marina, coordinates 25.0866, 55.1474.
- Story: family of four, budget pressure this month.
- History: 10 weekly grocery orders, Saturdays, ending last Saturday.

## Stores

| Store | merchant_id | Type | Delivery | Service fee | Notes |
|---|---|---|---|---|---|
| Careem Quik Dubai Marina | 40001 | Quik | from sandbox | from sandbox | Extend catalogue with staples |
| Marina Fresh Market | 40101 | Shops | AED 7 | from sandbox | Cheaper staples, full range |
| JLT Organic Pantry | 40201 | Shops | AED 9 | from sandbox | Pricier, **missing** atta and water |
| (optional) second supermarket | 40301 | Shops | AED 5 | | Only if time; makes comparison richer |

Target outcome: Marina Fresh Market narrowly beats Quik for the full basket; JLT is disqualified for missing essentials. (The planning mock-up had Marina at AED 148.70 vs Quik AED 150.90.)

## Catalogue additions (per store)

| Item | Category | Tier | Size | Quik AED | Marina AED | JLT AED | Cheaper swap at same store |
|---|---|---|---|---|---|---|---|
| Drinking water 6x1.5L | Water | T1 | 6 pack | 9.50 | 8.75 | n/a | |
| Basmati rice 5kg (brand A) | Staples | T2 | 5kg | 42.00 | 39.50 | 48.00 | Basmati rice 5kg (store brand) 34.00 |
| Atta wheat flour 5kg | Staples | T2 | 5kg | 18.50 | 17.25 | n/a | |
| Sunflower oil 1.8L | Staples | T2 | 1.8L | 16.75 | 15.90 | 21.00 | |
| Toor dal 1kg | Staples | T2 | 1kg | 9.25 | 8.50 | 11.00 | |
| Fresh milk 2L | Fresh | T3 | 2L | 10.50 | 10.25 | 13.00 | |
| Eggs 30 | Fresh | T3 | 30 | 21.00 | 19.50 | 26.00 | |
| Onions 1kg | Fresh | T3 | 1kg | 4.25 | 3.75 | 6.00 | |
| Tomatoes 1kg | Fresh | T3 | 1kg | 5.50 | 4.95 | 7.50 | |
| Arabic bread | Fresh | T3 | pack | 3.00 | 2.75 | 4.00 | |
| Dish soap 750ml | Household | T4 | 750ml | 8.25 | 7.95 | 12.00 | |
| Potato chips family pack | Treats | T5 | 150g | 7.50 | 6.95 | 9.00 | |
| Cola 6x330ml | Treats | T5 | 6 pack | 11.00 | 10.50 | n/a | |
| Chocolate bar multipack | Treats | T5 | 4 pack | 9.75 | 9.25 | 14.00 | |

Prices are illustrative and can be tuned on the day so the story lands. Keep them plausible for Dubai.

## Order history patterns (10 weeks)

| Item | Pattern | What it demonstrates |
|---|---|---|
| Water | Every week, qty 2 | T1, weekly cycle |
| Rice 5kg | Every 3 weeks; price 38.00 rising to 42.00 | Price drift (+10.5%), slow cycle, swap candidate |
| Atta 5kg | Every 2 weeks | Staple cycle |
| Oil | Every 3 weeks | Staple cycle |
| Dal | Every 2 weeks | |
| Milk | Every week, qty 2; price 9.50 to 10.50 | Drift on a weekly item |
| Eggs | Every week | |
| Onions, tomatoes | Every week | |
| Bread | Every week, qty 2 | |
| Dish soap | Every 4 weeks, last bought 1 week ago | Deferred: not due this week |
| Chips | 8 of 10 weeks | Treat, but frequent: user may override to keep |
| Cola | Every week | Cut first under budget |
| Chocolate | 6 of 10 weeks | Cut first |

Last week's total should be about AED 186. "Cut 15%" gives a budget of about AED 158. The planned basket should land under that, with the best promo (e.g. free delivery) bringing the exact total lower.

## Demo assertions (write as tests)

1. Rice shows drift of about +10% and is swapped to the store brand.
2. Dish soap is deferred with a next-due date, not cut.
3. Cola and chocolate are cut; chips are cut unless overridden.
4. Water, rice, atta, oil, milk, eggs are always in the final basket.
5. Marina Fresh Market is chosen; JLT is shown as missing atta and water.
6. Estimated total <= budget.
7. Monthly saving is computed and positive.

## Format rules

- Match field names, nesting and types of the real tool outputs exactly, so swapping to production needs no code change.
- Keep fixtures in `/fixtures` as JSON, loaded by our data layer (not by editing the sandbox's own fixtures, unless the sandbox format makes that simpler). **[DECIDE on the day]**
- Never mix sample and real records without the `sample` flag.
