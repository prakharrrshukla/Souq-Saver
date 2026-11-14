---
tool: global_search
domain: groceries
---

# global_search

Careem Shops search across merchants and their items (supermarkets, organic stores, …) — the
discovery step before `search_groceries_items` with a `merchant_id`. Quik is deliberately
excluded (it has its own tools), so results never include Careem Quik Dubai Marina `40001`. It
does **not** span food: restaurants come from the `food_*` tools.

Fixture world: Marina Fresh Market (merchant `40101`, brand `40100`, 30–40 min, AED 7 delivery,
4.6★) sells `4010101` Organic Full Cream Milk 1L AED 8.50, `4010102` Organic Free Range Eggs 6pk
AED 12.75 and `4010103` Ginger Kombucha 330ml AED 14.00; JLT Organic Pantry (`40201`, brand
`40200`, 40–50 min, AED 9) sells `4020101` Original Kombucha 330ml AED 13.50.

Local server triggers: `location` containing `nowhere` → location not found; `latitude: 0,
longitude: 0` without `location` → no coordinates; `query` containing `unicorn` → nothing found;
`query` containing `trigger_upstream_down` → upstream unavailable; `query` containing `kombucha` →
both organic stores.

## Scenario: no-coordinates

`latitude: 0, longitude: 0` and no `location`: nothing to search around.

```json match
{
  "latitude": 0,
  "longitude": 0
}
```

```json response
{
  "page": "global_search",
  "merchants": null,
  "products": null,
  "error": "failed to search location: no location text and no coordinates provided"
}
```

## Scenario: location-not-found

`location` containing `nowhere`: location search returns no match.

```json match
{
  "location": "~nowhere"
}
```

```json response
{
  "page": "global_search",
  "merchants": null,
  "products": null,
  "error": "failed to search location: location not found for the provided location text"
}
```

## Scenario: upstream-unavailable

`query` containing `trigger_upstream_down`: global search answers 503.

```json match
{
  "query": "~trigger_upstream_down"
}
```

```json response
{
  "page": "global_search",
  "merchants": null,
  "products": null,
  "error": "failed to search: unexpected response status 503"
}
```

## Scenario: nothing-found

`query` containing `unicorn`: no merchant or item matches (empty arrays, no error).

```json match
{
  "query": "~unicorn"
}
```

```json response
{
  "page": "global_search",
  "merchants": [],
  "products": [],
  "pagination": {
    "total": 0,
    "current_page": 1,
    "total_pages": 0,
    "per_page": 20
  }
}
```

## Scenario: kombucha

`query` containing `kombucha`: both organic stores, each with its kombucha.

```json match
{
  "query": "~kombucha"
}
```

```json response
{
  "page": "global_search",
  "merchants": [
    {
      "id": 40101,
      "title": "Marina Fresh Market",
      "image_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_store.png",
      "logo_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_logo.png",
      "is_cplus": false,
      "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40101",
      "rating": "4.60",
      "rating_volume": "(850+)",
      "delivery_time": "30-40 mins",
      "distance": "0 km",
      "cuisine": "Organic, Groceries",
      "secondary_info": "AED 7.00",
      "value_proposition": null,
      "promotional_badges": [],
      "is_closed": false
    },
    {
      "id": 40201,
      "title": "JLT Organic Pantry",
      "image_url": "https://careem-catalog-media.media.careem.com/shops/jlt_pantry_store.png",
      "logo_url": "https://careem-catalog-media.media.careem.com/shops/jlt_pantry_logo.png",
      "is_cplus": false,
      "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40201",
      "rating": "4.40",
      "rating_volume": "(320+)",
      "delivery_time": "40-50 mins",
      "distance": "0 km",
      "cuisine": "Organic",
      "secondary_info": "AED 9.00",
      "value_proposition": null,
      "promotional_badges": [],
      "is_closed": false
    }
  ],
  "products": [
    {
      "items": [
        {
          "id": 4010103,
          "title": "Ginger Kombucha 330ml",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_ginger.png",
          "images_urls": [
            "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_ginger.png"
          ],
          "is_cplus": false,
          "link": "careem://shops/merchant/40101/item/4010103",
          "secondary_info": "AED 14.00",
          "price": {
            "total": 14.0,
            "original": 14.0,
            "discount": 0.0,
            "discount_percentage": 0
          },
          "currency_code": "AED",
          "promotional_badges": [],
          "is_active": true,
          "is_available": true,
          "is_near_expiry": false,
          "is_ad": false
        }
      ],
      "merchant": {
        "id": 40101,
        "title": "Marina Fresh Market",
        "image_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_store.png",
        "logo_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_logo.png",
        "is_cplus": false,
        "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40101",
        "rating": "4.60",
        "rating_volume": "(850+)",
        "delivery_time": "30-40 mins",
        "distance": "0 km",
        "cuisine": "Organic, Groceries",
        "secondary_info": "AED 7.00",
        "value_proposition": null,
        "promotional_badges": [],
        "is_closed": false
      }
    },
    {
      "items": [
        {
          "id": 4020101,
          "title": "Original Kombucha 330ml",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_original.png",
          "images_urls": [
            "https://careem-catalog-media.media.careem.com/shops/sku_kombucha_original.png"
          ],
          "is_cplus": false,
          "link": "careem://shops/merchant/40201/item/4020101",
          "secondary_info": "AED 13.50",
          "price": {
            "total": 13.5,
            "original": 13.5,
            "discount": 0.0,
            "discount_percentage": 0
          },
          "currency_code": "AED",
          "promotional_badges": [],
          "is_active": true,
          "is_available": true,
          "is_near_expiry": false,
          "is_ad": false
        }
      ],
      "merchant": {
        "id": 40201,
        "title": "JLT Organic Pantry",
        "image_url": "https://careem-catalog-media.media.careem.com/shops/jlt_pantry_store.png",
        "logo_url": "https://careem-catalog-media.media.careem.com/shops/jlt_pantry_logo.png",
        "is_cplus": false,
        "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40201",
        "rating": "4.40",
        "rating_volume": "(320+)",
        "delivery_time": "40-50 mins",
        "distance": "0 km",
        "cuisine": "Organic",
        "secondary_info": "AED 9.00",
        "value_proposition": null,
        "promotional_badges": [],
        "is_closed": false
      }
    }
  ],
  "pagination": {
    "total": 2,
    "current_page": 1,
    "total_pages": 1,
    "per_page": 20
  }
}
```

## Scenario: with-location

`location` set (e.g. `Work`): resolved through location search first; Marina Fresh Market
still delivers there.

```json match
{
  "location": "*"
}
```

```json response
{
  "page": "global_search",
  "merchants": [
    {
      "id": 40101,
      "title": "Marina Fresh Market",
      "image_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_store.png",
      "logo_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_logo.png",
      "is_cplus": false,
      "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40101",
      "rating": "4.60",
      "rating_volume": "(850+)",
      "delivery_time": "30-40 mins",
      "distance": "0 km",
      "cuisine": "Organic, Groceries",
      "secondary_info": "AED 7.00",
      "value_proposition": null,
      "promotional_badges": [],
      "is_closed": false
    }
  ],
  "products": [
    {
      "items": [
        {
          "id": 4010101,
          "title": "Organic Full Cream Milk 1L",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png",
          "images_urls": [
            "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png"
          ],
          "is_cplus": false,
          "link": "careem://shops/merchant/40101/item/4010101",
          "secondary_info": "AED 8.50",
          "price": {
            "total": 8.5,
            "original": 8.5,
            "discount": 0.0,
            "discount_percentage": 0
          },
          "currency_code": "AED",
          "promotional_badges": [],
          "is_active": true,
          "is_available": true,
          "is_near_expiry": false,
          "is_ad": false
        },
        {
          "id": 4010102,
          "title": "Organic Free Range Eggs 6pk",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_eggs_6.png",
          "images_urls": [
            "https://careem-catalog-media.media.careem.com/shops/sku_org_eggs_6.png"
          ],
          "is_cplus": false,
          "link": "careem://shops/merchant/40101/item/4010102",
          "secondary_info": "AED 12.75",
          "price": {
            "total": 12.75,
            "original": 12.75,
            "discount": 0.0,
            "discount_percentage": 0
          },
          "currency_code": "AED",
          "promotional_badges": [],
          "is_active": true,
          "is_available": true,
          "is_near_expiry": false,
          "is_ad": false
        }
      ],
      "merchant": {
        "id": 40101,
        "title": "Marina Fresh Market",
        "image_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_store.png",
        "logo_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_logo.png",
        "is_cplus": false,
        "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40101",
        "rating": "4.60",
        "rating_volume": "(850+)",
        "delivery_time": "30-40 mins",
        "distance": "0 km",
        "cuisine": "Organic, Groceries",
        "secondary_info": "AED 7.00",
        "value_proposition": null,
        "promotional_badges": [],
        "is_closed": false
      }
    }
  ],
  "pagination": {
    "total": 1,
    "current_page": 1,
    "total_pages": 1,
    "per_page": 20
  }
}
```

## Scenario: milk-and-eggs

Default: Marina Fresh Market with its organic milk and eggs (Quik excluded).

```json response
{
  "page": "global_search",
  "merchants": [
    {
      "id": 40101,
      "title": "Marina Fresh Market",
      "image_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_store.png",
      "logo_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_logo.png",
      "is_cplus": false,
      "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40101",
      "rating": "4.60",
      "rating_volume": "(850+)",
      "delivery_time": "30-40 mins",
      "distance": "0 km",
      "cuisine": "Organic, Groceries",
      "secondary_info": "AED 7.00",
      "value_proposition": null,
      "promotional_badges": [],
      "is_closed": false
    }
  ],
  "products": [
    {
      "items": [
        {
          "id": 4010101,
          "title": "Organic Full Cream Milk 1L",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png",
          "images_urls": [
            "https://careem-catalog-media.media.careem.com/shops/sku_org_milk_1l.png"
          ],
          "is_cplus": false,
          "link": "careem://shops/merchant/40101/item/4010101",
          "secondary_info": "AED 8.50",
          "price": {
            "total": 8.5,
            "original": 8.5,
            "discount": 0.0,
            "discount_percentage": 0
          },
          "currency_code": "AED",
          "promotional_badges": [],
          "is_active": true,
          "is_available": true,
          "is_near_expiry": false,
          "is_ad": false
        },
        {
          "id": 4010102,
          "title": "Organic Free Range Eggs 6pk",
          "image_url": "https://careem-catalog-media.media.careem.com/shops/sku_org_eggs_6.png",
          "images_urls": [
            "https://careem-catalog-media.media.careem.com/shops/sku_org_eggs_6.png"
          ],
          "is_cplus": false,
          "link": "careem://shops/merchant/40101/item/4010102",
          "secondary_info": "AED 12.75",
          "price": {
            "total": 12.75,
            "original": 12.75,
            "discount": 0.0,
            "discount_percentage": 0
          },
          "currency_code": "AED",
          "promotional_badges": [],
          "is_active": true,
          "is_available": true,
          "is_near_expiry": false,
          "is_ad": false
        }
      ],
      "merchant": {
        "id": 40101,
        "title": "Marina Fresh Market",
        "image_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_store.png",
        "logo_url": "https://careem-catalog-media.media.careem.com/shops/marina_fresh_logo.png",
        "is_cplus": false,
        "link": "https://careem-catalog-media.media.careem.com/shops/merchant/40101",
        "rating": "4.60",
        "rating_volume": "(850+)",
        "delivery_time": "30-40 mins",
        "distance": "0 km",
        "cuisine": "Organic, Groceries",
        "secondary_info": "AED 7.00",
        "value_proposition": null,
        "promotional_badges": [],
        "is_closed": false
      }
    }
  ],
  "pagination": {
    "total": 1,
    "current_page": 1,
    "total_pages": 1,
    "per_page": 20
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
  "description": "Search across merchants and their items using a text query, optionally filtered by tag ids and excluded brand ids. Never returns Quik (dark store) results — do not call this for Quik or grocery searches; use the grocery/Quik search tools for those instead.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "exclude_brand_ids": {
        "description": "brand ids to exclude from the results",
        "items": {
          "type": "integer"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "latitude": {
        "description": "the user's current location latitude for distance-based search results",
        "type": "number"
      },
      "limit": {
        "description": "results per page, defaults to 20",
        "type": [
          "null",
          "integer"
        ]
      },
      "location": {
        "description": "the location to search for only if the user mentions a specific area, can be an area, address, or vague words for saved locations, such as Home, Office, School, etc.",
        "type": "string"
      },
      "longitude": {
        "description": "the user's current location longitude for distance-based search results",
        "type": "number"
      },
      "page": {
        "description": "page number for pagination, defaults to 1",
        "type": [
          "null",
          "integer"
        ]
      },
      "query": {
        "description": "the search text for items and merchants",
        "type": "string"
      },
      "tag_ids": {
        "description": "tag ids to filter results by",
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
      "query",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "global_search",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "merchants": {
        "description": "merchants matching the search",
        "items": {
          "additionalProperties": false,
          "properties": {
            "cuisine": {
              "type": "string"
            },
            "delayed_tag": {
              "additionalProperties": false,
              "properties": {
                "primary": {
                  "type": "string"
                },
                "secondary": {
                  "type": "string"
                }
              },
              "required": [
                "primary",
                "secondary"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "delivery_time": {
              "type": "string"
            },
            "distance": {
              "type": "string"
            },
            "id": {
              "type": "integer"
            },
            "image_url": {
              "type": "string"
            },
            "is_closed": {
              "type": "boolean"
            },
            "is_cplus": {
              "type": "boolean"
            },
            "is_new": {
              "type": "boolean"
            },
            "link": {
              "type": "string"
            },
            "logo_url": {
              "type": "string"
            },
            "promotional_badges": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "label": {
                    "type": "string"
                  },
                  "subtitle": {
                    "type": "string"
                  },
                  "variant": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "label",
                  "subtitle",
                  "variant"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "rating": {
              "type": "string"
            },
            "rating_volume": {
              "type": "string"
            },
            "secondary_info": {
              "type": "string"
            },
            "title": {
              "type": "string"
            },
            "value_proposition": {
              "type": [
                "null",
                "string"
              ]
            }
          },
          "required": [
            "id",
            "title",
            "image_url",
            "logo_url",
            "is_cplus",
            "link",
            "rating",
            "rating_volume",
            "delivery_time",
            "distance",
            "cuisine",
            "secondary_info",
            "value_proposition",
            "promotional_badges",
            "is_closed"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "page": {
        "description": "the page to display",
        "type": "string"
      },
      "pagination": {
        "additionalProperties": true,
        "description": "pagination info for this search: total, current_page, total_pages, per_page",
        "type": "object"
      },
      "products": {
        "description": "merchants with their matching items",
        "items": {
          "additionalProperties": false,
          "properties": {
            "items": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "currency_code": {
                    "type": "string"
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
                  "is_active": {
                    "type": "boolean"
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
                  "is_cplus": {
                    "type": "boolean"
                  },
                  "is_near_expiry": {
                    "type": [
                      "null",
                      "boolean"
                    ]
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
                      "original": {
                        "type": "number"
                      },
                      "total": {
                        "type": "number"
                      }
                    },
                    "required": [
                      "total",
                      "original",
                      "discount",
                      "discount_percentage"
                    ],
                    "type": [
                      "null",
                      "object"
                    ]
                  },
                  "promotional_badges": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "label": {
                          "type": "string"
                        },
                        "subtitle": {
                          "type": "string"
                        },
                        "variant": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "id",
                        "label",
                        "subtitle",
                        "variant"
                      ],
                      "type": "object"
                    },
                    "type": [
                      "null",
                      "array"
                    ]
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
                  "images_urls",
                  "is_cplus",
                  "link",
                  "secondary_info",
                  "promotional_badges",
                  "is_active",
                  "is_available"
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
                "cuisine": {
                  "type": "string"
                },
                "delayed_tag": {
                  "additionalProperties": false,
                  "properties": {
                    "primary": {
                      "type": "string"
                    },
                    "secondary": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "primary",
                    "secondary"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "delivery_time": {
                  "type": "string"
                },
                "distance": {
                  "type": "string"
                },
                "id": {
                  "type": "integer"
                },
                "image_url": {
                  "type": "string"
                },
                "is_closed": {
                  "type": "boolean"
                },
                "is_cplus": {
                  "type": "boolean"
                },
                "is_new": {
                  "type": "boolean"
                },
                "link": {
                  "type": "string"
                },
                "logo_url": {
                  "type": "string"
                },
                "promotional_badges": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "label": {
                        "type": "string"
                      },
                      "subtitle": {
                        "type": "string"
                      },
                      "variant": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id",
                      "label",
                      "subtitle",
                      "variant"
                    ],
                    "type": "object"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "rating": {
                  "type": "string"
                },
                "rating_volume": {
                  "type": "string"
                },
                "secondary_info": {
                  "type": "string"
                },
                "title": {
                  "type": "string"
                },
                "value_proposition": {
                  "type": [
                    "null",
                    "string"
                  ]
                }
              },
              "required": [
                "id",
                "title",
                "image_url",
                "logo_url",
                "is_cplus",
                "link",
                "rating",
                "rating_volume",
                "delivery_time",
                "distance",
                "cuisine",
                "secondary_info",
                "value_proposition",
                "promotional_badges",
                "is_closed"
              ],
              "type": "object"
            }
          },
          "required": [
            "items",
            "merchant"
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
      "merchants",
      "products"
    ],
    "type": "object"
  },
  "title": "Search Items and Merchants"
}
```
