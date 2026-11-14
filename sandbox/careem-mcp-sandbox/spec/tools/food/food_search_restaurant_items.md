---
tool: food_search_restaurant_items
domain: food
---

# food_search_restaurant_items

Dish search inside one restaurant. Happy paths are keyed on The local server restaurant ids
30101–30105 (see FIXTURES.md); dishes include their option groups so the agent can see
which items need customizing before `cart_add_item`.

Try: "does Morning Syrniki Café have cappuccino?".

## Scenario: upstream-unavailable

`restaurant_id: 39999` → search service 503.

```json match
{
  "restaurant_id": 39999
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 0,
  "currency": {
    "id": 0,
    "code": "",
    "name": "",
    "name_localized": "",
    "label": "",
    "label_localized": "",
    "position": "",
    "decimals": 0,
    "purchasing_power_index": 0,
    "name_short": "",
    "cents_100": false
  },
  "dishes": [],
  "error": "failed to search restaurant items: unexpected response status 503"
}
```

## Scenario: no-matching-dishes

Any `query` containing `xyz` → no matching dishes in the requested restaurant (200 with `dishes: []`).

```json match
{
  "query": "~xyz"
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": {{args.restaurant_id}},
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": []
}
```

## Scenario: syrniki-cafe-syrniki

Restaurant `30104`, query containing `syrniki`.

```json match
{
  "restaurant_id": 30104,
  "query": "~syrniki"
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30104,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700401,
      "name": "Classic Syrniki with Sour Cream",
      "name_localized": "Classic Syrniki with Sour Cream",
      "description": "Four golden cottage-cheese pancakes served with your choice of topping.",
      "description_localized": "Four golden cottage-cheese pancakes served with your choice of topping.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30104/items/700401",
      "price": {
        "discount": 0,
        "original": 34,
        "total": 34
      },
      "groups": [
        {
          "id": 84011,
          "name": "Choose your topping",
          "name_localized": "Choose your topping",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840111,
              "item": "Sour cream",
              "item_localized": "Sour cream",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840112,
              "item": "Berry jam",
              "item_localized": "Berry jam",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840113,
              "item": "Condensed milk",
              "item_localized": "Condensed milk",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            }
          ]
        },
        {
          "id": 84012,
          "name": "Add-ons",
          "name_localized": "Add-ons",
          "min": 0,
          "max": 2,
          "multi_select": true,
          "options": [
            {
              "id": 840121,
              "item": "Extra sour cream",
              "item_localized": "Extra sour cream",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 4,
                "total": 4
              }
            },
            {
              "id": 840122,
              "item": "Fresh berries",
              "item_localized": "Fresh berries",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 6,
                "total": 6
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Scenario: syrniki-cafe-coffee

Restaurant `30104`, query containing `coffee`.

```json match
{
  "restaurant_id": 30104,
  "query": "~coffee"
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30104,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700402,
      "name": "Cappuccino",
      "name_localized": "Cappuccino",
      "description": "Double-shot espresso with steamed milk foam.",
      "description_localized": "Double-shot espresso with steamed milk foam.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30104/items/700402",
      "price": {
        "discount": 0,
        "original": 19,
        "total": 19
      },
      "groups": [
        {
          "id": 84021,
          "name": "Choose your milk",
          "name_localized": "Choose your milk",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840211,
              "item": "Full cream",
              "item_localized": "Full cream",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840212,
              "item": "Oat",
              "item_localized": "Oat",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            },
            {
              "id": 840213,
              "item": "Almond",
              "item_localized": "Almond",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            }
          ]
        },
        {
          "id": 84022,
          "name": "Choose your size",
          "name_localized": "Choose your size",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840221,
              "item": "Regular",
              "item_localized": "Regular",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840222,
              "item": "Large",
              "item_localized": "Large",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 4,
                "total": 4
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Scenario: syrniki-cafe-cappuccino

Restaurant `30104`, query containing `cappuccino`.

```json match
{
  "restaurant_id": 30104,
  "query": "~cappuccino"
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30104,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700402,
      "name": "Cappuccino",
      "name_localized": "Cappuccino",
      "description": "Double-shot espresso with steamed milk foam.",
      "description_localized": "Double-shot espresso with steamed milk foam.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30104/items/700402",
      "price": {
        "discount": 0,
        "original": 19,
        "total": 19
      },
      "groups": [
        {
          "id": 84021,
          "name": "Choose your milk",
          "name_localized": "Choose your milk",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840211,
              "item": "Full cream",
              "item_localized": "Full cream",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840212,
              "item": "Oat",
              "item_localized": "Oat",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            },
            {
              "id": 840213,
              "item": "Almond",
              "item_localized": "Almond",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            }
          ]
        },
        {
          "id": 84022,
          "name": "Choose your size",
          "name_localized": "Choose your size",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840221,
              "item": "Regular",
              "item_localized": "Regular",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840222,
              "item": "Large",
              "item_localized": "Large",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 4,
                "total": 4
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Scenario: pizza-margherita

Restaurant `30103`, query containing `margherita`.

```json match
{
  "restaurant_id": 30103,
  "query": "~margherita"
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30103,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700301,
      "name": "Margherita Pizza",
      "name_localized": "Margherita Pizza",
      "description": "San Marzano tomato, fior di latte mozzarella and fresh basil.",
      "description_localized": "San Marzano tomato, fior di latte mozzarella and fresh basil.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700301.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30103/items/700301",
      "price": {
        "discount": 0,
        "original": 39,
        "total": 39
      },
      "groups": [
        {
          "id": 83011,
          "name": "Choose your size",
          "name_localized": "Choose your size",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 830111,
              "item": "Medium",
              "item_localized": "Medium",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 830112,
              "item": "Large",
              "item_localized": "Large",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 12,
                "total": 12
              }
            }
          ]
        },
        {
          "id": 83012,
          "name": "Choose your crust",
          "name_localized": "Choose your crust",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 830121,
              "item": "Classic",
              "item_localized": "Classic",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 830122,
              "item": "Thin",
              "item_localized": "Thin",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            }
          ]
        },
        {
          "id": 83013,
          "name": "Extra toppings",
          "name_localized": "Extra toppings",
          "min": 0,
          "max": 3,
          "multi_select": true,
          "options": [
            {
              "id": 830131,
              "item": "Mushrooms",
              "item_localized": "Mushrooms",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 4,
                "total": 4
              }
            },
            {
              "id": 830132,
              "item": "Black olives",
              "item_localized": "Black olives",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            },
            {
              "id": 830133,
              "item": "Extra mozzarella",
              "item_localized": "Extra mozzarella",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 6,
                "total": 6
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Scenario: shawarma-station-all

Any other query in Shawarma Station (`30101`) → all of its dishes.

```json match
{
  "restaurant_id": 30101
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30101,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700101,
      "name": "Chicken Shawarma Wrap",
      "name_localized": "Chicken Shawarma Wrap",
      "description": "Marinated chicken, garlic toum, pickles and fries wrapped in saj bread.",
      "description_localized": "Marinated chicken, garlic toum, pickles and fries wrapped in saj bread.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700101.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30101/items/700101",
      "price": {
        "discount": 0,
        "original": 18,
        "total": 18
      },
      "groups": [
        {
          "id": 81011,
          "name": "Choose your size",
          "name_localized": "Choose your size",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 810111,
              "item": "Regular",
              "item_localized": "Regular",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 810112,
              "item": "Large",
              "item_localized": "Large",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 6,
                "total": 6
              }
            }
          ]
        },
        {
          "id": 81012,
          "name": "Extras",
          "name_localized": "Extras",
          "min": 0,
          "max": 2,
          "multi_select": true,
          "options": [
            {
              "id": 810121,
              "item": "Extra garlic sauce",
              "item_localized": "Extra garlic sauce",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 2,
                "total": 2
              }
            },
            {
              "id": 810122,
              "item": "No pickles",
              "item_localized": "No pickles",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            }
          ]
        }
      ]
    },
    {
      "id": 700102,
      "name": "Falafel Plate",
      "name_localized": "Falafel Plate",
      "description": "Six crispy falafel with hummus, tahini, salad and pita.",
      "description_localized": "Six crispy falafel with hummus, tahini, salad and pita.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700102.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30101/items/700102",
      "price": {
        "discount": 0,
        "original": 22,
        "total": 22
      }
    },
    {
      "id": 700103,
      "name": "Mixed Grill Platter",
      "name_localized": "Mixed Grill Platter",
      "description": "Shish tawook, kofta and lamb tikka with grilled vegetables and rice.",
      "description_localized": "Shish tawook, kofta and lamb tikka with grilled vegetables and rice.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700103.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30101/items/700103",
      "price": {
        "discount": 0,
        "original": 65,
        "total": 65
      }
    }
  ]
}
```

## Scenario: sakura-sushi-lab-all

Any other query in Sakura Sushi Lab (`30102`) → all of its dishes.

```json match
{
  "restaurant_id": 30102
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30102,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700201,
      "name": "Salmon Avocado Roll (8 pcs)",
      "name_localized": "Salmon Avocado Roll (8 pcs)",
      "description": "Fresh salmon, avocado and cucumber, topped with sesame.",
      "description_localized": "Fresh salmon, avocado and cucumber, topped with sesame.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700201.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30102/items/700201",
      "price": {
        "discount": 0,
        "original": 42,
        "total": 42
      }
    },
    {
      "id": 700202,
      "name": "Chicken Katsu Bento",
      "name_localized": "Chicken Katsu Bento",
      "description": "Panko chicken katsu, steamed rice, salad and miso soup.",
      "description_localized": "Panko chicken katsu, steamed rice, salad and miso soup.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700202.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30102/items/700202",
      "price": {
        "discount": 0,
        "original": 48,
        "total": 48
      }
    }
  ]
}
```

## Scenario: pizza-piazza-all

Any other query in Pizza Piazza (`30103`) → all of its dishes.

```json match
{
  "restaurant_id": 30103
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30103,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700301,
      "name": "Margherita Pizza",
      "name_localized": "Margherita Pizza",
      "description": "San Marzano tomato, fior di latte mozzarella and fresh basil.",
      "description_localized": "San Marzano tomato, fior di latte mozzarella and fresh basil.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700301.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30103/items/700301",
      "price": {
        "discount": 0,
        "original": 39,
        "total": 39
      },
      "groups": [
        {
          "id": 83011,
          "name": "Choose your size",
          "name_localized": "Choose your size",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 830111,
              "item": "Medium",
              "item_localized": "Medium",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 830112,
              "item": "Large",
              "item_localized": "Large",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 12,
                "total": 12
              }
            }
          ]
        },
        {
          "id": 83012,
          "name": "Choose your crust",
          "name_localized": "Choose your crust",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 830121,
              "item": "Classic",
              "item_localized": "Classic",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 830122,
              "item": "Thin",
              "item_localized": "Thin",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            }
          ]
        },
        {
          "id": 83013,
          "name": "Extra toppings",
          "name_localized": "Extra toppings",
          "min": 0,
          "max": 3,
          "multi_select": true,
          "options": [
            {
              "id": 830131,
              "item": "Mushrooms",
              "item_localized": "Mushrooms",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 4,
                "total": 4
              }
            },
            {
              "id": 830132,
              "item": "Black olives",
              "item_localized": "Black olives",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            },
            {
              "id": 830133,
              "item": "Extra mozzarella",
              "item_localized": "Extra mozzarella",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 6,
                "total": 6
              }
            }
          ]
        }
      ]
    },
    {
      "id": 700302,
      "name": "Pepperoni Pizza",
      "name_localized": "Pepperoni Pizza",
      "description": "Tomato sauce, mozzarella and spicy beef pepperoni.",
      "description_localized": "Tomato sauce, mozzarella and spicy beef pepperoni.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700302.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30103/items/700302",
      "price": {
        "discount": 0,
        "original": 46,
        "total": 46
      }
    }
  ]
}
```

## Scenario: morning-syrniki-cafe-all

Any other query in Morning Syrniki Café (`30104`) → all of its dishes.

```json match
{
  "restaurant_id": 30104
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30104,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700401,
      "name": "Classic Syrniki with Sour Cream",
      "name_localized": "Classic Syrniki with Sour Cream",
      "description": "Four golden cottage-cheese pancakes served with your choice of topping.",
      "description_localized": "Four golden cottage-cheese pancakes served with your choice of topping.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30104/items/700401",
      "price": {
        "discount": 0,
        "original": 34,
        "total": 34
      },
      "groups": [
        {
          "id": 84011,
          "name": "Choose your topping",
          "name_localized": "Choose your topping",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840111,
              "item": "Sour cream",
              "item_localized": "Sour cream",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840112,
              "item": "Berry jam",
              "item_localized": "Berry jam",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840113,
              "item": "Condensed milk",
              "item_localized": "Condensed milk",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            }
          ]
        },
        {
          "id": 84012,
          "name": "Add-ons",
          "name_localized": "Add-ons",
          "min": 0,
          "max": 2,
          "multi_select": true,
          "options": [
            {
              "id": 840121,
              "item": "Extra sour cream",
              "item_localized": "Extra sour cream",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 4,
                "total": 4
              }
            },
            {
              "id": 840122,
              "item": "Fresh berries",
              "item_localized": "Fresh berries",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 6,
                "total": 6
              }
            }
          ]
        }
      ]
    },
    {
      "id": 700402,
      "name": "Cappuccino",
      "name_localized": "Cappuccino",
      "description": "Double-shot espresso with steamed milk foam.",
      "description_localized": "Double-shot espresso with steamed milk foam.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700402.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30104/items/700402",
      "price": {
        "discount": 0,
        "original": 19,
        "total": 19
      },
      "groups": [
        {
          "id": 84021,
          "name": "Choose your milk",
          "name_localized": "Choose your milk",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840211,
              "item": "Full cream",
              "item_localized": "Full cream",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840212,
              "item": "Oat",
              "item_localized": "Oat",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            },
            {
              "id": 840213,
              "item": "Almond",
              "item_localized": "Almond",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 3,
                "total": 3
              }
            }
          ]
        },
        {
          "id": 84022,
          "name": "Choose your size",
          "name_localized": "Choose your size",
          "min": 1,
          "max": 1,
          "multi_select": false,
          "options": [
            {
              "id": 840221,
              "item": "Regular",
              "item_localized": "Regular",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 0,
                "total": 0
              }
            },
            {
              "id": 840222,
              "item": "Large",
              "item_localized": "Large",
              "is_active": true,
              "price": {
                "discount": 0,
                "original": 4,
                "total": 4
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Scenario: green-bowl-co-all

Any other query in Green Bowl Co. (`30105`) → all of its dishes.

```json match
{
  "restaurant_id": 30105
}
```

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 30105,
  "currency": {
    "id": 1,
    "code": "AED",
    "name": "Dirham",
    "name_localized": "Dirham",
    "label": "AED",
    "label_localized": "AED",
    "position": "left",
    "decimals": 2,
    "purchasing_power_index": 1,
    "name_short": "Dirhams",
    "cents_100": true
  },
  "dishes": [
    {
      "id": 700501,
      "name": "Chicken Caesar Bowl",
      "name_localized": "Chicken Caesar Bowl",
      "description": "Grilled chicken, romaine, parmesan, croutons and Caesar dressing.",
      "description_localized": "Grilled chicken, romaine, parmesan, croutons and Caesar dressing.",
      "image_url": "https://careem-catalog-media.media.careem.com/food/items/700501.jpg",
      "active": true,
      "inactivity_reason": null,
      "link": "careemfood://restaurants/30105/items/700501",
      "price": {
        "discount": 0,
        "original": 38,
        "total": 38
      }
    }
  ]
}
```

## Scenario: restaurant-not-found

Default: restaurant id not locally world (use 30101–30105) → upstream 404. On error `restaurant_id` is 0 and `currency` is zero-valued, as in production.

```json response
{
  "page": "food_search_restaurant_items",
  "restaurant_id": 0,
  "currency": {
    "id": 0,
    "code": "",
    "name": "",
    "name_localized": "",
    "label": "",
    "label_localized": "",
    "position": "",
    "decimals": 0,
    "purchasing_power_index": 0,
    "name_short": "",
    "cents_100": false
  },
  "dishes": [],
  "error": "failed to search restaurant items: unexpected response status 404"
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Search for dishes or menu items within a specific restaurant by text query. Returns matching dishes with names, prices, descriptions, and availability.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "city_id": {
        "description": "city ID",
        "type": "string"
      },
      "domain": {
        "description": "order domain: food | shops | quik; defaults to food",
        "type": "string"
      },
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "limit": {
        "description": "number of results per page, max 30, default 20",
        "type": "integer"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "page": {
        "description": "page number for pagination, default 1",
        "type": "integer"
      },
      "query": {
        "description": "search text for dishes e.g. 'burger', 'pizza'",
        "type": "string"
      },
      "restaurant_id": {
        "description": "restaurant ID to search items in",
        "type": "integer"
      }
    },
    "required": [
      "restaurant_id",
      "query",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "food_search_restaurant_items",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
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
            "maximum": 2147483647,
            "minimum": -2147483648,
            "type": "integer"
          },
          "id": {
            "type": "integer"
          },
          "label": {
            "type": "string"
          },
          "label_localized": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "name_localized": {
            "type": "string"
          },
          "name_short": {
            "type": "string"
          },
          "position": {
            "type": "string"
          },
          "purchasing_power_index": {
            "maximum": 2147483647,
            "minimum": -2147483648,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "code",
          "name",
          "name_localized",
          "label",
          "label_localized",
          "position",
          "decimals",
          "purchasing_power_index",
          "name_short",
          "cents_100"
        ],
        "type": "object"
      },
      "dishes": {
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
            "groups": {
              "items": {
                "additionalProperties": false,
                "properties": {
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
                        "groups": {
                          "items": {
                            "additionalProperties": false,
                            "properties": {
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
                                    "id": {
                                      "type": "integer"
                                    },
                                    "is_active": {
                                      "type": "boolean"
                                    },
                                    "item": {
                                      "type": "string"
                                    },
                                    "item_localized": {
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
                                        "original",
                                        "discount",
                                        "total"
                                      ],
                                      "type": "object"
                                    }
                                  },
                                  "required": [
                                    "id",
                                    "item",
                                    "item_localized",
                                    "is_active",
                                    "price"
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
                              "id",
                              "name",
                              "name_localized",
                              "min",
                              "max",
                              "multi_select",
                              "options"
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
                        "is_active": {
                          "type": "boolean"
                        },
                        "item": {
                          "type": "string"
                        },
                        "item_localized": {
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
                            "original",
                            "discount",
                            "total"
                          ],
                          "type": "object"
                        }
                      },
                      "required": [
                        "id",
                        "item",
                        "item_localized",
                        "is_active",
                        "price"
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
                  "id",
                  "name",
                  "name_localized",
                  "min",
                  "max",
                  "multi_select",
                  "options"
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
            "inactivity_reason": {
              "type": [
                "null",
                "string"
              ]
            },
            "link": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "name_localized": {
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
                "original",
                "discount",
                "total"
              ],
              "type": "object"
            }
          },
          "required": [
            "id",
            "name",
            "name_localized",
            "description",
            "description_localized",
            "image_url",
            "price",
            "active",
            "link",
            "inactivity_reason"
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
      },
      "restaurant_id": {
        "type": "integer"
      }
    },
    "required": [
      "page",
      "restaurant_id",
      "currency",
      "dishes"
    ],
    "type": "object"
  },
  "title": "Search Dishes in a Restaurant"
}
```
