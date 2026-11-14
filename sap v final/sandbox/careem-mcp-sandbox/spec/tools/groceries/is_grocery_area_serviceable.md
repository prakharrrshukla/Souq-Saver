---
tool: is_grocery_area_serviceable
domain: groceries
---

# is_grocery_area_serviceable

Answers "does Careem Quik deliver here?" by asking for the nearest Quik dark store. Leo's Home
(25.0866, 55.1474) is served by Careem Quik Dubai Marina `40001`; `latitude: 51.5074` (London) is outside the
service area; `latitude: -1` (magic trigger) simulates an upstream outage.

## Scenario: not-serviceable

`latitude: 51.5074` (London) — no Quik store covers the point. (Production answers `true` even
for `latitude: 0`, because the nearest-store lookup always returns a store, so a real
out-of-area point is used as the trigger.)

```json match
{
  "latitude": 51.5074
}
```

```json response
{
  "page": "is_grocery_area_serviceable",
  "serviceable": false
}
```

## Scenario: upstream-unavailable

`latitude: -1` (magic trigger): upstream answers 503 without an `errors` array.

```json match
{
  "latitude": -1
}
```

```json response
{
  "page": "is_grocery_area_serviceable",
  "serviceable": false,
  "error": "failed to check area serviceability: unknown grocery service error"
}
```

## Scenario: serviceable

Default (e.g. Home, 25.0866, 55.1474): Careem Quik Dubai Marina delivers here.

```json response
{
  "page": "is_grocery_area_serviceable",
  "serviceable": true
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Checks whether Quik (Careem's groceries vertical) delivers to a given area, identified by coordinates. Only call this when the user's intent is to ask whether an area/location is serviceable for groceries — do not use it as a general-purpose check for other verticals. Never invent coordinates: if the user names an area without giving coordinates, first call search_locations to resolve that area to coordinates and pass those in; if the user doesn't mention any area, use the user's current latitude/longitude.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "latitude": {
        "description": "latitude of the area to check for Quik (groceries) serviceability",
        "type": "number"
      },
      "longitude": {
        "description": "longitude of the area to check for Quik (groceries) serviceability",
        "type": "number"
      }
    },
    "required": [
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "is_grocery_area_serviceable",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "page": {
        "type": "string"
      },
      "serviceable": {
        "description": "true if Quik (groceries) delivers to the given coordinates",
        "type": "boolean"
      }
    },
    "required": [
      "page",
      "serviceable"
    ],
    "type": "object"
  },
  "title": "Check Quik (Groceries) Area Serviceability"
}
```
