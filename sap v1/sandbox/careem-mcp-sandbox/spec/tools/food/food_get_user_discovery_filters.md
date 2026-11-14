---
tool: food_get_user_discovery_filters
domain: food
---

# food_get_user_discovery_filters

Filter and sort sections the food discovery screen offers at the user's location. Each item's
`key`/`value` pair is an input of the search tools —
[food_dynamic_search](food_dynamic_search.md), [food_dish_search](food_dish_search.md) and
[food_merchant_search](food_merchant_search.md) (e.g. `cuisine_ids=9` → Sakura Sushi Lab,
`promotions_percentage=15` → restaurants with offers, `sort=rating`). Cuisine ids line up with
the cuisines on the fixture restaurants 30101–30105.

Triggers: `latitude: 0` → `outside-service-area`, `latitude: 99` → `upstream-unavailable`,
`latitude: 1` → `no-filters`, anything else → `dubai-marina`.

Try: "what filters can I use for food?" then "show me Japanese places".

## Scenario: outside-service-area

Latitude `0` simulates a location Careem Food does not serve: upstream 400, body echoed in the error. `filters`/`sorts` are omitted (omitempty).

```json match
{
  "latitude": 0
}
```

```json response
{
  "page": "user_food_discovery_filters",
  "error": "failed to fetch discovery filters: unexpected status 400: {\"code\":\"OUT_OF_SERVICE_AREA\",\"message\":\"location is outside the service area\"}"
}
```

## Scenario: upstream-unavailable

Latitude `99` (or `./careem-mcp.sh scenario`) → upstream 503.

```json match
{
  "latitude": 99
}
```

```json response
{
  "page": "user_food_discovery_filters",
  "error": "failed to fetch discovery filters: unexpected status 503: {\"code\":\"SERVICE_UNAVAILABLE\",\"message\":\"upstream unavailable\"}"
}
```

## Scenario: no-filters

Latitude `1` → upstream returns `{}`; empty lists are dropped by `omitempty`, leaving only `page`.

```json match
{
  "latitude": 1
}
```

```json response
{
  "page": "user_food_discovery_filters"
}
```

## Scenario: dubai-marina

Default: full set of filters and sorts for Dubai Marina.

```json response
{
  "page": "user_food_discovery_filters",
  "filters": [
    {
      "section_name": "Quick Access Filters",
      "section_type": "offers_type",
      "is_multi_select": true,
      "items": [
        {
          "text": "4.7+ Rated",
          "key": "avr_rating",
          "value": "4.65"
        },
        {
          "text": "Top Choices",
          "key": "tag_ids",
          "value": "1249"
        },
        {
          "text": "15% Off or more",
          "key": "promotions_percentage",
          "value": "15"
        },
        {
          "text": "Careem+ Exclusive",
          "key": "tag_ids",
          "value": "1210"
        },
        {
          "text": "Under 30 mins",
          "key": "delivery_time",
          "value": "30"
        }
      ]
    },
    {
      "section_name": "Price range",
      "section_type": "price_range",
      "is_multi_select": false,
      "items": [
        {
          "text": "$",
          "key": "price",
          "value": "low"
        },
        {
          "text": "$$",
          "key": "price",
          "value": "mid"
        },
        {
          "text": "$$$",
          "key": "price",
          "value": "high"
        }
      ]
    },
    {
      "section_name": "Cuisines",
      "section_type": "cuisines",
      "is_multi_select": true,
      "items": [
        {
          "text": "Arabic",
          "key": "cuisine_ids",
          "value": "5"
        },
        {
          "text": "Breakfast",
          "key": "cuisine_ids",
          "value": "21"
        },
        {
          "text": "Healthy",
          "key": "cuisine_ids",
          "value": "34"
        },
        {
          "text": "Italian",
          "key": "cuisine_ids",
          "value": "8"
        },
        {
          "text": "Japanese",
          "key": "cuisine_ids",
          "value": "9"
        },
        {
          "text": "Pizza",
          "key": "cuisine_ids",
          "value": "313"
        },
        {
          "text": "Sushi",
          "key": "cuisine_ids",
          "value": "312"
        }
      ]
    },
    {
      "section_name": "Dietary",
      "section_type": "dietary",
      "is_multi_select": true,
      "items": [
        {
          "text": "Vegetarian",
          "key": "tag_ids",
          "value": "681"
        },
        {
          "text": "Vegan",
          "key": "tag_ids",
          "value": "682"
        },
        {
          "text": "Halal",
          "key": "tag_ids",
          "value": "144"
        }
      ]
    }
  ],
  "sorts": [
    {
      "section_name": "Sort by",
      "section_type": "sort_by",
      "is_multi_select": false,
      "items": [
        {
          "text": "Recommended",
          "key": "sort",
          "value": "recommended"
        },
        {
          "text": "Top Rated",
          "key": "sort",
          "value": "top_rated"
        },
        {
          "text": "Fastest delivery",
          "key": "sort",
          "value": "delivery_time"
        },
        {
          "text": "Price: low to high",
          "key": "sort",
          "value": "price_asc"
        },
        {
          "text": "Nearest",
          "key": "sort",
          "value": "nearby"
        }
      ]
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
  "description": "Fetch available filter and sort options for food discovery at the user's location.\nReturns sections such as cuisines, dietary preferences, quick-access filters (deals, ratings, delivery speed),\nand sort options — each with the key/value parameters needed for food discovery search filters.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "latitude": {
        "description": "user's current latitude",
        "type": "number"
      },
      "longitude": {
        "description": "user's current longitude",
        "type": "number"
      }
    },
    "required": [
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "food_get_user_discovery_filters",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "filters": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "is_multi_select": {
              "type": "boolean"
            },
            "items": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "key": {
                    "type": "string"
                  },
                  "text": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "text",
                  "key",
                  "value"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "section_name": {
              "type": "string"
            },
            "section_type": {
              "type": "string"
            }
          },
          "required": [
            "section_name",
            "section_type",
            "is_multi_select",
            "items"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "page": {
        "type": "string"
      },
      "sorts": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "is_multi_select": {
              "type": "boolean"
            },
            "items": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "key": {
                    "type": "string"
                  },
                  "text": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "text",
                  "key",
                  "value"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "section_name": {
              "type": "string"
            },
            "section_type": {
              "type": "string"
            }
          },
          "required": [
            "section_name",
            "section_type",
            "is_multi_select",
            "items"
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
      "page"
    ],
    "type": "object"
  },
  "title": "Get User Food Discovery Filters"
}
```
