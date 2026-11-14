---
tool: search_groceries_get_all_deals
domain: groceries
---

# search_groceries_get_all_deals

Every current Quik deal at the nearest store (Careem Quik Dubai Marina `40001`), grouped by
category — the "All Deals" virtual category. In the fixture world the only discounted SKU is
`4000108` Ground Coffee 250g (20% off, AED 40.00 → 32.00); items keep the full `GroceryItem`
shape, so ids go straight into the cart tools.

Magic coordinates: `latitude: 0` → outside the service area, `latitude: -1` →
upstream unavailable, `latitude: 1` → no deals right now.

## Scenario: outside-service-area

`latitude: 0` — no Quik store nearby; the category filter answers 404.

```json match
{
  "latitude": 0
}
```

```json response
{
  "page": "search_groceries_get_all_deals",
  "groups": null,
  "error": "failed to get all deals: unexpected response status 404"
}
```

## Scenario: upstream-unavailable

`latitude: -1` (magic trigger): upstream answers 503.

```json match
{
  "latitude": -1
}
```

```json response
{
  "page": "search_groceries_get_all_deals",
  "groups": null,
  "error": "failed to get all deals: unexpected response status 503"
}
```

## Scenario: no-deals

`latitude: 1` (magic trigger): the store has no active deals right now.

```json match
{
  "latitude": 1
}
```

```json response
{
  "page": "search_groceries_get_all_deals",
  "merchant_id": 40001,
  "groups": []
}
```

## Scenario: deals

Default: the discounted ground coffee under *Coffee & Tea*.

```json response
{
  "page": "search_groceries_get_all_deals",
  "merchant_id": 40001,
  "groups": [
    {
      "id": 7100108,
      "name": "Coffee & Tea",
      "name_localized": "Coffee & Tea",
      "active": true,
      "items": [
        {
          "id": 4000108,
          "item": "Ground Coffee 250g",
          "item_localized": "Ground Coffee 250g",
          "upc": "6290000000108",
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_coffee.png",
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
            "discount_type": "PERCENTAGE",
            "total": 32.0,
            "total_formatted": "32.00",
            "tax_percentage": 5
          },
          "active": true,
          "link": "https://careem-catalog-media.media.careem.com/quik/items/4000108",
          "attributes": [],
          "tags": [],
          "catalog_id": 40001,
          "view_only_promotion": null,
          "currency": {
            "code": "AED",
            "decimals": 2,
            "label": "AED"
          },
          "item_location": null,
          "master_product_id": "sku_coffee",
          "is_near_expiry": false,
          "is_ad": false,
          "ad_details": null,
          "is_available": true,
          "timing": null,
          "groups": [],
          "item_promotion": {
            "label": "20% off"
          },
          "item_badge_localized": "20% off",
          "item_type": "REGULAR",
          "bundle_details": null,
          "superapp_link": "careem://shops/merchant/40001/item/4000108"
        }
      ]
    }
  ]
}
```

## Definition

```json tool
{
  "_meta": {
    "ui": {
      "resourceUri": "ui://careem-mcp-app",
      "visibility": [
        "model"
      ]
    }
  },
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Retrieves every item currently on discount in the \"All Deals\" category on Quik (Careem's grocery store), grouped by category. Use this ONLY when the user asks to see all deals/discounts in general (e.g. \"show all deals on Quik\", \"what's on sale\") with NO specific product, item, or category named. If the user names a specific item or category, use search_groceries_items with the on_discount filter instead.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "latitude": {
        "description": "the user's current location latitude, used to resolve delivery ETA and item availability",
        "type": "number"
      },
      "longitude": {
        "description": "the user's current location longitude, used to resolve delivery ETA and item availability",
        "type": "number"
      }
    },
    "required": [
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "search_groceries_get_all_deals",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "groups": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "active": {
              "type": "boolean"
            },
            "id": {
              "type": "integer"
            },
            "items": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "active": {
                    "type": "boolean"
                  },
                  "ad_details": true,
                  "attributes": {
                    "items": true,
                    "type": [
                      "null",
                      "array"
                    ]
                  },
                  "bundle_details": true,
                  "catalog_id": {
                    "type": "integer"
                  },
                  "currency": {
                    "additionalProperties": true,
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
                    "items": true,
                    "type": [
                      "null",
                      "array"
                    ]
                  },
                  "id": {
                    "type": "integer"
                  },
                  "image_url": {
                    "type": "string"
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
                    "type": [
                      "null",
                      "boolean"
                    ]
                  },
                  "is_available": {
                    "type": "boolean"
                  },
                  "is_near_expiry": {
                    "type": [
                      "null",
                      "boolean"
                    ]
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
                    "additionalProperties": true,
                    "type": [
                      "null",
                      "object"
                    ]
                  },
                  "item_promotion": {
                    "additionalProperties": true,
                    "type": [
                      "null",
                      "object"
                    ]
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
                      "original_formatted",
                      "discount",
                      "discount_percentage",
                      "discount_type",
                      "total",
                      "total_formatted",
                      "tax_percentage"
                    ],
                    "type": "object"
                  },
                  "superapp_link": {
                    "type": "string"
                  },
                  "tags": {
                    "items": true,
                    "type": [
                      "null",
                      "array"
                    ]
                  },
                  "timing": {
                    "additionalProperties": true,
                    "type": [
                      "null",
                      "object"
                    ]
                  },
                  "upc": {
                    "type": "string"
                  },
                  "view_only_promotion": {
                    "additionalProperties": true,
                    "type": [
                      "null",
                      "object"
                    ]
                  }
                },
                "required": [
                  "id",
                  "item",
                  "item_localized",
                  "upc",
                  "image_url",
                  "images_urls",
                  "description",
                  "description_localized",
                  "price",
                  "active",
                  "link",
                  "attributes",
                  "tags",
                  "catalog_id",
                  "view_only_promotion",
                  "currency",
                  "item_location",
                  "master_product_id",
                  "is_near_expiry",
                  "is_ad",
                  "ad_details",
                  "is_available",
                  "timing",
                  "groups",
                  "item_promotion",
                  "item_badge_localized",
                  "item_type",
                  "bundle_details",
                  "superapp_link"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "name": {
              "type": "string"
            },
            "name_localized": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "name",
            "name_localized",
            "active",
            "items"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "merchant_id": {
        "type": "integer"
      },
      "page": {
        "type": "string"
      }
    },
    "required": [
      "page",
      "groups"
    ],
    "type": "object"
  },
  "title": "Get All Grocery Deals on Quik"
}
```
