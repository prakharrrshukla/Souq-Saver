---
tool: box_get_vehicle_types
domain: box
---

# box_get_vehicle_types

Vehicle types (CCTs) and price ranges for a Box trip. The local server always quotes Home
(`25.0866, 55.1474`) → Work (`25.2172, 55.2826`), ~24 km: Motorbike `1501` (AED 32–38, up to
7 kg), Car `1502` (AED 45–52, up to 60 kg), Van `1503` (AED 89–105, up to 300 kg). Box
Purchase (`buy`) lists Motorbike and Car without prices. Pass the chosen `cct_id` to
`box_pre_checkout`.

Try: "how much to send a parcel from home to work?", business type `buy`,
`dropoff_latitude: 0` (no vehicles), `pickup_latitude: 0` (outside the Box area).

## Scenario: invalid-business-type

Any value other than `send`/`buy`; the triggers it on values containing `deliver`.

```json match
{ "business_type": "~deliver" }
```

```json response
{ "vehicle_types": [], "error": "business_type must be either 'send' or 'buy'" }
```

## Scenario: invalid-pickup-coordinates

```json match
{ "pickup_latitude": 0, "pickup_longitude": 0 }
```

```json response
{ "vehicle_types": [], "error": "valid pickup and dropoff coordinates are required to fetch vehicle types" }
```

## Scenario: invalid-dropoff-coordinates

```json match
{ "dropoff_latitude": 0, "dropoff_longitude": 0 }
```

```json response
{ "vehicle_types": [], "error": "valid pickup and dropoff coordinates are required to fetch vehicle types" }
```

## Scenario: outside-service-area

`pickup_latitude: 0` with a non-zero longitude: pickup is not in a Box city, upstream 400.

```json match
{ "pickup_latitude": 0 }
```

```json response
{ "vehicle_types": [], "error": "failed to fetch vehicle types: box service returned status 400" }
```

## Scenario: upstream-unavailable

Internal failure (magic `pickup_longitude: 0` with a non-zero latitude, or
`./careem-mcp.sh scenario`): upstream 503. Also stands for transport errors and the unreachable
`internal server error`.

```json match
{ "pickup_longitude": 0 }
```

```json response
{ "vehicle_types": [], "error": "failed to fetch vehicle types: box service returned status 503" }
```

## Scenario: no-vehicles

`dropoff_latitude: 0` (non-zero longitude): the dropoff is outside the service area, upstream
returns `{"ccts": []}` — an empty list with no error.

```json match
{ "dropoff_latitude": 0 }
```

```json response
{ "vehicle_types": [] }
```

## Scenario: buy-unpriced

Box Purchase: no `pricing` upstream, so the price fields are omitted.

```json match
{ "business_type": "buy" }
```

```json response
{
  "vehicle_types": [
    {
      "cct_id": 1501,
      "title": "Motorbike",
      "description": "We buy and deliver small items up to 7 kg",
      "icon": "https://careem-catalog-media.media.careem.com/box/motorbike.png"
    },
    {
      "cct_id": 1502,
      "title": "Car",
      "description": "We buy and deliver items up to 60 kg",
      "icon": "https://careem-catalog-media.media.careem.com/box/car.png"
    }
  ]
}
```

## Scenario: send-home-to-work

Default: three priced vehicle types for Home → Work.

```json response
{
  "vehicle_types": [
    {
      "cct_id": 1501,
      "title": "Motorbike",
      "description": "Small parcels up to 7 kg (fits 2 shoe boxes)",
      "icon": "https://careem-catalog-media.media.careem.com/box/motorbike.png",
      "min_price": 32,
      "max_price": 38,
      "currency_code": "AED"
    },
    {
      "cct_id": 1502,
      "title": "Car",
      "description": "Up to 60 kg (fits 2 suitcases)",
      "icon": "https://careem-catalog-media.media.careem.com/box/car.png",
      "min_price": 45,
      "max_price": 52,
      "currency_code": "AED"
    },
    {
      "cct_id": 1503,
      "title": "Van",
      "description": "Bulky items up to 300 kg (fits a sofa)",
      "icon": "https://careem-catalog-media.media.careem.com/box/van.png",
      "min_price": 89,
      "max_price": 105,
      "currency_code": "AED"
    }
  ]
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Retrieve available vehicle types (e.g. Motorbike, Car) with price estimates for a Box package delivery or purchase, given a pickup and dropoff location. Use business_type \"send\" for Box Delivery or \"buy\" for Box Purchase. Returns each vehicle's cct_id, capacity description, and min/max price - use cct_id in the subsequent checkout/order-creation call.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "business_type": {
        "description": "box business type: send (Box Delivery) or buy (Box Purchase)",
        "type": "string"
      },
      "dropoff_latitude": {
        "description": "dropoff location latitude",
        "type": "number"
      },
      "dropoff_longitude": {
        "description": "dropoff location longitude",
        "type": "number"
      },
      "pickup_latitude": {
        "description": "pickup location latitude",
        "type": "number"
      },
      "pickup_longitude": {
        "description": "pickup location longitude",
        "type": "number"
      }
    },
    "required": [
      "pickup_latitude",
      "pickup_longitude",
      "dropoff_latitude",
      "dropoff_longitude",
      "business_type"
    ],
    "type": "object"
  },
  "name": "box_get_vehicle_types",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "vehicle_types": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "cct_id": {
              "description": "pass this as cct_id when checking out or creating the order",
              "type": "integer"
            },
            "currency_code": {
              "type": "string"
            },
            "description": {
              "type": "string"
            },
            "icon": {
              "type": "string"
            },
            "max_price": {
              "type": "number"
            },
            "min_price": {
              "type": "number"
            },
            "title": {
              "type": "string"
            }
          },
          "required": [
            "cct_id",
            "title",
            "description",
            "icon"
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
      "vehicle_types"
    ],
    "type": "object"
  },
  "title": "Get Box Vehicle Types And Pricing"
}
```
