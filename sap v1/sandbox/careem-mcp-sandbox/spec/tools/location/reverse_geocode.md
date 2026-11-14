---
tool: reverse_geocode
domain: location
---

# reverse_geocode

Turns coordinates into an address (Careem location service). Matches are exact on the
fixture coordinates; anything else in Dubai resolves to a generic JBR address (Bahar 4). Feed `providerId` into `save_new_address`.

## Scenario: invalid-latitude

Latitude outside ±90 (trigger: exactly `91`) → client-side validation, no HTTP call.

```json match
{"latitude": 91}
```

```json response
{ "error": "failed to reverse geocode: invalid latitude: must be between -90 and 90" }
```

## Scenario: invalid-longitude

Longitude outside ±180 (trigger: exactly `181`) → client-side validation, no HTTP call.

```json match
{"longitude": 181}
```

```json response
{ "error": "failed to reverse geocode: invalid longitude: must be between -180 and 180" }
```

## Scenario: outside-service-area

Latitude `0` (e.g. Null Island) — no Careem service area. The location service answers 404 with a JSON error object; the client never checks the status and decodes it into an all-zero result, so production returns this **empty location without an error**.

```json match
{
  "latitude": 0
}
```

```json response
{
  "location": {
    "formattedName": "",
    "latitude": 0,
    "longitude": 0,
    "serviceAreaId": 0,
    "providerId": "",
    "locationUuid": null,
    "area": "",
    "buildingName": "",
    "city": null,
    "country": "",
    "placeName": "",
    "streetAddress": "",
    "unitNumber": null
  }
}
```

## Scenario: upstream-unavailable

Internal failure, forced with `./careem-mcp.sh scenario` or the magic point `11.1111, 11.1111`: a plain-text 503 body after retries fails JSON decoding. Also stands for transport timeouts and `internal server error`.

```json match
{"latitude": 11.1111, "longitude": 11.1111}
```

```json response
{ "error": "failed to reverse geocode: invalid character 'u' looking for beginning of value" }
```

## Scenario: home-marina-gate

Leo's Home coordinates (`25.0866, 55.1474`).

```json match
{
  "latitude": 25.0866,
  "longitude": 55.1474
}
```

```json response
{
  "location": {
    "formattedName": "Marina Gate 1, Dubai Marina, Dubai",
    "latitude": 25.0866,
    "longitude": 55.1474,
    "serviceAreaId": 1,
    "providerId": "place_marina_gate_1",
    "locationUuid": "LOC-50001",
    "area": "Dubai Marina",
    "buildingName": "Marina Gate 1",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "placeName": "Marina Gate 1",
    "streetAddress": "King Salman Bin Abdulaziz Al Saud St",
    "unitNumber": null
  }
}
```

## Scenario: work-emirates-towers

Work coordinates (`25.2172, 55.2826`).

```json match
{
  "latitude": 25.2172,
  "longitude": 55.2826
}
```

```json response
{
  "location": {
    "formattedName": "Emirates Towers, Sheikh Zayed Rd, Dubai",
    "latitude": 25.2172,
    "longitude": 55.2826,
    "serviceAreaId": 1,
    "providerId": "place_emirates_towers",
    "locationUuid": "LOC-50002",
    "area": "Trade Centre 2",
    "buildingName": "Emirates Office Tower",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "placeName": "Emirates Towers",
    "streetAddress": "Sheikh Zayed Rd",
    "unitNumber": null
  }
}
```

## Scenario: generic-jbr

Default: any other point resolves to a building the location service has not indexed yet (Bahar 4 in JBR, `locationUuid: null`). Coordinates are fixed to the fixture point.

```json response
{
  "location": {
    "formattedName": "Bahar 4, Jumeirah Beach Residence, Dubai",
    "latitude": 25.0779,
    "longitude": 55.1335,
    "serviceAreaId": 1,
    "providerId": "place_bahar_4",
    "locationUuid": null,
    "area": "Jumeirah Beach Residence",
    "buildingName": "Bahar 4",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "placeName": "Bahar 4",
    "streetAddress": "The Walk, JBR",
    "unitNumber": null
  }
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Resolves latitude/longitude coordinates into a human-readable address and place details.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "latitude": {
        "description": "latitude of the point to resolve into an address",
        "type": "number"
      },
      "longitude": {
        "description": "longitude of the point to resolve into an address",
        "type": "number"
      }
    },
    "required": [
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "reverse_geocode",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "location": {
        "additionalProperties": false,
        "description": "resolved address for the given coordinates",
        "properties": {
          "area": {
            "type": "string"
          },
          "buildingName": {
            "type": "string"
          },
          "city": {
            "type": [
              "null",
              "string"
            ]
          },
          "country": {
            "type": "string"
          },
          "formattedName": {
            "type": "string"
          },
          "latitude": {
            "type": "number"
          },
          "locationUuid": {
            "type": [
              "null",
              "string"
            ]
          },
          "longitude": {
            "type": "number"
          },
          "placeName": {
            "type": "string"
          },
          "providerId": {
            "type": "string"
          },
          "serviceAreaId": {
            "type": "integer"
          },
          "streetAddress": {
            "type": "string"
          },
          "unitNumber": {
            "type": [
              "null",
              "string"
            ]
          }
        },
        "required": [
          "formattedName",
          "latitude",
          "longitude",
          "serviceAreaId",
          "providerId",
          "locationUuid",
          "area",
          "buildingName",
          "city",
          "country",
          "placeName",
          "streetAddress",
          "unitNumber"
        ],
        "type": [
          "null",
          "object"
        ]
      }
    },
    "type": "object"
  },
  "title": "Resolve coordinates into an address"
}
```
