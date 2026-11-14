---
tool: create_grocery_cart_with_quantities
domain: groceries
---

# create_grocery_cart_with_quantities

Adds an already-resolved shopping list to a grocery basket. The agent first resolves every
keyword to a real `catalog_item_id` + `price` with `search_groceries_items` and passes the
`merchant_id` from that search; this tool does **no searching or picking** — it adds each
item's chosen id (alternatives are display-only) and returns the list, the payment type to use
and the resulting basket. At Careem Quik Dubai Marina (`40001`) the basket is `6000002`; default
payment resolves to `wallet`.

The local server can't echo arbitrary items into fixed lines, so the default scenario shows the
canonical milk ×2 (alternative: Greek yogurt) / eggs ×1 / sourdough ×1 cart regardless of input.

Local server triggers: keyword containing `bulk` → low stock (retried at 5); `catalog_item_id`
`"4000106"` (avocado) → out of stock; `"4000199"` → unknown item; keyword containing `unicorn`
→ unpriced item; keyword containing `yogurt` → added to Leo's existing basket;
`merchant_id: 40101` → Careem Shops merchant; `latitude: 25.2172` (Work) → card default, cash
fallback.

## Scenario: invalid-coordinates

`latitude: 0, longitude: 0` — rejected before anything else.

```json match
{
  "latitude": 0,
  "longitude": 0
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 0,
      "title": "",
      "currency": ""
    },
    "groups": [],
    "unavailable_keywords": []
  },
  "error": "invalid location coordinates"
}
```

## Scenario: no-items

`items: null` (or only entries with a blank keyword / catalog_item_id).

```json match
{
  "items": null
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 0,
      "title": "",
      "currency": ""
    },
    "groups": [],
    "unavailable_keywords": []
  },
  "error": "no grocery items provided to build a shopping list"
}
```

## Scenario: missing-merchant

`merchant_id: 0` — the merchant from the search that resolved the items is required.

```json match
{
  "merchant_id": 0
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 0,
      "title": "",
      "currency": ""
    },
    "groups": [],
    "unavailable_keywords": []
  },
  "error": "merchant_id is required"
}
```

## Scenario: shops-merchant

`merchant_id: 40101` (Marina Fresh Market, Careem Shops). The item lookup is hard-wired to the
`quik` catalogue, so titles and images come back empty; the merchant title comes from the global
view. New basket `6000003`.

```json match
{
  "merchant_id": 40101
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40101,
      "title": "Marina Fresh Market",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "organic milk",
        "quantity": 1,
        "items": [
          {
            "id": 4010101,
            "title": "",
            "image_url": "",
            "secondary_info": "AED 8.50",
            "price": 8.5,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      }
    ],
    "unavailable_keywords": [],
    "basket_id": 6000003,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "wallet",
    "current_basket": {
      "id": 6000003,
      "domain": "shops",
      "business_type": "SHOPS",
      "merchant": {
        "id": 40101,
        "name": "Marina Fresh Market"
      },
      "price": {
        "net_total": 8.5,
        "original": 8.5
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4010101",
          "title_localized": "Organic Full Cream Milk 1L",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 8.5,
            "total": 8.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png"
        }
      ]
    }
  }
}
```

## Scenario: unpriced-item

A keyword containing `unicorn` arrives with no price (`price` ≤ 0): it is listed in
`unavailable_keywords` and not added; milk still goes in.

```json match
{
  "items": [
    {
      "keyword": "~unicorn"
    }
  ]
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40001,
      "title": "Careem Quik Dubai Marina",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "milk",
        "quantity": 2,
        "items": [
          {
            "id": 4000101,
            "title": "Fresh Farm Full Cream Milk 1L",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
            "secondary_info": "AED 6.75",
            "price": 6.75,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      }
    ],
    "unavailable_keywords": [
      "unicorn"
    ],
    "basket_id": 6000002,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "wallet",
    "current_basket": {
      "id": 6000002,
      "domain": "shops",
      "business_type": "QUIK",
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "price": {
        "net_total": 13.5,
        "original": 13.5
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000101",
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "count": 2,
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        }
      ]
    }
  }
}
```

## Scenario: eggs-low-stock

A keyword containing `bulk` (e.g. `bulk eggs`, quantity 20): the basket rejects 20 with "Item is
out of stock, only 5 available", the tool retries with 5 (group `quantity` becomes 5) and
reports it in `failed_items` with `added_quantity: 5`.

```json match
{
  "items": [
    {
      "keyword": "~bulk"
    }
  ]
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40001,
      "title": "Careem Quik Dubai Marina",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "milk",
        "quantity": 2,
        "items": [
          {
            "id": 4000101,
            "title": "Fresh Farm Full Cream Milk 1L",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
            "secondary_info": "AED 6.75",
            "price": 6.75,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      },
      {
        "keyword": "bulk eggs",
        "quantity": 5,
        "items": [
          {
            "id": 4000102,
            "title": "Free Range Eggs 12pk",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png",
            "secondary_info": "AED 14.50",
            "price": 14.5,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      }
    ],
    "unavailable_keywords": [],
    "basket_id": 6000002,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "wallet",
    "current_basket": {
      "id": 6000002,
      "domain": "shops",
      "business_type": "QUIK",
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "price": {
        "net_total": 86.0,
        "original": 86.0
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000101",
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "count": 2,
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        },
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000102",
          "title_localized": "Free Range Eggs 12pk",
          "count": 5,
          "price": {
            "discount": 0,
            "original": 72.5,
            "total": 72.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png"
        }
      ]
    },
    "failed_items": [
      {
        "keyword": "bulk eggs",
        "requested_quantity": 20,
        "error_code": "INSUFFICIENT_STOCK",
        "error_message": "Item is out of stock",
        "max_available": 5,
        "added_quantity": 5
      }
    ]
  }
}
```

## Scenario: avocado-out-of-stock

`catalog_item_id: "4000106"` (Hass Avocado): the basket answers "Hass Avocado 2pk is out of
stock" — no "only N", so no retry; the avocado group stays in the list without an
`item_uuid`, the rest are added.

```json match
{
  "items": [
    {
      "catalog_item_id": "4000106"
    }
  ]
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40001,
      "title": "Careem Quik Dubai Marina",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "milk",
        "quantity": 2,
        "items": [
          {
            "id": 4000101,
            "title": "Fresh Farm Full Cream Milk 1L",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
            "secondary_info": "AED 6.75",
            "price": 6.75,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      },
      {
        "keyword": "bread",
        "quantity": 1,
        "items": [
          {
            "id": 4000103,
            "title": "Sourdough Loaf",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png",
            "secondary_info": "AED 12.00",
            "price": 12.0,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      },
      {
        "keyword": "avocado",
        "quantity": 1,
        "items": [
          {
            "id": 4000106,
            "title": "Hass Avocado 2pk",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_avocado.png",
            "secondary_info": "AED 11.50",
            "price": 11.5,
            "currency": "AED",
            "is_available": true
          }
        ]
      }
    ],
    "unavailable_keywords": [],
    "basket_id": 6000002,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "wallet",
    "current_basket": {
      "id": 6000002,
      "domain": "shops",
      "business_type": "QUIK",
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "price": {
        "net_total": 25.5,
        "original": 25.5
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000101",
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "count": 2,
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        },
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000103",
          "title_localized": "Sourdough Loaf",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 12.0,
            "total": 12.0
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png"
        }
      ]
    },
    "failed_items": [
      {
        "keyword": "avocado",
        "requested_quantity": 1,
        "error_code": "INSUFFICIENT_STOCK",
        "error_message": "Item is out of stock"
      }
    ]
  }
}
```

## Scenario: unknown-item

`catalog_item_id: "4000199"` (not in the catalogue): upstream has no title for it and the
basket answers "item not found" → `NOT_FOUND`.

```json match
{
  "items": [
    {
      "catalog_item_id": "4000199"
    }
  ]
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40001,
      "title": "Careem Quik Dubai Marina",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "milk",
        "quantity": 2,
        "items": [
          {
            "id": 4000101,
            "title": "Fresh Farm Full Cream Milk 1L",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
            "secondary_info": "AED 6.75",
            "price": 6.75,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      },
      {
        "keyword": "oat milk",
        "quantity": 1,
        "items": [
          {
            "id": 4000199,
            "title": "",
            "image_url": "",
            "secondary_info": "AED 9.00",
            "price": 9.0,
            "currency": "AED",
            "is_available": true
          }
        ]
      }
    ],
    "unavailable_keywords": [],
    "basket_id": 6000002,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "wallet",
    "current_basket": {
      "id": 6000002,
      "domain": "shops",
      "business_type": "QUIK",
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "price": {
        "net_total": 13.5,
        "original": 13.5
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000101",
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "count": 2,
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        }
      ]
    },
    "failed_items": [
      {
        "keyword": "oat milk",
        "requested_quantity": 1,
        "error_code": "NOT_FOUND",
        "error_message": "Item not found"
      }
    ]
  }
}
```

## Scenario: existing-basket

A keyword containing `yogurt`: Leo's Quik basket `6000002` already held 2× milk, eggs and
sourdough, so `has_existing_items` is true and the yogurt is added on top.

```json match
{
  "items": [
    {
      "keyword": "~yogurt"
    }
  ]
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40001,
      "title": "Careem Quik Dubai Marina",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "greek yogurt",
        "quantity": 1,
        "items": [
          {
            "id": 4000107,
            "title": "Greek Yogurt 500g",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png",
            "secondary_info": "AED 13.25",
            "price": 13.25,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      }
    ],
    "unavailable_keywords": [],
    "basket_id": 6000002,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "wallet",
    "has_existing_items": true,
    "current_basket": {
      "id": 6000002,
      "domain": "shops",
      "business_type": "QUIK",
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "price": {
        "net_total": 53.25,
        "original": 53.25
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000001",
          "catalog_item_id": "4000101",
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "count": 2,
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        },
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000002",
          "catalog_item_id": "4000102",
          "title_localized": "Free Range Eggs 12pk",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 14.5,
            "total": 14.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png"
        },
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000003",
          "catalog_item_id": "4000103",
          "title_localized": "Sourdough Loaf",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 12.0,
            "total": 12.0
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png"
        },
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000107",
          "title_localized": "Greek Yogurt 500g",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 13.25,
            "total": 13.25
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png"
        }
      ]
    }
  }
}
```

## Scenario: card-default-cash-fallback

`latitude: 25.2172` (Work): Leo's default instrument there is a card, which this flow does not
support, so `payment_type` falls back to `cash` (the cart is still built).

```json match
{
  "latitude": 25.2172
}
```

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40001,
      "title": "Careem Quik Dubai Marina",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "milk",
        "quantity": 2,
        "items": [
          {
            "id": 4000101,
            "title": "Fresh Farm Full Cream Milk 1L",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
            "secondary_info": "AED 6.75",
            "price": 6.75,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          },
          {
            "id": 4000107,
            "title": "Greek Yogurt 500g",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png",
            "secondary_info": "AED 13.25",
            "price": 13.25,
            "currency": "AED",
            "is_available": true
          }
        ]
      },
      {
        "keyword": "eggs",
        "quantity": 1,
        "items": [
          {
            "id": 4000102,
            "title": "Free Range Eggs 12pk",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png",
            "secondary_info": "AED 14.50",
            "price": 14.5,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      },
      {
        "keyword": "bread",
        "quantity": 1,
        "items": [
          {
            "id": 4000103,
            "title": "Sourdough Loaf",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png",
            "secondary_info": "AED 12.00",
            "price": 12.0,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      }
    ],
    "unavailable_keywords": [],
    "basket_id": 6000002,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "cash",
    "current_basket": {
      "id": 6000002,
      "domain": "shops",
      "business_type": "QUIK",
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "price": {
        "net_total": 40.0,
        "original": 40.0
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000101",
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "count": 2,
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        },
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000102",
          "title_localized": "Free Range Eggs 12pk",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 14.5,
            "total": 14.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png"
        },
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000103",
          "title_localized": "Sourdough Loaf",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 12.0,
            "total": 12.0
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png"
        }
      ]
    }
  }
}
```

## Scenario: breakfast-cart

Default: milk ×2 (with Greek yogurt as a display-only alternative), eggs ×1, sourdough ×1 added
to basket `6000002` (AED 40.00), paid by wallet.

```json response
{
  "page": "create_grocery_cart_with_quantities",
  "data": {
    "merchant": {
      "id": 40001,
      "title": "Careem Quik Dubai Marina",
      "currency": "AED"
    },
    "groups": [
      {
        "keyword": "milk",
        "quantity": 2,
        "items": [
          {
            "id": 4000101,
            "title": "Fresh Farm Full Cream Milk 1L",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png",
            "secondary_info": "AED 6.75",
            "price": 6.75,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          },
          {
            "id": 4000107,
            "title": "Greek Yogurt 500g",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_yogurt.png",
            "secondary_info": "AED 13.25",
            "price": 13.25,
            "currency": "AED",
            "is_available": true
          }
        ]
      },
      {
        "keyword": "eggs",
        "quantity": 1,
        "items": [
          {
            "id": 4000102,
            "title": "Free Range Eggs 12pk",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png",
            "secondary_info": "AED 14.50",
            "price": 14.5,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      },
      {
        "keyword": "bread",
        "quantity": 1,
        "items": [
          {
            "id": 4000103,
            "title": "Sourdough Loaf",
            "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png",
            "secondary_info": "AED 12.00",
            "price": 12.0,
            "currency": "AED",
            "is_available": true,
            "item_uuid": "{{uuid}}"
          }
        ]
      }
    ],
    "unavailable_keywords": [],
    "basket_id": 6000002,
    "city_id": 1,
    "timezone": "Asia/Dubai",
    "payment_type": "wallet",
    "current_basket": {
      "id": 6000002,
      "domain": "shops",
      "business_type": "QUIK",
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "price": {
        "net_total": 40.0,
        "original": 40.0
      },
      "currency": {
        "code": "AED",
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "LEFT",
        "decimals": 2
      },
      "items": [
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000101",
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "count": 2,
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_milk_1l.png"
        },
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000102",
          "title_localized": "Free Range Eggs 12pk",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 14.5,
            "total": 14.5
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_eggs_12.png"
        },
        {
          "item_uuid": "{{uuid}}",
          "catalog_item_id": "4000103",
          "title_localized": "Sourdough Loaf",
          "count": 1,
          "price": {
            "discount": 0,
            "original": 12.0,
            "total": 12.0
          },
          "active": true,
          "image_url": "https://careem-catalog-media.media.careem.com/quik/sku_bread.png"
        }
      ]
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
  "annotations": {},
  "description": "Adds a de-duplicated list of already-resolved grocery items (each with a catalog_item_id from search_groceries_items, a quantity, and optional alternatives for display) to the user's basket — returning a one-tap cart. This MUTATES the basket (it is not a read-only search) and never searches or picks on its own: call search_groceries_items first and judge relevance yourself, then pass only the items you've decided are genuine matches.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "items": {
        "description": "the de-duplicated grocery items to add, each already resolved to a real catalog_item_id via search_groceries_items",
        "items": {
          "additionalProperties": false,
          "properties": {
            "alternatives": {
              "description": "other candidates considered for this keyword, for display only",
              "items": {
                "additionalProperties": false,
                "properties": {
                  "catalog_item_id": {
                    "description": "the alternative's numeric item id, as a string",
                    "type": "string"
                  },
                  "price": {
                    "type": "number"
                  }
                },
                "required": [
                  "catalog_item_id"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "catalog_item_id": {
              "description": "the exact item id resolved via search_groceries_items — never guessed",
              "type": "string"
            },
            "keyword": {
              "description": "the grocery item keyword the user asked for, e.g. milk",
              "type": "string"
            },
            "price": {
              "description": "the chosen item's unit price, from search_groceries_items",
              "type": "number"
            },
            "quantity": {
              "description": "how many units the user wants; default 1",
              "type": "integer"
            }
          },
          "required": [
            "keyword",
            "catalog_item_id",
            "quantity"
          ],
          "type": "object"
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
        "description": "the merchant id from search_groceries_items' response — must match the search that resolved these items",
        "type": "integer"
      }
    },
    "required": [
      "items",
      "merchant_id",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "create_grocery_cart_with_quantities",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "data": {
        "additionalProperties": false,
        "properties": {
          "basket_id": {
            "type": "integer"
          },
          "brand_id": {
            "type": "integer"
          },
          "city_id": {
            "type": "integer"
          },
          "current_basket": {
            "additionalProperties": false,
            "properties": {
              "business_type": {
                "type": "string"
              },
              "currency": {
                "additionalProperties": false,
                "properties": {
                  "code": {
                    "type": "string"
                  },
                  "decimals": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "label": {
                    "type": "string"
                  },
                  "name_localized": {
                    "type": "string"
                  },
                  "position": {
                    "type": "string"
                  }
                },
                "required": [
                  "code",
                  "label",
                  "name_localized",
                  "position",
                  "decimals"
                ],
                "type": "object"
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
                    "active": {
                      "type": "boolean"
                    },
                    "catalog_item_id": {
                      "type": "string"
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
                    "title_localized",
                    "count",
                    "price",
                    "active",
                    "image_url"
                  ],
                  "type": "object"
                },
                "type": [
                  "null",
                  "array"
                ]
              },
              "merchant": {
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
                  "id",
                  "name"
                ],
                "type": "object"
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
              }
            },
            "required": [
              "id",
              "domain",
              "business_type",
              "merchant",
              "price",
              "currency",
              "items"
            ],
            "type": [
              "null",
              "object"
            ]
          },
          "failed_items": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "added_quantity": {
                  "type": "integer"
                },
                "error_code": {
                  "type": "string"
                },
                "error_message": {
                  "type": "string"
                },
                "keyword": {
                  "type": "string"
                },
                "max_available": {
                  "type": "integer"
                },
                "requested_quantity": {
                  "type": "integer"
                }
              },
              "required": [
                "keyword",
                "requested_quantity",
                "error_code",
                "error_message"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "groups": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "items": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "currency": {
                        "type": "string"
                      },
                      "id": {
                        "type": "integer"
                      },
                      "image_url": {
                        "type": "string"
                      },
                      "is_available": {
                        "type": "boolean"
                      },
                      "item_uuid": {
                        "type": "string"
                      },
                      "price": {
                        "type": "number"
                      },
                      "secondary_info": {
                        "type": "string"
                      },
                      "title": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id",
                      "title",
                      "image_url",
                      "secondary_info",
                      "price",
                      "currency",
                      "is_available"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "keyword": {
                  "type": "string"
                },
                "quantity": {
                  "type": "integer"
                }
              },
              "required": [
                "keyword",
                "quantity",
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
          "merchant": {
            "additionalProperties": false,
            "properties": {
              "currency": {
                "type": "string"
              },
              "id": {
                "type": "integer"
              },
              "title": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "title",
              "currency"
            ],
            "type": "object"
          },
          "payment_type": {
            "type": "string"
          },
          "timezone": {
            "type": "string"
          },
          "unavailable_keywords": {
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
          "merchant",
          "groups",
          "unavailable_keywords"
        ],
        "type": "object"
      },
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "page": {
        "type": "string"
      }
    },
    "required": [
      "page",
      "data"
    ],
    "type": "object"
  },
  "title": "Create a Grocery Cart with Items and Quantities"
}
```
