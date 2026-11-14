---
tool: search_groceries_items
domain: groceries
---

# search_groceries_items

Product search. Without `merchant_id` it searches **Careem Quik**: the nearest dark store for
brand `40000` is Careem Quik Dubai Marina (merchant `40001`, ETA 15 min) and results use the
fixture SKUs `4000101`–`4000108`. With `merchant_id` (a Careem Shops merchant from
`global_search`, e.g. `40101` Marina Fresh Market) it searches that one store instead and
reports `domain: "shops"`.

`4000106` Hass Avocado is listed with `is_available: false` (out of stock; only `active: false`
items are filtered out). When Quik has nothing for a term, the upstream recommends Careem Shops
merchants as `fallback` / `additional_fallbacks` (trigger term: `kombucha`).

Local server triggers: `latitude: 0` → outside the Quik area; `max_delivery_minutes: 10` → too slow;
terms containing `unicorn` (or `trigger_upstream_down`) find nothing; a term containing `yogurt`
shows Leo's existing Quik basket `6000002`.

Try: "find milk and eggs", then `create_grocery_cart_with_quantities` or `cart_add_item`
(merchant_id 40001, catalog_item_id "4000101").

## Scenario: missing-search-terms

`search_terms: null` (an empty array can't be targeted by the scenario — force this with
`./careem-mcp.sh scenario`): rejected before any upstream call.

```json match
{
  "search_terms": null
}
```

```json response
{
  "page": "grocery_items",
  "groups": null,
  "error": "search_terms is required and must not be empty"
}
```

## Scenario: outside-service-area

`latitude: 0` — the nearest-store lookup answers `MERCHANT_OUT_OF_SERVICEABLE_AREA` for every
term, so every term is skipped.

```json match
{
  "latitude": 0
}
```

```json response
{
  "page": "grocery_items",
  "domain": "quik",
  "groups": null,
  "error": "no items found for the provided search terms"
}
```

## Scenario: too-slow

`max_delivery_minutes: 10` — the nearest store's 15 min ETA exceeds the limit.

```json match
{
  "max_delivery_minutes": 10
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": null,
  "error": "the nearest store's estimated delivery time is 15 minutes, which exceeds the requested 10 minute limit"
}
```

## Scenario: shops-merchant

`merchant_id: 40101` — search inside Marina Fresh Market (a Careem Shops merchant from
`global_search`). No nearest-store lookup, so no `merchant_name` / `merchant_eta_minutes`; no
basket there yet.

```json match
{
  "merchant_id": 40101
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40101,
  "domain": "shops",
  "groups": [
    {
      "name": "{{args.search_terms.0}}",
      "items": [
        {
          "id": 4010101,
          "item": "Organic Full Cream Milk 1L",
          "item_localized": "Organic Full Cream Milk 1L",
          "upc": "6290004010101",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png",
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
            "discount_type": null,
            "total": 8.5,
            "total_formatted": "8.50",
            "tax_percentage": 5
          },
          "active": true,
          "link": "https://careem-catalog-media.media.careem.com/shops/items/4010101",
          "attributes": [],
          "tags": [],
          "catalog_id": 40101,
          "view_only_promotion": null,
          "currency": {
            "code": "AED",
            "decimals": 2,
            "label": "AED"
          },
          "item_location": null,
          "master_product_id": "sku_org_milk_1l",
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
          "superapp_link": "careem://shops/merchant/40101/item/4010101"
        },
        {
          "id": 4010102,
          "item": "Organic Free Range Eggs 6pk",
          "item_localized": "Organic Free Range Eggs 6pk",
          "upc": "6290004010102",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_eggs_6.png",
          "images_urls": [
            "https://careem-catalog-media.media.careem.com/shops/sku_org_eggs_6.png"
          ],
          "description": "Organic Free Range Eggs 6pk (6 pcs)",
          "description_localized": "Organic Free Range Eggs 6pk (6 pcs)",
          "price": {
            "original": 12.75,
            "original_formatted": "12.75",
            "discount": 0.0,
            "discount_percentage": 0,
            "discount_type": null,
            "total": 12.75,
            "total_formatted": "12.75",
            "tax_percentage": 5
          },
          "active": true,
          "link": "https://careem-catalog-media.media.careem.com/shops/items/4010102",
          "attributes": [],
          "tags": [],
          "catalog_id": 40101,
          "view_only_promotion": null,
          "currency": {
            "code": "AED",
            "decimals": 2,
            "label": "AED"
          },
          "item_location": null,
          "master_product_id": "sku_org_eggs_6",
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
          "superapp_link": "careem://shops/merchant/40101/item/4010102"
        }
      ]
    }
  ]
}
```

## Scenario: partial-results

Terms include `milk` **and** a `unicorn` term: only the term with matches gets a group; the empty
one is silently dropped (no error).

```json match
{
  "search_terms": [
    "~milk",
    "~unicorn"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "milk",
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
        }
      ]
    }
  ]
}
```

## Scenario: no-results

Every term contains `unicorn` (or `trigger_upstream_down` — an upstream outage looks the same,
because failing terms are skipped).

```json match
{
  "search_terms": [
    "~unicorn"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "domain": "quik",
  "groups": null,
  "error": "no items found for the provided search terms"
}
```

## Scenario: quik-fallback

A term containing `kombucha`: Quik has no match, so the upstream recommends Careem Shops
merchants — Marina Fresh Market as `fallback`, JLT Organic Pantry in `additional_fallbacks`.

```json match
{
  "search_terms": [
    "~kombucha"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "kombucha",
      "items": [],
      "fallback": {
        "merchant_id": 40101,
        "merchant_name": "Marina Fresh Market",
        "eta_minutes": 40,
        "items": [
          {
            "id": 4010103,
            "item": "Ginger Kombucha 330ml",
            "item_localized": "Ginger Kombucha 330ml",
            "upc": "6290004010103",
            "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_ginger.png",
            "images_urls": [
              "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_ginger.png"
            ],
            "description": "Ginger Kombucha 330ml (330 ml)",
            "description_localized": "Ginger Kombucha 330ml (330 ml)",
            "price": {
              "original": 14.0,
              "original_formatted": "14.00",
              "discount": 0.0,
              "discount_percentage": 0,
              "discount_type": null,
              "total": 14.0,
              "total_formatted": "14.00",
              "tax_percentage": 5
            },
            "active": true,
            "link": "https://careem-catalog-media.media.careem.com/shops/items/4010103",
            "attributes": [],
            "tags": [],
            "catalog_id": 40101,
            "view_only_promotion": null,
            "currency": {
              "code": "AED",
              "decimals": 2,
              "label": "AED"
            },
            "item_location": null,
            "master_product_id": "sku_kombucha_ginger",
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
            "superapp_link": "careem://shops/merchant/40101/item/4010103"
          }
        ]
      },
      "additional_fallbacks": [
        {
          "merchant_id": 40201,
          "merchant_name": "JLT Organic Pantry",
          "eta_minutes": 50,
          "items": [
            {
              "id": 4020101,
              "item": "Original Kombucha 330ml",
              "item_localized": "Original Kombucha 330ml",
              "upc": "6290004020101",
              "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_original.png",
              "images_urls": [
                "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_original.png"
              ],
              "description": "Original Kombucha 330ml (330 ml)",
              "description_localized": "Original Kombucha 330ml (330 ml)",
              "price": {
                "original": 13.5,
                "original_formatted": "13.50",
                "discount": 0.0,
                "discount_percentage": 0,
                "discount_type": null,
                "total": 13.5,
                "total_formatted": "13.50",
                "tax_percentage": 5
              },
              "active": true,
              "link": "https://careem-catalog-media.media.careem.com/shops/items/4020101",
              "attributes": [],
              "tags": [],
              "catalog_id": 40201,
              "view_only_promotion": null,
              "currency": {
                "code": "AED",
                "decimals": 2,
                "label": "AED"
              },
              "item_location": null,
              "master_product_id": "sku_kombucha_original",
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
              "superapp_link": "careem://shops/merchant/40201/item/4020101"
            }
          ]
        }
      ]
    }
  ]
}
```

## Scenario: existing-basket

A term containing `yogurt`: results plus Leo's existing Quik basket `6000002` (2× milk, eggs,
sourdough), titles/images enriched from upstream.

```json match
{
  "search_terms": [
    "~yogurt"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "yogurt",
      "items": [
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
      ]
    }
  ],
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

## Scenario: breakfast-trio

Milk, eggs and bread in one call — one group per term, in input order.

```json match
{
  "search_terms": [
    "~milk",
    "~egg",
    "~bread"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "milk",
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
        }
      ],
      "additional_items": [
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
      ]
    },
    {
      "name": "eggs",
      "items": [
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
        }
      ]
    },
    {
      "name": "bread",
      "items": [
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
        }
      ]
    }
  ]
}
```

## Scenario: milk

`milk`: the milk SKU, plus Greek yogurt as an `additional_items` related match.

```json match
{
  "search_terms": [
    "~milk"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "milk",
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
        }
      ],
      "additional_items": [
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
      ]
    }
  ]
}
```

## Scenario: eggs

`eggs`.

```json match
{
  "search_terms": [
    "~egg"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "eggs",
      "items": [
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
        }
      ]
    }
  ]
}
```

## Scenario: bread

`bread` / sourdough.

```json match
{
  "search_terms": [
    "~bread"
  ]
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "bread",
      "items": [
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
        }
      ]
    }
  ]
}
```

## Scenario: on-discount

`on_discount: true` (`filters={"deals":"1"}`): only the discounted coffee (20% off, AED 40 → 32).

```json match
{
  "on_discount": true
}
```

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "{{args.search_terms.0}}",
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

## Scenario: generic-results

Default: any other term returns a generic mix (bananas, the out-of-stock avocado, water, coffee).

```json response
{
  "page": "grocery_items",
  "merchant_id": 40001,
  "domain": "quik",
  "merchant_name": "Careem Quik Dubai Marina",
  "merchant_eta_minutes": 15,
  "groups": [
    {
      "name": "{{args.search_terms.0}}",
      "items": [
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
          "id": 4000106,
          "item": "Hass Avocado 2pk",
          "item_localized": "Hass Avocado 2pk",
          "upc": "6290000000106",
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_avocado.png",
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
            "discount_type": null,
            "total": 11.5,
            "total_formatted": "11.50",
            "tax_percentage": 5
          },
          "active": true,
          "link": "https://careem-catalog-media.media.careem.com/quik/items/4000106",
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
          "master_product_id": "sku_avocado",
          "is_near_expiry": false,
          "is_ad": false,
          "ad_details": null,
          "is_available": false,
          "timing": null,
          "groups": [],
          "item_promotion": null,
          "item_badge_localized": null,
          "item_type": "REGULAR",
          "bundle_details": null,
          "superapp_link": "careem://shops/merchant/40001/item/4000106"
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
        },
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
  "description": "Search for multiple specific items in a single call. Takes an array of search terms (e.g. [\"eggs\", \"tomatoes\", \"onion\"]) and returns all matching items from one store, plus that store's estimated delivery time. Aggregates results from multiple searches into one response. Pass merchant_id to search inside a specific Careem Shops merchant found via global_search; omit it for Quik grocery, which resolves the nearest dark store automatically. When Quik's own results for a term are insufficient, also includes a recommended fallback merchant with its matching items, plus up to 2 further recommended merchants (each with its own matching items) in additional_fallbacks. Optionally narrow results with on_discount, previously_ordered, careem_recommended, tags (dietary/attribute), or sort, and/or cap the acceptable delivery time with max_delivery_minutes.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "careem_recommended": {
        "description": "if true, only return items Careem recommends/curates",
        "type": "boolean"
      },
      "latitude": {
        "description": "the user's current location latitude for distance-based search results",
        "type": "number"
      },
      "limit": {
        "description": "items per page per search term, defaults to 10",
        "type": [
          "null",
          "integer"
        ]
      },
      "longitude": {
        "description": "the user's current location longitude for distance-based search results",
        "type": "number"
      },
      "max_delivery_minutes": {
        "description": "if set, skip the search and report the estimated delivery time when the nearest store's ETA exceeds this many minutes",
        "type": [
          "null",
          "integer"
        ]
      },
      "merchant_id": {
        "description": "search inside ONE specific shops merchant, using a merchant id from global_search. Omit for Quik grocery, which resolves the nearest dark store automatically — never pass a Quik merchant id here.",
        "type": [
          "null",
          "integer"
        ]
      },
      "on_discount": {
        "description": "if true, only return items currently on discount/promotion",
        "type": "boolean"
      },
      "page": {
        "description": "page number for pagination, defaults to 1",
        "type": [
          "null",
          "integer"
        ]
      },
      "previously_ordered": {
        "description": "if true, only return items the user has purchased before (purchase-history match); combine with on_discount for 'discounted items I've ordered before'",
        "type": "boolean"
      },
      "search_terms": {
        "description": "array of search terms for grocery items (e.g. [\"eggs\", \"tomatoes\", \"onion\"]); if a single search is needed, pass as array with one element",
        "items": {
          "type": "string"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "sort": {
        "description": "how to order results: relevance (default), price (low to high), or offer (biggest discounts first)",
        "type": [
          "null",
          "string"
        ]
      },
      "tags": {
        "description": "dietary/attribute filter tags, e.g. [\"gluten_free\", \"vegan\"]; supported values: organic, ready_to_eat, fresh, high_protein, no_added_sugar, vegan, gluten_free, low_fat, low_calories, healthy, eco_friendly, no_antibiotics, paraben_free, sourdough, low_carb, low_sodium, mineral, free_range, keto, lean, grass_fed, no_preservatives, lactose_free",
        "items": {
          "type": "string"
        },
        "type": [
          "null",
          "array"
        ]
      }
    },
    "required": [
      "search_terms",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "search_groceries_items",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "current_basket": {
        "additionalProperties": false,
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
      "domain": {
        "description": "basket domain these results resolve to: shops (a named merchant_id was passed) or quik",
        "type": "string"
      },
      "error": {
        "type": "string"
      },
      "groups": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "additional_fallbacks": {
              "description": "further recommended alternative merchants beyond fallback, each with its own matching items, only present when Quik's own results for this ingredient were insufficient",
              "items": {
                "additionalProperties": false,
                "properties": {
                  "eta_minutes": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
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
                  "merchant_id": {
                    "type": "integer"
                  },
                  "merchant_name": {
                    "type": "string"
                  }
                },
                "required": [
                  "merchant_id",
                  "merchant_name",
                  "items"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "additional_items": {
              "description": "further matching items beyond the primary result set for this ingredient",
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
            "fallback": {
              "additionalProperties": false,
              "description": "a recommended alternative merchant and its items, only present when Quik's own results for this ingredient were insufficient",
              "properties": {
                "eta_minutes": {
                  "maximum": 2147483647,
                  "minimum": -2147483648,
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
                "merchant_id": {
                  "type": "integer"
                },
                "merchant_name": {
                  "type": "string"
                }
              },
              "required": [
                "merchant_id",
                "merchant_name",
                "items"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "items": {
              "description": "list of matching items from the nearest Quik store for this ingredient",
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
              "description": "the ingredient name (e.g., 'eggs', 'tomatoes')",
              "type": "string"
            }
          },
          "required": [
            "name",
            "items"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "has_existing_items": {
        "type": "boolean"
      },
      "merchant_eta_minutes": {
        "description": "estimated delivery time in minutes for the nearest store",
        "type": "integer"
      },
      "merchant_id": {
        "type": "integer"
      },
      "merchant_name": {
        "description": "the nearest store's display name",
        "type": "string"
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
  "title": "Search for Multiple Items Inside One Store"
}
```
