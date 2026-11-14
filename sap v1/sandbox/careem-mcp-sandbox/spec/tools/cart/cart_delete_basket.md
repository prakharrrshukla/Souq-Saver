---
tool: cart_delete_basket
domain: cart
---

# cart_delete_basket

Deletes the whole basket for a merchant. Works for the food basket (`30104`, pass `domain: "food"`)
and the grocery basket (`40001`). No pricing or enrichment follows.

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
  "page": "cart_delete_basket",
  "success": false,
  "error": "invalid location coordinates"
}
```

## Scenario: no-basket

Shawarma Station (`30101`) has no basket: DeleteBasket answers 404, surfaced as the raw status.

```json match
{
  "merchant_id": 30101
}
```

```json response
{
  "page": "cart_delete_basket",
  "success": false,
  "error": "failed to delete basket: unexpected response status 404"
}
```

## Scenario: upstream-unavailable

Merchant `99999` (magic trigger): the DELETE answers 503.

```json match
{
  "merchant_id": 99999
}
```

```json response
{
  "page": "cart_delete_basket",
  "success": false,
  "error": "failed to delete basket: unexpected response status 503"
}
```

## Scenario: deleted

Default: basket deleted.

```json response
{
  "page": "cart_delete_basket",
  "success": true
}
```

## Definition

```json tool
{
  "annotations": {},
  "description": "Deletes the entire basket for the given merchant.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "domain": {
        "description": "basket domain: shops for grocery (default), food for food ordering",
        "type": "string"
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
        "description": "merchant ID whose basket to delete",
        "type": "integer"
      },
      "timezone": {
        "description": "IANA timezone from user_info.city_timezone — skips city lookup when provided",
        "type": "string"
      }
    },
    "required": [
      "merchant_id",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "cart_delete_basket",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "page": {
        "type": "string"
      },
      "success": {
        "type": "boolean"
      }
    },
    "required": [
      "page",
      "success"
    ],
    "type": "object"
  },
  "title": "Delete Cart"
}
```
