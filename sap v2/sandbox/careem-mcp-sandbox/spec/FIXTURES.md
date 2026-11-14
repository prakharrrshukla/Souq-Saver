# Fixtures

All tool scenarios share one world so that multi-step flows (search → options → add to cart →
checkout, or Box config → quote → order) line up
across tools. When you add
or edit a scenario, reuse these ids instead of inventing new ones. None of it is real data.

Where the real schema requires an integer id, the numeric form listed here is used.
Each tool file's notes list its own trigger values.

## Persona

| Field | Value |
| --- | --- |
| User id | `900000001` |
| Name | Leonardo DiCappuccino |
| Email | `leo.dicappuccino@finally-won-an-oscar.coffee` |
| Phone | `+971500000001` |
| City / country | Dubai, AE (currency `AED`) |
| Language | `en` |

Identity-side ids: encrypted user id `enc_900000001`, partner token
`partner-access-token`, city id `1` (Dubai, timezone `Asia/Dubai`).

## Saved addresses / locations

| Label | Id | Title | Lat, Lng |
| --- | --- | --- | --- |
| Home | `50001` | Marina Gate 1, Dubai Marina | 25.0866, 55.1474 |
| Work | `50002` | Emirates Towers, Sheikh Zayed Rd | 25.2172, 55.2826 |
| Gym | `50003` | Fitness Hub, JLT Cluster D | 25.0702, 55.1430 |
| New bookmark (save_new_address) | `50004` | | |
| Popular POI | `poi_dubai_mall` | Dubai Mall, Downtown Dubai | 25.1972, 55.2796 |
| Popular POI | `poi_dxb_t3` | Dubai International Airport T3 | 25.2528, 55.3644 |
| Unsaved point | — | Bahar 4, JBR (reverse-geocode default) | 25.0779, 55.1335 |

Location UUIDs — production only trusts the uppercase `LOC-` prefix (anything else gets a new
POI minted): saved places `LOC-50001` … `LOC-50004`; POIs `LOC-poi-dubai-mall`,
`-marina-mall`, `-dxb-t3`, `-dxb-t1`, `-dwc`; minted for the unsaved point
`LOC-poi-bahar-4`. Order POIs (Box) append a drop-off detail: `LOC-50001::LDD-90001`,
`LOC-50002::LDD-90002`. Provider place ids `place_dubai_mall`,
`place_fitness_hub`.

## Payments

| Instrument | Id | Details |
| --- | --- | --- |
| Card | `4242` (`"4242"` where the schema wants a string; `{ "type": "card", "id": 4242 }` in cart) | Visa •••• 4242 (preferred) |
| Wallet | — | Careem Wallet, balance AED 125.50 (API: amount `12550`, 2 decimals) |
| Cash | `cash` | |

Payment ids that fail: `4000002` (card declined at checkout); any card id other than `4242`
(Box: not available).

## Food

| Restaurant | Id | Notes |
| --- | --- | --- |
| Shawarma Station | `30101` | Arabic, 20–30 min, AED 7 delivery, 4.6★ |
| Sakura Sushi Lab | `30102` | Japanese, 35–45 min, free delivery, 4.4★, 15% off |
| Pizza Piazza | `30103` | Italian, 25–35 min, AED 5 delivery, 4.5★ |
| Morning Syrniki Café | `30104` | Breakfast / Ukrainian, 20–30 min, 4.8★ |
| Green Bowl Co. | `30105` | Healthy / salads, 25–35 min, AED 6 delivery, 4.3★, **no scheduled orders** |

Scheduling: 30-minute slots today and tomorrow, starting `{{now+2h}}` / `{{now+24h}}`; the day
after tomorrow is inactive. Pizza Piazza `30103`'s requested slot is full upstream (the tool
still reports it available — a production quirk). `restaurant_id: 0` → not found.

Menu items (id — name — price AED):

- `700101` Chicken Shawarma Wrap — 18 (options: size Regular/Large +6, extra garlic +2)
- `700102` Falafel Plate — 22
- `700103` Mixed Grill Platter — 65
- `700201` Salmon Avocado Roll (8 pcs) — 42
- `700202` Chicken Katsu Bento — 48
- `700301` Margherita Pizza — 39 (options: size Medium/Large +12, crust Classic/Thin)
- `700302` Pepperoni Pizza — 46
- `700401` Classic Syrniki with Sour Cream — 34 (options: topping Sour cream/Berry jam/Condensed milk)
- `700402` Cappuccino — 19 (options: milk Full/Oat +3/Almond +3, size)
- `700501` Chicken Caesar Bowl — 38
- inactive: `700403` Berry Syrniki (seasonal; also "unavailable for this slot" in cart),
  `700404` Iced Cappuccino, `700104` Family Shawarma Box — 79

Option ids follow production's `<group>::<option>` format, e.g. Syrniki topping sour cream
`84011::840111`, Cappuccino milk full `84021::840211` / oat `84021::840212` (+3), size `84022::…`.
`food_get_item_options` is the source of truth for every option id.

Brand ids are `1301xx` (e.g. `130104`). Past-order basket ids `5008001`, `5008000`, `5007999`.
Food search: `classifier_status` is `ok`, `fallback_default`, or `skipped` (explicit tab).

Past food orders (integer ids, as in the real schema): `8001` — 2× Classic Syrniki + 1× Cappuccino
from Morning Syrniki Café, delivered to Home; `8000` shawarma; `7999` pizza.

## Groceries (Quik and Careem Shops)

| Thing | Value |
| --- | --- |
| Store | Careem Quik Dubai Marina, merchant id `40001` (brand `40000`), 15–20 min; Quik captain Omar R. `+971500000012` |
| Notes | the `sku_*` names live in `master_product_id`; `4000106` avocado is out of stock; `4000108` coffee is the deal (discounted), `4000109` Ground Coffee 500g AED 72 is its variant; `4000199` is an unknown id; terms containing `unicorn` find nothing; `latitude: 0` is outside the service area |
| Careem Shops merchants | `40101` Marina Fresh Market (brand `40100`, 30–40 min, AED 7 delivery, 4.6★) · `40201` JLT Organic Pantry (brand `40200`, 40–50 min, AED 9, 4.4★) |
| Shops items | `4010101` Organic Full Cream Milk 1L AED 8.50 · `4010102` Organic Free Range Eggs 6pk AED 12.75 · `4010103` Ginger Kombucha 330ml AED 14.00 · `4020101` Original Kombucha 330ml AED 13.50 |
| Categories | deals filter `7100000`; group `7100108` "Coffee & Tea"; core categories `71xx` / `81xx` |
| Products (item id → name) | `4000101` Fresh Farm Full Cream Milk 1L AED 6.75 · `4000102` Free Range Eggs 12pk AED 14.50 · `4000103` Sourdough Loaf AED 12.00 · `4000104` Bananas 1kg AED 7.25 · `4000105` Mineral Water 6×1.5L AED 9.95 · `4000106` Hass Avocado 2pk AED 11.50 · `4000107` Greek Yogurt 500g AED 13.25 · `4000108` Ground Coffee 250g AED 32.00 |

## Cart / checkout

| Thing | Value |
| --- | --- |
| Food basket | `6000001` — Morning Syrniki Café: 2× Classic Syrniki + 1× Cappuccino; items 87.00 + delivery 5.00 + service 2.50 − CAREEM20 15.00 = **AED 79.50** |
| Grocery basket | `6000002` — Quik: 2× milk + eggs + sourdough; 40.00 + delivery 4.00 + service 1.50 = **AED 45.50** |
| Shops basket | `6000003` → order `9003` / `INV-9003` |
| Placed food order | `9001` / `INV-9001` |
| Placed grocery order | `9002` / `INV-9002` |
| Promo ids | 510020 `CAREEM20`, 510030 `FREEDEL`, 510010 `EXPIRED10` |
| Checkout promos | `CAREEM20` (best, auto-applied), `FREEDEL`, `EXPIRED10` (expired) |
| Deep links | `https://…?adjust_t=1k9x2mq&invoiceId=…` (production uses a real Adjust tracker — never copied here) |
| Slots in cart | slot start containing `T23:` → reschedule rejected (Cappuccino unavailable); `scheduled_slot_end: ""` → half-specified slot error |

## Activities

String reference ids used by `get_activities` / `track_activity`:

| Reference | What |
| --- | --- |
| `ride_1001` | ongoing ride (Ahmed K.) |
| `ride_1002` | upcoming scheduled ride |
| `ride_0999` | past ride |
| `order_9001` | placed food order 9001 |
| `order_9002` | ongoing Quik order 9002 (`merchant_type: ufd`; captain Omar R.) |
| `order_8001`, `order_8000`, `order_7999` | past food orders (the last two on page 2, cursor `cursor_page2`) |
| `order_9201` | past Careem Shops order (`merchant_type: retail`, basket `6000101`, AED 52) |
| `box_7001` | ongoing Box delivery Home → Work, captain Khalid M. `+971500000021`, AED 22 cash |
| `pay_0001` | Careem Pay activity the tool filters out |

Page size is 35.

## Box (Careem Box — send / buy)

| Thing | Value |
| --- | --- |
| Area | Dubai only; `latitude: 0` (non-zero longitude) is outside the Box area |
| Default trip | Home `LOC-50001` → Work `LOC-50002`, 24.3 km |
| Vehicle types (send) | Motorbike `1501` AED 32–38 (was 36–42), ≤ 7 kg, 35–45 min · Car `1502` AED 45–52, ≤ 60 kg, 40–50 min · Van `1503` AED 89–105, ≤ 300 kg, `TEMP_OFF` at pre-checkout |
| Vehicle types (buy) | Motorbike and Car, unpriced |
| Categories (send) | 1 Food, groceries (default) · 2 Documents and others (as in production). `buy` → none (upstream 204) |
| Config | production texts: "We do not transport anything illegal or prohibited by our terms, including alcohol and money"; suggestions "Upon arrival please call", "Please leave outside the door"; buy cap AED 500 |
| Order | `9101`, invoice `INV-9101`, AED 35.00 (3500, 2 decimals) |
| Magic | `instructions` containing `trigger_hours_closed` / `trigger_wallet_down` / `trigger_card_expired` / `trigger_fraud` / `trigger_invoice_down`; `dropoff_name` containing `abu dhabi` (intercity restricted) |

## Magic values (local-only triggers)

Each tool file documents its own triggers next to each scenario, and
[SCENARIOS.md](SCENARIOS.md) lists every scenario with its match rule. Values reused across
tools:

| Value | Effect |
| --- | --- |
| id / text containing `missing` | upstream 404 / not found |
| text containing `trigger_upstream_down`, merchant id `99999`, restaurant id `39999` | upstream unavailable |
| `latitude: 0` (with non-zero longitude) | outside the service area |
| `0, 0` coordinates | invalid coordinates (where the tool validates them) |
| `latitude: -1` / `1` | groceries top items, deals, serviceability: outage / empty |
| `timezone` containing `pricing-down` / `empty-cart` / `wallet-down` / `basket-down` | cart pricing / empty cart / wallet lookup / Quik basket failures |
| `query` containing `xyz` | food search: no results |
| search term `kombucha` / `yogurt` | groceries: Shops fallback / existing Quik basket |
| `user_info` `service_area_id` 994–999 | new user, bookmarks down, personalization/identity failures |
| maps path containing `..`, `/v2/`, `huge`, `trigger_too_many` | maps resources validation / size errors |

Any scenario can also be forced with `./careem-mcp.sh scenario <tool> <scenario>`.
