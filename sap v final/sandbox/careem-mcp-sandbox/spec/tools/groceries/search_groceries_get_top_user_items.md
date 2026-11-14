---
tool: search_groceries_get_top_user_items
domain: groceries
---

# search_groceries_get_top_user_items

Leo's "usual" Quik items at the nearest store (merchant `40001`). Same item shape as
`search_groceries_items`, so ids can go straight into `create_grocery_cart_with_quantities` /
`cart_add_item`. When the user has no Quik history (or the personalised list fails) the tool
falls back to generic top picks and says so with `source: "top_picks"`, `is_personalized: false`.
The default answer also carries Leo's existing Quik basket `6000002`.

Magic coordinates: `latitude: 0` → outside the service area, `latitude: -1` →
upstream unavailable, `latitude: 1` → no order history (top-picks fallback).

## Scenario: outside-service-area

`latitude: 0` — no Quik store nearby: both the personalised list and the top-picks fallback
answer 404.

```json match
{
  "latitude": 0
}
```

```json response
{
  "page": "search_groceries_get_top_user_items",
  "data": null,
  "source": "",
  "is_personalized": false,
  "error": "failed to get top user items or top picks fallback: unexpected response status 404"
}
```

## Scenario: upstream-unavailable

`latitude: -1` (magic trigger): upstream answers 503 to both calls.

```json match
{
  "latitude": -1
}
```

```json response
{
  "page": "search_groceries_get_top_user_items",
  "data": null,
  "source": "",
  "is_personalized": false,
  "error": "failed to get top user items or top picks fallback: unexpected response status 503"
}
```

## Scenario: no-history

`latitude: 1` (magic trigger): a user who never ordered from Quik — the personalised list is
empty, so generic top picks are returned (coffee, bananas, yogurt) flagged as not personalised.

```json match
{
  "latitude": 1
}
```

```json response
{
  "page": "search_groceries_get_top_user_items",
  "data": {
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
      },
      {
        "id": 4000104,
        "item": "Bananas 1kg",
        "item_localized": "Bananas 1kg",
        "upc": "6290000000104",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bananas.png",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_bananas.png"
        ],
        "description": "Bananas 1kg (1 kg)",
        "description_localized": "Bananas 1kg (1 kg)",
        "price": {
          "original": 7.25,
          "original_formatted": "7.25",
          "discount": 0.0,
          "discount_percentage": 0,
          "discount_type": null,
          "total": 7.25,
          "total_formatted": "7.25",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000104",
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
        "master_product_id": "sku_bananas",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000104"
      },
      {
        "id": 4000107,
        "item": "Greek Yogurt 500g",
        "item_localized": "Greek Yogurt 500g",
        "upc": "6290000000107",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png"
        ],
        "description": "Greek Yogurt 500g (500 g)",
        "description_localized": "Greek Yogurt 500g (500 g)",
        "price": {
          "original": 13.25,
          "original_formatted": "13.25",
          "discount": 0.0,
          "discount_percentage": 0,
          "discount_type": null,
          "total": 13.25,
          "total_formatted": "13.25",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000107",
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
        "master_product_id": "sku_yogurt",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000107"
      }
    ],
    "merchant_id": 40001
  },
  "source": "top_picks",
  "is_personalized": false
}
```

## Scenario: usuals

Default: Leo's usuals at Careem Quik Dubai Marina, plus his existing basket `6000002`.

```json response
{
  "page": "search_groceries_get_top_user_items",
  "data": {
    "items": [
      {
        "id": 4000101,
        "item": "Fresh Farm Full Cream Milk 1L",
        "item_localized": "Fresh Farm Full Cream Milk 1L",
        "upc": "6290000000101",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
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
          "discount_type": null,
          "total": 6.75,
          "total_formatted": "6.75",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000101",
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
        "master_product_id": "sku_milk_1l",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000101"
      },
      {
        "id": 4000102,
        "item": "Free Range Eggs 12pk",
        "item_localized": "Free Range Eggs 12pk",
        "upc": "6290000000102",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png",
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
          "discount_type": null,
          "total": 14.5,
          "total_formatted": "14.50",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000102",
        "attributes": [],
        "tags": [
          "free_range"
        ],
        "catalog_id": 40001,
        "view_only_promotion": null,
        "currency": {
          "code": "AED",
          "decimals": 2,
          "label": "AED"
        },
        "item_location": null,
        "master_product_id": "sku_eggs_12",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000102"
      },
      {
        "id": 4000103,
        "item": "Sourdough Loaf",
        "item_localized": "Sourdough Loaf",
        "upc": "6290000000103",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_bread.png"
        ],
        "description": "Sourdough Loaf (500 g)",
        "description_localized": "Sourdough Loaf (500 g)",
        "price": {
          "original": 12.0,
          "original_formatted": "12.00",
          "discount": 0.0,
          "discount_percentage": 0,
          "discount_type": null,
          "total": 12.0,
          "total_formatted": "12.00",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000103",
        "attributes": [],
        "tags": [
          "sourdough"
        ],
        "catalog_id": 40001,
        "view_only_promotion": null,
        "currency": {
          "code": "AED",
          "decimals": 2,
          "label": "AED"
        },
        "item_location": null,
        "master_product_id": "sku_bread",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000103"
      },
      {
        "id": 4000104,
        "item": "Bananas 1kg",
        "item_localized": "Bananas 1kg",
        "upc": "6290000000104",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bananas.png",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_bananas.png"
        ],
        "description": "Bananas 1kg (1 kg)",
        "description_localized": "Bananas 1kg (1 kg)",
        "price": {
          "original": 7.25,
          "original_formatted": "7.25",
          "discount": 0.0,
          "discount_percentage": 0,
          "discount_type": null,
          "total": 7.25,
          "total_formatted": "7.25",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000104",
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
        "master_product_id": "sku_bananas",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000104"
      },
      {
        "id": 4000107,
        "item": "Greek Yogurt 500g",
        "item_localized": "Greek Yogurt 500g",
        "upc": "6290000000107",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png"
        ],
        "description": "Greek Yogurt 500g (500 g)",
        "description_localized": "Greek Yogurt 500g (500 g)",
        "price": {
          "original": 13.25,
          "original_formatted": "13.25",
          "discount": 0.0,
          "discount_percentage": 0,
          "discount_type": null,
          "total": 13.25,
          "total_formatted": "13.25",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000107",
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
        "master_product_id": "sku_yogurt",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000107"
      },
      {
        "id": 4000105,
        "item": "Mineral Water 6x1.5L",
        "item_localized": "Mineral Water 6x1.5L",
        "upc": "6290000000105",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_water_6.png",
        "images_urls": [
          "https://careem-catalog-media.media.careem.com/quik/sku_water_6.png"
        ],
        "description": "Mineral Water 6x1.5L (6 x 1.5 L)",
        "description_localized": "Mineral Water 6x1.5L (6 x 1.5 L)",
        "price": {
          "original": 9.95,
          "original_formatted": "9.95",
          "discount": 0.0,
          "discount_percentage": 0,
          "discount_type": null,
          "total": 9.95,
          "total_formatted": "9.95",
          "tax_percentage": 5
        },
        "active": true,
        "link": "https://careem-catalog-media.media.careem.com/quik/items/4000105",
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
        "master_product_id": "sku_water_6",
        "is_near_expiry": false,
        "is_ad": false,
        "ad_details": null,
        "is_available": true,
        "timing": null,
        "groups": [],
        "item_promotion": null,
        "item_badge_localized": null,
        "item_type": "REGULAR",
        "bundle_details": null,
        "superapp_link": "careem://shops/merchant/40001/item/4000105"
      }
    ],
    "merchant_id": 40001
  },
  "source": "top_user_items",
  "is_personalized": true,
  "has_existing_items": true,
  "current_basket": {
    "id": 6000002,
    "merchant_id": 40001,
    "domain": "shops",
    "business_type": "supermarkets",
    "delivery_type": "careem",
    "state": "active",
    "total_count": 4,
    "count": 3,
    "version": 3,
    "items": [
      {
        "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000001",
        "catalog_item_id": "4000101",
        "count": 2,
        "options": null,
        "price": {
          "discount": 0,
          "original": 13.5,
          "total": 13.5
        },
        "careem_user_id": 900000001,
        "title_localized": "Fresh Farm Full Cream Milk 1L",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
      },
      {
        "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000002",
        "catalog_item_id": "4000102",
        "count": 1,
        "options": null,
        "price": {
          "discount": 0,
          "original": 14.5,
          "total": 14.5
        },
        "careem_user_id": 900000001,
        "title_localized": "Free Range Eggs 12pk",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png"
      },
      {
        "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000003",
        "catalog_item_id": "4000103",
        "count": 1,
        "options": null,
        "price": {
          "discount": 0,
          "original": 12.0,
          "total": 12.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Sourdough Loaf",
        "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png"
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 40.0,
      "original": 40.0
    },
    "currency": {
      "code": ""
    }
  }
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
  "description": "Retrieves frequently ordered grocery items for the user from a specific brand based on user's location and brand preferences - use this for requests like 'reorder my usual'. If the user has no order history yet, automatically falls back to generic popular top picks instead of returning empty; check source/is_personalized in the response to tell which one was returned and phrase the reply accordingly (e.g. don't call top_picks 'your usual'). Returns detailed item information including product names (English and localized), UPC codes, images, pricing details (original price, discounts, total), availability status, and deep links to items. Response includes the merchant ID and a list of items with comprehensive product information.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "latitude": {
        "description": "the user's current location latitude for distance-based search results",
        "type": "number"
      },
      "longitude": {
        "description": "the user's current location longitude for distance-based search results",
        "type": "number"
      }
    },
    "required": [
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "search_groceries_get_top_user_items",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "current_basket": {
        "additionalProperties": false,
        "description": "the user's existing basket for this merchant, if any items are already in it",
        "properties": {
          "business_type": {
            "type": "string"
          },
          "count": {
            "type": "integer"
          },
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
                "type": "integer"
              },
              "label": {
                "type": "string"
              }
            },
            "required": [
              "code"
            ],
            "type": "object"
          },
          "delivery_type": {
            "type": "string"
          },
          "domain": {
            "type": "string"
          },
          "id": {
            "type": "integer"
          },
          "items": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "careem_user_id": {
                  "type": "integer"
                },
                "catalog_item_id": {
                  "type": "string"
                },
                "comment": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "count": {
                  "type": "integer"
                },
                "image_url": {
                  "type": "string"
                },
                "item_uuid": {
                  "type": "string"
                },
                "options": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "catalog_option_id": {
                        "type": "string"
                      },
                      "count": {
                        "type": "integer"
                      },
                      "count_per_item": {
                        "type": "integer"
                      },
                      "name": {
                        "type": "string"
                      },
                      "option_uuid": {
                        "type": "string"
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
                          "discount",
                          "original",
                          "total"
                        ],
                        "type": "object"
                      }
                    },
                    "required": [
                      "option_uuid",
                      "catalog_option_id",
                      "count",
                      "count_per_item",
                      "price"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
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
                    "discount",
                    "original",
                    "total"
                  ],
                  "type": "object"
                },
                "title_localized": {
                  "type": "string"
                }
              },
              "required": [
                "item_uuid",
                "catalog_item_id",
                "count",
                "options",
                "price",
                "careem_user_id"
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
          "missing_items": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "careem_user_id": {
                  "type": "integer"
                },
                "catalog_item_id": {
                  "type": "string"
                },
                "comment": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "count": {
                  "type": "integer"
                },
                "image_url": {
                  "type": "string"
                },
                "item_uuid": {
                  "type": "string"
                },
                "options": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "catalog_option_id": {
                        "type": "string"
                      },
                      "count": {
                        "type": "integer"
                      },
                      "count_per_item": {
                        "type": "integer"
                      },
                      "name": {
                        "type": "string"
                      },
                      "option_uuid": {
                        "type": "string"
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
                          "discount",
                          "original",
                          "total"
                        ],
                        "type": "object"
                      }
                    },
                    "required": [
                      "option_uuid",
                      "catalog_option_id",
                      "count",
                      "count_per_item",
                      "price"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
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
                    "discount",
                    "original",
                    "total"
                  ],
                  "type": "object"
                },
                "title_localized": {
                  "type": "string"
                }
              },
              "required": [
                "item_uuid",
                "catalog_item_id",
                "count",
                "options",
                "price",
                "careem_user_id"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "price": {
            "additionalProperties": false,
            "properties": {
              "net_total": {
                "type": "number"
              },
              "original": {
                "type": "number"
              }
            },
            "required": [
              "net_total",
              "original"
            ],
            "type": "object"
          },
          "schedule_details": {
            "additionalProperties": false,
            "properties": {
              "time_slot": {
                "additionalProperties": false,
                "properties": {
                  "end": {
                    "type": "string"
                  },
                  "start": {
                    "type": "string"
                  }
                },
                "required": [
                  "start",
                  "end"
                ],
                "type": "object"
              }
            },
            "required": [
              "time_slot"
            ],
            "type": [
              "null",
              "object"
            ]
          },
          "state": {
            "type": "string"
          },
          "total_count": {
            "type": "integer"
          },
          "version": {
            "type": "integer"
          }
        },
        "required": [
          "id",
          "merchant_id",
          "domain",
          "business_type",
          "delivery_type",
          "state",
          "total_count",
          "count",
          "version",
          "items",
          "missing_items",
          "price",
          "currency"
        ],
        "type": [
          "null",
          "object"
        ]
      },
      "data": {
        "additionalProperties": false,
        "properties": {
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
          "merchant_id": {
            "type": "integer"
          }
        },
        "required": [
          "items",
          "merchant_id"
        ],
        "type": [
          "null",
          "object"
        ]
      },
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "has_existing_items": {
        "description": "true if the user already has items in their basket for this merchant",
        "type": "boolean"
      },
      "is_personalized": {
        "description": "true if Data reflects the user's own past orders (their 'usual' items); false if the user is new/has no order history and Data holds generic top picks instead - reply accordingly, e.g. don't call these 'your usual' when false",
        "type": "boolean"
      },
      "page": {
        "type": "string"
      },
      "source": {
        "description": "where Data came from: top_user_items (the user's own frequently-ordered items) or top_picks (generic popular items, returned as a fallback because the user has no order history yet)",
        "type": "string"
      }
    },
    "required": [
      "page",
      "data",
      "source",
      "is_personalized"
    ],
    "type": "object"
  },
  "title": "Get User's Top Grocery Items"
}
```
