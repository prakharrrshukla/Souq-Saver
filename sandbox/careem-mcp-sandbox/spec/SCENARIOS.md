# Scenario index

Every scenario of every tool. Scenarios are tried top to bottom; the first whose
trigger matches the call arguments wins, otherwise the **default** answers. Any scenario can
be forced with `./careem-mcp.sh scenario <tool> <scenario>`. Match syntax: [FORMAT.md](FORMAT.md).

## box

### [box_create_order](tools/box/box_create_order.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-pickup-coordinates` | `{"pickup_latitude":0,"pickup_longitude":0}` |  |
| `missing-pickup-location-id` | `{"pickup_location_id":""}` |  |
| `missing-dropoff-location-id` | `{"dropoff_location_id":""}` |  |
| `missing-cct-id` | `{"cct_id":0}` |  |
| `payment-type-missing` | `{"payment_type":""}` |  |
| `payment-type-unsupported` | `{"payment_type":"~pay"}` | A payment type containing `pay` (e.g. `apple pay`, `careem pay`) is not one of cash/card/wallet. |
| `card-payment-id-empty` | `{"payment_id":"","payment_type":"card"}` |  |
| `wallet-instruments-unavailable` | `{"instructions":"~trigger_wallet_down","payment_type":"wallet"}` | Magic: wallet payment with `instructions` containing `trigger_wallet_down` — the payment-instruments call answered 503. (A card payment fails the same way in production.) |
| `wallet-unavailable` | `{"instructions":"~trigger_wallet_disabled","payment_type":"wallet"}` | Magic: wallet payment with `instructions` containing `trigger_wallet_disabled` — the wallet is disabled for Box now (also what happens when the pickup city can't be resolved). |
| `fraud-rejected` | `{"instructions":"~trigger_fraud","payment_type":"cash"}` | Magic: cash with `instructions` containing `trigger_fraud` — everything validated, but the order API rejects the cash order (403, fraud prevention). The body is not read, so only the status reaches … |
| `upstream-unavailable` | `{"pickup_longitude":0}` | Internal failure (magic `pickup_longitude: 0` with a non-zero latitude, or `./careem-mcp.sh scenario`): the create-order API answered 503. Also stands for transport errors and the unreachable … |
| `invoice-lookup-failed` | `{"instructions":"~trigger_invoice_down","payment_type":"cash"}` | Magic: cash with `instructions` containing `trigger_invoice_down` — the order is placed but the invoice lookup fails, so `amount`/`currency_code` are omitted. |
| `card-paid` | `{"payment_id":"4242","payment_type":"card"}` | Visa •••• 4242 (the working, preferred card). |
| `card-not-available` | `{"payment_id":"*","payment_type":"card"}` | Any other card id: not among the user's working cards. |
| `card-payment-id-missing` | `{"payment_type":"card"}` | Card without `payment_id`. |
| `wallet-paid` | `{"payment_type":"wallet"}` |  |
| `cash-paid` | `{"payment_type":"cash"}` | Cash still gets an invoice (paid to the captain), so `amount` is filled. |
| `payment-type-invalid` | **default** | Default: any other `payment_type` (e.g. `bank transfer`) is rejected before any order call. |

### [box_get_categories](tools/box/box_get_categories.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-business-type` | `{"business_type":"~deliver"}` | Any value other than `send`/`buy`; the triggers it on values containing `deliver`. |
| `invalid-location` | `{"latitude":0,"longitude":0}` |  |
| `outside-service-area` | `{"latitude":0}` | `latitude: 0` with a non-zero longitude: not a Box city, upstream 400. |
| `upstream-unavailable` | `{"longitude":0}` | Internal failure (magic `longitude: 0` with a non-zero latitude, or `./careem-mcp.sh scenario`): upstream 503. Also stands for transport errors and the unreachable `internal server error`. |
| `buy-no-categories` | `{"business_type":"buy"}` | Box Purchase has no categories in Dubai: upstream answers 204, the tool returns an empty list and no title — skip category selection and omit `package_category_id` later. |
| `send-dubai` | **default** | Default: Box Delivery categories. |

### [box_get_config](tools/box/box_get_config.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-business-type` | `{"business_type":"~deliver"}` | Any `business_type` other than `send`/`buy` — the triggers it on values containing `deliver` (e.g. `delivery`). Production also rejects `Send` (case-sensitive), which the case-insensitive local … |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `0, 0` (or out-of-range) coordinates; no upstream call. |
| `outside-service-area` | `{"latitude":0}` | `latitude: 0` with a non-zero longitude: the point is valid but not in any Box city, so upstream answers 400 (body ignored). |
| `upstream-unavailable` | `{"longitude":0}` | Internal failure (magic `longitude: 0` with a non-zero latitude, or `./careem-mcp.sh scenario`): upstream answers 503. Also stands for transport errors (`failed to fetch box config: <transport … |
| `buy-dubai` | `{"business_type":"buy"}` | Box Purchase: the captain buys items for the user. |
| `send-dubai` | **default** | Default: Box Delivery from a Dubai pickup. |

### [box_get_vehicle_types](tools/box/box_get_vehicle_types.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-business-type` | `{"business_type":"~deliver"}` | Any value other than `send`/`buy`; the triggers it on values containing `deliver`. |
| `invalid-pickup-coordinates` | `{"pickup_latitude":0,"pickup_longitude":0}` |  |
| `invalid-dropoff-coordinates` | `{"dropoff_latitude":0,"dropoff_longitude":0}` |  |
| `outside-service-area` | `{"pickup_latitude":0}` | `pickup_latitude: 0` with a non-zero longitude: pickup is not in a Box city, upstream 400. |
| `upstream-unavailable` | `{"pickup_longitude":0}` | Internal failure (magic `pickup_longitude: 0` with a non-zero latitude, or `./careem-mcp.sh scenario`): upstream 503. Also stands for transport errors and the unreachable `internal server error`. |
| `no-vehicles` | `{"dropoff_latitude":0}` | `dropoff_latitude: 0` (non-zero longitude): the dropoff is outside the service area, upstream returns `{"ccts": []}` — an empty list with no error. |
| `buy-unpriced` | `{"business_type":"buy"}` | Box Purchase: no `pricing` upstream, so the price fields are omitted. |
| `send-home-to-work` | **default** | Default: three priced vehicle types for Home → Work. |

### [box_pre_checkout](tools/box/box_pre_checkout.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-pickup-coordinates` | `{"pickup_latitude":0,"pickup_longitude":0}` |  |
| `invalid-dropoff-coordinates` | `{"dropoff_latitude":0,"dropoff_longitude":0}` |  |
| `missing-cct-id` | `{"cct_id":0}` |  |
| `upstream-unavailable` | `{"pickup_longitude":0}` | Internal failure (magic `pickup_longitude: 0` with a non-zero latitude, or `./careem-mcp.sh scenario`): pre-checkout answered 503. Also stands for transport errors and the unreachable `internal … |
| `city-off` | `{"pickup_latitude":0}` | `pickup_latitude: 0` (non-zero longitude): pickup outside any Box city. |
| `intercity-restricted` | `{"dropoff_name":"~abu dhabi"}` | `dropoff_name` containing `Abu Dhabi`: pickup and dropoff are in different cities. |
| `hours-closed` | `{"instructions":"~trigger_hours_closed"}` | Magic: `instructions` containing `trigger_hours_closed` — outside Box operating hours. |
| `temp-off` | `{"cct_id":1503}` | `cct_id: 1503` (Van) is temporarily paused. |
| `cash-only` | `{"instructions":"~trigger_wallet_down"}` | Magic: `instructions` containing `trigger_wallet_down` — the payment-instruments call failed (503), so production falls back to cash only. Same output when the city can't be resolved or the user … |
| `wallet-preferred` | `{"instructions":"~trigger_card_expired"}` | Magic: `instructions` containing `trigger_card_expired` — the only card is expired, so it is not listed and the wallet is preferred. |
| `location-id-unresolved` | `{"dropoff_location_id":"~missing"}` | `dropoff_location_id` containing `missing` (not `LOC-` prefixed): `CreateOrderPOI` fails, the raw id is echoed back unchanged. |
| `bookmark-ids-resolved` | `{"pickup_location_id":"50001"}` | `pickup_location_id: "50001"` (the Home bookmark id instead of a LOC id): both ids are minted into transactional order POIs via `CreateOrderPOI` (The local server assumes dropoff `50002`). |
| `car-quote` | `{"cct_id":1502}` | `cct_id: 1502` (Car). |
| `available-motorbike` | **default** | Default: Motorbike Home → Work is available; card, wallet and cash offered (card preferred). |

## cart

### [cart_add_item](tools/cart/cart_add_item.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | Only a slot start (end passed as `""`): production refuses to silently fall back to an on-demand line. |
| `out-of-stock` | `{"catalog_item_id":"4000106"}` | Adding `4000106` (Hass Avocado 2pk) fails: the item is out of stock. |
| `unavailable-for-slot` | `{"catalog_item_id":"700403","scheduled_slot_start":"*"}` | Scheduling Berry Syrniki (`700403`, seasonal) for a slot: upstream answers 400 `UNAVAILABLE_ITEMS_FOR_GIVEN_SLOT` and its message is returned verbatim. |
| `item-unavailable` | `{"catalog_item_id":"999999"}` | `catalog_item_id: "999999"` isn't sold by the merchant: upstream answers 400 `ITEM_NOT_FOUND`; every code other than `ITEM_OUT_OF_STOCK` becomes the generic message. |
| `timeout` | `{"merchant_id":99999}` | Merchant `99999` simulates an upstream timeout. The transport error contains `timeout`, so the tool answers with the retry message. |
| `grocery-add` | `{"merchant_id":40001}` | Any add to Quik store `40001` returns the grocery basket (2× milk + eggs + sourdough, AED 45.50). |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the add succeeds but pricing fails; the mutation's basket is returned enriched (names + currency) without `price` / `payment_method`. |
| `scheduled-add` | `{"scheduled_slot_end":"*","scheduled_slot_start":"*"}` | Both slot fields set: the line is added with a schedule context and the basket comes back with `schedule_details` echoing the slot; promos are evaluated for the slot start (CAREEM20 still applies, … |
| `food-add` | **default** | Default: the item lands in the Morning Syrniki Café basket (2× Syrniki + 1× Cappuccino). |

### [cart_add_items](tools/cart/cart_add_items.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `no-items` | `{"items":null}` | Empty `items` → `no items provided` (with `results: null`). An empty array can't be targeted by a match block (it matches every array), so force this one with `./careem-mcp.sh scenario`; the … |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | Only a slot start (end passed as `""`) → rejected before any basket call. |
| `partial-out-of-stock` | `{"items":[{"catalog_item_id":"4000106"}]}` | Any batch containing `4000106`: avocado fails (out of stock), milk/eggs/bread succeed. |
| `grocery-batch` | `{"merchant_id":40001}` | Batch to Quik store `40001`: milk, eggs and sourdough all added. |
| `all-failed` | `{"merchant_id":99999}` | Merchant `99999` (magic trigger): every AddItem times out, so every line fails; the follow-up pricing also fails and there was no successful basket to fall back to, so `basket` / `price` are omitted. … |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): all lines are added but pricing fails; the basket from the last successful AddItem is returned enriched, without `price` / `payment_method`. |
| `food-batch` | **default** | Default: 2× Classic Syrniki + 1× Cappuccino added to Morning Syrniki Café in one call. |

### [cart_checkout](tools/cart/cart_checkout.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | Only a slot start (end passed as `""`): production refuses to silently degrade to an on-demand order. |
| `location-lookup-failed` | `{"latitude":23.5}` | Latitude `23.5` (magic trigger, empty desert): the saved-address snapping call errors. |
| `location-not-saved` | `{"latitude":25.1972}` | Checking out from Dubai Mall (latitude `25.1972`), which isn't a saved address. |
| `out-of-delivery-area` | `{"latitude":25.0702}` | Checking out from the Gym address (latitude `25.0702`, saved as `LOC-50003`): upstream rejects it with a structured `errorContext` error whose message is returned verbatim. The payment was … |
| `basket-not-found` | `{"basket_id":404}` | `basket_id: 404`: upstream answers 404 with a flat `errorMessage`, returned verbatim. The payment was already resolved, so `payment_type` is present. |
| `upstream-unavailable` | `{"basket_id":99999}` | `basket_id: 99999` (magic trigger): upstream answers 503 with no error body. The payment was already resolved, so `payment_type` is present. |
| `payment-declined` | `{"payment_id":4000002,"payment_type":"card"}` | `payment_type: card` with `payment_id: 4000002`: a saved card the payment service declines (without `payment_type` the id would be ignored and the default card resolved). The payment was already … |
| `price-changed` | `{"total_price":1}` | `total_price: 1` (any stale total in real life) is rejected because it no longer matches the basket. The payment was already resolved, so `payment_type` is present. |
| `cash-order` | `{"payment_type":"cash"}` | `payment_type: cash`: order placed, nothing to pay online. |
| `wallet-order` | `{"payment_type":"wallet"}` | `payment_type: wallet`: paid from the Careem Pay balance (AED 125.50). |
| `shops-order` | `{"domain":"shops"}` | `domain: shops`: same flow with the shops bookmark consumer and settlement keys; `serviceProvider: "shops"`, order `9003` (local server shops basket `6000003`), paid by the default card. |
| `scheduled-order` | `{"scheduled_slot_end":"*","scheduled_slot_start":"*"}` | Both slot fields set: the payload carries a scheduled `delivery` block; the response looks like `card-order`. |
| `card-order` | **default** | Default: payment resolved to card `4242`; returns the pay deep link and echoes `total_price` as `amount`. |

### [cart_delete_basket](tools/cart/cart_delete_basket.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `no-basket` | `{"merchant_id":30101}` | Shawarma Station (`30101`) has no basket: DeleteBasket answers 404, surfaced as the raw status. |
| `upstream-unavailable` | `{"merchant_id":99999}` | Merchant `99999` (magic trigger): the DELETE answers 503. |
| `deleted` | **default** | Default: basket deleted. |

### [cart_delete_items](tools/cart/cart_delete_items.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | Only a slot start (end passed as `""`) → rejected before the DELETE. |
| `upstream-unavailable` | `{"merchant_id":99999}` | Merchant `99999` (magic trigger): the DELETE answers 503. |
| `no-uuids` | `{"item_uuids":""}` | `item_uuids: ""` sends `item_uuids: null`; upstream rejects it with 400. |
| `item-not-found` | `{"item_uuids":"~missing"}` | Any uuid containing `missing`: DeleteItems answers 404 and production surfaces the raw status. |
| `basket-emptied` | `{"item_uuids":"~,"}` | Several uuids at once (any comma in `item_uuids`) empties the basket. The follow-up basket lookup / price calls answer 404 for the now-empty basket and this tool has no fallback basket, so only `success: … |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the delete succeeds but pricing fails; with no fallback basket the output is just `success: true` (same shape as `basket-emptied`). |
| `cappuccino-removed` | **default** | Default: the Cappuccino line is gone: 68.00 + 7.50 − 13.60 = AED 61.90. |

### [cart_get_basket](tools/cart/cart_get_basket.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-merchant` | `{"merchant_id":0}` | `merchant_id: 0` hits the guard against guessed merchants (any value ≤ 0 does). |
| `no-basket` | `{"merchant_id":30101}` | Shawarma Station (`30101`) has no open basket: the upstream API answers 404, which the service maps to a basket-not-found error. |
| `upstream-unavailable` | `{"merchant_id":99999}` | Merchant `99999` (magic trigger): upstream answers 503. |
| `grocery-basket` | `{"merchant_id":40001}` | Quik store `40001` returns the grocery basket (no promo, AED 45.50); `merchant` comes from the nearest-store lookup. |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the basket loads but the price call fails, so production returns the enriched basket and merchant without `price` / `payment_method`. |
| `food-basket` | **default** | Default: the Morning Syrniki Café basket, AED 79.50 with CAREEM20. |

### [cart_get_basket_price](tools/cart/cart_get_basket_price.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | Only a slot start (end passed as `""`) → rejected before any upstream call. |
| `grocery-price` | `{"merchant_id":40001}` | Quik store `40001`. |
| `empty-basket` | `{"merchant_id":30101}` | Shawarma Station (`30101`) has no basket: the promo lookup soft-fails, then the upstream API answers 404 (a basket-not-found error) … |
| `pay-with-wallet` | `{"use_wallet":true}` | `use_wallet: true`. In production `use_wallet` only sets `payment_ctx.isWalletUsed` in the promo request; the payment method still comes from the instruments resolver. This scenario stands in for the … |
| `no-promo-cod` | `{"payment_type":"COD"}` | `payment_type: COD`: the promo request is sent with `paymentType: COD`, which locks the card-only CAREEM20, so no promo is applied and the plain GET price is used: 87.00 + 5.00 + 2.50 = AED 94.50. … |
| `wallet-down` | `{"timezone":"~wallet-down"}` | `timezone` containing `wallet-down` (magic trigger): the instruments call fails, so the resolver falls back to `cash` (the price is unchanged, AED 79.50). |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the price call answers 503 — a hard error for this tool. |
| `food-price` | **default** | Default: Morning Syrniki Café, AED 79.50 with CAREEM20. |

### [cart_get_checkout_promos](tools/cart/cart_get_checkout_promos.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | Only a slot start (end passed as `""`) → rejected before any upstream call. |
| `no-basket` | `{"merchant_id":30101}` | Shawarma Station (`30101`) has no basket: basket lookup answers 404 (a basket-not-found error, text `basket not found`) and, unlike the pricing flow, this tool fails hard. |
| `upstream-unavailable` | `{"merchant_id":99999}` | Merchant `99999` (magic trigger): upstream answers 503 (an upstream failure reads the same way). |
| `cash-payment` | `{"payment_type":"COD"}` | `payment_type: COD` locks the card-only CAREEM20. |
| `no-promos` | `{"merchant_id":40001}` | Quik store `40001` has no checkout promos today. |
| `promos-available` | **default** | Default: CAREEM20 (best), free delivery, and expired EXPIRED10. |

### [cart_get_global_view](tools/cart/cart_get_global_view.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `only-grocery` | `{"merchant_id":40001}` | Filter by Quik merchant `40001`. |
| `only-food` | `{"merchant_id":30104}` | Filter by Morning Syrniki Café `30104`. |
| `no-baskets` | `{"merchant_id":30101}` | Any other restaurant from FIXTURES (e.g. Shawarma Station `30101`) has nothing in the cart. |
| `upstream-unavailable` | `{"merchant_id":99999}` | `merchant_id: 99999` (magic trigger): the global-view call answers 503. |
| `no-open-baskets` | `{"timezone":"~empty-cart"}` | `timezone` containing `empty-cart` (magic trigger): the user has no baskets at all. Without a `merchant_id` filter production returns the empty list, which `omitempty` drops, so only `page` remains. |
| `all-baskets` | **default** | Default: both baskets. |

### [cart_get_quik_basket](tools/cart/cart_get_quik_basket.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `outside-service-area` | `{"latitude":0}` | `latitude: 0` (FIXTURES: outside the service area): the nearest-store lookup answers with `MERCHANT_OUT_OF_SERVICEABLE_AREA`. |
| `upstream-unavailable` | `{"timezone":"~trigger_upstream_down"}` | `timezone` containing `trigger_upstream_down` (magic trigger): the grocery service answers 503 with no `errors` list. |
| `no-basket` | `{"timezone":"~empty-cart"}` | `timezone` containing `empty-cart` (magic trigger): the store resolves but the user has no Quik basket (basket lookup 404). `merchant` is still returned. |
| `basket-unavailable` | `{"timezone":"~basket-down"}` | `timezone` containing `basket-down` (magic trigger): upstream answers 503 after the store resolved. |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the basket loads but pricing fails; basket (names + currency) and merchant without `price` / `payment_method`. |
| `quik-basket` | **default** | Default: the Careem Quik Dubai Marina basket `6000002`, AED 45.50. |

### [cart_grocery_checkout](tools/cart/cart_grocery_checkout.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `location-lookup-failed` | `{"latitude":23.5}` | Latitude `23.5` (magic trigger, empty desert): the saved-address snapping call errors. |
| `location-not-saved` | `{"latitude":25.1972}` | Checking out from Dubai Mall (latitude `25.1972`), which isn't a saved address. |
| `out-of-delivery-area` | `{"latitude":25.0702}` | Checking out from the Gym address (latitude `25.0702`, saved as `LOC-50003`): upstream rejects it with a structured `errorContext` error whose message is returned verbatim. The payment was … |
| `basket-not-found` | `{"basket_id":404}` | `basket_id: 404`: upstream answers 404 with a flat `errorMessage`, returned verbatim. The payment was already resolved, so `payment_type` is present. |
| `upstream-unavailable` | `{"basket_id":99999}` | `basket_id: 99999` (magic trigger): upstream answers 503 with no error body. The payment was already resolved, so `payment_type` is present. |
| `payment-declined` | `{"payment_id":4000002,"payment_type":"card"}` | `payment_type: card` with `payment_id: 4000002`: a saved card the payment service declines. The payment was already resolved, so `payment_type` is present. |
| `price-changed` | `{"total_price":1}` | `total_price: 1` (any stale total in real life) is rejected because it no longer matches the basket. The payment was already resolved, so `payment_type` is present. |
| `cash-order` | `{"payment_type":"cash"}` | `payment_type: cash`: order placed, nothing to pay online. |
| `wallet-order` | `{"payment_type":"wallet"}` | `payment_type: wallet`: paid from the Careem Pay balance (AED 125.50). |
| `card-order` | **default** | Default: payment resolved to card `4242`; returns the pay deep link and echoes `total_price` as `amount`. |

### [cart_reorder](tools/cart/cart_reorder.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `order-not-found` | `{"order_id":404}` | Order `404` doesn't exist: ReorderBasket answers 404, surfaced as the raw status. |
| `grocery-reorder` | `{"order_id":9002}` | Order `9002` refills the Quik grocery basket. |
| `item-unavailable` | `{"order_id":8002}` | Order `8002` reorders, but Cappuccino is currently unavailable and lands in `missing_items` (68.00 + 7.50 − 13.60 = AED 61.90). |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the reorder succeeds but pricing fails; the reordered basket is returned enriched without `price` / `payment_method`. |
| `food-reorder` | **default** | Default (e.g. `8001`): the Syrniki breakfast is back in the basket. |

### [cart_reschedule_basket](tools/cart/cart_reschedule_basket.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-location` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` fails the coordinate guard before any upstream call. |
| `cleared-explicit` | `{"scheduled_slot_end":"","scheduled_slot_start":""}` | Both slot fields passed as empty strings: treated exactly like omitting them — the schedule is cleared. |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | A start with an empty end (`scheduled_slot_end: ""`) → rejected; the clear-or-set rule is spelled out in the message. |
| `unavailable-for-slot` | `{"scheduled_slot_start":"~T23:"}` | Slot start containing `T23:` (03:00 Dubai): upstream rejects the move with `UNAVAILABLE_ITEMS_FOR_GIVEN_SLOT` naming the Cappuccino line; the basket keeps its previous schedule. |
| `timeout` | `{"merchant_id":99999}` | Merchant `99999` (magic trigger): the PATCH times out. |
| `no-basket` | `{"merchant_id":30101}` | Shawarma Station (`30101`) has no basket: upstream answers 404 `BASKET_NOT_FOUND`, which is not a recognised code → generic message. |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the reschedule succeeds but pricing fails; the rescheduled basket is returned enriched without `price` / `payment_method` (schedule echoes the … |
| `rescheduled` | `{"scheduled_slot_end":"*","scheduled_slot_start":"*"}` | Both slot fields set: every line moves to the new slot; `basket.schedule_details` echoes it and CAREEM20 still applies at that time (AED 79.50). |
| `cleared` | **default** | Default (no slot fields): the existing schedule is cleared back to immediate delivery — no `schedule_details`, AED 79.50. |

### [cart_update_item](tools/cart/cart_update_item.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `half-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"*"}` | Only a slot start (end passed as `""`) → rejected before the PATCH. |
| `upstream-unavailable` | `{"merchant_id":99999}` | Merchant `99999` (magic trigger): the PATCH times out. |
| `out-of-stock` | `{"count":50}` | `count: 50` exceeds stock: upstream answers `ITEM_OUT_OF_STOCK` and its message is returned verbatim. |
| `pricing-down` | `{"timezone":"~pricing-down"}` | `timezone` containing `pricing-down` (magic trigger): the update succeeds (Syrniki → 3) but pricing fails; the UpdateItem basket is returned enriched without `price` / `payment_method`. |
| `line-not-found` | `{"item_uuid":"~missing"}` | An `item_uuid` containing `missing` is not in the basket. |
| `remove-cappuccino` | `{"catalog_item_id":"700402","count":0}` | Cappuccino set to `count: 0` is removed: 68.00 + 5.00 + 2.50 − 13.60 (20%) = AED 61.90. |
| `cappuccino-oat-milk` | `{"catalog_item_id":"700402"}` | Any other Cappuccino update switches it to oat milk (+3): 90.00 + 7.50 − 15.00 = AED 82.50. |
| `syrniki-to-3` | **default** | Default: Syrniki bumped to 3: 121.00 + 7.50 − 15.00 = AED 113.50. |

## food

### [food_check_slot_availability](tools/food/food_check_slot_availability.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-coordinates` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` → rejected before anything else (`restaurant_id` is still echoed). |
| `missing-slot-start` | `{"slot_start":""}` | `slot_start: ""` → validation error, no upstream call. |
| `missing-slot-end` | `{"slot_end":""}` | `slot_end: ""` → same validation error. |
| `upstream-unavailable` | `{"restaurant_id":39999}` | `restaurant_id: 39999` → COES 503. |
| `restaurant-not-found` | `{"restaurant_id":0}` | `restaurant_id: 0` (or any unknown merchant) → COES 404. |
| `scheduling-not-supported` | `{"restaurant_id":30105}` | Restaurant `30105` (Green Bowl Co.): `scheduling_enabled: false` and `slot_active: false` → not available, with the fixed title. `subtitle` is never set by production. |
| `slot-full-reported-available` | `{"restaurant_id":30103}` | Restaurant `30103` (Pizza Piazza): upstream says the slot itself is full (`slot_active: false`) but the restaurant has scheduling enabled — production computes `slot_active \|\| scheduling_enabled` … |
| `slot-available` | **default** | Default (e.g. Morning Syrniki Café `30104` with a slot from `food_get_scheduling_slots`): `slot_active: true` → available; no title/subtitle. |

### [food_dish_search](tools/food/food_dish_search.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `upstream-unavailable` | `{"query":"~trigger_upstream_down"}` | `query` containing `trigger_upstream_down` → the upstream API answers 503. |
| `syrniki` | `{"query":"~syrniki"}` | `query` containing `syrniki` → Morning Syrniki Café with its matching dish `700401` (the seasonal `700403` Berry Syrniki is inactive and dropped by the client). |
| `cappuccino` | `{"query":"~cappuccino"}` | `query` containing `cappuccino` → Morning Syrniki Café with `700402` Cappuccino (inactive `700404` Iced Cappuccino dropped). |
| `shawarma` | `{"query":"~shawarma"}` | `query` containing `shawarma` (e.g. "chicken shawarma") → Shawarma Station with `700101` Chicken Shawarma Wrap (inactive `700104` Family Shawarma Box dropped). |
| `chicken` | `{"query":"~chicken"}` | `query` containing `chicken` → three merchants, one matching dish each, in upstream ranking order. |
| `sushi` | `{"query":"~sushi"}` | `query` containing `sushi` → Sakura Sushi Lab (15% off, free delivery) with `700201` Salmon Avocado Roll. |
| `pizza` | `{"query":"~pizza"}` | `query` containing `pizza` → Pizza Piazza with `700301` Margherita and `700302` Pepperoni. |
| `salad` | `{"query":"~salad"}` | `query` containing `salad` → Green Bowl Co. with `700501` Chicken Caesar Bowl. |
| `no-results` | **default** | Default: no merchant serves a matching dish (200 with `restaurants: []`) — not an error. |

### [food_dynamic_search](tools/food/food_dynamic_search.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `upstream-unavailable` | `{"query":"~trigger_upstream_down"}` | `query` containing `trigger_upstream_down` → the upstream API answers 503. On error nothing but `restaurants: []` is set, so `page`, `type` and `classifier_status` are empty strings; the error … |
| `tab-override-restaurants` | `{"query":"~syrniki","search_tab":"restaurants"}` | `search_tab: "restaurants"` with a dish-like query (`syrniki`) → the classifier is bypassed and the restaurant branch is returned (`classifier_status: "skipped"` is a local server assumption). |
| `merchant-sakura` | `{"query":"~sakura"}` | `query` containing `sakura` → classified as a restaurant search (merchant-name match, so no per-merchant `dishes`), page `food_merchant_search`. |
| `merchant-pizza-piazza` | `{"query":"~pizza piazza"}` | `query` containing `pizza piazza` → restaurant search for Pizza Piazza (checked before the generic `pizza` dish scenario). |
| `dish-syrniki` | `{"query":"~syrniki"}` | `query` containing `syrniki` → classified as a dish search: cards with matching `items`, page `food_dish_search`. |
| `dish-chicken` | `{"query":"~chicken"}` | `query` containing `chicken` → dish search across three merchants. |
| `dish-pizza` | `{"query":"~pizza"}` | `query` containing `pizza` → dish search: Pizza Piazza with both pizzas. |
| `no-results` | `{"query":"~xyz"}` | `query` containing `xyz` → the classifier cannot decide, falls back to the restaurant branch, which is empty (not an error). |
| `fallback-default` | **default** | Default: a vague query ("something for lunch") → classifier falls back to a restaurant search (`classifier_status: "fallback_default"`) returning popular nearby merchants without per-merchant … |

### [food_get_item_options](tools/food/food_get_item_options.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `upstream-unavailable` | `{"restaurant_id":39999}` | `restaurant_id: 39999` → upstream 503 (checked before the per-item scenarios). |
| `item-700101` | `{"item_id":700101}` | `700101` Chicken Shawarma Wrap. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`. |
| `item-700102` | `{"item_id":700102}` | `700102` Falafel Plate. No customization — can be added to the cart directly. |
| `item-700103` | `{"item_id":700103}` | `700103` Mixed Grill Platter. No customization — can be added to the cart directly. |
| `item-700201` | `{"item_id":700201}` | `700201` Salmon Avocado Roll (8 pcs). No customization — can be added to the cart directly. |
| `item-700202` | `{"item_id":700202}` | `700202` Chicken Katsu Bento. No customization — can be added to the cart directly. |
| `item-700301` | `{"item_id":700301}` | `700301` Margherita Pizza. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`. |
| `item-700302` | `{"item_id":700302}` | `700302` Pepperoni Pizza. No customization — can be added to the cart directly. |
| `item-700401` | `{"item_id":700401}` | `700401` Classic Syrniki with Sour Cream. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`. |
| `item-700402` | `{"item_id":700402}` | `700402` Cappuccino. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`. |
| `item-700501` | `{"item_id":700501}` | `700501` Chicken Caesar Bowl. No customization — can be added to the cart directly. |
| `item-not-found` | **default** | Default: item id not locally menus (use 700101–700501) → upstream 404. `item_id` echoes the input; `currency` is zero-valued, as in production. |

### [food_get_items_options](tools/food/food_get_items_options.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `partial-failure` | `{"item_ids":[799999]}` | Including item `799999` in `item_ids` shows per-item partial failure: the syrniki items succeed, 799999 errors. |
| `no-item-ids` | `{"item_ids":null}` | `item_ids: null` → validation error before any upstream call; `results` is `null`. Force with `./careem-mcp.sh scenario` to simulate an empty array. |
| `upstream-unavailable` | `{"restaurant_id":39999}` | `restaurant_id: 39999` → every per-item GET returns 503 (The local server renders one entry, for `item_ids[0]`). |
| `shawarma-station` | `{"restaurant_id":30101}` | Restaurant `30101` (Shawarma Station): returns options for all of its menu items, whichever ids were asked for. |
| `sakura-sushi-lab` | `{"restaurant_id":30102}` | Restaurant `30102` (Sakura Sushi Lab): returns options for all of its menu items, whichever ids were asked for. |
| `pizza-piazza` | `{"restaurant_id":30103}` | Restaurant `30103` (Pizza Piazza): returns options for all of its menu items, whichever ids were asked for. |
| `morning-syrniki-cafe` | `{"restaurant_id":30104}` | Restaurant `30104` (Morning Syrniki Café): returns options for all of its menu items, whichever ids were asked for. |
| `green-bowl-co` | `{"restaurant_id":30105}` | Restaurant `30105` (Green Bowl Co.): returns options for all of its menu items, whichever ids were asked for. |
| `restaurant-not-found` | **default** | Default: restaurant id not locally world → every per-item GET 404s. Production has no top-level error here; each item carries its own (The local server renders one entry, for `item_ids[0]`). |

### [food_get_restaurant_menu](tools/food/food_get_restaurant_menu.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `upstream-unavailable` | `{"restaurant_id":39999}` | `restaurant_id: 39999` → upstream 503. |
| `half-specified-slot` | `{"scheduled_slot_end":"","scheduled_slot_start":"~T"}` | Only one slot bound set (here `scheduled_slot_end: ""`) → validation error, no upstream call. |
| `half-specified-slot-start` | `{"scheduled_slot_end":"~T","scheduled_slot_start":""}` | Mirror case: `scheduled_slot_start: ""` with an end time → same validation error. |
| `scheduled-slot-syrniki` | `{"restaurant_id":30104,"scheduled_slot_end":"*","scheduled_slot_start":"*"}` | Restaurant `30104` with both slot bounds (any values, typically from `food_get_scheduling_slots`) → the menu evaluated for that slot; `availability_details.scheduling.requested_slot` echoes the … |
| `scheduled-slot-not-supported` | `{"restaurant_id":30105,"scheduled_slot_end":"*","scheduled_slot_start":"*"}` | Restaurant `30105` (Green Bowl Co. does not accept scheduled orders) with a slot → menu returned, but `scheduling_enabled: false` and `requested_slot.is_available: false`. |
| `morning-syrniki-cafe` | `{"restaurant_id":30104}` | Restaurant `30104` — Morning Syrniki Café. |
| `shawarma-station` | `{"restaurant_id":30101}` | Restaurant `30101` — Shawarma Station. |
| `sakura-sushi-lab` | `{"restaurant_id":30102}` | Restaurant `30102` — Sakura Sushi Lab. |
| `pizza-piazza` | `{"restaurant_id":30103}` | Restaurant `30103` — Pizza Piazza. |
| `green-bowl-co` | `{"restaurant_id":30105}` | Restaurant `30105` — Green Bowl Co. (immediate delivery only: `scheduling_enabled: false`). |
| `restaurant-not-found` | **default** | Default: restaurant id not locally world (use 30101–30105) → upstream 404. Production omits `restaurant` on error. |

### [food_get_scheduling_slots](tools/food/food_get_scheduling_slots.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-coordinates` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` → rejected before any upstream call. |
| `upstream-unavailable` | `{"restaurant_id":39999}` | `restaurant_id: 39999` → COES 503. |
| `restaurant-not-found` | `{"restaurant_id":0}` | `restaurant_id: 0` (or any unknown merchant) → COES 404. |
| `scheduling-not-supported` | `{"restaurant_id":30105}` | Restaurant `30105` (Green Bowl Co.) does not accept scheduled orders: COES returns `days: []`, which `omitempty` drops — the output is only `page`. |
| `slots-available` | **default** | Default (e.g. Morning Syrniki Café `30104`): today and tomorrow (production format: `date` is the local calendar day, `name` the weekday, `name_localized` "Today"/"Tomorrow"/"Fri, 9th Oct"), … |

### [food_get_user_discovery_filters](tools/food/food_get_user_discovery_filters.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `outside-service-area` | `{"latitude":0}` | Latitude `0` simulates a location Careem Food does not serve: upstream 400, body echoed in the error. `filters`/`sorts` are omitted (omitempty). |
| `upstream-unavailable` | `{"latitude":99}` | Latitude `99` (or `./careem-mcp.sh scenario`) → upstream 503. |
| `no-filters` | `{"latitude":1}` | Latitude `1` → upstream returns `{}`; empty lists are dropped by `omitempty`, leaving only `page`. |
| `dubai-marina` | **default** | Default: full set of filters and sorts for Dubai Marina. |

### [food_merchant_search](tools/food/food_merchant_search.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `upstream-unavailable` | `{"query":"~trigger_upstream_down"}` | `query` containing `trigger_upstream_down` → the upstream API answers 503. |
| `syrniki` | `{"query":"~syrniki"}` | `query` containing `syrniki` → Morning Syrniki Café (name match) with its matching dish under `dishes`. |
| `sushi` | `{"query":"~sushi"}` | `query` containing `sushi` → Sakura Sushi Lab (name/cuisine match, 15% off) with its matching dish. |
| `pizza` | `{"query":"~pizza"}` | `query` containing `pizza` → Pizza Piazza with both pizzas as matching dishes. |
| `shawarma` | `{"query":"~shawarma"}` | `query` containing `shawarma` → Shawarma Station with `700101` (inactive `700104` dropped by the client). |
| `bowl` | `{"query":"~bowl"}` | `query` containing `bowl` → Green Bowl Co. (merchant name) with `700501` Chicken Caesar Bowl. |
| `breakfast` | `{"query":"~breakfast"}` | `query` containing `breakfast` → cuisine match only: Morning Syrniki Café with no per-merchant dishes (`dishes` omitted). |
| `no-results` | **default** | Default: nothing matches (200 with `restaurants: []`) — not an error. |

### [food_search_restaurant_items](tools/food/food_search_restaurant_items.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `upstream-unavailable` | `{"restaurant_id":39999}` | `restaurant_id: 39999` → search service 503. |
| `no-matching-dishes` | `{"query":"~xyz"}` | Any `query` containing `xyz` → no matching dishes in the requested restaurant (200 with `dishes: []`). |
| `syrniki-cafe-syrniki` | `{"query":"~syrniki","restaurant_id":30104}` | Restaurant `30104`, query containing `syrniki`. |
| `syrniki-cafe-coffee` | `{"query":"~coffee","restaurant_id":30104}` | Restaurant `30104`, query containing `coffee`. |
| `syrniki-cafe-cappuccino` | `{"query":"~cappuccino","restaurant_id":30104}` | Restaurant `30104`, query containing `cappuccino`. |
| `pizza-margherita` | `{"query":"~margherita","restaurant_id":30103}` | Restaurant `30103`, query containing `margherita`. |
| `shawarma-station-all` | `{"restaurant_id":30101}` | Any other query in Shawarma Station (`30101`) → all of its dishes. |
| `sakura-sushi-lab-all` | `{"restaurant_id":30102}` | Any other query in Sakura Sushi Lab (`30102`) → all of its dishes. |
| `pizza-piazza-all` | `{"restaurant_id":30103}` | Any other query in Pizza Piazza (`30103`) → all of its dishes. |
| `morning-syrniki-cafe-all` | `{"restaurant_id":30104}` | Any other query in Morning Syrniki Café (`30104`) → all of its dishes. |
| `green-bowl-co-all` | `{"restaurant_id":30105}` | Any other query in Green Bowl Co. (`30105`) → all of its dishes. |
| `restaurant-not-found` | **default** | Default: restaurant id not locally world (use 30101–30105) → upstream 404. On error `restaurant_id` is 0 and `currency` is zero-valued, as in production. |

## groceries

### [create_grocery_cart_with_quantities](tools/groceries/create_grocery_cart_with_quantities.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-coordinates` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` — rejected before anything else. |
| `no-items` | `{"items":null}` | `items: null` (or only entries with a blank keyword / catalog_item_id). |
| `missing-merchant` | `{"merchant_id":0}` | `merchant_id: 0` — the merchant from the search that resolved the items is required. |
| `shops-merchant` | `{"merchant_id":40101}` | `merchant_id: 40101` (Marina Fresh Market, Careem Shops). The item lookup is hard-wired to the `quik` catalogue, so titles and images come back empty; the merchant title comes from the global view. … |
| `unpriced-item` | `{"items":[{"keyword":"~unicorn"}]}` | A keyword containing `unicorn` arrives with no price (`price` ≤ 0): it is listed in `unavailable_keywords` and not added; milk still goes in. |
| `eggs-low-stock` | `{"items":[{"keyword":"~bulk"}]}` | A keyword containing `bulk` (e.g. `bulk eggs`, quantity 20): the basket rejects 20 with "Item is out of stock, only 5 available", the tool retries with 5 (group `quantity` becomes 5) and reports it … |
| `avocado-out-of-stock` | `{"items":[{"catalog_item_id":"4000106"}]}` | `catalog_item_id: "4000106"` (Hass Avocado): the basket answers "Hass Avocado 2pk is out of stock" — no "only N", so no retry; the avocado group stays in the list without an `item_uuid`, the rest … |
| `unknown-item` | `{"items":[{"catalog_item_id":"4000199"}]}` | `catalog_item_id: "4000199"` (not in the catalogue): upstream has no title for it and the basket answers "item not found" → `NOT_FOUND`. |
| `existing-basket` | `{"items":[{"keyword":"~yogurt"}]}` | A keyword containing `yogurt`: Leo's Quik basket `6000002` already held 2× milk, eggs and sourdough, so `has_existing_items` is true and the yogurt is added on top. |
| `card-default-cash-fallback` | `{"latitude":25.2172}` | `latitude: 25.2172` (Work): Leo's default instrument there is a card, which this flow does not support, so `payment_type` falls back to `cash` (the cart is still built). |
| `breakfast-cart` | **default** | Default: milk ×2 (with Greek yogurt as a display-only alternative), eggs ×1, sourdough ×1 added to basket `6000002` (AED 40.00), paid by wallet. |

### [global_search](tools/groceries/global_search.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `no-coordinates` | `{"latitude":0,"longitude":0}` | `latitude: 0, longitude: 0` and no `location`: nothing to search around. |
| `location-not-found` | `{"location":"~nowhere"}` | `location` containing `nowhere`: location search returns no match. |
| `upstream-unavailable` | `{"query":"~trigger_upstream_down"}` | `query` containing `trigger_upstream_down`: global search answers 503. |
| `nothing-found` | `{"query":"~unicorn"}` | `query` containing `unicorn`: no merchant or item matches (empty arrays, no error). |
| `kombucha` | `{"query":"~kombucha"}` | `query` containing `kombucha`: both organic stores, each with its kombucha. |
| `with-location` | `{"location":"*"}` | `location` set (e.g. `Work`): resolved through location search first; Marina Fresh Market still delivers there. |
| `milk-and-eggs` | **default** | Default: Marina Fresh Market with its organic milk and eggs (Quik excluded). |

### [groceries_get_items_details](tools/groceries/groceries_get_items_details.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `missing-merchant` | `{"merchant_id":0}` | `merchant_id: 0`. |
| `no-item-ids` | `{"item_ids":null}` | `item_ids: null` (an empty array can't be targeted — use `./careem-mcp.sh scenario`). |
| `non-positive-id` | `{"item_ids":[0]}` | `item_ids` containing `0` (any id ≤ 0). |
| `too-many-items` | `{"item_ids":[-21]}` | More than 20 ids. Array length cannot be matched, so the scenario keys this on The local server-only id `-21` (or force it with `./careem-mcp.sh scenario`). |
| `upstream-unavailable` | `{"merchant_id":99999}` | `merchant_id: 99999` (magic trigger): every item lookup answers 503 (shown for the first id). |
| `shops-item` | `{"merchant_id":40101}` | `merchant_id: 40101` — Marina Fresh Market's organic milk. |
| `unknown-item` | `{"item_ids":[4000199]}` | `item_ids` containing `4000199`: not sold at this store (404) — milk is still returned. |
| `coffee` | `{"item_ids":[4000108]}` | `item_ids` containing `4000108`: ground coffee with its 20% deal, origin/roast attributes and a 500 g size variant. |
| `avocado` | `{"item_ids":[4000106]}` | `item_ids` containing `4000106`: active in the catalogue but not available (`status_text_localized: "Out of stock"`). |
| `milk-and-eggs` | **default** | Default: milk (with nutrition table) and eggs. |

### [is_grocery_area_serviceable](tools/groceries/is_grocery_area_serviceable.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `not-serviceable` | `{"latitude":51.5074}` | `latitude: 51.5074` (London) — no Quik store covers the point. (Production answers `true` even for `latitude: 0`, because the nearest-store lookup always returns a store, so a real out-of-area … |
| `upstream-unavailable` | `{"latitude":-1}` | `latitude: -1` (magic trigger): upstream answers 503 without an `errors` array. |
| `serviceable` | **default** | Default (e.g. Home, 25.0866, 55.1474): Careem Quik Dubai Marina delivers here. |

### [search_groceries_get_all_deals](tools/groceries/search_groceries_get_all_deals.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `outside-service-area` | `{"latitude":0}` | `latitude: 0` — no Quik store nearby; the category filter answers 404. |
| `upstream-unavailable` | `{"latitude":-1}` | `latitude: -1` (magic trigger): upstream answers 503. |
| `no-deals` | `{"latitude":1}` | `latitude: 1` (magic trigger): the store has no active deals right now. |
| `deals` | **default** | Default: the discounted ground coffee under *Coffee & Tea*. |

### [search_groceries_get_top_user_items](tools/groceries/search_groceries_get_top_user_items.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `outside-service-area` | `{"latitude":0}` | `latitude: 0` — no Quik store nearby: both the personalised list and the top-picks fallback answer 404. |
| `upstream-unavailable` | `{"latitude":-1}` | `latitude: -1` (magic trigger): upstream answers 503 to both calls. |
| `no-history` | `{"latitude":1}` | `latitude: 1` (magic trigger): a user who never ordered from Quik — the personalised list is empty, so generic top picks are returned (coffee, bananas, yogurt) flagged as not personalised. |
| `usuals` | **default** | Default: Leo's usuals at Careem Quik Dubai Marina, plus his existing basket `6000002`. |

### [search_groceries_items](tools/groceries/search_groceries_items.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `missing-search-terms` | `{"search_terms":null}` | `search_terms: null` (an empty array can't be targeted by the scenario — force this with `./careem-mcp.sh scenario`): rejected before any upstream call. |
| `outside-service-area` | `{"latitude":0}` | `latitude: 0` — the nearest-store lookup answers `MERCHANT_OUT_OF_SERVICEABLE_AREA` for every term, so every term is skipped. |
| `too-slow` | `{"max_delivery_minutes":10}` | `max_delivery_minutes: 10` — the nearest store's 15 min ETA exceeds the limit. |
| `shops-merchant` | `{"merchant_id":40101}` | `merchant_id: 40101` — search inside Marina Fresh Market (a Careem Shops merchant from `global_search`). No nearest-store lookup, so no `merchant_name` / `merchant_eta_minutes`; no basket there yet. |
| `partial-results` | `{"search_terms":["~milk","~unicorn"]}` | Terms include `milk` **and** a `unicorn` term: only the term with matches gets a group; the empty one is silently dropped (no error). |
| `no-results` | `{"search_terms":["~unicorn"]}` | Every term contains `unicorn` (or `trigger_upstream_down` — an upstream outage looks the same, because failing terms are skipped). |
| `quik-fallback` | `{"search_terms":["~kombucha"]}` | A term containing `kombucha`: Quik has no match, so the upstream recommends Careem Shops merchants — Marina Fresh Market as `fallback`, JLT Organic Pantry in `additional_fallbacks`. |
| `existing-basket` | `{"search_terms":["~yogurt"]}` | A term containing `yogurt`: results plus Leo's existing Quik basket `6000002` (2× milk, eggs, sourdough), titles/images enriched from upstream. |
| `breakfast-trio` | `{"search_terms":["~milk","~egg","~bread"]}` | Milk, eggs and bread in one call — one group per term, in input order. |
| `milk` | `{"search_terms":["~milk"]}` | `milk`: the milk SKU, plus Greek yogurt as an `additional_items` related match. |
| `eggs` | `{"search_terms":["~egg"]}` | `eggs`. |
| `bread` | `{"search_terms":["~bread"]}` | `bread` / sourdough. |
| `on-discount` | `{"on_discount":true}` | `on_discount: true` (`filters={"deals":"1"}`): only the discounted coffee (20% off, AED 40 → 32). |
| `generic-results` | **default** | Default: any other term returns a generic mix (bananas, the out-of-stock avocado, water, coffee). |

## location

### [reverse_geocode](tools/location/reverse_geocode.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-latitude` | `{"latitude":91}` | Latitude outside ±90 (trigger: exactly `91`) → client-side validation, no HTTP call. |
| `invalid-longitude` | `{"longitude":181}` | Longitude outside ±180 (trigger: exactly `181`) → client-side validation, no HTTP call. |
| `outside-service-area` | `{"latitude":0}` | Latitude `0` (e.g. Null Island) — no Careem service area. The location service answers 404 with a JSON error object; the client never checks the status and decodes it into an all-zero result, so … |
| `upstream-unavailable` | `{"latitude":11.1111,"longitude":11.1111}` | Internal failure, forced with `./careem-mcp.sh scenario` or the magic point `11.1111, 11.1111`: a plain-text 503 body after retries fails JSON decoding. Also stands for transport timeouts and … |
| `home-marina-gate` | `{"latitude":25.0866,"longitude":55.1474}` | Leo's Home coordinates (`25.0866, 55.1474`). |
| `work-emirates-towers` | `{"latitude":25.2172,"longitude":55.2826}` | Work coordinates (`25.2172, 55.2826`). |
| `generic-jbr` | **default** | Default: any other point resolves to a building the location service has not indexed yet (Bahar 4 in JBR, `locationUuid: null`). Coordinates are fixed to the fixture point. |

### [save_new_address](tools/location/save_new_address.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `duplicate-home` | `{"saved_name":"Home"}` | `saved_name` "Home" already exists. |
| `duplicate-work` | `{"saved_name":"Work"}` | `saved_name` "Work" already exists. |
| `duplicate-gym` | `{"saved_name":"Gym"}` | `saved_name` "Gym" already exists. |
| `validation-rejected` | `{"saved_name":""}` | Empty `saved_name`: the tool sends it anyway (no local validation of the name or of the detail fields `building_type` requires) and the bookmark service rejects it with 422. |
| `outside-service-area` | `{"latitude":0}` | Latitude `0` — not inside any service area. |
| `upstream-unavailable` | `{"saved_name":"~trigger_upstream_down"}` | Internal failure (`saved_name` containing `trigger_upstream_down`, or `./careem-mcp.sh scenario`): 503 after retries. Also stands for transport timeouts (`failed to save location: Post "…": context … |
| `saved` | **default** | Default: bookmark created. Coordinates are the generic Bahar 4 point from `reverse_geocode` (numeric args cannot be echoed); `providerId` echoes the input. |

## maps

### [maps_get_resources](tools/maps/maps_get_resources.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `paths-required` | `{"paths":null}` | `paths: null` (or `[]`, forced with `./careem-mcp.sh scenario` since an empty array cannot be matched). |
| `too-many-paths` | `{"paths":["~trigger_too_many"]}` | More than 32 paths in one call (trigger: a path containing `trigger_too_many`). |
| `path-traversal` | `{"paths":["~.."]}` | A path with a `..` segment (e.g. `/v1/tiles/../v2/admin`): rejected before any request is made. The local server echoes the first path. |
| `path-outside-allowlist` | `{"paths":["~/v2/"]}` | A path outside `/v1/tiles/` (trigger: a path containing `/v2/`, e.g. `/v2/admin`): the whole batch is rejected. The local server echoes the first path. |
| `upstream-unavailable` | `{"paths":["~trigger_upstream_down"]}` | A path containing `trigger_upstream_down`: the request to the maps API times out; only that entry carries an `error`, with status 0 and no body. |
| `oversized-asset` | `{"paths":["~huge"]}` | A path containing `huge`: the upstream body is larger than 4 MiB, so it is dropped and flagged (status still reported). |
| `missing-tile` | `{"paths":["~missing"]}` | A path containing `missing`: the maps API answers 404; this is a normal result (no `error`), the widget simply skips the tile. Body = base64 of `{"error":"missing tile"}`. |
| `style-document` | `{"paths":["~/styles/"]}` | A path under `/v1/tiles/styles/` (e.g. `/v1/tiles/styles/careem_base`): the Mapbox-style document (base64 of a minimal style pointing at the tile, glyph and sprite paths). |
| `glyph-range` | `{"paths":["~/fonts/"]}` | A path under `/v1/tiles/fonts/` (e.g. `/v1/tiles/fonts/glyphs/0-255.pbf`). |
| `sprite-index` | `{"paths":["~/sprites/"]}` | A path under `/v1/tiles/sprites/` (e.g. `/v1/tiles/sprites/careem.json`). |
| `vector-tile` | **default** | Default: a vector tile (e.g. `/v1/tiles/vector-tiles/base/12/2650/1754`), returned as protobuf bytes (placeholder body). |

## user

### [get_activities](tools/user/get_activities.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-status` | `{"activity_status":"cancelled"}` | `activity_status: cancelled` — not a supported status. |
| `invalid-type` | `{"activity_type":"~taxi"}` | `activity_type` containing `taxi` — stands in for any unsupported vertical. |
| `upstream-unavailable` | `{"next_cursor":"~trigger_upstream_down"}` | `next_cursor` containing `trigger_upstream_down` (magic trigger): upstream answers 503 with a JSON `message`. |
| `next-page` | `{"next_cursor":"cursor_page2"}` | `next_cursor: cursor_page2` — the second page of past activities: two older food orders, no further page. |
| `nothing-matches` | `{"activity_status":"past","activity_type":"groceries"}` | `activity_status: past` + `activity_type: groceries` — Leo has no past Quik orders (his past `order_9201` is a Careem Shops order), so every bucket is empty and omitted. |
| `rides-only` | `{"activity_type":"ride"}` | `activity_type: ride`. |
| `food-only` | `{"activity_type":"food"}` | `activity_type: food`. |
| `groceries-only` | `{"activity_type":"groceries"}` | `activity_type: groceries` — the ongoing Quik order only (`merchant_type: ufd`). |
| `shops-only` | `{"activity_type":"shops"}` | `activity_type: shops` — the Careem Shops order from Marina Fresh Market (upstream type `groceries`, `merchant_type: retail`, normalised to `shops`). |
| `delivery-only` | `{"activity_type":"delivery"}` | `activity_type: delivery` — the ongoing Careem Box delivery, with the default Help Center `care_deep_link` filled in. |
| `ongoing-only` | `{"activity_status":"ongoing"}` | `activity_status: ongoing`. |
| `upcoming-only` | `{"activity_status":"upcoming"}` | `activity_status: upcoming`. |
| `past-only` | `{"activity_status":"past"}` | `activity_status: past` (the Careem Pay top-up is filtered out). |
| `all` | **default** | Default: every supported activity, all three buckets, with paging to the next page. |

### [track_activity](tools/user/track_activity.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `invalid-type` | `{"activity_type":"~taxi"}` | `activity_type` containing `taxi` — stands in for any unsupported vertical (the scenario cannot match "anything else"). |
| `upstream-unavailable` | `{"reference_id":"~outage"}` | `reference_id` containing `outage` (magic trigger): the tracker answers 503. |
| `not-ongoing` | `{"reference_id":"~missing"}` | Reference ids containing `missing` — the tracker answers 404. |
| `past-ride` | `{"reference_id":"ride_0999"}` | Past ride `ride_0999` is completed, so there is nothing to track (tracker 404). |
| `past-food-order` | `{"reference_id":"order_8001"}` | Past food order `order_8001` was delivered, so there is nothing to track (tracker 404). |
| `shops-order` | `{"activity_type":"shops"}` | `activity_type: shops` — Leo's only Careem Shops order (`order_9201`) was delivered two days ago; the `groceries` tracker answers 404. |
| `ride-searching` | `{"reference_id":"ride_searching"}` | `reference_id: ride_searching` — no captain yet: no ETA, no captain or vehicle, just the status texts. |
| `food-order` | `{"activity_type":"food"}` | `activity_type: food` — placed food order 9001 (`order_9001`) from Morning Syrniki Café being prepared. |
| `grocery-order` | `{"activity_type":"groceries"}` | `activity_type: groceries` — Quik order `order_9002` with captain Omar R. on the way. |
| `box-delivery` | `{"activity_type":"delivery"}` | `activity_type: delivery` — Careem Box `box_7001` (Home → Work) picked up by Khalid M. |
| `ride` | **default** | Default (`activity_type: ride`): captain Ahmed K. 4 min away from Marina Gate 1. |

### [user_info](tools/user/user_info.md)

| Scenario | Trigger | What it simulates |
| --- | --- | --- |
| `personalization-down` | `{"service_area_id":999}` | `service_area_id: 999` — personalization answers 503; identity and bookmarks still come back. |
| `identity-down` | `{"service_area_id":998}` | `service_area_id: 998` — the upstream API answers 401 (expired token); bookmarks, routines and suggestions still come back. |
| `upstream-unavailable` | `{"service_area_id":997}` | `service_area_id: 997` — identity, personalization and bookmarks all answer 503 (and the food history too, so only the generic food suggestion is left). |
| `no-personalization` | `{"service_area_id":996}` | `service_area_id: 996` — personalization knows nothing about the user (`response: []`), so `routines` is omitted. |
| `bookmarks-down` | `{"service_area_id":995}` | `service_area_id: 995` — the bookmark service answers 503; everything else is returned. |
| `new-user` | `{"service_area_id":994}` | `service_area_id: 994` (with coordinates) — no food orders, no Quik history and no saved or suggested places yet: every vertical falls back to its generic suggestion (airport + mall rides). |
| `outside-quik-area` | `{"latitude":0}` | `latitude: 0` — Quik does not serve the point, so there is no groceries suggestion (no city or ride suggestions resolve there either). |
| `with-location` | `{"latitude":"*","longitude":"*"}` | Coordinates passed (Home) → city fields (Dubai), Quik reorder suggestion and two ride suggestions (Work, Dubai Mall — Home is only in `Saved`, and the user is already there). |
| `no-location` | **default** | Default: no coordinates — no city fields, no ride suggestions, and (0,0) is outside the Quik area so no groceries suggestion. |

---

52 tools, 443 scenarios.
