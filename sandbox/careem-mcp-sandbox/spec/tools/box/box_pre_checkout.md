---
tool: box_pre_checkout
domain: box
---

# box_pre_checkout

Validates a Box Delivery (always `send`) for pickup, dropoff and a `cct_id`, returns the final
price/ETA and — when `AVAILABLE` — the payment methods the user can pick. The local server quotes
Home (`LOC-50001`, `25.0866, 55.1474`) → Work (`LOC-50002`, `25.2172, 55.2826`),
24.3 km: Motorbike `1501` AED 32–38 in 35–45 min (default), Car `1502` AED 45–52 in 40–50 min,
Van `1503` temporarily off. Payment methods: Visa •••• 4242 (id `4242`, preferred), Careem
Wallet, Cash. There is no quote id: `box_create_order` takes the same ids/coordinates again.

The echoed fields are the request's coordinates and `cct_id`; location ids, `instructions`
(`Upon arrival please call`) and `package_category_id` (`2`, Documents and others) are the fixed local server chain
values unless a scenario says otherwise (production echoes whatever was passed and omits empty
ones).

Try: Motorbike from home to work, `cct_id: 1502` (Car), `cct_id: 1503` (Van, TEMP_OFF),
`dropoff_name` containing `Abu Dhabi` (intercity), `pickup_latitude: 0` (CITY_OFF),
`instructions` containing `trigger_hours_closed` / `trigger_wallet_down` / `trigger_card_expired`,
`pickup_location_id: "50001"` (bookmark id resolved to a LOC id).

## Scenario: invalid-pickup-coordinates

```json match
{ "pickup_latitude": 0, "pickup_longitude": 0 }
```

```json response
{ "service_status": "", "error": "valid pickup and dropoff coordinates are required to pre-checkout" }
```

## Scenario: invalid-dropoff-coordinates

```json match
{ "dropoff_latitude": 0, "dropoff_longitude": 0 }
```

```json response
{ "service_status": "", "error": "valid pickup and dropoff coordinates are required to pre-checkout" }
```

## Scenario: missing-cct-id

```json match
{ "cct_id": 0 }
```

```json response
{ "service_status": "", "error": "cct_id is required - select one from box_get_vehicle_types first" }
```

## Scenario: upstream-unavailable

Internal failure (magic `pickup_longitude: 0` with a non-zero latitude, or
`./careem-mcp.sh scenario`): pre-checkout answered 503. Also stands for transport errors and the
unreachable `internal server error`.

```json match
{ "pickup_longitude": 0 }
```

```json response
{ "service_status": "", "error": "failed to fetch pre-checkout: box service returned status 503" }
```

## Scenario: city-off

`pickup_latitude: 0` (non-zero longitude): pickup outside any Box city.

```json match
{ "pickup_latitude": 0 }
```

```json response
{
  "service_status": "CITY_OFF",
  "info_text": "Careem Box isn't available in this area yet. We're working on it!",
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "Upon arrival please call",
  "package_category_id": 2
}
```

## Scenario: intercity-restricted

`dropoff_name` containing `Abu Dhabi`: pickup and dropoff are in different cities.

```json match
{ "dropoff_name": "~abu dhabi" }
```

```json response
{
  "service_status": "INTERCITY_RESTRICTED",
  "info_text": "Pickup and drop-off need to be in the same city. Box can't deliver from Dubai to Abu Dhabi yet.",
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "Upon arrival please call",
  "package_category_id": 2
}
```

## Scenario: hours-closed

Magic: `instructions` containing `trigger_hours_closed` — outside Box operating hours.

```json match
{ "instructions": "~trigger_hours_closed" }
```

```json response
{
  "service_status": "HOURS_CLOSED",
  "info_text": "Box deliveries run from 7:00 AM to 11:00 PM. Please try again during operating hours.",
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "{{args.instructions}}",
  "package_category_id": 2
}
```

## Scenario: temp-off

`cct_id: 1503` (Van) is temporarily paused.

```json match
{ "cct_id": 1503 }
```

```json response
{
  "service_status": "TEMP_OFF",
  "info_text": "Van deliveries are paused right now due to high demand. Please try a Car or Motorbike, or try again later.",
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "Upon arrival please call",
  "package_category_id": 2
}
```

## Scenario: cash-only

Magic: `instructions` containing `trigger_wallet_down` — the payment-instruments call failed (503),
so production falls back to cash only. Same output when the city can't be resolved or the user
has no usable card/wallet.

```json match
{ "instructions": "~trigger_wallet_down" }
```

```json response
{
  "service_status": "AVAILABLE",
  "delivery_estimate": {
    "min_duration_minutes": 35,
    "max_duration_minutes": 45,
    "distance_km": 24.3,
    "min_price": 32,
    "max_price": 38,
    "currency_code": "AED"
  },
  "user_available_payment_methods": [
    {
      "type": "cash",
      "display": "Cash",
      "preferred": true
    }
  ],
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "{{args.instructions}}",
  "package_category_id": 2
}
```

## Scenario: wallet-preferred

Magic: `instructions` containing `trigger_card_expired` — the only card is expired, so it is not
listed and the wallet is preferred.

```json match
{ "instructions": "~trigger_card_expired" }
```

```json response
{
  "service_status": "AVAILABLE",
  "delivery_estimate": {
    "min_duration_minutes": 35,
    "max_duration_minutes": 45,
    "distance_km": 24.3,
    "min_price": 32,
    "max_price": 38,
    "currency_code": "AED"
  },
  "user_available_payment_methods": [
    {
      "type": "wallet",
      "display": "Careem Wallet",
      "preferred": true
    },
    {
      "type": "cash",
      "display": "Cash"
    }
  ],
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "{{args.instructions}}",
  "package_category_id": 2
}
```

## Scenario: location-id-unresolved

`dropoff_location_id` containing `missing` (not `LOC-` prefixed): `CreateOrderPOI` fails, the raw
id is echoed back unchanged.

```json match
{ "dropoff_location_id": "~missing" }
```

```json response
{
  "service_status": "AVAILABLE",
  "delivery_estimate": {
    "min_duration_minutes": 35,
    "max_duration_minutes": 45,
    "distance_km": 24.3,
    "min_price": 32,
    "max_price": 38,
    "currency_code": "AED"
  },
  "user_available_payment_methods": [
    {
      "id": "4242",
      "type": "card",
      "display": "•••• 4242",
      "preferred": true
    },
    {
      "type": "wallet",
      "display": "Careem Wallet"
    },
    {
      "type": "cash",
      "display": "Cash"
    }
  ],
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "{{args.dropoff_location_id}}",
  "instructions": "Upon arrival please call",
  "package_category_id": 2
}
```

## Scenario: bookmark-ids-resolved

`pickup_location_id: "50001"` (the Home bookmark id instead of a LOC id): both ids are minted
into transactional order POIs via `CreateOrderPOI` (The local server assumes dropoff `50002`).

```json match
{ "pickup_location_id": "50001" }
```

```json response
{
  "service_status": "AVAILABLE",
  "delivery_estimate": {
    "min_duration_minutes": 35,
    "max_duration_minutes": 45,
    "distance_km": 24.3,
    "min_price": 32,
    "max_price": 38,
    "currency_code": "AED"
  },
  "user_available_payment_methods": [
    {
      "id": "4242",
      "type": "card",
      "display": "•••• 4242",
      "preferred": true
    },
    {
      "type": "wallet",
      "display": "Careem Wallet"
    },
    {
      "type": "cash",
      "display": "Cash"
    }
  ],
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001::LDD-90001",
  "dropoff_location_id": "LOC-50002::LDD-90002",
  "instructions": "Upon arrival please call",
  "package_category_id": 2
}
```

## Scenario: car-quote

`cct_id: 1502` (Car).

```json match
{ "cct_id": 1502 }
```

```json response
{
  "service_status": "AVAILABLE",
  "delivery_estimate": {
    "min_duration_minutes": 40,
    "max_duration_minutes": 50,
    "distance_km": 24.3,
    "min_price": 45,
    "max_price": 52,
    "currency_code": "AED"
  },
  "user_available_payment_methods": [
    {
      "id": "4242",
      "type": "card",
      "display": "•••• 4242",
      "preferred": true
    },
    {
      "type": "wallet",
      "display": "Careem Wallet"
    },
    {
      "type": "cash",
      "display": "Cash"
    }
  ],
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "Upon arrival please call",
  "package_category_id": 2
}
```

## Scenario: available-motorbike

Default: Motorbike Home → Work is available; card, wallet and cash offered (card preferred).

```json response
{
  "service_status": "AVAILABLE",
  "delivery_estimate": {
    "min_duration_minutes": 35,
    "max_duration_minutes": 45,
    "distance_km": 24.3,
    "min_price": 32,
    "max_price": 38,
    "currency_code": "AED"
  },
  "user_available_payment_methods": [
    {
      "id": "4242",
      "type": "card",
      "display": "•••• 4242",
      "preferred": true
    },
    {
      "type": "wallet",
      "display": "Careem Wallet"
    },
    {
      "type": "cash",
      "display": "Cash"
    }
  ],
  "cct_id": {{args.cct_id}},
  "pickup_latitude": {{args.pickup_latitude}},
  "pickup_longitude": {{args.pickup_longitude}},
  "dropoff_latitude": {{args.dropoff_latitude}},
  "dropoff_longitude": {{args.dropoff_longitude}},
  "pickup_location_id": "LOC-50001",
  "dropoff_location_id": "LOC-50002",
  "instructions": "Upon arrival please call",
  "package_category_id": 2
}
```

## Definition

```json tool
{
  "annotations": {},
  "description": "Validates that a Box Delivery can proceed for the given pickup, dropoff, and cct_id (from box_get_vehicle_types), and returns the final price/ETA estimate. Check service_status in the response - only AVAILABLE means the order can be created; any other value (INTERCITY_RESTRICTED, CITY_OFF, TEMP_OFF, HOURS_CLOSED) means the flow must stop here and the reason should be surfaced to the user. Also pass pickup_location_id, dropoff_location_id, pickup_name, dropoff_name, instructions, and package_category_id here (even though none of them affect pricing) - pickup_name/dropoff_name become the order's place title shown on the activity card, so always pass the real resolved names, never leave them blank or invent one; the location_id/instructions/category fields are echoed back to build the \"Place Order\" button directly, without a further round trip through you. When AVAILABLE, the response also includes user_available_payment_methods - show these to the user and let them pick; never auto-select. Pass the chosen entry's type (and id, for card) as payment_type/payment_id to box_create_order.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "cct_id": {
        "description": "cct_id of the vehicle type selected from box_get_vehicle_types",
        "type": "integer"
      },
      "dropoff_latitude": {
        "description": "dropoff location latitude",
        "type": "number"
      },
      "dropoff_location_id": {
        "description": "the dropoff address's location_identifier (LOC-xxxx) - same value you'll pass to box_create_order",
        "type": "string"
      },
      "dropoff_longitude": {
        "description": "dropoff location longitude",
        "type": "number"
      },
      "dropoff_name": {
        "description": "the dropoff place's title/name, same source rules as pickup_name",
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
      "pickup_latitude": {
        "description": "pickup location latitude",
        "type": "number"
      },
      "pickup_location_id": {
        "description": "the pickup address's location_identifier (LOC-xxxx) - same value you'll pass to box_create_order",
        "type": "string"
      },
      "pickup_longitude": {
        "description": "pickup location longitude",
        "type": "number"
      },
      "pickup_name": {
        "description": "the pickup place's title/name, from search_locations/reverse_geocode/a saved bookmark - shown on the created order's activity card, so pass the real resolved name, never invent one",
        "type": "string"
      }
    },
    "required": [
      "pickup_latitude",
      "pickup_longitude",
      "dropoff_latitude",
      "dropoff_longitude",
      "cct_id"
    ],
    "type": "object"
  },
  "name": "box_pre_checkout",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "cct_id": {
        "type": "integer"
      },
      "delivery_estimate": {
        "additionalProperties": false,
        "properties": {
          "currency_code": {
            "type": "string"
          },
          "distance_km": {
            "type": "number"
          },
          "max_duration_minutes": {
            "type": "number"
          },
          "max_price": {
            "type": "number"
          },
          "min_duration_minutes": {
            "type": "number"
          },
          "min_price": {
            "type": "number"
          }
        },
        "required": [
          "min_duration_minutes",
          "max_duration_minutes",
          "distance_km",
          "min_price",
          "max_price",
          "currency_code"
        ],
        "type": [
          "null",
          "object"
        ]
      },
      "dropoff_latitude": {
        "type": "number"
      },
      "dropoff_location_id": {
        "type": "string"
      },
      "dropoff_longitude": {
        "type": "number"
      },
      "error": {
        "type": "string"
      },
      "info_text": {
        "description": "user-facing explanation when service is unavailable",
        "type": "string"
      },
      "instructions": {
        "type": "string"
      },
      "package_category_id": {
        "type": "integer"
      },
      "pickup_latitude": {
        "type": "number"
      },
      "pickup_location_id": {
        "type": "string"
      },
      "pickup_longitude": {
        "type": "number"
      },
      "service_status": {
        "description": "AVAILABLE if the order can proceed; otherwise INTERCITY_RESTRICTED, CITY_OFF, TEMP_OFF, or HOURS_CLOSED - do not proceed to order creation unless this is AVAILABLE",
        "type": "string"
      },
      "user_available_payment_methods": {
        "description": "show these to the user and let them pick - never auto-select; pass the chosen entry's type (and id, for card) to box_create_order",
        "items": {
          "additionalProperties": false,
          "properties": {
            "display": {
              "description": "human-readable label, e.g. 'Visa ...4242' or 'Careem Wallet'",
              "type": "string"
            },
            "id": {
              "description": "card instrument id - pass back as payment_id when type is card",
              "type": "string"
            },
            "preferred": {
              "description": "default-select hint only - still show the user the full list",
              "type": "boolean"
            },
            "type": {
              "description": "cash, card, or wallet",
              "type": "string"
            }
          },
          "required": [
            "type",
            "display"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      }
    },
    "required": [
      "service_status"
    ],
    "type": "object"
  },
  "title": "Validate A Box Delivery Before Checkout"
}
```
