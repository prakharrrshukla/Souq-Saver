---
tool: food_get_items_options
domain: food
---

# food_get_items_options

Batch version of `food_get_item_options`. The local server keys on `restaurant_id` and returns
every item of that restaurant (it does not filter by `item_ids`), which covers the common
reorder flow: restaurant `30104` → 700401 Classic Syrniki + 700402 Cappuccino.
Each result reports its own `error` independently, as in production (see `partial-failure`).

## Scenario: partial-failure

Including item `799999` in `item_ids` shows per-item partial failure: the syrniki items succeed, 799999 errors.

```json match
{
  "item_ids": [
    799999
  ]
}
```

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": 700401,
      "item_name": "Classic Syrniki with Sour Cream",
      "has_required_options": true,
      "option_groups": [
        {
          "group_id": 84011,
          "name": "Choose your topping",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "84011::840111",
              "group_id": 84011,
              "option_id": 840111,
              "name": "Sour cream",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84011::840112",
              "group_id": 84011,
              "option_id": 840112,
              "name": "Berry jam",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84011::840113",
              "group_id": 84011,
              "option_id": 840113,
              "name": "Condensed milk",
              "price": 0,
              "is_active": true
            }
          ]
        },
        {
          "group_id": 84012,
          "name": "Add-ons",
          "required": false,
          "min": 0,
          "max": 2,
          "multi_select": true,
          "options": [
            {
              "catalog_option_id": "84012::840121",
              "group_id": 84012,
              "option_id": 840121,
              "name": "Extra sour cream",
              "price": 4,
              "is_active": true
            },
            {
              "catalog_option_id": "84012::840122",
              "group_id": 84012,
              "option_id": 840122,
              "name": "Fresh berries",
              "price": 6,
              "is_active": true
            }
          ]
        }
      ]
    },
    {
      "item_id": 700402,
      "item_name": "Cappuccino",
      "has_required_options": true,
      "option_groups": [
        {
          "group_id": 84021,
          "name": "Choose your milk",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "84021::840211",
              "group_id": 84021,
              "option_id": 840211,
              "name": "Full cream",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84021::840212",
              "group_id": 84021,
              "option_id": 840212,
              "name": "Oat",
              "price": 3,
              "is_active": true
            },
            {
              "catalog_option_id": "84021::840213",
              "group_id": 84021,
              "option_id": 840213,
              "name": "Almond",
              "price": 3,
              "is_active": true
            }
          ]
        },
        {
          "group_id": 84022,
          "name": "Choose your size",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "84022::840221",
              "group_id": 84022,
              "option_id": 840221,
              "name": "Regular",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84022::840222",
              "group_id": 84022,
              "option_id": 840222,
              "name": "Large",
              "price": 4,
              "is_active": true
            }
          ]
        }
      ]
    },
    {
      "item_id": 799999,
      "item_name": "",
      "has_required_options": false,
      "option_groups": null,
      "error": "failed to fetch item options: unexpected response status 404"
    }
  ]
}
```

## Scenario: no-item-ids

`item_ids: null` → validation error before any upstream call; `results` is `null`. Force with `./careem-mcp.sh scenario` to simulate an empty array.

```json match
{
  "item_ids": null
}
```

```json response
{
  "page": "food_get_items_options",
  "results": null,
  "error": "no item_ids provided"
}
```

## Scenario: upstream-unavailable

`restaurant_id: 39999` → every per-item GET returns 503 (The local server renders one entry, for `item_ids[0]`).

```json match
{
  "restaurant_id": 39999
}
```

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": {{args.item_ids.0}},
      "item_name": "",
      "has_required_options": false,
      "option_groups": null,
      "error": "failed to fetch item options: unexpected response status 503"
    }
  ]
}
```

## Scenario: shawarma-station

Restaurant `30101` (Shawarma Station): returns options for all of its menu items, whichever ids were asked for.

```json match
{
  "restaurant_id": 30101
}
```

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": 700101,
      "item_name": "Chicken Shawarma Wrap",
      "has_required_options": true,
      "option_groups": [
        {
          "group_id": 81011,
          "name": "Choose your size",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "81011::810111",
              "group_id": 81011,
              "option_id": 810111,
              "name": "Regular",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "81011::810112",
              "group_id": 81011,
              "option_id": 810112,
              "name": "Large",
              "price": 6,
              "is_active": true
            }
          ]
        },
        {
          "group_id": 81012,
          "name": "Extras",
          "required": false,
          "min": 0,
          "max": 2,
          "multi_select": true,
          "options": [
            {
              "catalog_option_id": "81012::810121",
              "group_id": 81012,
              "option_id": 810121,
              "name": "Extra garlic sauce",
              "price": 2,
              "is_active": true
            },
            {
              "catalog_option_id": "81012::810122",
              "group_id": 81012,
              "option_id": 810122,
              "name": "No pickles",
              "price": 0,
              "is_active": true
            }
          ]
        }
      ]
    },
    {
      "item_id": 700102,
      "item_name": "Falafel Plate",
      "has_required_options": false,
      "option_groups": []
    },
    {
      "item_id": 700103,
      "item_name": "Mixed Grill Platter",
      "has_required_options": false,
      "option_groups": []
    }
  ]
}
```

## Scenario: sakura-sushi-lab

Restaurant `30102` (Sakura Sushi Lab): returns options for all of its menu items, whichever ids were asked for.

```json match
{
  "restaurant_id": 30102
}
```

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": 700201,
      "item_name": "Salmon Avocado Roll (8 pcs)",
      "has_required_options": false,
      "option_groups": []
    },
    {
      "item_id": 700202,
      "item_name": "Chicken Katsu Bento",
      "has_required_options": false,
      "option_groups": []
    }
  ]
}
```

## Scenario: pizza-piazza

Restaurant `30103` (Pizza Piazza): returns options for all of its menu items, whichever ids were asked for.

```json match
{
  "restaurant_id": 30103
}
```

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": 700301,
      "item_name": "Margherita Pizza",
      "has_required_options": true,
      "option_groups": [
        {
          "group_id": 83011,
          "name": "Choose your size",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "83011::830111",
              "group_id": 83011,
              "option_id": 830111,
              "name": "Medium",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "83011::830112",
              "group_id": 83011,
              "option_id": 830112,
              "name": "Large",
              "price": 12,
              "is_active": true
            }
          ]
        },
        {
          "group_id": 83012,
          "name": "Choose your crust",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "83012::830121",
              "group_id": 83012,
              "option_id": 830121,
              "name": "Classic",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "83012::830122",
              "group_id": 83012,
              "option_id": 830122,
              "name": "Thin",
              "price": 0,
              "is_active": true
            }
          ]
        },
        {
          "group_id": 83013,
          "name": "Extra toppings",
          "required": false,
          "min": 0,
          "max": 3,
          "multi_select": true,
          "options": [
            {
              "catalog_option_id": "83013::830131",
              "group_id": 83013,
              "option_id": 830131,
              "name": "Mushrooms",
              "price": 4,
              "is_active": true
            },
            {
              "catalog_option_id": "83013::830132",
              "group_id": 83013,
              "option_id": 830132,
              "name": "Black olives",
              "price": 3,
              "is_active": true
            },
            {
              "catalog_option_id": "83013::830133",
              "group_id": 83013,
              "option_id": 830133,
              "name": "Extra mozzarella",
              "price": 6,
              "is_active": true
            }
          ]
        }
      ]
    },
    {
      "item_id": 700302,
      "item_name": "Pepperoni Pizza",
      "has_required_options": false,
      "option_groups": []
    }
  ]
}
```

## Scenario: morning-syrniki-cafe

Restaurant `30104` (Morning Syrniki Café): returns options for all of its menu items, whichever ids were asked for.

```json match
{
  "restaurant_id": 30104
}
```

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": 700401,
      "item_name": "Classic Syrniki with Sour Cream",
      "has_required_options": true,
      "option_groups": [
        {
          "group_id": 84011,
          "name": "Choose your topping",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "84011::840111",
              "group_id": 84011,
              "option_id": 840111,
              "name": "Sour cream",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84011::840112",
              "group_id": 84011,
              "option_id": 840112,
              "name": "Berry jam",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84011::840113",
              "group_id": 84011,
              "option_id": 840113,
              "name": "Condensed milk",
              "price": 0,
              "is_active": true
            }
          ]
        },
        {
          "group_id": 84012,
          "name": "Add-ons",
          "required": false,
          "min": 0,
          "max": 2,
          "multi_select": true,
          "options": [
            {
              "catalog_option_id": "84012::840121",
              "group_id": 84012,
              "option_id": 840121,
              "name": "Extra sour cream",
              "price": 4,
              "is_active": true
            },
            {
              "catalog_option_id": "84012::840122",
              "group_id": 84012,
              "option_id": 840122,
              "name": "Fresh berries",
              "price": 6,
              "is_active": true
            }
          ]
        }
      ]
    },
    {
      "item_id": 700402,
      "item_name": "Cappuccino",
      "has_required_options": true,
      "option_groups": [
        {
          "group_id": 84021,
          "name": "Choose your milk",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "84021::840211",
              "group_id": 84021,
              "option_id": 840211,
              "name": "Full cream",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84021::840212",
              "group_id": 84021,
              "option_id": 840212,
              "name": "Oat",
              "price": 3,
              "is_active": true
            },
            {
              "catalog_option_id": "84021::840213",
              "group_id": 84021,
              "option_id": 840213,
              "name": "Almond",
              "price": 3,
              "is_active": true
            }
          ]
        },
        {
          "group_id": 84022,
          "name": "Choose your size",
          "required": true,
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "catalog_option_id": "84022::840221",
              "group_id": 84022,
              "option_id": 840221,
              "name": "Regular",
              "price": 0,
              "is_active": true
            },
            {
              "catalog_option_id": "84022::840222",
              "group_id": 84022,
              "option_id": 840222,
              "name": "Large",
              "price": 4,
              "is_active": true
            }
          ]
        }
      ]
    }
  ]
}
```

## Scenario: green-bowl-co

Restaurant `30105` (Green Bowl Co.): returns options for all of its menu items, whichever ids were asked for.

```json match
{
  "restaurant_id": 30105
}
```

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": 700501,
      "item_name": "Chicken Caesar Bowl",
      "has_required_options": false,
      "option_groups": []
    }
  ]
}
```

## Scenario: restaurant-not-found

Default: restaurant id not locally world → every per-item GET 404s. Production has no top-level error here; each item carries its own (The local server renders one entry, for `item_ids[0]`).

```json response
{
  "page": "food_get_items_options",
  "results": [
    {
      "item_id": {{args.item_ids.0}},
      "item_name": "",
      "has_required_options": false,
      "option_groups": null,
      "error": "failed to fetch item options: unexpected response status 404"
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
  "description": "Fetch customization/option groups for several menu items from the same restaurant in one call — prefer this over repeated food_get_item_options calls when checking 2+ items. Partial success: each item in the results array reports its own option groups or its own error independently.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "city_id": {
        "description": "city ID",
        "type": "string"
      },
      "domain": {
        "description": "order domain: food | shops | quik; defaults to food",
        "type": "string"
      },
      "item_ids": {
        "description": "item IDs to fetch customization options for, in one call",
        "items": {
          "type": "integer"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "restaurant_id": {
        "description": "restaurant/merchant ID the items belong to",
        "type": "integer"
      }
    },
    "required": [
      "restaurant_id",
      "item_ids",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "food_get_items_options",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "page": {
        "type": "string"
      },
      "results": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "error": {
              "type": "string"
            },
            "has_required_options": {
              "type": "boolean"
            },
            "item_id": {
              "type": "integer"
            },
            "item_name": {
              "type": "string"
            },
            "option_groups": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "group_id": {
                    "type": "integer"
                  },
                  "max": {
                    "type": "integer"
                  },
                  "min": {
                    "type": "integer"
                  },
                  "multi_select": {
                    "type": "boolean"
                  },
                  "name": {
                    "type": "string"
                  },
                  "options": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "catalog_option_id": {
                          "type": "string"
                        },
                        "group_id": {
                          "type": "integer"
                        },
                        "is_active": {
                          "type": "boolean"
                        },
                        "name": {
                          "type": "string"
                        },
                        "option_id": {
                          "type": "integer"
                        },
                        "price": {
                          "type": "number"
                        },
                        "sub_groups": {
                          "items": {
                            "additionalProperties": false,
                            "properties": {
                              "group_id": {
                                "type": "integer"
                              },
                              "max": {
                                "type": "integer"
                              },
                              "min": {
                                "type": "integer"
                              },
                              "multi_select": {
                                "type": "boolean"
                              },
                              "name": {
                                "type": "string"
                              },
                              "options": {
                                "items": {
                                  "additionalProperties": false,
                                  "properties": {
                                    "catalog_option_id": {
                                      "type": "string"
                                    },
                                    "group_id": {
                                      "type": "integer"
                                    },
                                    "is_active": {
                                      "type": "boolean"
                                    },
                                    "name": {
                                      "type": "string"
                                    },
                                    "option_id": {
                                      "type": "integer"
                                    },
                                    "price": {
                                      "type": "number"
                                    }
                                  },
                                  "required": [
                                    "catalog_option_id",
                                    "group_id",
                                    "option_id",
                                    "name",
                                    "price",
                                    "is_active"
                                  ],
                                  "type": "object"
                                },
                                "type": [
                                  "null",
                                  "array"
                                ]
                              },
                              "required": {
                                "type": "boolean"
                              }
                            },
                            "required": [
                              "group_id",
                              "name",
                              "required",
                              "min",
                              "max",
                              "multi_select",
                              "options"
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
                        "catalog_option_id",
                        "group_id",
                        "option_id",
                        "name",
                        "price",
                        "is_active"
                      ],
                      "type": "object"
                    },
                    "type": [
                      "null",
                      "array"
                    ]
                  },
                  "required": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "group_id",
                  "name",
                  "required",
                  "min",
                  "max",
                  "multi_select",
                  "options"
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
            "item_id",
            "item_name",
            "has_required_options",
            "option_groups"
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
      "page",
      "results"
    ],
    "type": "object"
  },
  "title": "Get Customization Options for Multiple Items"
}
```
