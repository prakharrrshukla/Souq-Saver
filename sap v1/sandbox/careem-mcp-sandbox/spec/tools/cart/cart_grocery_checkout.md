---
tool: cart_grocery_checkout
domain: cart
---

# cart_grocery_checkout

Places the Careem Quik order for basket `6000002` and returns the master invoice. Order id is
`serviceReferenceId` 9002 (FIXTURES `order_9002`). `payment_type` reports what was actually
used; with card payment the user finishes payment through the returned `deep_link`, and `amount`
echoes your `total_price` (AED 45.50 for the default basket). Cash / wallet orders return no deep link.

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
  "page": "cart_grocery_checkout",
  "error": "invalid location coordinates"
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
  "page": "cart_grocery_checkout",
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
  "page": "cart_grocery_checkout",
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
  "page": "cart_grocery_checkout",
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
  "page": "cart_grocery_checkout",
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
  "page": "cart_grocery_checkout",
  "error": "unexpected response status 503",
  "payment_type": "card"
}
```

## Scenario: payment-declined

`payment_type: card` with `payment_id: 4000002`: a saved card the payment service declines. The payment was already resolved, so `payment_type` is present.

```json match
{
  "payment_type": "card",
  "payment_id": 4000002
}
```

```json response
{
  "page": "cart_grocery_checkout",
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
  "page": "cart_grocery_checkout",
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
  "page": "cart_grocery_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9002",
    "childInvoices": [
      {
        "serviceProvider": "quik",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9002-1",
        "serviceReferenceId": 9002
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
  "page": "cart_grocery_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9002",
    "childInvoices": [
      {
        "serviceProvider": "quik",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9002-1",
        "serviceReferenceId": 9002
      }
    ]
  },
  "payment_type": "wallet"
}
```

## Scenario: card-order

Default: payment resolved to card `4242`; returns the pay deep link and echoes `total_price` as `amount`.

```json response
{
  "page": "cart_grocery_checkout",
  "checkout": {
    "masterInvoiceReference": "INV-9002",
    "childInvoices": [
      {
        "serviceProvider": "quik",
        "clientServiceReference": "{{uuid}}",
        "invoiceReference": "INV-9002-1",
        "serviceReferenceId": 9002
      }
    ]
  },
  "deep_link": "https://pay.careem.com/payment?adjust_deeplink_js=1&adjust_t=1k9x2mq&invoiceId=INV-9002",
  "invoice_id": "INV-9002",
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
  "description": "Places a Careem Quik grocery order. Resolves the delivery address and payment method automatically from the user's current location if not provided.",
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
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "location_id": {
        "description": "delivery location UUID (LOC-xxxx); resolved from current location if omitted",
        "type": "string"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "payment_id": {
        "description": "payment instrument ID (from basket price payment_method.id); only applies when payment_type is card",
        "type": "integer"
      },
      "payment_type": {
        "description": "payment method: cash | wallet | card; resolved from default instrument if omitted",
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
  "name": "cart_grocery_checkout",
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
  "title": "Checkout Grocery Cart"
}
```
