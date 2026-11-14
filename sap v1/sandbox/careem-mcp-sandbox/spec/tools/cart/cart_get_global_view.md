---
tool: cart_get_global_view
domain: cart
---

# cart_get_global_view

All of the user's open baskets across merchants (lightweight view: no fees/promos). By default
the user has two: the food basket `6000001` at Morning Syrniki Café (`30104`, AED 87.00 of items)
and the grocery basket `6000002` at Careem Quik Dubai Marina (`40001`, AED 40.00 of items).
Use the returned `merchant.id` with `cart_get_basket` (or `cart_get_quik_basket`) for the priced view.

## Scenario: invalid-location

`latitude: 0, longitude: 0` fails the coordinate guard before any upstream call.

```json match
{
  "latitude": 0,
  "longitude": 0
}
```

```json response
{
  "page": "cart_get_global_view",
  "error": "invalid location coordinates"
}
```

## Scenario: only-grocery

Filter by Quik merchant `40001`.

```json match
{
  "merchant_id": 40001
}
```

```json response
{
  "page": "cart_get_global_view",
  "baskets": [
    {
      "id": 6000002,
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "domain": "shops",
      "business_type": "supermarkets",
      "currency": {
        "code": "AED",
        "decimals": 2,
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "before"
      },
      "items": [
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000001",
          "catalog_item_id": "4000101",
          "count": 2,
          "active": true,
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "image_url": "https://careem-catalog-media.media.careem.com/items/4000101.png",
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          }
        },
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000002",
          "catalog_item_id": "4000102",
          "count": 1,
          "active": true,
          "title_localized": "Free Range Eggs 12pk",
          "image_url": "https://careem-catalog-media.media.careem.com/items/4000102.png",
          "price": {
            "discount": 0,
            "original": 14.5,
            "total": 14.5
          }
        },
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000003",
          "catalog_item_id": "4000103",
          "count": 1,
          "active": true,
          "title_localized": "Sourdough Loaf",
          "image_url": "https://careem-catalog-media.media.careem.com/items/4000103.png",
          "price": {
            "discount": 0,
            "original": 12.0,
            "total": 12.0
          }
        }
      ],
      "price": {
        "net_total": 40.0,
        "original": 40.0
      }
    }
  ]
}
```

## Scenario: only-food

Filter by Morning Syrniki Café `30104`.

```json match
{
  "merchant_id": 30104
}
```

```json response
{
  "page": "cart_get_global_view",
  "baskets": [
    {
      "id": 6000001,
      "merchant": {
        "id": 30104,
        "name": "Morning Syrniki Café"
      },
      "domain": "food",
      "business_type": "restaurants",
      "currency": {
        "code": "AED",
        "decimals": 2,
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "before"
      },
      "items": [
        {
          "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
          "catalog_item_id": "700401",
          "count": 2,
          "active": true,
          "title_localized": "Classic Syrniki with Sour Cream",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg",
          "price": {
            "discount": 0,
            "original": 68.0,
            "total": 68.0
          }
        },
        {
          "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700402",
          "catalog_item_id": "700402",
          "count": 1,
          "active": true,
          "title_localized": "Cappuccino",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg",
          "price": {
            "discount": 0,
            "original": 19.0,
            "total": 19.0
          }
        }
      ],
      "price": {
        "net_total": 87.0,
        "original": 87.0
      }
    }
  ]
}
```

## Scenario: no-baskets

Any other restaurant from FIXTURES (e.g. Shawarma Station `30101`) has nothing in the cart.

```json match
{
  "merchant_id": 30101
}
```

```json response
{
  "page": "cart_get_global_view",
  "baskets": []
}
```

## Scenario: upstream-unavailable

`merchant_id: 99999` (magic trigger): the global-view call answers 503.

```json match
{
  "merchant_id": 99999
}
```

```json response
{
  "page": "cart_get_global_view",
  "error": "failed to get baskets: unexpected response status 503"
}
```

## Scenario: no-open-baskets

`timezone` containing `empty-cart` (magic trigger): the user has no baskets at all. Without a `merchant_id` filter production returns the empty list, which `omitempty` drops, so only `page` remains.

```json match
{
  "timezone": "~empty-cart"
}
```

```json response
{
  "page": "cart_get_global_view"
}
```

## Scenario: all-baskets

Default: both baskets.

```json response
{
  "page": "cart_get_global_view",
  "baskets": [
    {
      "id": 6000001,
      "merchant": {
        "id": 30104,
        "name": "Morning Syrniki Café"
      },
      "domain": "food",
      "business_type": "restaurants",
      "currency": {
        "code": "AED",
        "decimals": 2,
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "before"
      },
      "items": [
        {
          "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700401",
          "catalog_item_id": "700401",
          "count": 2,
          "active": true,
          "title_localized": "Classic Syrniki with Sour Cream",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg",
          "price": {
            "discount": 0,
            "original": 68.0,
            "total": 68.0
          }
        },
        {
          "item_uuid": "5b1e2c4a-1111-4a7e-9c01-000000700402",
          "catalog_item_id": "700402",
          "count": 1,
          "active": true,
          "title_localized": "Cappuccino",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg",
          "price": {
            "discount": 0,
            "original": 19.0,
            "total": 19.0
          }
        }
      ],
      "price": {
        "net_total": 87.0,
        "original": 87.0
      }
    },
    {
      "id": 6000002,
      "merchant": {
        "id": 40001,
        "name": "Careem Quik Dubai Marina"
      },
      "domain": "shops",
      "business_type": "supermarkets",
      "currency": {
        "code": "AED",
        "decimals": 2,
        "label": "AED",
        "name_localized": "UAE Dirham",
        "position": "before"
      },
      "items": [
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000001",
          "catalog_item_id": "4000101",
          "count": 2,
          "active": true,
          "title_localized": "Fresh Farm Full Cream Milk 1L",
          "image_url": "https://careem-catalog-media.media.careem.com/items/4000101.png",
          "price": {
            "discount": 0,
            "original": 13.5,
            "total": 13.5
          }
        },
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000002",
          "catalog_item_id": "4000102",
          "count": 1,
          "active": true,
          "title_localized": "Free Range Eggs 12pk",
          "image_url": "https://careem-catalog-media.media.careem.com/items/4000102.png",
          "price": {
            "discount": 0,
            "original": 14.5,
            "total": 14.5
          }
        },
        {
          "item_uuid": "7c2d9e10-2222-4b8f-8d02-000000000003",
          "catalog_item_id": "4000103",
          "count": 1,
          "active": true,
          "title_localized": "Sourdough Loaf",
          "image_url": "https://careem-catalog-media.media.careem.com/items/4000103.png",
          "price": {
            "discount": 0,
            "original": 12.0,
            "total": 12.0
          }
        }
      ],
      "price": {
        "net_total": 40.0,
        "original": 40.0
      }
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
  "description": "Returns the user's active baskets with full item details (names, images, prices). Pass merchant_id to filter to one basket; omit it to see all. Use this when the user asks to see their current cart.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
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
        "description": "optional merchant ID to filter to a single basket",
        "type": "integer"
      },
      "timezone": {
        "description": "IANA timezone from user_info.city_timezone — skips city lookup when provided",
        "type": "string"
      }
    },
    "required": [
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "cart_get_global_view",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "baskets": {
        "items": {
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
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "error": {
        "type": "string"
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
  "title": "Get All Baskets with Full Item Details"
}
```
