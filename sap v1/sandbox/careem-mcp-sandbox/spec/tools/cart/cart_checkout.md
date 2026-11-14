---
tool: cart_checkout
domain: cart
---

# cart_checkout

Places the order for a food basket (default `6000001`) — or a shops basket with `domain: "shops"` —
and returns the master invoice. The food order id is `serviceReferenceId` 9001 (FIXTURES
`order_9001`). `payment_type` reports what was actually used; with card payment the user
finishes payment through the returned `deep_link`, and `amount` echoes your `total_price`
(AED 79.50 for the default basket). Cash / wallet orders return no deep link.

Failures come back in `error` as production does (raw upstream text for checkout failures).
Use `./careem-mcp.sh scenario` to force `payment-declined` without the magic payment id.

## Scenario: invalid-location

`latitude: 0, longitude: 0` fails the coordinate guard before any upstream call.

```json match
{
  "latitude": 0,
  "longitude": 0
}
```

```json response
{
  "page": "cart_checkout",
  "error": "invalid location coordinates"
}
```

## Scenario: half-slot

Only a slot start (end passed as `""`): production refuses to silently degrade to an on-demand order.

```json match
{
  "scheduled_slot_start": "*",
  "scheduled_slot_end": ""
}
```

```json response
{
  "page": "cart_checkout",
  "error": "scheduled_slot_start and scheduled_slot_end must both be set, or both omitted"
}
```

## Scenario: location-lookup-failed

Latitude `23.5` (magic trigger, empty desert): the saved-address snapping call errors.

```json match
{
  "latitude": 23.5
}
```

```json response
{
  "page": "cart_checkout",
  "error": "couldn't resolve your delivery location, please try again"
}
```

## Scenario: location-not-saved

Checking out from Dubai Mall (latitude `25.1972`), which isn't a saved address.

```json match
{
  "latitude": 25.1972
}
```

```json response
{
  "page": "cart_checkout",
  "error": "Your current location isn't a saved address. Please save it as a delivery address in Careem first, then place the order."
}
```

## Scenario: out-of-delivery-area

Checking out from the Gym address (latitude `25.0702`, saved as `LOC-50003`): upstream rejects it with a structured `errorContext` error whose message is returned verbatim. The payment was already resolved, so `payment_type` is present.

```json match
{
  "latitude": 25.0702
}
```

```json response
{
  "page": "cart_checkout",
  "error": "This store doesn't deliver to your selected address.",
  "payment_type": "card"
}
```

## Scenario: basket-not-found

`basket_id: 404`: upstream answers 404 with a flat `errorMessage`, returned verbatim. The payment was already resolved, so `payment_type` is present.

```json match
{
  "basket_id": 404
}
```

```json response
{
  "page": "cart_checkout",
  "error": "Basket not found or already checked out",
  "payment_type": "card"
}
```

## Scenario: upstream-unavailable

`basket_id: 99999` (magic trigger): upstream answers 503 with no error body. The payment was already resolved, so `payment_type` is present.

```json match
{
  "basket_id": 99999
}
```

```json response
{
  "page": "cart_checkout",
  "error": "unexpected response status 503",
  "payment_type": "card"
}
```

## Scenario: payment-declined

`payment_type: card` with `payment_id: 4000002`: a saved card the payment service declines (without `payment_type` the id would be ignored and the default card resolved). The payment was already resolved, so `payment_type` is present.

```json match
{
  "payment_type": "card",
  "payment_id": 4000002
}
```

```json response
{
  "page": "cart_checkout",
  "error": "unexpected response status 402",
  "payment_type": "card"
}
```

## Scenario: price-changed

`total_price: 1` (any stale total in real life) is rejected because it no longer matches the basket. The payment was already resolved, so `payment_type` is present.

```json match
{
  "total_price": 1
}
```

```json response
{
  "page": "cart_checkout",
  "error": "unexpected response status 409",
  "payment_type": "card"
}
```

## Scenario: cash-order

`payment_type: cash`: order placed, nothing to pay online.

```json match
{
  "payment_type": "cash"
}
```

```json response
{
  "page": "cart_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9001",
    "childInvoices": [
      {
        "serviceProvider": "food",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9001-1",
        "serviceReferenceId": 9001
      }
    ]
  },
  "payment_type": "cash"
}
```

## Scenario: wallet-order

`payment_type: wallet`: paid from the Careem Pay balance (AED 125.50).

```json match
{
  "payment_type": "wallet"
}
```

```json response
{
  "page": "cart_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9001",
    "childInvoices": [
      {
        "serviceProvider": "food",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9001-1",
        "serviceReferenceId": 9001
      }
    ]
  },
  "payment_type": "wallet"
}
```

## Scenario: shops-order

`domain: shops`: same flow with the shops bookmark consumer and settlement keys; `serviceProvider: "shops"`, order `9003` (local server shops basket `6000003`), paid by the default card.

```json match
{
  "domain": "shops"
}
```

```json response
{
  "page": "cart_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9003",
    "childInvoices": [
      {
        "serviceProvider": "shops",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9003-1",
        "serviceReferenceId": 9003
      }
    ]
  },
  "deep_link": "https://pay.careem.com/payment?adjust_deeplink_js=1&adjust_t=1k9x2mq&invoiceId=INV-9003",
  "invoice_id": "INV-9003",
  "amount": {{args.total_price}},
  "currency": "AED",
  "payment_type": "card"
}
```

## Scenario: scheduled-order

Both slot fields set: the payload carries a scheduled `delivery` block; the response looks like `card-order`.

```json match
{
  "scheduled_slot_start": "*",
  "scheduled_slot_end": "*"
}
```

```json response
{
  "page": "cart_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9001",
    "childInvoices": [
      {
        "serviceProvider": "food",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9001-1",
        "serviceReferenceId": 9001
      }
    ]
  },
  "deep_link": "https://pay.careem.com/payment?adjust_deeplink_js=1&adjust_t=1k9x2mq&invoiceId=INV-9001",
  "invoice_id": "INV-9001",
  "amount": {{args.total_price}},
  "currency": "AED",
  "payment_type": "card"
}
```

## Scenario: card-order

Default: payment resolved to card `4242`; returns the pay deep link and echoes `total_price` as `amount`.

```json response
{
  "page": "cart_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9001",
    "childInvoices": [
      {
        "serviceProvider": "food",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9001-1",
        "serviceReferenceId": 9001
      }
    ]
  },
  "deep_link": "https://pay.careem.com/payment?adjust_deeplink_js=1&adjust_t=1k9x2mq&invoiceId=INV-9001",
  "invoice_id": "INV-9001",
  "amount": {{args.total_price}},
  "currency": "AED",
  "payment_type": "card"
}
```

## Definition

```json tool
{
  "_meta": {
    "ui": {
      "resourceUri": "ui://careem-mcp-app",
      "visibility": [
        "model"
      ]
    }
  },
  "annotations": {},
  "description": "Places a food or shops order by checking out the basket (pass domain=shops for shops baskets). Returns a master invoice reference and the order ID.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "basket_id": {
        "description": "basket ID to check out (from pre-fetched basket)",
        "type": "integer"
      },
      "city_id": {
        "description": "city ID from user_info.city_id — skips city lookup when provided alongside timezone",
        "type": "integer"
      },
      "currency": {
        "description": "currency code from user_info.city_currency — used for card deep link response",
        "type": "string"
      },
      "delivery_eta": {
        "description": "expected delivery time in minutes. Required when domain=shops: pass merchant.eta_in_minutes from the cart_get_basket_price (or cart_get_basket / cart_add_item) result. Optional for food.",
        "type": "integer"
      },
      "domain": {
        "description": "order domain: food (default) or shops; must match the basket's domain",
        "type": "string"
      },
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "location_identifier": {
        "description": "delivery location UUID (LOC-xxxx format). Leave unset unless you have a real UUID — NEVER guess or send a placeholder like 'LOC-xxxx'. When omitted, the user's saved delivery address at their current coordinates is resolved automatically.",
        "type": "string"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "payment_id": {
        "description": "payment instrument ID for a specific saved card. Leave unset unless you have a real ID from basket price payment_method.id — NEVER guess or send a placeholder. When omitted (or 0) with payment_type=card, the user's default working card is used automatically.",
        "type": "integer"
      },
      "payment_type": {
        "description": "payment method: cash | card | wallet; resolved from default instrument if omitted",
        "type": "string"
      },
      "scheduled_slot_end": {
        "description": "UTC ISO end of a confirmed-available scheduling slot; omit for immediate delivery",
        "type": "string"
      },
      "scheduled_slot_start": {
        "description": "UTC ISO start of a confirmed-available scheduling slot; omit for immediate delivery",
        "type": "string"
      },
      "timezone": {
        "description": "IANA timezone from user_info.city_timezone — skips city lookup when provided alongside city_id",
        "type": "string"
      },
      "total_price": {
        "description": "total order price for validation (from pre-fetched basket price)",
        "type": "number"
      },
      "use_wallet_balance": {
        "description": "true to apply wallet balance",
        "type": "boolean"
      }
    },
    "required": [
      "basket_id",
      "total_price",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "cart_checkout",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "amount": {
        "type": "number"
      },
      "checkout": {
        "additionalProperties": false,
        "properties": {
          "childInvoices": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "clientServiceReference": {
                  "type": "string"
                },
                "invoiceReference": {
                  "type": "string"
                },
                "serviceProvider": {
                  "type": "string"
                },
                "serviceReferenceId": {
                  "type": "integer"
                }
              },
              "required": [
                "serviceProvider",
                "clientServiceReference",
                "invoiceReference",
                "serviceReferenceId"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "masterInvoiceReference": {
            "type": "string"
          }
        },
        "required": [
          "masterInvoiceReference",
          "childInvoices"
        ],
        "type": [
          "null",
          "object"
        ]
      },
      "currency": {
        "type": "string"
      },
      "deep_link": {
        "type": "string"
      },
      "error": {
        "type": "string"
      },
      "invoice_id": {
        "type": "string"
      },
      "page": {
        "type": "string"
      },
      "payment_type": {
        "type": "string"
      }
    },
    "required": [
      "page"
    ],
    "type": "object"
  },
  "title": "Checkout Cart"
}
```
