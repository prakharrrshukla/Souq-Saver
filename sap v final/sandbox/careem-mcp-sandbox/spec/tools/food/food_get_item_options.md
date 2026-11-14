---
tool: food_get_item_options
domain: food
---

# food_get_item_options

Customization groups for one menu item. `catalog_option_id` is `<group_id>::<option_id>`,
exactly as production builds it, and is what `cart_add_item` expects. Items with options:
700101 (size, extras), 700301 (size, crust, toppings), 700401 (topping, add-ons),
700402 (milk, size). Every other fixture item returns no groups.

Try: "add a large oat cappuccino" (700402 → `84021::840212` + `84022::840222`).

## Scenario: upstream-unavailable

`restaurant_id: 39999` → upstream 503 (checked before the per-item scenarios).

```json match
{
  "restaurant_id": 39999
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": {{args.item_id}},
  "item_name": "",
  "currency": {
    "id": 0,
    "code": "",
    "name": "",
    "name_localized": "",
    "label": "",
    "label_localized": "",
    "position": "",
    "decimals": 0,
    "purchasing_power_index": 0,
    "name_short": "",
    "cents_100": false
  },
  "has_required_options": false,
  "option_groups": [],
  "error": "failed to fetch item options: unexpected response status 503"
}
```

## Scenario: item-700101

`700101` Chicken Shawarma Wrap. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`.

```json match
{
  "item_id": 700101
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700101,
  "item_name": "Chicken Shawarma Wrap",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
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
}
```

## Scenario: item-700102

`700102` Falafel Plate. No customization — can be added to the cart directly.

```json match
{
  "item_id": 700102
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700102,
  "item_name": "Falafel Plate",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "has_required_options": false,
  "option_groups": []
}
```

## Scenario: item-700103

`700103` Mixed Grill Platter. No customization — can be added to the cart directly.

```json match
{
  "item_id": 700103
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700103,
  "item_name": "Mixed Grill Platter",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "has_required_options": false,
  "option_groups": []
}
```

## Scenario: item-700201

`700201` Salmon Avocado Roll (8 pcs). No customization — can be added to the cart directly.

```json match
{
  "item_id": 700201
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700201,
  "item_name": "Salmon Avocado Roll (8 pcs)",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "has_required_options": false,
  "option_groups": []
}
```

## Scenario: item-700202

`700202` Chicken Katsu Bento. No customization — can be added to the cart directly.

```json match
{
  "item_id": 700202
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700202,
  "item_name": "Chicken Katsu Bento",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "has_required_options": false,
  "option_groups": []
}
```

## Scenario: item-700301

`700301` Margherita Pizza. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`.

```json match
{
  "item_id": 700301
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700301,
  "item_name": "Margherita Pizza",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
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
}
```

## Scenario: item-700302

`700302` Pepperoni Pizza. No customization — can be added to the cart directly.

```json match
{
  "item_id": 700302
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700302,
  "item_name": "Pepperoni Pizza",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "has_required_options": false,
  "option_groups": []
}
```

## Scenario: item-700401

`700401` Classic Syrniki with Sour Cream. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`.

```json match
{
  "item_id": 700401
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700401,
  "item_name": "Classic Syrniki with Sour Cream",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
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
}
```

## Scenario: item-700402

`700402` Cappuccino. Has required option groups — pass the chosen `catalog_option_id` values to `cart_add_item`.

```json match
{
  "item_id": 700402
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700402,
  "item_name": "Cappuccino",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
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
```

## Scenario: item-700501

`700501` Chicken Caesar Bowl. No customization — can be added to the cart directly.

```json match
{
  "item_id": 700501
}
```

```json response
{
  "page": "food_get_item_options",
  "item_id": 700501,
  "item_name": "Chicken Caesar Bowl",
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "has_required_options": false,
  "option_groups": []
}
```

## Scenario: item-not-found

Default: item id not locally menus (use 700101–700501) → upstream 404. `item_id` echoes the input; `currency` is zero-valued, as in production.

```json response
{
  "page": "food_get_item_options",
  "item_id": {{args.item_id}},
  "item_name": "",
  "currency": {
    "id": 0,
    "code": "",
    "name": "",
    "name_localized": "",
    "label": "",
    "label_localized": "",
    "position": "",
    "decimals": 0,
    "purchasing_power_index": 0,
    "name_short": "",
    "cents_100": false
  },
  "has_required_options": false,
  "option_groups": [],
  "error": "failed to fetch item options: unexpected response status 404"
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Fetch a menu item's customization/option groups (e.g. size, toppings) with ready-to-use catalog_option_id values. Call this before cart_add_item when an item may require or allow customization.",
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
      "item_id": {
        "description": "item ID to fetch customization options for",
        "type": "integer"
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
        "description": "restaurant/merchant ID the item belongs to",
        "type": "integer"
      }
    },
    "required": [
      "restaurant_id",
      "item_id",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "food_get_item_options",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "currency": {
        "additionalProperties": false,
        "properties": {
          "cents_100": {
            "type": "boolean"
          },
          "code": {
            "type": "string"
          },
          "decimals": {
            "maximum": 2147483647,
            "minimum": -2147483648,
            "type": "integer"
          },
          "id": {
            "type": "integer"
          },
          "label": {
            "type": "string"
          },
          "label_localized": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "name_localized": {
            "type": "string"
          },
          "name_short": {
            "type": "string"
          },
          "position": {
            "type": "string"
          },
          "purchasing_power_index": {
            "maximum": 2147483647,
            "minimum": -2147483648,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "code",
          "name",
          "name_localized",
          "label",
          "label_localized",
          "position",
          "decimals",
          "purchasing_power_index",
          "name_short",
          "cents_100"
        ],
        "type": "object"
      },
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
      },
      "page": {
        "type": "string"
      }
    },
    "required": [
      "page",
      "item_id",
      "item_name",
      "currency",
      "has_required_options",
      "option_groups"
    ],
    "type": "object"
  },
  "title": "Get Item Customization Options"
}
```
