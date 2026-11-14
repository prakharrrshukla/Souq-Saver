---
tool: cart_update_item
domain: cart
---

# cart_update_item

Changes the count / options / comment of an existing basket line and returns the re-priced basket.
Line uuids in the default basket: Syrniki `5b1e2c4a-1111-4a7e-9c01-000000700401`,
Cappuccino `5b1e2c4a-1111-4a7e-9c01-000000700402`. The local server is stateless: responses are fixed fixture baskets (see [FIXTURES.md](../../FIXTURES.md)), not baskets built from your input.

## Scenario: half-slot

Only a slot start (end passed as `""`) → rejected before the PATCH.

```json match
{
  "scheduled_slot_start": "*",
  "scheduled_slot_end": ""
}
```

```json response
{
  "page": "cart_update_item",
  "basket": null,
  "error": "scheduled_slot_start and scheduled_slot_end must both be set, or both omitted"
}
```

## Scenario: upstream-unavailable

Merchant `99999` (magic trigger): the PATCH times out.

```json match
{
  "merchant_id": 99999
}
```

```json response
{
  "page": "cart_update_item",
  "basket": null,
  "error": "Request timed out. Please try again."
}
```

## Scenario: out-of-stock

`count: 50` exceeds stock: upstream answers `ITEM_OUT_OF_STOCK` and its message is returned verbatim.

```json match
{
  "count": 50
}
```

```json response
{
  "page": "cart_update_item",
  "basket": null,
  "error": "We currently have only 10 piece(s) available in stock"
}
```

## Scenario: pricing-down

`timezone` containing `pricing-down` (magic trigger): the update succeeds (Syrniki → 3) but pricing fails; the UpdateItem basket is returned enriched without `price` / `payment_method`.

```json match
{
  "timezone": "~pricing-down"
}
```

```json response
{
  "page": "cart_update_item",
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
    "total_count": 4,
    "count": 2,
    "version": 5,
    "items": [
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
        "catalog_item_id": "700401",
        "comment": null,
        "count": 3,
        "options": [
          {
            "option_uuid": "84011::840111",
            "catalog_option_id": "84011::840111",
            "count": 3,
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
          "original": 102.0,
          "total": 102.0
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
      "net_total": 121.0,
      "original": 121.0
    },
    "currency": {
      "code": "AED",
      "label": "AED",
      "decimals": 2,
      "cents_100": true
    }
  }
}
```

## Scenario: line-not-found

An `item_uuid` containing `missing` is not in the basket.

```json match
{
  "item_uuid": "~missing"
}
```

```json response
{
  "page": "cart_update_item",
  "basket": null,
  "error": "Unable to process your request. Please try again."
}
```

## Scenario: remove-cappuccino

Cappuccino set to `count: 0` is removed: 68.00 + 5.00 + 2.50 − 13.60 (20%) = AED 61.90.

```json match
{
  "catalog_item_id": "700402",
  "count": 0
}
```

```json response
{
  "page": "cart_update_item",
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
    "total_count": 2,
    "count": 1,
    "version": 5,
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
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 68.0,
      "original": 68.0
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
            "price": 68.0,
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
            "price": -13.6,
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
            "price": 61.9,
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
      "total": 61.9,
      "description": "Incl. VAT"
    },
    "total_saving": 13.6,
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

## Scenario: cappuccino-oat-milk

Any other Cappuccino update switches it to oat milk (+3): 90.00 + 7.50 − 15.00 = AED 82.50.

```json match
{
  "catalog_item_id": "700402"
}
```

```json response
{
  "page": "cart_update_item",
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
    "version": 5,
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
            "option_uuid": "84021::840212",
            "catalog_option_id": "84021::840212",
            "count": 1,
            "count_per_item": 1,
            "price": {
              "discount": 0,
              "original": 3.0,
              "total": 3.0
            },
            "name": "Oat"
          }
        ],
        "price": {
          "discount": 0,
          "original": 22.0,
          "total": 22.0
        },
        "careem_user_id": 900000001,
        "title_localized": "Cappuccino",
        "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg"
      }
    ],
    "missing_items": null,
    "price": {
      "net_total": 90.0,
      "original": 90.0
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
            "price": 90.0,
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
            "price": 82.5,
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
      "total": 82.5,
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

## Scenario: syrniki-to-3

Default: Syrniki bumped to 3: 121.00 + 7.50 − 15.00 = AED 113.50.

```json response
{
  "page": "cart_update_item",
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
    "total_count": 4,
    "count": 2,
    "version": 5,
    "items": [
      {
        "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
        "catalog_item_id": "700401",
        "comment": null,
        "count": 3,
        "options": [
          {
            "option_uuid": "84011::840111",
            "catalog_option_id": "84011::840111",
            "count": 3,
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
          "original": 102.0,
          "total": 102.0
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
      "net_total": 121.0,
      "original": 121.0
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
            "price": 121.0,
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
            "price": 113.5,
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
      "total": 113.5,
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
  "annotations": {},
  "description": "Update an existing item in the basket. Use count 0 to remove the item from the basket.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "catalog_item_id": {
        "description": "numeric item ID as string from food search results (e.g. '4487285425')",
        "type": "string"
      },
      "city_id": {
        "description": "city ID from user_info.city_id — skips city lookup when provided alongside timezone",
        "type": "integer"
      },
      "comment": {
        "description": "updated special instructions",
        "type": "string"
      },
      "count": {
        "description": "new item count (0 to remove)",
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
      "item_uuid": {
        "description": "UUID of the item to update (assigned when the item was added)",
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
      "options": {
        "description": "options/modifiers from food_get_item_options; provide catalog_option_id and count for each selected option",
        "items": {
          "additionalProperties": false,
          "properties": {
            "catalog_option_id": {
              "description": "option ID from food_get_item_options in format group_id::option_id (e.g. '1395509660::4487285427')",
              "type": "string"
            },
            "count": {
              "description": "quantity of this option to include",
              "type": "integer"
            }
          },
          "required": [
            "catalog_option_id",
            "count"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
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
      }
    },
    "required": [
      "merchant_id",
      "item_uuid",
      "catalog_item_id",
      "count",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "cart_update_item",
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
      "page",
      "basket"
    ],
    "type": "object"
  },
  "title": "Update Cart Item"
}
```
