---
tool: track_activity
domain: user
---

# track_activity

Live tracker for one ongoing activity (use the `type` and `reference_id` from `get_activities`).
`ride` → captain Ahmed K. on the way for `ride_1001` (`ride_searching` → still finding a
captain); `food` → order `order_9001` being prepared; `groceries` → Quik order
`order_9002` on the way; `delivery` → Careem Box `box_7001` picked up. Only ongoing
activities track: past ones (`ride_0999`, `order_8001`, the Careem Shops order
`order_9201` — so any `shops` call) return the tracker's 404 as an error. Every success
echoes `reference_id` / `activity_type` so a client can keep polling (`poll_after` seconds).

An empty `activity_type` is also rejected by production (`invalid-type`); the scenario keys that
scenario on `taxi`. `reference_id` containing `outage` simulates a tracker outage.

## Scenario: invalid-type

`activity_type` containing `taxi` — stands in for any unsupported vertical (the scenario cannot match
"anything else").

```json match
{
  "activity_type": "~taxi"
}
```

```json response
{
  "page": "track_activity",
  "error": "invalid activity_type: must be one of ride, food, groceries, shops, or delivery"
}
```

## Scenario: upstream-unavailable

`reference_id` containing `outage` (magic trigger): the tracker answers 503.

```json match
{
  "reference_id": "~outage"
}
```

```json response
{
  "page": "track_activity",
  "error": "activity-tracker endpoint returned status 503"
}
```

## Scenario: not-ongoing

Reference ids containing `missing` — the tracker answers 404.

```json match
{
  "reference_id": "~missing"
}
```

```json response
{
  "page": "track_activity",
  "error": "activity-tracker endpoint returned status 404"
}
```

## Scenario: past-ride

Past ride `ride_0999` is completed, so there is nothing to track (tracker 404).

```json match
{
  "reference_id": "ride_0999"
}
```

```json response
{
  "page": "track_activity",
  "error": "activity-tracker endpoint returned status 404"
}
```

## Scenario: past-food-order

Past food order `order_8001` was delivered, so there is nothing to track (tracker 404).

```json match
{
  "reference_id": "order_8001"
}
```

```json response
{
  "page": "track_activity",
  "error": "activity-tracker endpoint returned status 404"
}
```

## Scenario: shops-order

`activity_type: shops` — Leo's only Careem Shops order (`order_9201`) was delivered two days
ago; the `groceries` tracker answers 404.

```json match
{
  "activity_type": "shops"
}
```

```json response
{
  "page": "track_activity",
  "error": "activity-tracker endpoint returned status 404"
}
```

## Scenario: ride-searching

`reference_id: ride_searching` — no captain yet: no ETA, no captain or vehicle, just the status
texts.

```json match
{
  "reference_id": "ride_searching"
}
```

```json response
{
  "page": "track_activity",
  "reference_id": "{{args.reference_id}}",
  "activity_type": "ride",
  "status": "SEARCHING",
  "help_deeplink": "careem://help?ride_id=ride_searching",
  "service_specific_status": "FINDING_CAPTAIN",
  "currency": "AED",
  "self_deeplink": "careem://ride.careem.com/track?ride_id=ride_searching",
  "pickup_title": "Marina Gate 1, Dubai Marina",
  "dropoff_title": "Dubai Mall, Downtown Dubai",
  "poll_after": 5,
  "title": "Finding your captain…",
  "subtitle": "This usually takes a minute"
}
```

## Scenario: food-order

`activity_type: food` — placed food order 9001 (`order_9001`) from Morning Syrniki Café being
prepared.

```json match
{
  "activity_type": "food"
}
```

```json response
{
  "page": "track_activity",
  "reference_id": "{{args.reference_id}}",
  "activity_type": "food",
  "status": "PREPARING",
  "current_eta_minutes": 22,
  "initial_eta_minutes": 25,
  "help_deeplink": "careem://care.careem.com/reportProblem?orderId=order_9001",
  "service_specific_status": "RESTAURANT_PREPARING",
  "merchant_name": "Morning Syrniki Café",
  "item_quantity_total": 3,
  "order_total": 79.5,
  "currency": "AED",
  "items": [
    {
      "name": "Classic Syrniki with Sour Cream",
      "quantity": 2,
      "image_url": "https://careem-catalog-media.media.careem.com/food/700401.png"
    },
    {
      "name": "Cappuccino",
      "quantity": 1,
      "image_url": "https://careem-catalog-media.media.careem.com/food/700402.png"
    }
  ],
  "price_breakdown": [
    {
      "name": "Subtotal",
      "price": "AED 87.00"
    },
    {
      "name": "Delivery fee",
      "price": "AED 5.00"
    },
    {
      "name": "Service fee",
      "price": "AED 2.50"
    },
    {
      "name": "CAREEM20",
      "price": "-AED 15.00"
    },
    {
      "name": "Total",
      "price": "AED 79.50"
    }
  ],
  "self_deeplink": "careem://food.careem.com/order/9001",
  "poll_after": 30
}
```

## Scenario: grocery-order

`activity_type: groceries` — Quik order `order_9002` with captain Omar R. on the way.

```json match
{
  "activity_type": "groceries"
}
```

```json response
{
  "page": "track_activity",
  "reference_id": "{{args.reference_id}}",
  "activity_type": "groceries",
  "status": "ON_THE_WAY",
  "current_eta_minutes": 9,
  "initial_eta_minutes": 15,
  "help_deeplink": "careem://care.careem.com/issueTypes?reference_id=order_9002&provider_id=3&partner=shops",
  "service_specific_status": "OUT_FOR_DELIVERY",
  "is_captain_assigned": true,
  "merchant_name": "Careem Quik Dubai Marina",
  "item_quantity_total": 4,
  "order_total": 45.5,
  "currency": "AED",
  "items": [
    {
      "name": "Fresh Farm Full Cream Milk 1L",
      "quantity": 2,
      "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
    },
    {
      "name": "Free Range Eggs 12pk",
      "quantity": 1,
      "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png"
    },
    {
      "name": "Sourdough Loaf",
      "quantity": 1,
      "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png"
    }
  ],
  "price_breakdown": [
    {
      "name": "Subtotal",
      "price": "AED 40.00"
    },
    {
      "name": "Delivery fee",
      "price": "AED 4.00"
    },
    {
      "name": "Service fee",
      "price": "AED 1.50"
    },
    {
      "name": "Total",
      "price": "AED 45.50"
    }
  ],
  "self_deeplink": "careem://shops.careem.com/order/9002",
  "captain_name": "Omar R.",
  "captain_phone": "+971500000012",
  "poll_after": 20
}
```

## Scenario: box-delivery

`activity_type: delivery` — Careem Box `box_7001` (Home → Work) picked up by Khalid M.

```json match
{
  "activity_type": "delivery"
}
```

```json response
{
  "page": "track_activity",
  "reference_id": "{{args.reference_id}}",
  "activity_type": "delivery",
  "status": "ON_THE_WAY",
  "current_eta_minutes": 18,
  "initial_eta_minutes": 25,
  "help_deeplink": "careem://care.careem.com/issueTypes?activity_id=box_7001&source_miniapp=com.careem.delivery",
  "service_specific_status": "PICKED_UP",
  "is_captain_assigned": true,
  "merchant_name": "Home",
  "item_quantity_total": 1,
  "order_total": 22,
  "currency": "AED",
  "items": [
    {
      "name": "Documents",
      "quantity": 1,
      "image_url": "https://careem-catalog-media.media.careem.com/box/documents.png"
    }
  ],
  "price_breakdown": [
    {
      "name": "Delivery fee",
      "price": "AED 22.00"
    },
    {
      "name": "Paid by",
      "price": "Cash"
    }
  ],
  "self_deeplink": "careem://delivery.careem.com/order/box_7001",
  "captain_name": "Khalid M.",
  "captain_phone": "+971500000021",
  "poll_after": 20
}
```

## Scenario: ride

Default (`activity_type: ride`): captain Ahmed K. 4 min away from Marina Gate 1.

```json response
{
  "page": "track_activity",
  "reference_id": "{{args.reference_id}}",
  "activity_type": "{{args.activity_type}}",
  "status": "CAPTAIN_ON_THE_WAY",
  "current_eta_minutes": 4,
  "initial_eta_minutes": 6,
  "help_deeplink": "careem://care.careem.com/issueTypes?activity_id=ride_1001&source_miniapp=com.careem.ridehail",
  "service_specific_status": "CAPTAIN_ASSIGNED",
  "is_captain_assigned": true,
  "currency": "AED",
  "price_breakdown": [
    {
      "name": "Estimated fare",
      "price": "AED 38.00"
    }
  ],
  "self_deeplink": "careem://ride.careem.com/track?ride_id=ride_1001",
  "captain_name": "Ahmed K.",
  "captain_phone": "+971500000000",
  "captain_rating": "4.92",
  "vehicle": {
    "plate_number": "DXB K 48213",
    "title": "White Toyota Camry",
    "image_url": "https://careem-catalog-media.media.careem.com/vehicles/camry.png"
  },
  "pickup_title": "Marina Gate 1, Dubai Marina",
  "dropoff_title": "Dubai Mall, Downtown Dubai",
  "pickup_eta_text": "Captain arrives in 4 min",
  "poll_after": 10,
  "title": "Captain on the way",
  "subtitle": "White Toyota Camry · DXB K 48213"
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Get live tracking info (current ETA, delivery stage, merchant, items, total, captain name/phone if assigned) for one ongoing ride, food, groceries, shops, or Careem Box delivery order. Only useful for ongoing orders. Use after get_activities identifies the specific order — pass its type as activity_type and its reference_id.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "activity_type": {
        "description": "vertical of the activity to track: ride, food, groceries, shops, or delivery (Careem Box send/receive package) (the activity's type field from get_activities)",
        "type": "string"
      },
      "reference_id": {
        "description": "the activity's reference_id from get_activities",
        "type": "string"
      }
    },
    "required": [
      "activity_type",
      "reference_id"
    ],
    "type": "object"
  },
  "name": "track_activity",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "activity_type": {
        "type": "string"
      },
      "captain_name": {
        "type": "string"
      },
      "captain_phone": {
        "type": "string"
      },
      "captain_rating": {
        "type": "string"
      },
      "currency": {
        "type": "string"
      },
      "current_eta_minutes": {
        "type": [
          "null",
          "integer"
        ]
      },
      "dropoff_title": {
        "type": "string"
      },
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "help_deeplink": {
        "type": "string"
      },
      "initial_eta_minutes": {
        "type": [
          "null",
          "integer"
        ]
      },
      "is_captain_assigned": {
        "type": "boolean"
      },
      "item_quantity_total": {
        "type": "integer"
      },
      "items": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "image_url": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "quantity": {
              "type": "integer"
            }
          },
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "merchant_name": {
        "type": "string"
      },
      "order_total": {
        "type": "number"
      },
      "page": {
        "description": "identifies this response as a track_activity result",
        "type": "string"
      },
      "pickup_eta_text": {
        "type": "string"
      },
      "pickup_title": {
        "type": "string"
      },
      "poll_after": {
        "type": "integer"
      },
      "price_breakdown": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "name": {
              "type": "string"
            },
            "price": {
              "type": "string"
            }
          },
          "required": [
            "name",
            "price"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "reference_id": {
        "type": "string"
      },
      "self_deeplink": {
        "type": "string"
      },
      "service_specific_status": {
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "subtitle": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "vehicle": {
        "additionalProperties": false,
        "properties": {
          "image_url": {
            "type": "string"
          },
          "plate_number": {
            "type": "string"
          },
          "title": {
            "type": "string"
          }
        },
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
  "title": "Track Activity"
}
```
