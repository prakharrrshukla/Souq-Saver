---
tool: cart_get_checkout_promos
domain: cart
---

# cart_get_checkout_promos

Promos available at checkout for a merchant. `CAREEM20` (20% off up to AED 15) is the best saving
and is what the cart tools auto-apply; `FREEDEL` is available; `EXPIRED10` is listed but deactivated.
This tool only lists promos — it never applies one.

## Scenario: half-slot

Only a slot start (end passed as `""`) → rejected before any upstream call.

```json match
{
  "scheduled_slot_start": "*",
  "scheduled_slot_end": ""
}
```

```json response
{
  "page": "cart_get_checkout_promos",
  "error": "scheduled_slot_start and scheduled_slot_end must both be set, or both omitted"
}
```

## Scenario: no-basket

Shawarma Station (`30101`) has no basket: basket lookup answers 404 (a basket-not-found error, text `basket not found`) and, unlike the pricing flow, this tool fails hard.

```json match
{
  "merchant_id": 30101
}
```

```json response
{
  "page": "cart_get_checkout_promos",
  "error": "failed to get promos: basket not found"
}
```

## Scenario: upstream-unavailable

Merchant `99999` (magic trigger): upstream answers 503 (an upstream failure reads the same way).

```json match
{
  "merchant_id": 99999
}
```

```json response
{
  "page": "cart_get_checkout_promos",
  "error": "failed to get promos: unexpected response status 503"
}
```

## Scenario: cash-payment

`payment_type: COD` locks the card-only CAREEM20.

```json match
{
  "payment_type": "COD"
}
```

```json response
{
  "page": "cart_get_checkout_promos",
  "promos": {
    "title_localized": "Available offers",
    "promos": [
      {
        "id": 510030,
        "code": "FREEDEL",
        "title_localized": "Free delivery",
        "short_title_localized": "Free delivery",
        "description_localized": "Free delivery on orders above AED 50.",
        "condition_localized": "Minimum order AED 50.",
        "offer_type": "free_delivery_offer",
        "badge_type": "success",
        "is_best_saving": false,
        "is_deactivated": false,
        "locked": false,
        "hide_on_checkout": false
      },
      {
        "id": 510020,
        "code": "CAREEM20",
        "title_localized": "20% off your order",
        "short_title_localized": "20% off",
        "description_localized": "Get 20% off, up to AED 15.",
        "condition_localized": "Pay by card to unlock this promo.",
        "offer_type": "percentage_discount_offer",
        "badge_type": "success",
        "is_best_saving": false,
        "is_deactivated": false,
        "locked": true,
        "hide_on_checkout": false
      },
      {
        "id": 510010,
        "code": "EXPIRED10",
        "title_localized": "10% off breakfast",
        "short_title_localized": "10% off",
        "description_localized": "10% off breakfast orders.",
        "condition_localized": "This promo expired on 30 Sep 2026.",
        "offer_type": "percentage_discount_offer",
        "badge_type": "neutral",
        "is_best_saving": false,
        "is_deactivated": true,
        "locked": false,
        "hide_on_checkout": false
      }
    ]
  }
}
```

## Scenario: no-promos

Quik store `40001` has no checkout promos today.

```json match
{
  "merchant_id": 40001
}
```

```json response
{
  "page": "cart_get_checkout_promos",
  "promos": {
    "title_localized": "Available offers",
    "promos": []
  }
}
```

## Scenario: promos-available

Default: CAREEM20 (best), free delivery, and expired EXPIRED10.

```json response
{
  "page": "cart_get_checkout_promos",
  "promos": {
    "title_localized": "Available offers",
    "promos": [
      {
        "id": 510020,
        "code": "CAREEM20",
        "title_localized": "20% off your order",
        "short_title_localized": "20% off",
        "description_localized": "Get 20% off, up to AED 15.",
        "condition_localized": "Valid on card payments. Max discount AED 15.",
        "offer_type": "percentage_discount_offer",
        "badge_type": "success",
        "is_best_saving": true,
        "is_deactivated": false,
        "locked": false,
        "hide_on_checkout": false
      },
      {
        "id": 510030,
        "code": "FREEDEL",
        "title_localized": "Free delivery",
        "short_title_localized": "Free delivery",
        "description_localized": "Free delivery on orders above AED 50.",
        "condition_localized": "Minimum order AED 50.",
        "offer_type": "free_delivery_offer",
        "badge_type": "success",
        "is_best_saving": false,
        "is_deactivated": false,
        "locked": false,
        "hide_on_checkout": false
      },
      {
        "id": 510010,
        "code": "EXPIRED10",
        "title_localized": "10% off breakfast",
        "short_title_localized": "10% off",
        "description_localized": "10% off breakfast orders.",
        "condition_localized": "This promo expired on 30 Sep 2026.",
        "offer_type": "percentage_discount_offer",
        "badge_type": "neutral",
        "is_best_saving": false,
        "is_deactivated": true,
        "locked": false,
        "hide_on_checkout": false
      }
    ]
  }
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Returns available promo codes for the current basket. The best saving promo is flagged with is_best_saving.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "business_type": {
        "description": "business type e.g. food, quik",
        "type": "string"
      },
      "city_id": {
        "description": "city ID from user_info.city_id — skips city lookup when provided",
        "type": "integer"
      },
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "merchant_id": {
        "description": "merchant ID to get promos for",
        "type": "integer"
      },
      "payment_type": {
        "description": "payment type e.g. CARD, COD",
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
        "description": "IANA timezone from user_info.city_timezone — skips city lookup when provided",
        "type": "string"
      },
      "use_wallet": {
        "description": "true if wallet balance is being used",
        "type": "boolean"
      }
    },
    "required": [
      "merchant_id",
      "business_type",
      "payment_type",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "cart_get_checkout_promos",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "page": {
        "type": "string"
      },
      "promos": {
        "additionalProperties": false,
        "properties": {
          "promos": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "badge_type": {
                  "type": "string"
                },
                "code": {
                  "type": "string"
                },
                "condition_localized": {
                  "type": "string"
                },
                "description_localized": {
                  "type": "string"
                },
                "hide_on_checkout": {
                  "type": "boolean"
                },
                "id": {
                  "type": "integer"
                },
                "is_best_saving": {
                  "type": "boolean"
                },
                "is_deactivated": {
                  "type": "boolean"
                },
                "locked": {
                  "type": "boolean"
                },
                "offer_type": {
                  "type": "string"
                },
                "short_title_localized": {
                  "type": "string"
                },
                "title_localized": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "code",
                "offer_type",
                "is_best_saving",
                "is_deactivated",
                "locked",
                "title_localized",
                "short_title_localized",
                "condition_localized",
                "description_localized",
                "hide_on_checkout",
                "badge_type"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "title_localized": {
            "type": "string"
          }
        },
        "required": [
          "promos",
          "title_localized"
        ],
        "type": [
          "null",
          "object"
        ]
      }
    },
    "required": [
      "page"
    ],
    "type": "object"
  },
  "title": "Get Checkout Promo Codes"
}
```
