---
tool: cart_get_quik_basket
domain: cart
---

# cart_get_quik_basket

The user's Careem Quik basket for wherever they are, without knowing a `merchant_id`: production
resolves the nearest Quik store first (Quik serves exactly one store per location), then returns
that store's basket priced and enriched like `cart_get_basket`.

Grocery basket `6000002` at Careem Quik Dubai Marina (`40001`): 2× milk + eggs + sourdough. Subtotal 40.00 + delivery 4.00 + service 1.50 = **AED 45.50** (no promo). Store: Careem Quik Dubai Marina (`40001`, brand `40000`, 15 min).
Default payment is card `4242`.

## Scenario: outside-service-area

`latitude: 0` (FIXTURES: outside the service area): the nearest-store lookup answers with `MERCHANT_OUT_OF_SERVICEABLE_AREA`.

```json match
{
  "latitude": 0
}
```

```json response
{
  "page": "cart_get_quik_basket",
  "basket": null,
  "error": "failed to resolve nearest Quik store: MERCHANT_OUT_OF_SERVICEABLE_AREA"
}
```

## Scenario: upstream-unavailable

`timezone` containing `trigger_upstream_down` (magic trigger): the grocery service answers 503 with no `errors` list.

```json match
{
  "timezone": "~trigger_upstream_down"
}
```

```json response
{
  "page": "cart_get_quik_basket",
  "basket": null,
  "error": "failed to resolve nearest Quik store: unknown grocery service error"
}
```

## Scenario: no-basket

`timezone` containing `empty-cart` (magic trigger): the store resolves but the user has no Quik basket (basket lookup 404). `merchant` is still returned.

```json match
{
  "timezone": "~empty-cart"
}
```

```json response
{
  "page": "cart_get_quik_basket",
  "merchant": {
    "id": 40001,
    "name": "Careem Quik Dubai Marina",
    "name_localized": "Careem Quik Dubai Marina",
    "eta_in_minutes": 15
  },
  "basket": null,
  "error": "cart does not exist yet — no items have been added for this merchant"
}
```

## Scenario: basket-unavailable

`timezone` containing `basket-down` (magic trigger): upstream answers 503 after the store resolved.

```json match
{
  "timezone": "~basket-down"
}
```

```json response
{
  "page": "cart_get_quik_basket",
  "merchant": {
    "id": 40001,
    "name": "Careem Quik Dubai Marina",
    "name_localized": "Careem Quik Dubai Marina",
    "eta_in_minutes": 15
  },
  "basket": null,
  "error": "failed to get basket: unexpected response status 503"
}
```

## Scenario: pricing-down

`timezone` containing `pricing-down` (magic trigger): the basket loads but pricing fails; basket (names + currency) and merchant without `price` / `payment_method`.

```json match
{
  "timezone": "~pricing-down"
}
```

```json response
{
  "page": "cart_get_quik_basket",
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
  }
}
```

## Scenario: quik-basket

Default: the Careem Quik Dubai Marina basket `6000002`, AED 45.50.

```json response
{
  "page": "cart_get_quik_basket",
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
  "description": "Resolves the nearest Careem Quik store for the user's current location and returns its basket contents, pricing, and metadata. Use this to view/refresh the Quik basket — no merchant_id needed, unlike cart_get_basket.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "city_id": {
        "description": "city ID from user_info.city_id — skips city lookup when provided alongside timezone",
        "type": "integer"
      },
      "currency": {
        "description": "currency code from user_info.city_currency — used for payment method resolution when provided alongside city_id and timezone",
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
  "name": "cart_get_quik_basket",
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
  "title": "Get Careem Quik Basket"
}
```
