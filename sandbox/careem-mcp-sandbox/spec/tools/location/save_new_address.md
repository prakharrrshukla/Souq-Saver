---
tool: save_new_address
domain: location
---

# save_new_address

Saves a bookmark for Leo. New bookmarks get id `50004`. Leo already has Home (`50001`),
Work (`50002`) and Gym (`50003`), so reusing one of those names is rejected.

## Scenario: duplicate-home

`saved_name` "Home" already exists.

```json match
{
  "saved_name": "Home"
}
```

```json response
{
  "success": false,
  "error": "failed to save location: unexpected response status 409"
}
```

## Scenario: duplicate-work

`saved_name` "Work" already exists.

```json match
{
  "saved_name": "Work"
}
```

```json response
{
  "success": false,
  "error": "failed to save location: unexpected response status 409"
}
```

## Scenario: duplicate-gym

`saved_name` "Gym" already exists.

```json match
{
  "saved_name": "Gym"
}
```

```json response
{
  "success": false,
  "error": "failed to save location: unexpected response status 409"
}
```

## Scenario: validation-rejected

Empty `saved_name`: the tool sends it anyway (no local validation of the name or of the detail fields `building_type` requires) and the bookmark service rejects it with 422.

```json match
{"saved_name": ""}
```

```json response
{
  "success": false,
  "error": "failed to save location: unexpected response status 422"
}
```

## Scenario: outside-service-area

Latitude `0` — not inside any service area.

```json match
{
  "latitude": 0
}
```

```json response
{
  "success": false,
  "error": "failed to save location: unexpected response status 400"
}
```

## Scenario: upstream-unavailable

Internal failure (`saved_name` containing `trigger_upstream_down`, or `./careem-mcp.sh scenario`): 503 after retries. Also stands for transport timeouts (`failed to save location: Post "…": context deadline exceeded …`) and `internal server error`.

```json match
{"saved_name": "~trigger_upstream_down"}
```

```json response
{
  "success": false,
  "error": "failed to save location: unexpected response status 503"
}
```

## Scenario: saved

Default: bookmark created. Coordinates are the generic Bahar 4 point from `reverse_geocode` (numeric args cannot be echoed); `providerId` echoes the input.

```json response
{
  "success": true,
  "savedLocation": {
    "bookmark": {
      "id": "50004",
      "locationUuid": "LOC-50004",
      "providerId": "{{args.provider_id}}",
      "locationType": 1,
      "serviceAreaId": 1,
      "updatedAt": "{{now}}"
    },
    "coordinates": [
      {
        "latitude": 25.0779,
        "longitude": 55.1335,
        "provider": "GOOGLE"
      }
    ]
  }
}
```

## Definition

```json tool
{
  "annotations": {},
  "description": "Saves a new address as a named bookmark for the user. First call reverse_geocode to resolve the point, then pass its providerId and coordinates here along with a saved_name (nickname).\n\nSet building_type to the kind of place (villa, apartment, office, shop, hotel, beach, park, or other; defaults to other) and provide the detail fields it requires:\n- villa: villa_number\n- apartment: apartment_number, floor_number, building_name\n- office: floor_number, building_name\n- shop: place_name, building_name\n- hotel: apartment_number, place_name\n- other: unit_number, building_name\n- beach / park: no extra fields\n\nplace_name and building_name can be taken from the reverse_geocode result.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "apartment_number": {
        "description": "apartment number; required for apartment and hotel",
        "type": "string"
      },
      "area": {
        "description": "area from the reverse_geocode result (optional)",
        "type": "string"
      },
      "building_name": {
        "description": "building name (from reverse_geocode result); required for apartment, office, shop and other",
        "type": "string"
      },
      "building_number": {
        "description": "building number (optional)",
        "type": "string"
      },
      "building_type": {
        "description": "address type: one of villa, apartment, office, shop, hotel, beach, park, other (default other). Required detail fields per type: villa-\u003evilla_number; apartment-\u003eapartment_number,floor_number,building_name; office-\u003efloor_number,building_name; shop-\u003eplace_name,building_name; hotel-\u003eapartment_number,place_name; other-\u003eunit_number,building_name; beach/park-\u003enone",
        "type": "string"
      },
      "delivery_notes": {
        "description": "additional delivery directions (optional)",
        "type": "string"
      },
      "floor_number": {
        "description": "floor number; required for apartment and office",
        "type": "string"
      },
      "latitude": {
        "description": "latitude of the location to save",
        "type": "number"
      },
      "longitude": {
        "description": "longitude of the location to save",
        "type": "number"
      },
      "place_name": {
        "description": "place name (from reverse_geocode result); required for shop and hotel",
        "type": "string"
      },
      "provider_id": {
        "description": "providerId from a reverse_geocode result identifying the place",
        "type": "string"
      },
      "saved_name": {
        "description": "nickname the user wants to save this address under (e.g. Home, Work). Always required.",
        "type": "string"
      },
      "street_name": {
        "description": "street name from the reverse_geocode result (optional)",
        "type": "string"
      },
      "unit_number": {
        "description": "unit number; required for other",
        "type": "string"
      },
      "villa_number": {
        "description": "villa number; required for villa",
        "type": "string"
      }
    },
    "required": [
      "saved_name",
      "provider_id",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "save_new_address",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "savedLocation": {
        "additionalProperties": false,
        "description": "the saved bookmark returned by the service",
        "properties": {
          "bookmark": {
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string"
              },
              "locationType": {
                "type": "integer"
              },
              "locationUuid": {
                "type": "string"
              },
              "providerId": {
                "type": "string"
              },
              "serviceAreaId": {
                "type": "integer"
              },
              "updatedAt": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "locationUuid",
              "providerId",
              "locationType",
              "serviceAreaId",
              "updatedAt"
            ],
            "type": "object"
          },
          "coordinates": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "latitude": {
                  "type": "number"
                },
                "longitude": {
                  "type": "number"
                },
                "provider": {
                  "type": "string"
                }
              },
              "required": [
                "latitude",
                "longitude",
                "provider"
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
          "bookmark",
          "coordinates"
        ],
        "type": [
          "null",
          "object"
        ]
      },
      "success": {
        "description": "whether the location was saved",
        "type": "boolean"
      }
    },
    "required": [
      "success"
    ],
    "type": "object"
  },
  "title": "Save a new address"
}
```
