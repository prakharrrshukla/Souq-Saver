---
tool: groceries_get_items_details
domain: groceries
---

# groceries_get_items_details

Full product details (price, availability, nutrition/attributes, variants) for up to 20 items of
one store, fetched in parallel — one result per requested id, in request order, each with
either `data` or its own `error`. Quik ids `4000101`–`4000108` live at merchant `40001`;
Marina Fresh Market's `4010101` at `40101`.

Local server triggers: `item_ids` containing `4000108` → coffee with its 20% deal and size variants;
`4000106` → the out-of-stock avocado; `4000199` → not found at this merchant; `merchant_id:
99999` → upstream unavailable for every item; `merchant_id: 40101` → shops item; `item_ids`
containing `0` → validation error. Anything else returns milk + eggs.

## Scenario: missing-merchant

`merchant_id: 0`.

```json match
{
  "merchant_id": 0
}
```

```json response
{
  "page": "groceries_get_items_details",
  "error": "merchant_id is required"
}
```

## Scenario: no-item-ids

`item_ids: null` (an empty array can't be targeted — use `./careem-mcp.sh scenario`).

```json match
{
  "item_ids": null
}
```

```json response
{
  "page": "groceries_get_items_details",
  "error": "item_ids must contain at least one item id"
}
```

## Scenario: non-positive-id

`item_ids` containing `0` (any id ≤ 0).

```json match
{
  "item_ids": [
    0
  ]
}
```

```json response
{
  "page": "groceries_get_items_details",
  "error": "item_ids must all be positive"
}
```

## Scenario: too-many-items

More than 20 ids. Array length cannot be matched, so the scenario keys this on The local server-only id
`-21` (or force it with `./careem-mcp.sh scenario`).

```json match
{
  "item_ids": [
    -21
  ]
}
```

```json response
{
  "page": "groceries_get_items_details",
  "error": "item_ids can contain at most 20 item ids"
}
```

## Scenario: upstream-unavailable

`merchant_id: 99999` (magic trigger): every item lookup answers 503 (shown for the first id).

```json match
{
  "merchant_id": 99999
}
```

```json response
{
  "page": "groceries_get_items_details",
  "items": [
    {
      "item_id": {{args.item_ids.0}},
      "error": "failed to get item details: unexpected response status 503"
    }
  ]
}
```

## Scenario: shops-item

`merchant_id: 40101` — Marina Fresh Market's organic milk.

```json match
{
  "merchant_id": 40101
}
```

```json response
{
  "page": "groceries_get_items_details",
  "items": [
    {
      "item_id": 4010101,
      "data": {
        "id": 4010101,
        "item": "Organic Full Cream Milk 1L",
        "item_localized": "Organic Full Cream Milk 1L",
        "upc": "6290004010101",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png"
        ],
        "description": "Organic Full Cream Milk 1L (1 L)",
        "description_localized": "Organic Full Cream Milk 1L (1 L)",
        "price": {
          "original": 8.5,
          "original_formatted": "8.50",
          "discount": 0.0,
          "discount_percentage": 0,
          "total": 8.5,
          "total_formatted": "8.50",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/shops/items/4010101",
        "catalog_id": 40101,
        "currency": {
          "label_localized": "AED"
        },
        "unit_of_measure": {
          "value": "1 L",
          "value_localized": "1 L"
        },
        "core_category": {
          "id": 8101,
          "name": "Milk",
          "name_localized": "Milk",
          "parent_category_id": 8100,
          "parent_category_name": "Dairy & Eggs",
          "parent_category_name_localized": "Dairy & Eggs"
        },
        "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png",
        "master_product_id": "sku_org_milk_1l",
        "is_near_expiry": false,
        "is_ad": false,
        "is_available": true,
        "item_type": "product",
        "tags": [
          {
            "key": "organic",
            "text_localized": "Organic"
          }
        ]
      }
    }
  ]
}
```

## Scenario: unknown-item

`item_ids` containing `4000199`: not sold at this store (404) — milk is still returned.

```json match
{
  "item_ids": [
    4000199
  ]
}
```

```json response
{
  "page": "groceries_get_items_details",
  "items": [
    {
      "item_id": 4000101,
      "data": {
        "id": 4000101,
        "item": "Fresh Farm Full Cream Milk 1L",
        "item_localized": "Fresh Farm Full Cream Milk 1L",
        "upc": "6290000000101",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        ],
        "description": "Fresh Farm Full Cream Milk 1L (1 L)",
        "description_localized": "Fresh Farm Full Cream Milk 1L (1 L)",
        "price": {
          "original": 6.75,
          "original_formatted": "6.75",
          "discount": 0.0,
          "discount_percentage": 0,
          "total": 6.75,
          "total_formatted": "6.75",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000101",
        "catalog_id": 40001,
        "currency": {
          "label_localized": "AED"
        },
        "unit_of_measure": {
          "value": "1 L",
          "value_localized": "1 L"
        },
        "core_category": {
          "id": 7101,
          "name": "Milk",
          "name_localized": "Milk",
          "parent_category_id": 7100,
          "parent_category_name": "Dairy & Eggs",
          "parent_category_name_localized": "Dairy & Eggs"
        },
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
        "master_product_id": "sku_milk_1l",
        "is_near_expiry": false,
        "is_ad": false,
        "is_available": true,
        "item_type": "product",
        "additional_attributes": [
          {
            "key": "nutrition",
            "title_localized": "Nutrition facts (per 100 ml)",
            "type": "table",
            "items": [
              {
                "key": "energy",
                "title_localized": "Energy",
                "primary_text_localized": "64 kcal"
              },
              {
                "key": "fat",
                "title_localized": "Fat",
                "primary_text_localized": "3.5 g"
              },
              {
                "key": "protein",
                "title_localized": "Protein",
                "primary_text_localized": "3.3 g"
              }
            ]
          }
        ],
        "tags": [
          {
            "key": "fresh",
            "text_localized": "Fresh"
          }
        ]
      }
    },
    {
      "item_id": 4000199,
      "error": "item not found at this merchant"
    }
  ]
}
```

## Scenario: coffee

`item_ids` containing `4000108`: ground coffee with its 20% deal, origin/roast attributes and a
500 g size variant.

```json match
{
  "item_ids": [
    4000108
  ]
}
```

```json response
{
  "page": "groceries_get_items_details",
  "items": [
    {
      "item_id": 4000108,
      "data": {
        "id": 4000108,
        "item": "Ground Coffee 250g",
        "item_localized": "Ground Coffee 250g",
        "upc": "6290000000108",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_coffee.png"
        ],
        "description": "Ground Coffee 250g (250 g)",
        "description_localized": "Ground Coffee 250g (250 g)",
        "price": {
          "original": 40.0,
          "original_formatted": "40.00",
          "discount": 8.0,
          "discount_percentage": 20,
          "total": 32.0,
          "total_formatted": "32.00",
          "tax_percentage": 5,
          "discount_type": "PERCENTAGE"
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000108",
        "catalog_id": 40001,
        "currency": {
          "label_localized": "AED"
        },
        "unit_of_measure": {
          "value": "250 g",
          "value_localized": "250 g"
        },
        "core_category": {
          "id": 7501,
          "name": "Coffee",
          "name_localized": "Coffee",
          "parent_category_id": 7500,
          "parent_category_name": "Coffee & Tea",
          "parent_category_name_localized": "Coffee & Tea"
        },
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_coffee.png",
        "master_product_id": "sku_coffee",
        "is_near_expiry": false,
        "is_ad": false,
        "is_available": true,
        "item_type": "product",
        "item_promotion": {
          "metadata": {
            "type": "DISCOUNT"
          }
        },
        "item_badge_localized": "20% off",
        "attributes": [
          {
            "key": "origin",
            "title_localized": "Origin",
            "value_localized": "Colombia"
          },
          {
            "key": "roast",
            "title_localized": "Roast",
            "value_localized": "Medium"
          }
        ],
        "variants": {
          "items": [
            {
              "id": 4000108,
              "item": "Ground Coffee 250g",
              "price": {
                "original": 40.0,
                "discount": 8.0,
                "discount_percentage": 20,
                "total": 32.0
              },
              "active": true,
              "is_near_expiry": false,
              "is_available": true,
              "variant_attributes": [
                {
                  "key": "size",
                  "value": "250g",
                  "value_localized": "250 g",
                  "collapsible": false,
                  "visible": true,
                  "priority": 1
                }
              ],
              "variant_titles": [
                "250 g"
              ]
            },
            {
              "id": 4000109,
              "item": "Ground Coffee 500g",
              "price": {
                "original": 72.0,
                "discount": 0,
                "discount_percentage": 0,
                "total": 72.0
              },
              "active": true,
              "is_near_expiry": false,
              "is_available": true,
              "variant_attributes": [
                {
                  "key": "size",
                  "value": "500g",
                  "value_localized": "500 g",
                  "collapsible": false,
                  "visible": true,
                  "priority": 1
                }
              ],
              "variant_titles": [
                "500 g"
              ]
            }
          ],
          "attributes": [
            {
              "key": "size",
              "title_localized": "Size",
              "priority": 1,
              "options": [
                {
                  "value": "250g",
                  "value_localized": "250 g",
                  "selected": true
                },
                {
                  "value": "500g",
                  "value_localized": "500 g",
                  "selected": false
                }
              ]
            }
          ]
        }
      }
    }
  ]
}
```

## Scenario: avocado

`item_ids` containing `4000106`: active in the catalogue but not available (`status_text_localized:
"Out of stock"`).

```json match
{
  "item_ids": [
    4000106
  ]
}
```

```json response
{
  "page": "groceries_get_items_details",
  "items": [
    {
      "item_id": 4000106,
      "data": {
        "id": 4000106,
        "item": "Hass Avocado 2pk",
        "item_localized": "Hass Avocado 2pk",
        "upc": "6290000000106",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_avocado.png"
        ],
        "description": "Hass Avocado 2pk (2 pcs)",
        "description_localized": "Hass Avocado 2pk (2 pcs)",
        "price": {
          "original": 11.5,
          "original_formatted": "11.50",
          "discount": 0.0,
          "discount_percentage": 0,
          "total": 11.5,
          "total_formatted": "11.50",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000106",
        "catalog_id": 40001,
        "currency": {
          "label_localized": "AED"
        },
        "unit_of_measure": {
          "value": "2 pcs",
          "value_localized": "2 pcs"
        },
        "core_category": {
          "id": 7302,
          "name": "Vegetables",
          "name_localized": "Vegetables",
          "parent_category_id": 7300,
          "parent_category_name": "Fruit & Vegetables",
          "parent_category_name_localized": "Fruit & Vegetables"
        },
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_avocado.png",
        "master_product_id": "sku_avocado",
        "is_near_expiry": false,
        "is_ad": false,
        "is_available": false,
        "item_type": "product",
        "status_text_localized": "Out of stock"
      }
    }
  ]
}
```

## Scenario: milk-and-eggs

Default: milk (with nutrition table) and eggs.

```json response
{
  "page": "groceries_get_items_details",
  "items": [
    {
      "item_id": 4000101,
      "data": {
        "id": 4000101,
        "item": "Fresh Farm Full Cream Milk 1L",
        "item_localized": "Fresh Farm Full Cream Milk 1L",
        "upc": "6290000000101",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        ],
        "description": "Fresh Farm Full Cream Milk 1L (1 L)",
        "description_localized": "Fresh Farm Full Cream Milk 1L (1 L)",
        "price": {
          "original": 6.75,
          "original_formatted": "6.75",
          "discount": 0.0,
          "discount_percentage": 0,
          "total": 6.75,
          "total_formatted": "6.75",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000101",
        "catalog_id": 40001,
        "currency": {
          "label_localized": "AED"
        },
        "unit_of_measure": {
          "value": "1 L",
          "value_localized": "1 L"
        },
        "core_category": {
          "id": 7101,
          "name": "Milk",
          "name_localized": "Milk",
          "parent_category_id": 7100,
          "parent_category_name": "Dairy & Eggs",
          "parent_category_name_localized": "Dairy & Eggs"
        },
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
        "master_product_id": "sku_milk_1l",
        "is_near_expiry": false,
        "is_ad": false,
        "is_available": true,
        "item_type": "product",
        "additional_attributes": [
          {
            "key": "nutrition",
            "title_localized": "Nutrition facts (per 100 ml)",
            "type": "table",
            "items": [
              {
                "key": "energy",
                "title_localized": "Energy",
                "primary_text_localized": "64 kcal"
              },
              {
                "key": "fat",
                "title_localized": "Fat",
                "primary_text_localized": "3.5 g"
              },
              {
                "key": "protein",
                "title_localized": "Protein",
                "primary_text_localized": "3.3 g"
              }
            ]
          }
        ],
        "tags": [
          {
            "key": "fresh",
            "text_localized": "Fresh"
          }
        ]
      }
    },
    {
      "item_id": 4000102,
      "data": {
        "id": 4000102,
        "item": "Free Range Eggs 12pk",
        "item_localized": "Free Range Eggs 12pk",
        "upc": "6290000000102",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png"
        ],
        "description": "Free Range Eggs 12pk (12 pcs)",
        "description_localized": "Free Range Eggs 12pk (12 pcs)",
        "price": {
          "original": 14.5,
          "original_formatted": "14.50",
          "discount": 0.0,
          "discount_percentage": 0,
          "total": 14.5,
          "total_formatted": "14.50",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000102",
        "catalog_id": 40001,
        "currency": {
          "label_localized": "AED"
        },
        "unit_of_measure": {
          "value": "12 pcs",
          "value_localized": "12 pcs"
        },
        "core_category": {
          "id": 7102,
          "name": "Eggs",
          "name_localized": "Eggs",
          "parent_category_id": 7100,
          "parent_category_name": "Dairy & Eggs",
          "parent_category_name_localized": "Dairy & Eggs"
        },
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png",
        "master_product_id": "sku_eggs_12",
        "is_near_expiry": false,
        "is_ad": false,
        "is_available": true,
        "item_type": "product",
        "tags": [
          {
            "key": "free_range",
            "text_localized": "Free range"
          }
        ]
      }
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
  "description": "Retrieves the details of up to 20 grocery items at a specific merchant (store) in one call: pricing, promotions, availability, category, attributes such as nutritional info, certifications, and variants (e.g. other sizes or flavours). Use it when the user asks about specific products, or to compare or filter search results (e.g. which have no sugar), after a grocery item search has given you the merchant_id and item_ids. Each requested item gets its own result, so one failure does not affect the others; an item-not-found error means the item is not in that merchant's active catalog, so search again instead of retrying.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "item_ids": {
        "description": "IDs of the items to fetch details for, as returned by the grocery item search tools (1 to 20)",
        "items": {
          "type": "integer"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "latitude": {
        "description": "the user's current location latitude",
        "type": "number"
      },
      "longitude": {
        "description": "the user's current location longitude",
        "type": "number"
      },
      "merchant_id": {
        "description": "ID of the merchant (store) the items belong to, as returned by the grocery item search tools",
        "type": "integer"
      }
    },
    "required": [
      "merchant_id",
      "item_ids",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "groceries_get_items_details",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the whole operation failed",
        "type": "string"
      },
      "items": {
        "description": "one result per requested item, in the order requested",
        "items": {
          "additionalProperties": false,
          "properties": {
            "data": {
              "additionalProperties": false,
              "description": "the item's details, including pricing, availability, nutritional info and variants",
              "properties": {
                "active": {
                  "description": "whether the item is in the merchant's active catalog (not the same as is_available)",
                  "type": "boolean"
                },
                "ad_details": {
                  "additionalProperties": false,
                  "properties": {
                    "bannerId": {
                      "type": "string"
                    },
                    "click_tracking_link": {
                      "type": "string"
                    },
                    "image_full_url": {
                      "type": "string"
                    },
                    "image_url": {
                      "type": "string"
                    },
                    "item_upc": {
                      "type": "string"
                    },
                    "view_tracking_link": {
                      "type": "string"
                    }
                  },
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "additional_attributes": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "description_localized": {
                        "type": "string"
                      },
                      "items": {
                        "items": {
                          "additionalProperties": false,
                          "properties": {
                            "key": {
                              "type": "string"
                            },
                            "primary_text_localized": {
                              "type": "string"
                            },
                            "secondary_text_localized": {
                              "type": [
                                "null",
                                "string"
                              ]
                            },
                            "title_localized": {
                              "type": "string"
                            }
                          },
                          "type": "object"
                        },
                        "type": [
                          "null",
                          "array"
                        ]
                      },
                      "key": {
                        "type": "string"
                      },
                      "table_primary_text_localized": {
                        "type": "string"
                      },
                      "table_secondary_text_localized": {
                        "type": "string"
                      },
                      "title_localized": {
                        "type": "string"
                      },
                      "type": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "key"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "attributes": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "color_code": {
                        "type": "string"
                      },
                      "flag": {
                        "type": [
                          "null",
                          "string"
                        ]
                      },
                      "icon": {
                        "type": [
                          "null",
                          "string"
                        ]
                      },
                      "key": {
                        "type": "string"
                      },
                      "title_localized": {
                        "type": "string"
                      },
                      "value_localized": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "key"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "bundle_details": {
                  "additionalProperties": false,
                  "properties": {
                    "items": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "active": {
                            "description": "whether the item is in the merchant's active catalog (not the same as is_available)",
                            "type": "boolean"
                          },
                          "attributes": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "color_code": {
                                  "type": "string"
                                },
                                "flag": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "icon": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "key": {
                                  "type": "string"
                                },
                                "title_localized": {
                                  "type": "string"
                                },
                                "value_localized": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "key"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "catalog_id": {
                            "type": "integer"
                          },
                          "core_category": {
                            "additionalProperties": false,
                            "properties": {
                              "id": {
                                "type": "integer"
                              },
                              "name": {
                                "type": "string"
                              },
                              "name_localized": {
                                "type": "string"
                              },
                              "parent_category_id": {
                                "type": [
                                  "null",
                                  "integer"
                                ]
                              },
                              "parent_category_name": {
                                "type": "string"
                              },
                              "parent_category_name_localized": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "id"
                            ],
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "currency": {
                            "additionalProperties": false,
                            "properties": {
                              "label_localized": {
                                "type": "string"
                              }
                            },
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "description": {
                            "type": "string"
                          },
                          "description_localized": {
                            "type": "string"
                          },
                          "groups": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "active": {
                                  "type": "boolean"
                                },
                                "description": {
                                  "type": "string"
                                },
                                "description_localized": {
                                  "type": "string"
                                },
                                "hash": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "id": {
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
                                "name_localized": {
                                  "type": "string"
                                },
                                "options": {
                                  "items": {
                                    "additionalProperties": false,
                                    "properties": {
                                      "active": {
                                        "type": "boolean"
                                      },
                                      "groups": {
                                        "items": {
                                          "additionalProperties": false,
                                          "properties": {
                                            "id": {
                                              "type": "integer"
                                            },
                                            "name": {
                                              "type": "string"
                                            }
                                          },
                                          "required": [
                                            "id"
                                          ],
                                          "type": "object"
                                        },
                                        "type": [
                                          "null",
                                          "array"
                                        ]
                                      },
                                      "id": {
                                        "type": "integer"
                                      },
                                      "image_url": {
                                        "type": [
                                          "null",
                                          "string"
                                        ]
                                      },
                                      "item": {
                                        "type": "string"
                                      },
                                      "item_localized": {
                                        "type": "string"
                                      },
                                      "master_product_id": {
                                        "type": [
                                          "null",
                                          "string"
                                        ]
                                      },
                                      "order": {
                                        "type": "integer"
                                      },
                                      "price": {
                                        "additionalProperties": false,
                                        "properties": {
                                          "discount": {
                                            "type": "number"
                                          },
                                          "original": {
                                            "type": "number"
                                          },
                                          "total": {
                                            "type": "number"
                                          }
                                        },
                                        "required": [
                                          "original",
                                          "discount",
                                          "total"
                                        ],
                                        "type": "object"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "price",
                                      "order",
                                      "active"
                                    ],
                                    "type": "object"
                                  },
                                  "type": [
                                    "null",
                                    "array"
                                  ]
                                },
                                "order": {
                                  "type": "integer"
                                },
                                "type": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "id",
                                "multi_select",
                                "min",
                                "max",
                                "order",
                                "active"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "id": {
                            "type": "integer"
                          },
                          "image_url": {
                            "type": [
                              "null",
                              "string"
                            ]
                          },
                          "images_urls": {
                            "items": {
                              "type": "string"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "item": {
                            "type": "string"
                          },
                          "item_localized": {
                            "type": "string"
                          },
                          "item_stripped_localized": {
                            "type": "string"
                          },
                          "link": {
                            "type": "string"
                          },
                          "master_product_id": {
                            "type": "string"
                          },
                          "price": {
                            "additionalProperties": false,
                            "properties": {
                              "discount": {
                                "type": "number"
                              },
                              "discount_percentage": {
                                "type": "number"
                              },
                              "discount_type": {
                                "type": [
                                  "null",
                                  "string"
                                ]
                              },
                              "original": {
                                "type": "number"
                              },
                              "original_formatted": {
                                "type": "string"
                              },
                              "tax_percentage": {
                                "type": [
                                  "null",
                                  "number"
                                ]
                              },
                              "total": {
                                "type": "number"
                              },
                              "total_formatted": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "original",
                              "discount",
                              "discount_percentage",
                              "total"
                            ],
                            "type": "object"
                          },
                          "quantity": {
                            "type": "integer"
                          },
                          "tags": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "color_code": {
                                  "type": "string"
                                },
                                "icon": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "key": {
                                  "type": "string"
                                },
                                "logo": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "text_localized": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "key"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "title_weight_localized": {
                            "type": "string"
                          },
                          "unit_of_measure": {
                            "additionalProperties": false,
                            "properties": {
                              "value": {
                                "type": "string"
                              },
                              "value_localized": {
                                "type": "string"
                              }
                            },
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "upc": {
                            "type": "string"
                          },
                          "view_only_promotion": {
                            "additionalProperties": false,
                            "properties": {
                              "discount_percentage": {
                                "type": "number"
                              },
                              "discount_type": {
                                "type": "string"
                              },
                              "total": {
                                "type": "number"
                              }
                            },
                            "required": [
                              "total",
                              "discount_percentage"
                            ],
                            "type": [
                              "null",
                              "object"
                            ]
                          }
                        },
                        "required": [
                          "id",
                          "price",
                          "active",
                          "quantity"
                        ],
                        "type": "object"
                      },
                      "type": [
                        "null",
                        "array"
                      ]
                    },
                    "original_aggregate_price": {
                      "type": "number"
                    },
                    "original_aggregate_price_formatted": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "original_aggregate_price"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "catalog_id": {
                  "type": "integer"
                },
                "certifications": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "info_url": {
                        "type": "string"
                      },
                      "logo_url": {
                        "type": "string"
                      },
                      "subtitle": {
                        "type": "string"
                      },
                      "title": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "core_category": {
                  "additionalProperties": false,
                  "properties": {
                    "id": {
                      "type": "integer"
                    },
                    "name": {
                      "type": "string"
                    },
                    "name_localized": {
                      "type": "string"
                    },
                    "parent_category_id": {
                      "type": [
                        "null",
                        "integer"
                      ]
                    },
                    "parent_category_name": {
                      "type": "string"
                    },
                    "parent_category_name_localized": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "currency": {
                  "additionalProperties": false,
                  "properties": {
                    "label_localized": {
                      "type": "string"
                    }
                  },
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "description": {
                  "type": "string"
                },
                "description_localized": {
                  "type": "string"
                },
                "groups": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "active": {
                        "type": "boolean"
                      },
                      "description": {
                        "type": "string"
                      },
                      "description_localized": {
                        "type": "string"
                      },
                      "hash": {
                        "type": [
                          "null",
                          "string"
                        ]
                      },
                      "id": {
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
                      "name_localized": {
                        "type": "string"
                      },
                      "options": {
                        "items": {
                          "additionalProperties": false,
                          "properties": {
                            "active": {
                              "type": "boolean"
                            },
                            "groups": {
                              "items": {
                                "additionalProperties": false,
                                "properties": {
                                  "id": {
                                    "type": "integer"
                                  },
                                  "name": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "id"
                                ],
                                "type": "object"
                              },
                              "type": [
                                "null",
                                "array"
                              ]
                            },
                            "id": {
                              "type": "integer"
                            },
                            "image_url": {
                              "type": [
                                "null",
                                "string"
                              ]
                            },
                            "item": {
                              "type": "string"
                            },
                            "item_localized": {
                              "type": "string"
                            },
                            "master_product_id": {
                              "type": [
                                "null",
                                "string"
                              ]
                            },
                            "order": {
                              "type": "integer"
                            },
                            "price": {
                              "additionalProperties": false,
                              "properties": {
                                "discount": {
                                  "type": "number"
                                },
                                "original": {
                                  "type": "number"
                                },
                                "total": {
                                  "type": "number"
                                }
                              },
                              "required": [
                                "original",
                                "discount",
                                "total"
                              ],
                              "type": "object"
                            }
                          },
                          "required": [
                            "id",
                            "price",
                            "order",
                            "active"
                          ],
                          "type": "object"
                        },
                        "type": [
                          "null",
                          "array"
                        ]
                      },
                      "order": {
                        "type": "integer"
                      },
                      "type": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id",
                      "multi_select",
                      "min",
                      "max",
                      "order",
                      "active"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "id": {
                  "type": "integer"
                },
                "image_url": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "images_urls": {
                  "items": {
                    "type": "string"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "is_ad": {
                  "type": "boolean"
                },
                "is_available": {
                  "description": "whether the item can be ordered right now; an item can be active in the catalog but unavailable, see status_text_localized",
                  "type": "boolean"
                },
                "is_near_expiry": {
                  "type": "boolean"
                },
                "item": {
                  "type": "string"
                },
                "item_badge_localized": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "item_localized": {
                  "type": "string"
                },
                "item_location": {
                  "additionalProperties": false,
                  "properties": {
                    "aisle": {
                      "type": [
                        "null",
                        "string"
                      ]
                    },
                    "row": {
                      "type": [
                        "null",
                        "string"
                      ]
                    },
                    "section": {
                      "type": [
                        "null",
                        "string"
                      ]
                    },
                    "zone": {
                      "type": [
                        "null",
                        "string"
                      ]
                    }
                  },
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "item_promotion": {
                  "additionalProperties": false,
                  "properties": {
                    "metadata": {
                      "additionalProperties": false,
                      "properties": {
                        "is_sample": {
                          "type": [
                            "null",
                            "boolean"
                          ]
                        },
                        "quantity": {
                          "type": [
                            "null",
                            "integer"
                          ]
                        },
                        "sample_promotion_id": {
                          "type": [
                            "null",
                            "integer"
                          ]
                        },
                        "sample_type": {
                          "type": [
                            "null",
                            "string"
                          ]
                        },
                        "supplier_contribution": {
                          "type": [
                            "null",
                            "number"
                          ]
                        },
                        "type": {
                          "type": [
                            "null",
                            "string"
                          ]
                        }
                      },
                      "type": "object"
                    }
                  },
                  "required": [
                    "metadata"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "item_stripped_localized": {
                  "type": "string"
                },
                "item_type": {
                  "description": "product, bundle or dynamic_bundle",
                  "type": "string"
                },
                "link": {
                  "type": "string"
                },
                "master_product_id": {
                  "type": "string"
                },
                "price": {
                  "additionalProperties": false,
                  "properties": {
                    "discount": {
                      "type": "number"
                    },
                    "discount_percentage": {
                      "type": "number"
                    },
                    "discount_type": {
                      "type": [
                        "null",
                        "string"
                      ]
                    },
                    "original": {
                      "type": "number"
                    },
                    "original_formatted": {
                      "type": "string"
                    },
                    "tax_percentage": {
                      "type": [
                        "null",
                        "number"
                      ]
                    },
                    "total": {
                      "type": "number"
                    },
                    "total_formatted": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "original",
                    "discount",
                    "discount_percentage",
                    "total"
                  ],
                  "type": "object"
                },
                "quality_dimensions": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "icon": {
                        "type": "string"
                      },
                      "key": {
                        "type": "string"
                      },
                      "max_label": {
                        "type": "string"
                      },
                      "max_score": {
                        "type": "integer"
                      },
                      "min_label": {
                        "type": "string"
                      },
                      "score": {
                        "type": "integer"
                      },
                      "title": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "key",
                      "score",
                      "max_score"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "status_text_localized": {
                  "description": "availability text for inactive items, e.g. Out of stock",
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "subtitle": {
                  "type": "string"
                },
                "tags": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "color_code": {
                        "type": "string"
                      },
                      "icon": {
                        "type": [
                          "null",
                          "string"
                        ]
                      },
                      "key": {
                        "type": "string"
                      },
                      "logo": {
                        "type": [
                          "null",
                          "string"
                        ]
                      },
                      "text_localized": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "key"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "timing": {
                  "additionalProperties": false,
                  "properties": {
                    "extra_from": {
                      "type": "string"
                    },
                    "extra_to": {
                      "type": "string"
                    },
                    "from": {
                      "type": "string"
                    },
                    "to": {
                      "type": "string"
                    }
                  },
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "title_weight_localized": {
                  "type": "string"
                },
                "unit_of_measure": {
                  "additionalProperties": false,
                  "properties": {
                    "value": {
                      "type": "string"
                    },
                    "value_localized": {
                      "type": "string"
                    }
                  },
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "upc": {
                  "type": "string"
                },
                "variant_details": {
                  "additionalProperties": false,
                  "properties": {
                    "variant_attribute": {
                      "additionalProperties": false,
                      "properties": {
                        "type": {
                          "type": "string"
                        },
                        "value_localized": {
                          "type": "string"
                        }
                      },
                      "type": "object"
                    },
                    "variant_id": {
                      "type": "integer"
                    },
                    "variant_items": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "active": {
                            "description": "whether the item is in the merchant's active catalog (not the same as is_available)",
                            "type": "boolean"
                          },
                          "attributes": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "color_code": {
                                  "type": "string"
                                },
                                "flag": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "icon": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "key": {
                                  "type": "string"
                                },
                                "title_localized": {
                                  "type": "string"
                                },
                                "value_localized": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "key"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "catalog_id": {
                            "type": "integer"
                          },
                          "core_category": {
                            "additionalProperties": false,
                            "properties": {
                              "id": {
                                "type": "integer"
                              },
                              "name": {
                                "type": "string"
                              },
                              "name_localized": {
                                "type": "string"
                              },
                              "parent_category_id": {
                                "type": [
                                  "null",
                                  "integer"
                                ]
                              },
                              "parent_category_name": {
                                "type": "string"
                              },
                              "parent_category_name_localized": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "id"
                            ],
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "currency": {
                            "additionalProperties": false,
                            "properties": {
                              "label_localized": {
                                "type": "string"
                              }
                            },
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "description": {
                            "type": "string"
                          },
                          "description_localized": {
                            "type": "string"
                          },
                          "id": {
                            "type": "integer"
                          },
                          "images_urls": {
                            "items": {
                              "type": "string"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "is_near_expiry": {
                            "type": "boolean"
                          },
                          "item": {
                            "type": "string"
                          },
                          "item_localized": {
                            "type": "string"
                          },
                          "item_stripped_localized": {
                            "type": "string"
                          },
                          "item_type": {
                            "type": "string"
                          },
                          "link": {
                            "type": "string"
                          },
                          "master_product_id": {
                            "type": "string"
                          },
                          "price": {
                            "additionalProperties": false,
                            "properties": {
                              "discount": {
                                "type": "number"
                              },
                              "discount_percentage": {
                                "type": "number"
                              },
                              "discount_type": {
                                "type": [
                                  "null",
                                  "string"
                                ]
                              },
                              "original": {
                                "type": "number"
                              },
                              "original_formatted": {
                                "type": "string"
                              },
                              "tax_percentage": {
                                "type": [
                                  "null",
                                  "number"
                                ]
                              },
                              "total": {
                                "type": "number"
                              },
                              "total_formatted": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "original",
                              "discount",
                              "discount_percentage",
                              "total"
                            ],
                            "type": "object"
                          },
                          "tags": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "color_code": {
                                  "type": "string"
                                },
                                "icon": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "key": {
                                  "type": "string"
                                },
                                "logo": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "text_localized": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "key"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "title_weight_localized": {
                            "type": "string"
                          },
                          "unit_of_measure": {
                            "additionalProperties": false,
                            "properties": {
                              "value": {
                                "type": "string"
                              },
                              "value_localized": {
                                "type": "string"
                              }
                            },
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "upc": {
                            "type": "string"
                          },
                          "variant_details": {
                            "additionalProperties": false,
                            "properties": {
                              "variant_attribute": {
                                "additionalProperties": false,
                                "properties": {
                                  "type": {
                                    "type": "string"
                                  },
                                  "value_localized": {
                                    "type": "string"
                                  }
                                },
                                "type": "object"
                              },
                              "variant_id": {
                                "type": "integer"
                              }
                            },
                            "required": [
                              "variant_id",
                              "variant_attribute"
                            ],
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "view_only_promotion": {
                            "additionalProperties": false,
                            "properties": {
                              "discount_percentage": {
                                "type": "number"
                              },
                              "discount_type": {
                                "type": "string"
                              },
                              "total": {
                                "type": "number"
                              }
                            },
                            "required": [
                              "total",
                              "discount_percentage"
                            ],
                            "type": [
                              "null",
                              "object"
                            ]
                          }
                        },
                        "required": [
                          "id",
                          "price",
                          "active",
                          "is_near_expiry"
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
                    "variant_id",
                    "variant_attribute"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "variant_details_v2": {
                  "additionalProperties": false,
                  "properties": {
                    "variant_attributes": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "collapsible": {
                            "type": "boolean"
                          },
                          "name": {
                            "type": "string"
                          },
                          "priority": {
                            "type": "integer"
                          },
                          "visibility": {
                            "type": "boolean"
                          }
                        },
                        "required": [
                          "collapsible",
                          "visibility",
                          "priority"
                        ],
                        "type": "object"
                      },
                      "type": [
                        "null",
                        "array"
                      ]
                    },
                    "variant_group_id": {
                      "type": "integer"
                    },
                    "variant_item_ids": {
                      "items": {
                        "type": "integer"
                      },
                      "type": [
                        "null",
                        "array"
                      ]
                    }
                  },
                  "required": [
                    "variant_group_id"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "variants": {
                  "additionalProperties": false,
                  "description": "items in the same variant group, e.g. other sizes or flavours",
                  "properties": {
                    "attributes": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "key": {
                            "type": "string"
                          },
                          "options": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "selected": {
                                  "type": "boolean"
                                },
                                "value": {
                                  "type": "string"
                                },
                                "value_localized": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "value",
                                "selected"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "priority": {
                            "type": "integer"
                          },
                          "title_localized": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "key",
                          "priority"
                        ],
                        "type": "object"
                      },
                      "type": [
                        "null",
                        "array"
                      ]
                    },
                    "items": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "active": {
                            "description": "whether the item is in the merchant's active catalog (not the same as is_available)",
                            "type": "boolean"
                          },
                          "attributes": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "color_code": {
                                  "type": "string"
                                },
                                "flag": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "icon": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "key": {
                                  "type": "string"
                                },
                                "title_localized": {
                                  "type": "string"
                                },
                                "value_localized": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "key"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "catalog_id": {
                            "type": "integer"
                          },
                          "core_category": {
                            "additionalProperties": false,
                            "properties": {
                              "id": {
                                "type": "integer"
                              },
                              "name": {
                                "type": "string"
                              },
                              "name_localized": {
                                "type": "string"
                              },
                              "parent_category_id": {
                                "type": [
                                  "null",
                                  "integer"
                                ]
                              },
                              "parent_category_name": {
                                "type": "string"
                              },
                              "parent_category_name_localized": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "id"
                            ],
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "currency": {
                            "additionalProperties": false,
                            "properties": {
                              "label_localized": {
                                "type": "string"
                              }
                            },
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "description": {
                            "type": "string"
                          },
                          "description_localized": {
                            "type": "string"
                          },
                          "groups": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "active": {
                                  "type": "boolean"
                                },
                                "description": {
                                  "type": "string"
                                },
                                "description_localized": {
                                  "type": "string"
                                },
                                "hash": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "id": {
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
                                "name_localized": {
                                  "type": "string"
                                },
                                "options": {
                                  "items": {
                                    "additionalProperties": false,
                                    "properties": {
                                      "active": {
                                        "type": "boolean"
                                      },
                                      "groups": {
                                        "items": {
                                          "additionalProperties": false,
                                          "properties": {
                                            "id": {
                                              "type": "integer"
                                            },
                                            "name": {
                                              "type": "string"
                                            }
                                          },
                                          "required": [
                                            "id"
                                          ],
                                          "type": "object"
                                        },
                                        "type": [
                                          "null",
                                          "array"
                                        ]
                                      },
                                      "id": {
                                        "type": "integer"
                                      },
                                      "image_url": {
                                        "type": [
                                          "null",
                                          "string"
                                        ]
                                      },
                                      "item": {
                                        "type": "string"
                                      },
                                      "item_localized": {
                                        "type": "string"
                                      },
                                      "master_product_id": {
                                        "type": [
                                          "null",
                                          "string"
                                        ]
                                      },
                                      "order": {
                                        "type": "integer"
                                      },
                                      "price": {
                                        "additionalProperties": false,
                                        "properties": {
                                          "discount": {
                                            "type": "number"
                                          },
                                          "original": {
                                            "type": "number"
                                          },
                                          "total": {
                                            "type": "number"
                                          }
                                        },
                                        "required": [
                                          "original",
                                          "discount",
                                          "total"
                                        ],
                                        "type": "object"
                                      }
                                    },
                                    "required": [
                                      "id",
                                      "price",
                                      "order",
                                      "active"
                                    ],
                                    "type": "object"
                                  },
                                  "type": [
                                    "null",
                                    "array"
                                  ]
                                },
                                "order": {
                                  "type": "integer"
                                },
                                "type": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "id",
                                "multi_select",
                                "min",
                                "max",
                                "order",
                                "active"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "id": {
                            "type": "integer"
                          },
                          "images_urls": {
                            "items": {
                              "type": "string"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "is_available": {
                            "type": "boolean"
                          },
                          "is_near_expiry": {
                            "type": "boolean"
                          },
                          "item": {
                            "type": "string"
                          },
                          "item_localized": {
                            "type": "string"
                          },
                          "item_stripped_localized": {
                            "type": "string"
                          },
                          "link": {
                            "type": "string"
                          },
                          "price": {
                            "additionalProperties": false,
                            "properties": {
                              "discount": {
                                "type": "number"
                              },
                              "discount_percentage": {
                                "type": "number"
                              },
                              "discount_type": {
                                "type": [
                                  "null",
                                  "string"
                                ]
                              },
                              "original": {
                                "type": "number"
                              },
                              "original_formatted": {
                                "type": "string"
                              },
                              "tax_percentage": {
                                "type": [
                                  "null",
                                  "number"
                                ]
                              },
                              "total": {
                                "type": "number"
                              },
                              "total_formatted": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "original",
                              "discount",
                              "discount_percentage",
                              "total"
                            ],
                            "type": "object"
                          },
                          "tags": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "color_code": {
                                  "type": "string"
                                },
                                "icon": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "key": {
                                  "type": "string"
                                },
                                "logo": {
                                  "type": [
                                    "null",
                                    "string"
                                  ]
                                },
                                "text_localized": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "key"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "title_weight_localized": {
                            "type": "string"
                          },
                          "unit_of_measure": {
                            "additionalProperties": false,
                            "properties": {
                              "value": {
                                "type": "string"
                              },
                              "value_localized": {
                                "type": "string"
                              }
                            },
                            "type": [
                              "null",
                              "object"
                            ]
                          },
                          "upc": {
                            "type": "string"
                          },
                          "variant_attributes": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "collapsible": {
                                  "type": "boolean"
                                },
                                "key": {
                                  "type": "string"
                                },
                                "priority": {
                                  "type": "integer"
                                },
                                "value": {
                                  "type": "string"
                                },
                                "value_localized": {
                                  "type": "string"
                                },
                                "visible": {
                                  "type": "boolean"
                                }
                              },
                              "required": [
                                "key",
                                "collapsible",
                                "visible",
                                "priority"
                              ],
                              "type": "object"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "variant_titles": {
                            "items": {
                              "type": "string"
                            },
                            "type": [
                              "null",
                              "array"
                            ]
                          },
                          "view_only_promotion": {
                            "additionalProperties": false,
                            "properties": {
                              "discount_percentage": {
                                "type": "number"
                              },
                              "discount_type": {
                                "type": "string"
                              },
                              "total": {
                                "type": "number"
                              }
                            },
                            "required": [
                              "total",
                              "discount_percentage"
                            ],
                            "type": [
                              "null",
                              "object"
                            ]
                          }
                        },
                        "required": [
                          "id",
                          "price",
                          "active",
                          "is_near_expiry",
                          "is_available"
                        ],
                        "type": "object"
                      },
                      "type": [
                        "null",
                        "array"
                      ]
                    },
                    "select_variant_deeplink": {
                      "type": [
                        "null",
                        "string"
                      ]
                    }
                  },
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "view_only_promotion": {
                  "additionalProperties": false,
                  "properties": {
                    "discount_percentage": {
                      "type": "number"
                    },
                    "discount_type": {
                      "type": "string"
                    },
                    "total": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "total",
                    "discount_percentage"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                }
              },
              "required": [
                "id",
                "price",
                "active",
                "is_near_expiry",
                "is_ad",
                "is_available"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "error": {
              "description": "why this item could not be fetched",
              "type": "string"
            },
            "item_id": {
              "type": "integer"
            }
          },
          "required": [
            "item_id"
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
      "page"
    ],
    "type": "object"
  },
  "title": "Get Grocery Items Details"
}
```
