---
tool: box_get_config
domain: box
---

# box_get_config

First step of a Careem Box flow: the city's prohibited-items disclaimer and suggested captain
instructions for a pickup point. The local server answers for Dubai (Home `25.0866, 55.1474` or any
other valid point): Box Delivery (`send`, default) or Box Purchase (`buy`) texts.

Try: "I want to send a package from home", business type `buy` ("buy something for me"),
`latitude: 0` (outside the Box area), an invalid business type such as `delivery`.

## Scenario: invalid-business-type

Any `business_type` other than `send`/`buy` — the triggers it on values containing
`deliver` (e.g. `delivery`). Production also rejects `Send` (case-sensitive), which the
case-insensitive local server matcher cannot reproduce.

```json match
{ "business_type": "~deliver" }
```

```json response
{ "error": "business_type must be either 'send' or 'buy'" }
```

## Scenario: invalid-location

`0, 0` (or out-of-range) coordinates; no upstream call.

```json match
{ "latitude": 0, "longitude": 0 }
```

```json response
{ "error": "a valid location is required to fetch box config" }
```

## Scenario: outside-service-area

`latitude: 0` with a non-zero longitude: the point is valid but not in any Box city, so
upstream answers 400 (body ignored).

```json match
{ "latitude": 0 }
```

```json response
{ "error": "failed to fetch box config: box service returned status 400" }
```

## Scenario: upstream-unavailable

Internal failure (magic `longitude: 0` with a non-zero latitude, or `./careem-mcp.sh scenario`):
upstream answers 503. Also stands for transport errors (`failed to fetch box config:
<transport error>`) and the unreachable `internal server error`.

```json match
{ "longitude": 0 }
```

```json response
{ "error": "failed to fetch box config: box service returned status 503" }
```

## Scenario: buy-dubai

Box Purchase: the captain buys items for the user.

```json match
{ "business_type": "buy" }
```

```json response
{
  "info_text": "The captain pays for your items upfront (up to AED 500) and you reimburse them on delivery. Alcohol, tobacco, medicines and gift cards can't be purchased.",
  "instructions_suggestions": [
    "Keep the receipt in the bag",
    "Call me if an item is out of stock",
    "Buy the closest alternative if unavailable"
  ]
}
```

## Scenario: send-dubai

Default: Box Delivery from a Dubai pickup.

```json response
{
  "info_text": "We do not transport anything illegal or prohibited by our terms, including alcohol and money",
  "instructions_suggestions": [
    "Upon arrival please call",
    "Please leave outside the door"
  ]
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Retrieve city-specific info text (e.g. prohibited-items disclaimer) and suggested captain instructions for a Box Delivery or Box Purchase, given a location. Surface info_text to the user and offer instructions_suggestions as quick picks when asking for delivery instructions.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "business_type": {
        "description": "box business type: send (Box Delivery) or buy (Box Purchase)",
        "type": "string"
      },
      "latitude": {
        "description": "pickup location latitude",
        "type": "number"
      },
      "longitude": {
        "description": "pickup location longitude",
        "type": "number"
      }
    },
    "required": [
      "latitude",
      "longitude",
      "business_type"
    ],
    "type": "object"
  },
  "name": "box_get_config",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "info_text": {
        "description": "disclaimer text about prohibited items - surface this to the user",
        "type": "string"
      },
      "instructions_suggestions": {
        "description": "suggested instructions for the captain the user can pick from or use as inspiration",
        "items": {
          "type": "string"
        },
        "type": [
          "null",
          "array"
        ]
      }
    },
    "type": "object"
  },
  "title": "Get Box Delivery Instructions And Info"
}
```
