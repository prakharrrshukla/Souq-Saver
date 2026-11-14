---
tool: box_create_order
domain: box
---

# box_create_order

Places the Box Delivery confirmed by `box_pre_checkout`. The local server order is always `9101`
(invoice `INV-9101`, total AED 35.00 — the Motorbike Home → Work fare) and reports back the
payment type the user picked: card `4242`, `wallet` or `cash`. The flow is
`box_get_config` → `box_get_categories` → `box_get_vehicle_types` → `box_pre_checkout` → this
tool with `pickup_location_id: "LOC-50001"`, `dropoff_location_id: "LOC-50002"`,
`cct_id: 1501`, `package_category_id: 2`.

Try: pay by card (`payment_type: "card"`, `payment_id: "4242"`), wallet, cash; a card id other
than `4242` (no longer available); `instructions` containing `trigger_fraud` with cash
(fraud-prevention rejection), `trigger_wallet_disabled` / `trigger_wallet_down` with wallet,
`trigger_invoice_down` with cash; `pickup_longitude: 0` (upstream down).

## Scenario: invalid-pickup-coordinates

```json match
{ "pickup_latitude": 0, "pickup_longitude": 0 }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "a valid pickup location is required to create the order" }
```

## Scenario: missing-pickup-location-id

```json match
{ "pickup_location_id": "" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "both pickup_location_id and dropoff_location_id are required - resolve them via search_locations/reverse_geocode/a saved bookmark first" }
```

## Scenario: missing-dropoff-location-id

```json match
{ "dropoff_location_id": "" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "both pickup_location_id and dropoff_location_id are required - resolve them via search_locations/reverse_geocode/a saved bookmark first" }
```

## Scenario: missing-cct-id

```json match
{ "cct_id": 0 }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "cct_id is required - confirm it via box_pre_checkout first" }
```

## Scenario: payment-type-missing

```json match
{ "payment_type": "" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "payment_type is required (cash | card | wallet); call box_pre_checkout to see available payment options" }
```

## Scenario: payment-type-unsupported

A payment type containing `pay` (e.g. `apple pay`, `careem pay`) is not one of cash/card/wallet.

```json match
{ "payment_type": "~pay" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "payment_type is required (cash | card | wallet); call box_pre_checkout to see available payment options" }
```

## Scenario: card-payment-id-empty

```json match
{ "payment_type": "card", "payment_id": "" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "payment_id is required when payment_type is card" }
```

## Scenario: wallet-instruments-unavailable

Magic: wallet payment with `instructions` containing `trigger_wallet_down` — the payment-instruments
call answered 503. (A card payment fails the same way in production.)

```json match
{ "payment_type": "wallet", "instructions": "~trigger_wallet_down" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "could not verify payment instruments: wallet Service returned status code 503" }
```

## Scenario: wallet-unavailable

Magic: wallet payment with `instructions` containing `trigger_wallet_disabled` — the wallet is
disabled for Box now (also what happens when the pickup city can't be resolved).

```json match
{ "payment_type": "wallet", "instructions": "~trigger_wallet_disabled" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "wallet is no longer available; call box_pre_checkout again for current payment options" }
```

## Scenario: fraud-rejected

Magic: cash with `instructions` containing `trigger_fraud` — everything validated, but the order
API rejects the cash order (403, fraud prevention). The body is not read, so only the status
reaches the user.

```json match
{ "payment_type": "cash", "instructions": "~trigger_fraud" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "failed to create order: box service returned status 403" }
```

## Scenario: upstream-unavailable

Internal failure (magic `pickup_longitude: 0` with a non-zero latitude, or
`./careem-mcp.sh scenario`): the create-order API answered 503. Also stands for transport errors
and the unreachable `internal server error`. (The local server checks this before the card id, so an
unknown card with this trigger reports 503 instead of `card-not-available`.)

```json match
{ "pickup_longitude": 0 }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "failed to create order: box service returned status 503" }
```

## Scenario: invoice-lookup-failed

Magic: cash with `instructions` containing `trigger_invoice_down` — the order is placed but the
invoice lookup fails, so `amount`/`currency_code` are omitted.

```json match
{ "payment_type": "cash", "instructions": "~trigger_invoice_down" }
```

```json response
{ "order_id": 9101, "invoice_id": "INV-9101", "payment_type": "cash" }
```

## Scenario: card-paid

Visa •••• 4242 (the working, preferred card).

```json match
{ "payment_type": "card", "payment_id": "4242" }
```

```json response
{ "order_id": 9101, "invoice_id": "INV-9101", "payment_type": "card", "amount": 35, "currency_code": "AED" }
```

## Scenario: card-not-available

Any other card id: not among the user's working cards.

```json match
{ "payment_type": "card", "payment_id": "*" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "selected card is no longer available; call box_pre_checkout again for current payment options" }
```

## Scenario: card-payment-id-missing

Card without `payment_id`.

```json match
{ "payment_type": "card" }
```

```json response
{ "order_id": 0, "payment_type": "", "error": "payment_id is required when payment_type is card" }
```

## Scenario: wallet-paid

```json match
{ "payment_type": "wallet" }
```

```json response
{ "order_id": 9101, "invoice_id": "INV-9101", "payment_type": "wallet", "amount": 35, "currency_code": "AED" }
```

## Scenario: cash-paid

Cash still gets an invoice (paid to the captain), so `amount` is filled.

```json match
{ "payment_type": "cash" }
```

```json response
{ "order_id": 9101, "invoice_id": "INV-9101", "payment_type": "cash", "amount": 35, "currency_code": "AED" }
```

## Scenario: payment-type-invalid

Default: any other `payment_type` (e.g. `bank transfer`) is rejected before any order call.

```json response
{ "order_id": 0, "payment_type": "", "error": "payment_type is required (cash | card | wallet); call box_pre_checkout to see available payment options" }
```

## Definition

```json tool
{
  "annotations": {},
  "description": "Places a Box Delivery order once the user has confirmed pickup, dropoff, vehicle type, and box_pre_checkout returned service_status \"AVAILABLE\". Requires payment_type (cash, card, or wallet) matching the entry the user picked from box_pre_checkout's user_available_payment_methods - never auto-select; card additionally requires that entry's id as payment_id. Returns order_id and the payment_type actually used - tell the user which one plainly. The other fields (invoice_id, amount, currency_code) are for the app's own UI to open the native payment sheet automatically - never read them aloud, quote them, or mention a link; just confirm the order was placed. A cash order can still fail with a fraud-prevention error even though everything up to here succeeded - surface any error plainly, never claim the order is confirmed unless this call returns without an error.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "cct_id": {
        "description": "cct_id of the vehicle type confirmed via box_pre_checkout",
        "type": "integer"
      },
      "dropoff_location_id": {
        "description": "the dropoff address's location_identifier (LOC-xxxx), same source rules as pickup_location_id",
        "type": "string"
      },
      "instructions": {
        "description": "captain instructions, empty if the user declined to give any",
        "type": "string"
      },
      "package_category_id": {
        "description": "from box_get_categories - omit entirely if categories came back empty",
        "type": "integer"
      },
      "payment_id": {
        "description": "required when payment_type is card - the id of the chosen entry from user_available_payment_methods",
        "type": "string"
      },
      "payment_type": {
        "description": "cash, card, or wallet - the type of the entry the user picked from box_pre_checkout's user_available_payment_methods; never auto-select",
        "type": "string"
      },
      "pickup_latitude": {
        "description": "pickup location latitude",
        "type": "number"
      },
      "pickup_location_id": {
        "description": "the pickup address's location_identifier (LOC-xxxx), from search_locations, reverse_geocode, or a saved bookmark - never invent one",
        "type": "string"
      },
      "pickup_longitude": {
        "description": "pickup location longitude",
        "type": "number"
      }
    },
    "required": [
      "pickup_latitude",
      "pickup_longitude",
      "pickup_location_id",
      "dropoff_location_id",
      "cct_id",
      "payment_type"
    ],
    "type": "object"
  },
  "name": "box_create_order",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "amount": {
        "description": "internal - the UI uses this for the native payment sheet, never quote it to the user",
        "type": "number"
      },
      "currency_code": {
        "description": "internal - paired with amount for the native payment sheet",
        "type": "string"
      },
      "error": {
        "type": "string"
      },
      "invoice_id": {
        "description": "internal - the UI uses this to open the native payment sheet automatically, never mention or quote it to the user",
        "type": "string"
      },
      "order_id": {
        "description": "the created order's id",
        "type": "integer"
      },
      "payment_type": {
        "description": "the payment method actually used: card, wallet, or cash - tell the user which one, never assume",
        "type": "string"
      }
    },
    "required": [
      "order_id",
      "payment_type"
    ],
    "type": "object"
  },
  "title": "Create A Box Delivery Order"
}
```
