---
tool: food_get_scheduling_slots
domain: food
---

# food_get_scheduling_slots

Days and 30-minute delivery slots a restaurant accepts scheduled orders for (production: COES
the upstream API). Slot `from`/`to` are UTC timestamps built from `{{now+…}}`, so they are
always in the future; `label` is a display string (in production, local restaurant time such as
"09:00 - 09:30"; The local server uses relative labels because its times move). In The local server `date`
is a full timestamp; production sends the calendar date.

Triggers: `0,0` coordinates → `invalid-coordinates`; `restaurant_id` `39999` →
`upstream-unavailable`, `0` → `restaurant-not-found`, `30105` → `scheduling-not-supported`;
anything else (e.g. `30104` Morning Syrniki Café) → `slots-available`.

Try: "can I order syrniki from Morning Syrniki Café for tomorrow morning?".

## Scenario: invalid-coordinates

`latitude: 0, longitude: 0` → rejected before any upstream call.

```json match
{
  "latitude": 0,
  "longitude": 0
}
```

```json response
{
  "page": "food_get_scheduling_slots",
  "error": "invalid location coordinates"
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
  "page": "food_get_scheduling_slots",
  "error": "failed to get scheduling slots: unexpected response status 503"
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
  "page": "food_get_scheduling_slots",
  "error": "failed to get scheduling slots: unexpected response status 404"
}
```

## Scenario: scheduling-not-supported

Restaurant `30105` (Green Bowl Co.) does not accept scheduled orders: COES returns `days: []`, which `omitempty` drops — the output is only `page`.

```json match
{
  "restaurant_id": 30105
}
```

```json response
{
  "page": "food_get_scheduling_slots"
}
```

## Scenario: slots-available

Default (e.g. Morning Syrniki Café `30104`): today and tomorrow (production format: `date` is the local calendar day, `name` the weekday, `name_localized` "Today"/"Tomorrow"/"Fri, 9th Oct"), 20-minute slots labelled in Dubai time, starting ~2 h from now; the day after tomorrow is inactive. Pass a slot's `from`/`to` unchanged to `food_check_slot_availability`, `food_get_restaurant_menu` and the cart tools.

```json response
{
  "days": [
    {
      "date": "{{now|date}}",
      "id": 1,
      "is_active": true,
      "name": "{{now|weekday}}",
      "name_localized": "Today",
      "slots": [
        {
          "from": "{{now+120m@20m}}",
          "label": "{{now+120m@20m|hhmm}} - {{now+140m@20m|hhmm}}",
          "to": "{{now+140m@20m}}"
        },
        {
          "from": "{{now+140m@20m}}",
          "label": "{{now+140m@20m|hhmm}} - {{now+160m@20m|hhmm}}",
          "to": "{{now+160m@20m}}"
        },
        {
          "from": "{{now+160m@20m}}",
          "label": "{{now+160m@20m|hhmm}} - {{now+180m@20m|hhmm}}",
          "to": "{{now+180m@20m}}"
        },
        {
          "from": "{{now+180m@20m}}",
          "label": "{{now+180m@20m|hhmm}} - {{now+200m@20m|hhmm}}",
          "to": "{{now+200m@20m}}"
        },
        {
          "from": "{{now+200m@20m}}",
          "label": "{{now+200m@20m|hhmm}} - {{now+220m@20m|hhmm}}",
          "to": "{{now+220m@20m}}"
        },
        {
          "from": "{{now+220m@20m}}",
          "label": "{{now+220m@20m|hhmm}} - {{now+240m@20m|hhmm}}",
          "to": "{{now+240m@20m}}"
        }
      ]
    },
    {
      "date": "{{now+24h|date}}",
      "id": 2,
      "is_active": true,
      "name": "{{now+24h|weekday}}",
      "name_localized": "Tomorrow",
      "slots": [
        {
          "from": "{{now+1440m@20m}}",
          "label": "{{now+1440m@20m|hhmm}} - {{now+1460m@20m|hhmm}}",
          "to": "{{now+1460m@20m}}"
        },
        {
          "from": "{{now+1460m@20m}}",
          "label": "{{now+1460m@20m|hhmm}} - {{now+1480m@20m|hhmm}}",
          "to": "{{now+1480m@20m}}"
        },
        {
          "from": "{{now+1480m@20m}}",
          "label": "{{now+1480m@20m|hhmm}} - {{now+1500m@20m|hhmm}}",
          "to": "{{now+1500m@20m}}"
        },
        {
          "from": "{{now+1500m@20m}}",
          "label": "{{now+1500m@20m|hhmm}} - {{now+1520m@20m|hhmm}}",
          "to": "{{now+1520m@20m}}"
        },
        {
          "from": "{{now+1520m@20m}}",
          "label": "{{now+1520m@20m|hhmm}} - {{now+1540m@20m|hhmm}}",
          "to": "{{now+1540m@20m}}"
        },
        {
          "from": "{{now+1540m@20m}}",
          "label": "{{now+1540m@20m|hhmm}} - {{now+1560m@20m|hhmm}}",
          "to": "{{now+1560m@20m}}"
        }
      ]
    },
    {
      "date": "{{now+48h|date}}",
      "id": 3,
      "is_active": false,
      "name": "{{now+48h|weekday}}",
      "name_localized": "{{now+48h|daylabel}}",
      "slots": []
    }
  ],
  "page": "food_get_scheduling_slots"
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Fetch the days and time-slots a restaurant currently accepts scheduled (future) orders for. Returns a list of days (today, tomorrow, and upcoming dates), each with its own list of time-slots (start/end in UTC, plus a display label in the restaurant's local time). Use this before letting the user pick a delivery time for a scheduled order, then confirm the chosen slot is still open with food_check_slot_availability before checkout.",
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
        "description": "ID of the restaurant to fetch scheduling slots for",
        "type": "integer"
      }
    },
    "required": [
      "restaurant_id",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "food_get_scheduling_slots",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "days": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string"
            },
            "id": {
              "type": "integer"
            },
            "is_active": {
              "type": "boolean"
            },
            "name": {
              "type": "string"
            },
            "name_localized": {
              "type": "string"
            },
            "slots": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "from": {
                    "type": "string"
                  },
                  "label": {
                    "type": "string"
                  },
                  "to": {
                    "type": "string"
                  }
                },
                "required": [
                  "from",
                  "to",
                  "label"
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
            "id",
            "date",
            "is_active",
            "name",
            "name_localized",
            "slots"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "error": {
        "type": "string"
      },
      "page": {
        "type": "string"
      }
    },
    "required": [
      "page"
    ],
    "type": "object"
  },
  "title": "Get Food Scheduling Slots"
}
```
