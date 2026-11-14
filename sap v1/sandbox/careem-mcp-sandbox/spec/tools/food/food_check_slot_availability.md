---
tool: food_check_slot_availability
domain: food
---

# food_check_slot_availability

Re-checks one scheduling slot right before checkout (production: COES
the upstream API). Pass the `from`/`to` of a slot from
`food_get_scheduling_slots` unchanged as `slot_start`/`slot_end`.

Triggers: `0,0` coordinates → `invalid-coordinates`; `slot_start: ""` / `slot_end: ""` →
`missing-slot-*`; `restaurant_id` `39999` → `upstream-unavailable`, `0` →
`restaurant-not-found`, `30105` → `scheduling-not-supported`, `30103` →
`slot-full-reported-available`; anything else (e.g. `30104`) → `slot-available`.

Try: "is the 9 o'clock slot tomorrow at Morning Syrniki Café still free?".

## Scenario: invalid-coordinates

`latitude: 0, longitude: 0` → rejected before anything else (`restaurant_id` is still echoed).

```json match
{
  "latitude": 0,
  "longitude": 0
}
```

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": false,
  "error": "invalid location coordinates"
}
```

## Scenario: missing-slot-start

`slot_start: ""` → validation error, no upstream call.

```json match
{
  "slot_start": ""
}
```

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": false,
  "error": "slot_start and slot_end are required"
}
```

## Scenario: missing-slot-end

`slot_end: ""` → same validation error.

```json match
{
  "slot_end": ""
}
```

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": false,
  "error": "slot_start and slot_end are required"
}
```

## Scenario: upstream-unavailable

`restaurant_id: 39999` → COES 503.

```json match
{
  "restaurant_id": 39999
}
```

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": false,
  "error": "failed to check slot availability: unexpected response status 503"
}
```

## Scenario: restaurant-not-found

`restaurant_id: 0` (or any unknown merchant) → COES 404.

```json match
{
  "restaurant_id": 0
}
```

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": false,
  "error": "failed to check slot availability: unexpected response status 404"
}
```

## Scenario: scheduling-not-supported

Restaurant `30105` (Green Bowl Co.): `scheduling_enabled: false` and `slot_active: false` → not available, with the fixed title. `subtitle` is never set by production.

```json match
{
  "restaurant_id": 30105
}
```

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": false,
  "title": "Restaurant is not available for scheduling"
}
```

## Scenario: slot-full-reported-available

Restaurant `30103` (Pizza Piazza): upstream says the slot itself is full (`slot_active: false`) but the restaurant has scheduling enabled — production computes `slot_active || scheduling_enabled` and still reports the slot as available.

```json match
{
  "restaurant_id": 30103
}
```

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": true
}
```

## Scenario: slot-available

Default (e.g. Morning Syrniki Café `30104` with a slot from `food_get_scheduling_slots`): `slot_active: true` → available; no title/subtitle.

```json response
{
  "page": "food_check_slot_availability",
  "restaurant_id": {{args.restaurant_id}},
  "is_available": true
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Confirm a restaurant can still fulfill an order for a specific previously-fetched scheduling slot (start/end times from food_get_scheduling_slots). Always call this right before checkout when the order is scheduled for later, since slot availability can change between browsing and confirming.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "restaurant_id": {
        "description": "ID of the restaurant to check",
        "type": "integer"
      },
      "slot_end": {
        "description": "end of the chosen slot, as the exact UTC ISO timestamp returned in a scheduling slot's 'to' field",
        "type": "string"
      },
      "slot_start": {
        "description": "start of the chosen slot, as the exact UTC ISO timestamp returned in a scheduling slot's 'from' field",
        "type": "string"
      }
    },
    "required": [
      "restaurant_id",
      "latitude",
      "longitude",
      "slot_start",
      "slot_end"
    ],
    "type": "object"
  },
  "name": "food_check_slot_availability",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "is_available": {
        "type": "boolean"
      },
      "page": {
        "type": "string"
      },
      "restaurant_id": {
        "type": "integer"
      },
      "subtitle": {
        "type": "string"
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "page",
      "restaurant_id",
      "is_available"
    ],
    "type": "object"
  },
  "title": "Check Food Scheduling Slot Availability"
}
```
