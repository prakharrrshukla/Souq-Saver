---
tool: cart_get_basket_price
domain: cart
---

# cart_get_basket_price

Full price breakdown for the current basket (fees, best promo auto-applied, resolved payment
method) plus the enriched basket and merchant. Pass `price.price.total` as `total_price` to
`cart_checkout` / `cart_grocery_checkout`.

Default food basket `6000001` at Morning Syrniki Café (`30104`): 2× Classic Syrniki (`700401`) + 1× Cappuccino (`700402`). Subtotal 87.00 + delivery 5.00 + service 2.50 − CAREEM20 15.00 (capped) = **AED 79.50**. Default payment is card `4242` (FIXTURES `card_4242`).

Grocery basket `6000002` at Careem Quik Dubai Marina (`40001`): 2× milk + eggs + sourdough. Subtotal 40.00 + delivery 4.00 + service 1.50 = **AED 45.50** (no promo).

## Scenario: half-slot

Only a slot start (end passed as `""`) → rejected before any upstream call.

```json match
{
  "scheduled_slot_start": "*",
  "scheduled_slot_end": ""
}
```

```json response
{
  "page": "cart_get_basket_price",
  "error": "scheduled_slot_start and scheduled_slot_end must both be set, or both omitted"
}
```

## Scenario: grocery-price

Quik store `40001`.

```json match
{
  "merchant_id": 40001
}
```

```json response
{
  "page": "cart_get_basket_price",
  "merchant": {
    "id": 40001,
    "name": "Careem Quik Dubai Marina",
    "name_localized": "Careem Quik Dubai Marina",
    "eta_in_minutes": 15
  },
  "basket": {
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
        "comment": null,
        "count": 2,
        "options": null,
        "price": {
          "discount": 0,
          "original": 13.5,
          "total": 13.5
        },
        "careem_user_id": 900000001,
        "title_localized": "Fresh Farm Full Cream Milk 1L",
        "image_url": "https://careem-catalog-media.media.careem.com/items/4000101.png"
      },
      {
        "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000002",
        "catalog_item_id": "4000102",
        "comment": null,
        "count": 1,
        "options": null,
        "price": {
          "discount": 0,
          "original": 14.5,
          "total": 14.5
        },
        "careem_user_id": 900000001,
        "title_localized": "Free Range Eggs 12pk",
        "image_url": "https://careem-catalog-media.media.careem.com/items/4000102.png"
      },
      {
        "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000003",
        "catalog_item_id": "4000103",
        "comment": null,
        "count": 1,
        "options": null,
        "price": {
          "discount": 0,
          "original": 12.0,
          "total": 12.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Sourdough Loaf",
        "image_url": "https://careem-catalog-media.media.careem.com/items/4000103.png"
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 40.0,
      "original": 40.0
    },
    "currency": {
      "code": "AED",
      "label": "AED",
      "decimals": 2,
      "cents_100": true
    }
  },
  "price": {
    "breakdown": [
      {
        "label": {
          "title": "Subtotal",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 40.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Delivery fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 4.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Service fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 1.5,
            "type": "regular",
            "font_style": "regular"
          }
        ],
        "description": "Helps us keep the lights on at Careem."
      },
      {
        "label": {
          "title": "Total",
          "font_style": "bold"
        },
        "value": [
          {
            "price": 45.5,
            "type": "bold",
            "font_style": "bold"
          }
        ]
      }
    ],
    "fee_info": {
      "title": "Fees",
      "info": {
        "title": "What are these fees?",
        "description": "Fees help cover delivery and running the platform.",
        "fees": [
          {
            "title": "Delivery fee",
            "description": "Paid to the captain who delivers your order."
          },
          {
            "title": "Service fee",
            "description": "Supports customer care and app operations."
          }
        ]
      }
    },
    "price": {
      "title": "Total",
      "total": 45.5,
      "description": "Incl. VAT"
    },
    "total_saving": 0.0,
    "fees": [
      {
        "type": "delivery_fee",
        "value": 4.0
      },
      {
        "type": "service_fee",
        "value": 1.5
      }
    ]
  },
  "payment_method": {
    "type": "card",
    "id": 4242
  }
}
```

## Scenario: empty-basket

Shawarma Station (`30101`) has no basket: the promo lookup soft-fails, then the upstream API answers 404 (a basket-not-found error) — a hard error for this tool.

```json match
{
  "merchant_id": 30101
}
```

```json response
{
  "page": "cart_get_basket_price",
  "error": "cart does not exist yet — no items have been added for this merchant"
}
```

## Scenario: pay-with-wallet

`use_wallet: true`. In production `use_wallet` only sets `payment_ctx.isWalletUsed` in the promo request; the payment method still comes from the instruments resolver. This scenario stands in for the expired-card-wallet instruments response (no working card, wallet enabled → `wallet`; AED 125.50 balance covers it).

```json match
{
  "use_wallet": true
}
```

```json response
{
  "page": "cart_get_basket_price",
  "merchant": {
    "id": 30104,
    "name": "Morning Syrniki Café",
    "name_localized": "Morning Syrniki Café",
    "eta_in_minutes": 25,
    "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-hero.jpg"
  },
  "basket": {
    "id": 6000001,
    "merchant_id": 30104,
    "domain": "food",
    "business_type": "restaurants",
    "delivery_type": "careem",
    "state": "active",
    "total_count": 3,
    "count": 2,
    "version": 3,
    "items": [
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
        "catalog_item_id": "700401",
        "comment": null,
        "count": 2,
        "options": [
          {
            "option_uuid": "84011::840111",
            "catalog_option_id": "84011::840111",
            "count": 2,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Sour cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 68.0,
          "total": 68.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Classic Syrniki with Sour Cream",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg"
      },
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700402",
        "catalog_item_id": "700402",
        "comment": null,
        "count": 1,
        "options": [
          {
            "option_uuid": "84021::840211",
            "catalog_option_id": "84021::840211",
            "count": 1,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Full cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 19.0,
          "total": 19.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Cappuccino",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg"
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 87.0,
      "original": 87.0
    },
    "currency": {
      "code": "AED",
      "label": "AED",
      "decimals": 2,
      "cents_100": true
    }
  },
  "price": {
    "breakdown": [
      {
        "label": {
          "title": "Subtotal",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 87.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Delivery fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 5.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Service fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 2.5,
            "type": "regular",
            "font_style": "regular"
          }
        ],
        "description": "Helps us keep the lights on at Careem."
      },
      {
        "label": {
          "title": "Promo (CAREEM20)",
          "badge_type": "success",
          "font_style": "regular"
        },
        "value": [
          {
            "price": -15.0,
            "type": "success",
            "font_style": "success"
          }
        ],
        "helper_msg": {
          "msg": "20% off up to AED 15 applied",
          "badge_type": "success"
        }
      },
      {
        "label": {
          "title": "Total",
          "font_style": "bold"
        },
        "value": [
          {
            "price": 79.5,
            "type": "bold",
            "font_style": "bold"
          }
        ]
      }
    ],
    "fee_info": {
      "title": "Fees",
      "info": {
        "title": "What are these fees?",
        "description": "Fees help cover delivery and running the platform.",
        "fees": [
          {
            "title": "Delivery fee",
            "description": "Paid to the captain who delivers your order."
          },
          {
            "title": "Service fee",
            "description": "Supports customer care and app operations."
          }
        ]
      }
    },
    "price": {
      "title": "Total",
      "total": 79.5,
      "description": "Incl. VAT"
    },
    "total_saving": 15.0,
    "fees": [
      {
        "type": "delivery_fee",
        "value": 5.0
      },
      {
        "type": "service_fee",
        "value": 2.5
      }
    ],
    "promo_code": {
      "code": "CAREEM20",
      "applied": {
        "id": 510020
      }
    },
    "info_message": "AED 79.50 will be paid from your Careem Pay balance (AED 125.50 available)."
  },
  "payment_method": {
    "type": "wallet"
  }
}
```

## Scenario: no-promo-cod

`payment_type: COD`: the promo request is sent with `paymentType: COD`, which locks the card-only CAREEM20, so no promo is applied and the plain GET price is used: 87.00 + 5.00 + 2.50 = AED 94.50. The payment method is still resolved from instruments (card 4242).

```json match
{
  "payment_type": "COD"
}
```

```json response
{
  "page": "cart_get_basket_price",
  "merchant": {
    "id": 30104,
    "name": "Morning Syrniki Café",
    "name_localized": "Morning Syrniki Café",
    "eta_in_minutes": 25,
    "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-hero.jpg"
  },
  "basket": {
    "id": 6000001,
    "merchant_id": 30104,
    "domain": "food",
    "business_type": "restaurants",
    "delivery_type": "careem",
    "state": "active",
    "total_count": 3,
    "count": 2,
    "version": 3,
    "items": [
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
        "catalog_item_id": "700401",
        "comment": null,
        "count": 2,
        "options": [
          {
            "option_uuid": "84011::840111",
            "catalog_option_id": "84011::840111",
            "count": 2,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Sour cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 68.0,
          "total": 68.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Classic Syrniki with Sour Cream",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg"
      },
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700402",
        "catalog_item_id": "700402",
        "comment": null,
        "count": 1,
        "options": [
          {
            "option_uuid": "84021::840211",
            "catalog_option_id": "84021::840211",
            "count": 1,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Full cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 19.0,
          "total": 19.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Cappuccino",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg"
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 87.0,
      "original": 87.0
    },
    "currency": {
      "code": "AED",
      "label": "AED",
      "decimals": 2,
      "cents_100": true
    }
  },
  "price": {
    "breakdown": [
      {
        "label": {
          "title": "Subtotal",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 87.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Delivery fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 5.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Service fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 2.5,
            "type": "regular",
            "font_style": "regular"
          }
        ],
        "description": "Helps us keep the lights on at Careem."
      },
      {
        "label": {
          "title": "Total",
          "font_style": "bold"
        },
        "value": [
          {
            "price": 94.5,
            "type": "bold",
            "font_style": "bold"
          }
        ]
      }
    ],
    "price": {
      "title": "Total",
      "total": 94.5,
      "description": "Incl. VAT"
    },
    "total_saving": 0.0,
    "fees": [
      {
        "type": "delivery_fee",
        "value": 5.0
      },
      {
        "type": "service_fee",
        "value": 2.5
      }
    ]
  },
  "payment_method": {
    "type": "card",
    "id": 4242
  }
}
```

## Scenario: wallet-down

`timezone` containing `wallet-down` (magic trigger): the instruments call fails, so the resolver falls back to `cash` (the price is unchanged, AED 79.50).

```json match
{
  "timezone": "~wallet-down"
}
```

```json response
{
  "page": "cart_get_basket_price",
  "merchant": {
    "id": 30104,
    "name": "Morning Syrniki Café",
    "name_localized": "Morning Syrniki Café",
    "eta_in_minutes": 25,
    "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-hero.jpg"
  },
  "basket": {
    "id": 6000001,
    "merchant_id": 30104,
    "domain": "food",
    "business_type": "restaurants",
    "delivery_type": "careem",
    "state": "active",
    "total_count": 3,
    "count": 2,
    "version": 3,
    "items": [
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
        "catalog_item_id": "700401",
        "comment": null,
        "count": 2,
        "options": [
          {
            "option_uuid": "84011::840111",
            "catalog_option_id": "84011::840111",
            "count": 2,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Sour cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 68.0,
          "total": 68.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Classic Syrniki with Sour Cream",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg"
      },
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700402",
        "catalog_item_id": "700402",
        "comment": null,
        "count": 1,
        "options": [
          {
            "option_uuid": "84021::840211",
            "catalog_option_id": "84021::840211",
            "count": 1,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Full cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 19.0,
          "total": 19.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Cappuccino",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg"
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 87.0,
      "original": 87.0
    },
    "currency": {
      "code": "AED",
      "label": "AED",
      "decimals": 2,
      "cents_100": true
    }
  },
  "price": {
    "breakdown": [
      {
        "label": {
          "title": "Subtotal",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 87.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Delivery fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 5.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Service fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 2.5,
            "type": "regular",
            "font_style": "regular"
          }
        ],
        "description": "Helps us keep the lights on at Careem."
      },
      {
        "label": {
          "title": "Promo (CAREEM20)",
          "badge_type": "success",
          "font_style": "regular"
        },
        "value": [
          {
            "price": -15.0,
            "type": "success",
            "font_style": "success"
          }
        ],
        "helper_msg": {
          "msg": "20% off up to AED 15 applied",
          "badge_type": "success"
        }
      },
      {
        "label": {
          "title": "Total",
          "font_style": "bold"
        },
        "value": [
          {
            "price": 79.5,
            "type": "bold",
            "font_style": "bold"
          }
        ]
      }
    ],
    "fee_info": {
      "title": "Fees",
      "info": {
        "title": "What are these fees?",
        "description": "Fees help cover delivery and running the platform.",
        "fees": [
          {
            "title": "Delivery fee",
            "description": "Paid to the captain who delivers your order."
          },
          {
            "title": "Service fee",
            "description": "Supports customer care and app operations."
          }
        ]
      }
    },
    "price": {
      "title": "Total",
      "total": 79.5,
      "description": "Incl. VAT"
    },
    "total_saving": 15.0,
    "fees": [
      {
        "type": "delivery_fee",
        "value": 5.0
      },
      {
        "type": "service_fee",
        "value": 2.5
      }
    ],
    "promo_code": {
      "code": "CAREEM20",
      "applied": {
        "id": 510020
      }
    }
  },
  "payment_method": {
    "type": "cash"
  }
}
```

## Scenario: pricing-down

`timezone` containing `pricing-down` (magic trigger): the price call answers 503 — a hard error for this tool.

```json match
{
  "timezone": "~pricing-down"
}
```

```json response
{
  "page": "cart_get_basket_price",
  "error": "failed to get basket price: unexpected response status 503"
}
```

## Scenario: food-price

Default: Morning Syrniki Café, AED 79.50 with CAREEM20.

```json response
{
  "page": "cart_get_basket_price",
  "merchant": {
    "id": 30104,
    "name": "Morning Syrniki Café",
    "name_localized": "Morning Syrniki Café",
    "eta_in_minutes": 25,
    "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-hero.jpg"
  },
  "basket": {
    "id": 6000001,
    "merchant_id": 30104,
    "domain": "food",
    "business_type": "restaurants",
    "delivery_type": "careem",
    "state": "active",
    "total_count": 3,
    "count": 2,
    "version": 3,
    "items": [
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
        "catalog_item_id": "700401",
        "comment": null,
        "count": 2,
        "options": [
          {
            "option_uuid": "84011::840111",
            "catalog_option_id": "84011::840111",
            "count": 2,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Sour cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 68.0,
          "total": 68.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Classic Syrniki with Sour Cream",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg"
      },
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700402",
        "catalog_item_id": "700402",
        "comment": null,
        "count": 1,
        "options": [
          {
            "option_uuid": "84021::840211",
            "catalog_option_id": "84021::840211",
            "count": 1,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 0.0,
              "total": 0.0
            },
            "name": "Full cream"
          }
        ],
        "price": {
          "discount": 0,
          "original": 19.0,
          "total": 19.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Cappuccino",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg"
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 87.0,
      "original": 87.0
    },
    "currency": {
      "code": "AED",
      "label": "AED",
      "decimals": 2,
      "cents_100": true
    }
  },
  "price": {
    "breakdown": [
      {
        "label": {
          "title": "Subtotal",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 87.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Delivery fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 5.0,
            "type": "regular",
            "font_style": "regular"
          }
        ]
      },
      {
        "label": {
          "title": "Service fee",
          "font_style": "regular"
        },
        "value": [
          {
            "price": 2.5,
            "type": "regular",
            "font_style": "regular"
          }
        ],
        "description": "Helps us keep the lights on at Careem."
      },
      {
        "label": {
          "title": "Promo (CAREEM20)",
          "badge_type": "success",
          "font_style": "regular"
        },
        "value": [
          {
            "price": -15.0,
            "type": "success",
            "font_style": "success"
          }
        ],
        "helper_msg": {
          "msg": "20% off up to AED 15 applied",
          "badge_type": "success"
        }
      },
      {
        "label": {
          "title": "Total",
          "font_style": "bold"
        },
        "value": [
          {
            "price": 79.5,
            "type": "bold",
            "font_style": "bold"
          }
        ]
      }
    ],
    "fee_info": {
      "title": "Fees",
      "info": {
        "title": "What are these fees?",
        "description": "Fees help cover delivery and running the platform.",
        "fees": [
          {
            "title": "Delivery fee",
            "description": "Paid to the captain who delivers your order."
          },
          {
            "title": "Service fee",
            "description": "Supports customer care and app operations."
          }
        ]
      }
    },
    "price": {
      "title": "Total",
      "total": 79.5,
      "description": "Incl. VAT"
    },
    "total_saving": 15.0,
    "fees": [
      {
        "type": "delivery_fee",
        "value": 5.0
      },
      {
        "type": "service_fee",
        "value": 2.5
      }
    ],
    "promo_code": {
      "code": "CAREEM20",
      "applied": {
        "id": 510020
      }
    }
  },
  "payment_method": {
    "type": "card",
    "id": 4242
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
  "description": "Gets the detailed price breakdown for the basket. Automatically fetches and applies the best available promo code before calculating the price.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "business_type": {
        "description": "business type e.g. food, restaurants, quik; defaults to the basket domain",
        "type": "string"
      },
      "city_id": {
        "description": "city ID from user_info.city_id — skips city lookup when provided",
        "type": "integer"
      },
      "currency": {
        "description": "currency code from user_info.city_currency — used for payment method resolution when provided alongside city_id and timezone",
        "type": "string"
      },
      "domain": {
        "description": "basket domain: shops for grocery (default), food for food ordering",
        "type": "string"
      },
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "merchant_id": {
        "description": "merchant ID",
        "type": "integer"
      },
      "payment_type": {
        "description": "payment type for promo eligibility e.g. CARD, COD; defaults to CARD",
        "type": "string"
      },
      "scheduled_slot_end": {
        "description": "UTC ISO end of a confirmed-available scheduling slot; omit for immediate delivery",
        "type": "string"
      },
      "scheduled_slot_start": {
        "description": "UTC ISO start of a confirmed-available scheduling slot; omit for immediate delivery",
        "type": "string"
      },
      "timezone": {
        "description": "IANA timezone from user_info.city_timezone — skips city lookup when provided",
        "type": "string"
      },
      "use_wallet": {
        "description": "true if wallet balance is being used",
        "type": "boolean"
      }
    },
    "required": [
      "merchant_id",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "cart_get_basket_price",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "basket": {
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
      "error": {
        "type": "string"
      },
      "merchant": {
        "additionalProperties": false,
        "properties": {
          "eta_in_minutes": {
            "type": "integer"
          },
          "id": {
            "type": "integer"
          },
          "image_url": {
            "type": "string"
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
          "name"
        ],
        "type": [
          "null",
          "object"
        ]
      },
      "page": {
        "type": "string"
      },
      "payment_method": {
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "integer"
          },
          "type": {
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": [
          "null",
          "object"
        ]
      },
      "price": {
        "additionalProperties": false,
        "properties": {
          "breakdown": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "description": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "helper_msg": {
                  "additionalProperties": false,
                  "properties": {
                    "badge_type": {
                      "type": [
                        "null",
                        "string"
                      ]
                    },
                    "msg": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "msg"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "info": {
                  "additionalProperties": false,
                  "properties": {
                    "description": {
                      "type": "string"
                    },
                    "sections": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "description": {
                            "type": "string"
                          },
                          "title": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "title",
                          "description"
                        ],
                        "type": "object"
                      },
                      "type": [
                        "null",
                        "array"
                      ]
                    },
                    "title": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "title"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "label": {
                  "additionalProperties": false,
                  "properties": {
                    "badge_type": {
                      "type": [
                        "null",
                        "string"
                      ]
                    },
                    "font_style": {
                      "type": "string"
                    },
                    "title": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "title",
                    "font_style"
                  ],
                  "type": "object"
                },
                "trailing_layout_separator": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "value": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "font_style": {
                        "type": "string"
                      },
                      "price": {
                        "type": "number"
                      },
                      "type": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "price",
                      "font_style",
                      "type"
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
                "label",
                "value"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "cashback": {
            "additionalProperties": false,
            "properties": {
              "badge_type": {
                "type": [
                  "null",
                  "string"
                ]
              },
              "value": {
                "type": "number"
              }
            },
            "required": [
              "value"
            ],
            "type": [
              "null",
              "object"
            ]
          },
          "cplus_total_saving": {
            "type": "number"
          },
          "fee_info": {
            "additionalProperties": false,
            "properties": {
              "info": {
                "additionalProperties": false,
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "fees": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "description": {
                          "type": "string"
                        },
                        "title": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "title",
                        "description"
                      ],
                      "type": "object"
                    },
                    "type": [
                      "null",
                      "array"
                    ]
                  },
                  "title": {
                    "type": "string"
                  }
                },
                "required": [
                  "title",
                  "description",
                  "fees"
                ],
                "type": "object"
              },
              "title": {
                "type": "string"
              }
            },
            "required": [
              "title",
              "info"
            ],
            "type": [
              "null",
              "object"
            ]
          },
          "fees": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "type": {
                  "type": "string"
                },
                "value": {
                  "type": "number"
                }
              },
              "required": [
                "type",
                "value"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "group_order_split": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "price": {
                  "type": "number"
                },
                "state": {
                  "type": "string"
                },
                "title": {
                  "type": "string"
                },
                "user_id": {
                  "type": "string"
                }
              },
              "required": [
                "user_id",
                "title",
                "price",
                "state"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "info_message": {
            "type": [
              "null",
              "string"
            ]
          },
          "last_item_price_updated_at": {
            "type": [
              "null",
              "string"
            ]
          },
          "price": {
            "additionalProperties": false,
            "properties": {
              "description": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "total": {
                "type": "number"
              }
            },
            "required": [
              "title",
              "total",
              "description"
            ],
            "type": "object"
          },
          "promo_code": {
            "additionalProperties": false,
            "properties": {
              "applied": {
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "integer"
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
              "code": {
                "type": "string"
              },
              "error": {
                "additionalProperties": false,
                "properties": {
                  "code": {
                    "type": "string"
                  },
                  "message": {
                    "type": "string"
                  }
                },
                "required": [
                  "code",
                  "message"
                ],
                "type": [
                  "null",
                  "object"
                ]
              }
            },
            "required": [
              "code"
            ],
            "type": [
              "null",
              "object"
            ]
          },
          "removed_items": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "catalog_item_id": {
                  "type": "integer"
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
                "promotion_id": {
                  "type": "integer"
                },
                "upc": {
                  "type": [
                    "null",
                    "string"
                  ]
                }
              },
              "required": [
                "item_uuid",
                "catalog_item_id",
                "promotion_id",
                "price"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "removed_options": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "catalog_option_id": {
                  "type": "string"
                },
                "item_uuid": {
                  "type": "string"
                },
                "option_uuid": {
                  "type": "string"
                }
              },
              "required": [
                "item_uuid",
                "option_uuid",
                "catalog_option_id"
              ],
              "type": "object"
            },
            "type": [
              "null",
              "array"
            ]
          },
          "total_saving": {
            "type": "number"
          }
        },
        "required": [
          "price",
          "total_saving",
          "fees"
        ],
        "type": [
          "null",
          "object"
        ]
      }
    },
    "required": [
      "page"
    ],
    "type": "object"
  },
  "title": "Get Cart Price Breakdown"
}
```
