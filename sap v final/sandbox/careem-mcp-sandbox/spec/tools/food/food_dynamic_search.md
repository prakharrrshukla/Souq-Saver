---
tool: food_dynamic_search
domain: food
---

# food_dynamic_search

One-box food search (production: the upstream API). The search service classifies the query
as a **dish** or a **restaurant** search and returns that branch: `type: "dishes"` → cards with
matching `items` (`page: "food_dish_search"`, same shape as `food_dish_search`);
`type: "restaurants"` → cards with matching `dishes` (`page: "food_merchant_search"`, same shape
as `food_merchant_search`). `classifier_status` is `ok` when the classifier decided and
`fallback_default` when it fell back to the restaurant branch. `search_tab` forces a branch.

Triggers (`query` contains): `sakura`, `pizza piazza` → restaurant branch; `syrniki`, `chicken`,
`pizza` → dish branch; `syrniki` with `search_tab: "restaurants"` → `tab-override-restaurants`;
`xyz` → `no-results`; `trigger_upstream_down` → `upstream-unavailable`; anything else →
`fallback-default`.

Try: "I want syrniki", "order from Sakura Sushi Lab".

## Scenario: upstream-unavailable

`query` containing `trigger_upstream_down` → the upstream API answers 503. On error nothing but `restaurants: []` is set, so `page`, `type` and `classifier_status` are empty strings; the error carries the upstream body.

```json match
{
  "query": "~trigger_upstream_down"
}
```

```json response
{
  "page": "",
  "type": "",
  "classifier_status": "",
  "restaurants": [],
  "error": "failed to search: unexpected response status 503: {\"code\":\"SERVICE_UNAVAILABLE\",\"message\":\"upstream unavailable\"}"
}
```

## Scenario: tab-override-restaurants

`search_tab: "restaurants"` with a dish-like query (`syrniki`) → the classifier is bypassed and the restaurant branch is returned (`classifier_status: "skipped"` is a local server assumption).

```json match
{
  "search_tab": "restaurants",
  "query": "~syrniki"
}
```

```json response
{
  "page": "food_merchant_search",
  "type": "restaurants",
  "classifier_status": "skipped",
  "restaurants": [
    {
      "_score": 1.0,
      "ads_badge_hidden": true,
      "arc_distance": "0.4 km",
      "arc_distance_localized": "0.4 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130104,
        "name": "Morning Syrniki Café",
        "name_localized": "Morning Syrniki Café",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/morning-syrniki-cafe.png",
        "link": "careem://food.careem.com/restaurants/brands/130104",
        "brand_media": []
      },
      "brand_id": 130104,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530104,
      "coordinate": {
        "lat": 25.0851,
        "lng": 55.1462
      },
      "cuisines": [
        {
          "id": 21,
          "name": "Breakfast",
          "name_localized": "Breakfast",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/breakfast.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 47,
          "name": "Eastern European",
          "name_localized": "Eastern European",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/ukrainian.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 25,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "20 - 30",
        "original_in_minutes": 25,
        "distance": 400,
        "distance_in_km": 0.4,
        "fee": 5,
        "careem_delivery_fee": 5,
        "merchant_delivery_fee": 5,
        "schedule_delivery_fee": 5,
        "options": "careem",
        "eta_promise_minutes": 30,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 5,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 0.5,
      "driving_distance_localized": "0.5 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30104,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": true,
      "is_new": false,
      "item_count": 2,
      "link": "careemfood://restaurants/30104?business_type=restaurants&merchant_type=normal",
      "location": "Dubai Marina",
      "location_localized": "Dubai Marina",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Morning Syrniki Café",
      "name_localized": "Morning Syrniki Café",
      "preparation_time": 12,
      "price": {
        "average": 45,
        "range": "",
        "scale": {
          "value": 1,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.8,
        "average_text": "4.8",
        "count": 640,
        "count_text": "640",
        "state": "highlight"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30104",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30104?business_type=restaurants&merchant_type=normal",
      "dishes": [
        {
          "id": 700401,
          "name": "Classic Syrniki with Sour Cream",
          "description": "Four golden cottage-cheese pancakes served with your choice of topping.",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg",
          "price": {
            "discount": 0,
            "discount_percentage": 0,
            "original": 34,
            "total": 34
          },
          "active": true
        }
      ]
    }
  ]
}
```

## Scenario: merchant-sakura

`query` containing `sakura` → classified as a restaurant search (merchant-name match, so no per-merchant `dishes`), page `food_merchant_search`.

```json match
{
  "query": "~sakura"
}
```

```json response
{
  "page": "food_merchant_search",
  "type": "restaurants",
  "classifier_status": "ok",
  "restaurants": [
    {
      "_score": 0.79,
      "ads_badge_hidden": true,
      "arc_distance": "2.4 km",
      "arc_distance_localized": "2.4 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130102,
        "name": "Sakura Sushi Lab",
        "name_localized": "Sakura Sushi Lab",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/sakura-sushi-lab.png",
        "link": "careem://food.careem.com/restaurants/brands/130102",
        "brand_media": []
      },
      "brand_id": 130102,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530102,
      "coordinate": {
        "lat": 25.0715,
        "lng": 55.1418
      },
      "cuisines": [
        {
          "id": 9,
          "name": "Japanese",
          "name_localized": "Japanese",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/japanese.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 312,
          "name": "Sushi",
          "name_localized": "Sushi",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/sushi.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 40,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "35 - 45",
        "original_in_minutes": 40,
        "distance": 2400,
        "distance_in_km": 2.4,
        "fee": 0,
        "careem_delivery_fee": 0,
        "merchant_delivery_fee": 0,
        "schedule_delivery_fee": 0,
        "options": "careem",
        "eta_promise_minutes": 45,
        "pricing_tag": "free_delivery",
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 0,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 3.1,
      "driving_distance_localized": "3.1 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30102,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/sakura-sushi-lab-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": false,
      "is_new": false,
      "item_count": 2,
      "link": "careemfood://restaurants/30102?business_type=restaurants&merchant_type=normal",
      "location": "JLT Cluster D",
      "location_localized": "JLT Cluster D",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/sakura-sushi-lab-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Sakura Sushi Lab",
      "name_localized": "Sakura Sushi Lab",
      "preparation_time": 25,
      "price": {
        "average": 90,
        "range": "",
        "scale": {
          "value": 2,
          "upper_bound": 3
        }
      },
      "promotions": [
        {
          "id": 950102,
          "active": true,
          "promo_code": null,
          "percentage": 15,
          "total_percentage": 15,
          "internal_subsidize": 0,
          "cap": 30,
          "text": "15% off your order",
          "text_localized": "15% off your order",
          "badge_type": "discount",
          "is_auto_applied": true,
          "type": "merchant_discount",
          "creation_user_type": "merchant",
          "offer_type": "percentage_discount_offer",
          "offer_value": 15,
          "partner_contribution": 15,
          "image_url": null,
          "min_basket_value": 40,
          "whitelist_items": [],
          "terms": [
            {
              "term": "Valid on orders above AED 40",
              "term_localized": "Valid on orders above AED 40"
            },
            {
              "term": "Maximum discount is AED 30",
              "term_localized": "Maximum discount is AED 30"
            }
          ],
          "text_attributes": null,
          "title": "15% off",
          "subtitle": "Auto-applied at checkout",
          "is_card_series_based": false
        }
      ],
      "rating": {
        "average": 4.4,
        "average_text": "4.4",
        "count": 870,
        "count_text": "870",
        "state": "default"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30102",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30102?business_type=restaurants&merchant_type=normal"
    }
  ]
}
```

## Scenario: merchant-pizza-piazza

`query` containing `pizza piazza` → restaurant search for Pizza Piazza (checked before the generic `pizza` dish scenario).

```json match
{
  "query": "~pizza piazza"
}
```

```json response
{
  "page": "food_merchant_search",
  "type": "restaurants",
  "classifier_status": "ok",
  "restaurants": [
    {
      "_score": 0.86,
      "ads_badge_hidden": true,
      "arc_distance": "1.6 km",
      "arc_distance_localized": "1.6 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130103,
        "name": "Pizza Piazza",
        "name_localized": "Pizza Piazza",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/pizza-piazza.png",
        "link": "careem://food.careem.com/restaurants/brands/130103",
        "brand_media": []
      },
      "brand_id": 130103,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530103,
      "coordinate": {
        "lat": 25.0789,
        "lng": 55.1389
      },
      "cuisines": [
        {
          "id": 8,
          "name": "Italian",
          "name_localized": "Italian",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/italian.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 313,
          "name": "Pizza",
          "name_localized": "Pizza",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/pizza.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 30,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "25 - 35",
        "original_in_minutes": 30,
        "distance": 1600,
        "distance_in_km": 1.6,
        "fee": 5,
        "careem_delivery_fee": 5,
        "merchant_delivery_fee": 5,
        "schedule_delivery_fee": 5,
        "options": "careem",
        "eta_promise_minutes": 35,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 5,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 2.1,
      "driving_distance_localized": "2.1 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30103,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/pizza-piazza-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": false,
      "is_new": false,
      "item_count": 2,
      "link": "careemfood://restaurants/30103?business_type=restaurants&merchant_type=normal",
      "location": "Dubai Marina",
      "location_localized": "Dubai Marina",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/pizza-piazza-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Pizza Piazza",
      "name_localized": "Pizza Piazza",
      "preparation_time": 18,
      "price": {
        "average": 60,
        "range": "",
        "scale": {
          "value": 2,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.5,
        "average_text": "4.5",
        "count": 1540,
        "count_text": "999+",
        "state": "highlight"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30103",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30103?business_type=restaurants&merchant_type=normal"
    }
  ]
}
```

## Scenario: dish-syrniki

`query` containing `syrniki` → classified as a dish search: cards with matching `items`, page `food_dish_search`.

```json match
{
  "query": "~syrniki"
}
```

```json response
{
  "page": "food_dish_search",
  "type": "dishes",
  "classifier_status": "ok",
  "restaurants": [
    {
      "_score": 1.0,
      "ads_badge_hidden": true,
      "arc_distance": "0.4 km",
      "arc_distance_localized": "0.4 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130104,
        "name": "Morning Syrniki Café",
        "name_localized": "Morning Syrniki Café",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/morning-syrniki-cafe.png",
        "link": "careem://food.careem.com/restaurants/brands/130104",
        "brand_media": []
      },
      "brand_id": 130104,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530104,
      "coordinate": {
        "lat": 25.0851,
        "lng": 55.1462
      },
      "cuisines": [
        {
          "id": 21,
          "name": "Breakfast",
          "name_localized": "Breakfast",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/breakfast.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 47,
          "name": "Eastern European",
          "name_localized": "Eastern European",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/ukrainian.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 25,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "20 - 30",
        "original_in_minutes": 25,
        "distance": 400,
        "distance_in_km": 0.4,
        "fee": 5,
        "careem_delivery_fee": 5,
        "merchant_delivery_fee": 5,
        "schedule_delivery_fee": 5,
        "options": "careem",
        "eta_promise_minutes": 30,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 5,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 0.5,
      "driving_distance_localized": "0.5 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30104,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": true,
      "is_new": false,
      "item_count": 1,
      "link": "careemfood://restaurants/30104?business_type=restaurants&merchant_type=normal",
      "location": "Dubai Marina",
      "location_localized": "Dubai Marina",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Morning Syrniki Café",
      "name_localized": "Morning Syrniki Café",
      "preparation_time": 12,
      "price": {
        "average": 45,
        "range": "",
        "scale": {
          "value": 1,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.8,
        "average_text": "4.8",
        "count": 640,
        "count_text": "640",
        "state": "highlight"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30104",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30104?business_type=restaurants&merchant_type=normal",
      "items": [
        {
          "id": 700401,
          "name": "Classic Syrniki with Sour Cream",
          "name_localized": "Classic Syrniki with Sour Cream",
          "description": "Four golden cottage-cheese pancakes served with your choice of topping.",
          "description_localized": "Four golden cottage-cheese pancakes served with your choice of topping.",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700401.jpg",
          "active": true,
          "price": {
            "discount": 0,
            "discount_percentage": 0,
            "original": 34,
            "total": 34
          }
        }
      ]
    }
  ]
}
```

## Scenario: dish-chicken

`query` containing `chicken` → dish search across three merchants.

```json match
{
  "query": "~chicken"
}
```

```json response
{
  "page": "food_dish_search",
  "type": "dishes",
  "classifier_status": "ok",
  "restaurants": [
    {
      "_score": 0.93,
      "ads_badge_hidden": true,
      "arc_distance": "1.1 km",
      "arc_distance_localized": "1.1 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130101,
        "name": "Shawarma Station",
        "name_localized": "Shawarma Station",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/shawarma-station.png",
        "link": "careem://food.careem.com/restaurants/brands/130101",
        "brand_media": []
      },
      "brand_id": 130101,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530101,
      "coordinate": {
        "lat": 25.0812,
        "lng": 55.1405
      },
      "cuisines": [
        {
          "id": 5,
          "name": "Arabic",
          "name_localized": "Arabic",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/arabic.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 318,
          "name": "Shawarma",
          "name_localized": "Shawarma",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/shawarma.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 25,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "20 - 30",
        "original_in_minutes": 25,
        "distance": 1100,
        "distance_in_km": 1.1,
        "fee": 7,
        "careem_delivery_fee": 7,
        "merchant_delivery_fee": 7,
        "schedule_delivery_fee": 7,
        "options": "careem",
        "eta_promise_minutes": 30,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 7,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 1.4,
      "driving_distance_localized": "1.4 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30101,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/shawarma-station-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": false,
      "is_new": false,
      "item_count": 1,
      "link": "careemfood://restaurants/30101?business_type=restaurants&merchant_type=normal",
      "location": "Dubai Marina",
      "location_localized": "Dubai Marina",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/shawarma-station-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Shawarma Station",
      "name_localized": "Shawarma Station",
      "preparation_time": 12,
      "price": {
        "average": 35,
        "range": "",
        "scale": {
          "value": 1,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.6,
        "average_text": "4.6",
        "count": 2310,
        "count_text": "999+",
        "state": "highlight"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30101",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30101?business_type=restaurants&merchant_type=normal",
      "items": [
        {
          "id": 700101,
          "name": "Chicken Shawarma Wrap",
          "name_localized": "Chicken Shawarma Wrap",
          "description": "Marinated chicken, garlic toum, pickles and fries wrapped in saj bread.",
          "description_localized": "Marinated chicken, garlic toum, pickles and fries wrapped in saj bread.",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700101.jpg",
          "active": true,
          "price": {
            "discount": 0,
            "discount_percentage": 0,
            "original": 18,
            "total": 18
          }
        }
      ]
    },
    {
      "_score": 0.79,
      "ads_badge_hidden": true,
      "arc_distance": "2.4 km",
      "arc_distance_localized": "2.4 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130102,
        "name": "Sakura Sushi Lab",
        "name_localized": "Sakura Sushi Lab",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/sakura-sushi-lab.png",
        "link": "careem://food.careem.com/restaurants/brands/130102",
        "brand_media": []
      },
      "brand_id": 130102,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530102,
      "coordinate": {
        "lat": 25.0715,
        "lng": 55.1418
      },
      "cuisines": [
        {
          "id": 9,
          "name": "Japanese",
          "name_localized": "Japanese",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/japanese.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 312,
          "name": "Sushi",
          "name_localized": "Sushi",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/sushi.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 40,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "35 - 45",
        "original_in_minutes": 40,
        "distance": 2400,
        "distance_in_km": 2.4,
        "fee": 0,
        "careem_delivery_fee": 0,
        "merchant_delivery_fee": 0,
        "schedule_delivery_fee": 0,
        "options": "careem",
        "eta_promise_minutes": 45,
        "pricing_tag": "free_delivery",
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 0,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 3.1,
      "driving_distance_localized": "3.1 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30102,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/sakura-sushi-lab-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": false,
      "is_new": false,
      "item_count": 1,
      "link": "careemfood://restaurants/30102?business_type=restaurants&merchant_type=normal",
      "location": "JLT Cluster D",
      "location_localized": "JLT Cluster D",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/sakura-sushi-lab-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Sakura Sushi Lab",
      "name_localized": "Sakura Sushi Lab",
      "preparation_time": 25,
      "price": {
        "average": 90,
        "range": "",
        "scale": {
          "value": 2,
          "upper_bound": 3
        }
      },
      "promotions": [
        {
          "id": 950102,
          "active": true,
          "promo_code": null,
          "percentage": 15,
          "total_percentage": 15,
          "internal_subsidize": 0,
          "cap": 30,
          "text": "15% off your order",
          "text_localized": "15% off your order",
          "badge_type": "discount",
          "is_auto_applied": true,
          "type": "merchant_discount",
          "creation_user_type": "merchant",
          "offer_type": "percentage_discount_offer",
          "offer_value": 15,
          "partner_contribution": 15,
          "image_url": null,
          "min_basket_value": 40,
          "whitelist_items": [],
          "terms": [
            {
              "term": "Valid on orders above AED 40",
              "term_localized": "Valid on orders above AED 40"
            },
            {
              "term": "Maximum discount is AED 30",
              "term_localized": "Maximum discount is AED 30"
            }
          ],
          "text_attributes": null,
          "title": "15% off",
          "subtitle": "Auto-applied at checkout",
          "is_card_series_based": false
        }
      ],
      "rating": {
        "average": 4.4,
        "average_text": "4.4",
        "count": 870,
        "count_text": "870",
        "state": "default"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30102",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30102?business_type=restaurants&merchant_type=normal",
      "items": [
        {
          "id": 700202,
          "name": "Chicken Katsu Bento",
          "name_localized": "Chicken Katsu Bento",
          "description": "Panko chicken katsu, steamed rice, salad and miso soup.",
          "description_localized": "Panko chicken katsu, steamed rice, salad and miso soup.",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700202.jpg",
          "active": true,
          "price": {
            "discount": 0,
            "discount_percentage": 0,
            "original": 48,
            "total": 48
          }
        }
      ]
    },
    {
      "_score": 0.72,
      "ads_badge_hidden": true,
      "arc_distance": "2.1 km",
      "arc_distance_localized": "2.1 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130105,
        "name": "Green Bowl Co.",
        "name_localized": "Green Bowl Co.",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/green-bowl-co.png",
        "link": "careem://food.careem.com/restaurants/brands/130105",
        "brand_media": []
      },
      "brand_id": 130105,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530105,
      "coordinate": {
        "lat": 25.0688,
        "lng": 55.1447
      },
      "cuisines": [
        {
          "id": 34,
          "name": "Healthy",
          "name_localized": "Healthy",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/healthy.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 35,
          "name": "Salads",
          "name_localized": "Salads",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/salads.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 30,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "25 - 35",
        "original_in_minutes": 30,
        "distance": 2100,
        "distance_in_km": 2.1,
        "fee": 6,
        "careem_delivery_fee": 6,
        "merchant_delivery_fee": 6,
        "schedule_delivery_fee": 6,
        "options": "careem",
        "eta_promise_minutes": 35,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 6,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 2.7,
      "driving_distance_localized": "2.7 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30105,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/green-bowl-co-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": false,
      "is_new": false,
      "item_count": 1,
      "link": "careemfood://restaurants/30105?business_type=restaurants&merchant_type=normal",
      "location": "JLT Cluster F",
      "location_localized": "JLT Cluster F",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/green-bowl-co-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Green Bowl Co.",
      "name_localized": "Green Bowl Co.",
      "preparation_time": 15,
      "price": {
        "average": 50,
        "range": "",
        "scale": {
          "value": 2,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.3,
        "average_text": "4.3",
        "count": 410,
        "count_text": "410",
        "state": "default"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30105",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30105?business_type=restaurants&merchant_type=normal",
      "items": [
        {
          "id": 700501,
          "name": "Chicken Caesar Bowl",
          "name_localized": "Chicken Caesar Bowl",
          "description": "Grilled chicken, romaine, parmesan, croutons and Caesar dressing.",
          "description_localized": "Grilled chicken, romaine, parmesan, croutons and Caesar dressing.",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700501.jpg",
          "active": true,
          "price": {
            "discount": 0,
            "discount_percentage": 0,
            "original": 38,
            "total": 38
          }
        }
      ]
    }
  ]
}
```

## Scenario: dish-pizza

`query` containing `pizza` → dish search: Pizza Piazza with both pizzas.

```json match
{
  "query": "~pizza"
}
```

```json response
{
  "page": "food_dish_search",
  "type": "dishes",
  "classifier_status": "ok",
  "restaurants": [
    {
      "_score": 0.86,
      "ads_badge_hidden": true,
      "arc_distance": "1.6 km",
      "arc_distance_localized": "1.6 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130103,
        "name": "Pizza Piazza",
        "name_localized": "Pizza Piazza",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/pizza-piazza.png",
        "link": "careem://food.careem.com/restaurants/brands/130103",
        "brand_media": []
      },
      "brand_id": 130103,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530103,
      "coordinate": {
        "lat": 25.0789,
        "lng": 55.1389
      },
      "cuisines": [
        {
          "id": 8,
          "name": "Italian",
          "name_localized": "Italian",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/italian.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 313,
          "name": "Pizza",
          "name_localized": "Pizza",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/pizza.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 30,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "25 - 35",
        "original_in_minutes": 30,
        "distance": 1600,
        "distance_in_km": 1.6,
        "fee": 5,
        "careem_delivery_fee": 5,
        "merchant_delivery_fee": 5,
        "schedule_delivery_fee": 5,
        "options": "careem",
        "eta_promise_minutes": 35,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 5,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 2.1,
      "driving_distance_localized": "2.1 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30103,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/pizza-piazza-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": false,
      "is_new": false,
      "item_count": 2,
      "link": "careemfood://restaurants/30103?business_type=restaurants&merchant_type=normal",
      "location": "Dubai Marina",
      "location_localized": "Dubai Marina",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/pizza-piazza-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Pizza Piazza",
      "name_localized": "Pizza Piazza",
      "preparation_time": 18,
      "price": {
        "average": 60,
        "range": "",
        "scale": {
          "value": 2,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.5,
        "average_text": "4.5",
        "count": 1540,
        "count_text": "999+",
        "state": "highlight"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30103",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30103?business_type=restaurants&merchant_type=normal",
      "items": [
        {
          "id": 700301,
          "name": "Margherita Pizza",
          "name_localized": "Margherita Pizza",
          "description": "San Marzano tomato, fior di latte mozzarella and fresh basil.",
          "description_localized": "San Marzano tomato, fior di latte mozzarella and fresh basil.",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700301.jpg",
          "active": true,
          "price": {
            "discount": 0,
            "discount_percentage": 0,
            "original": 39,
            "total": 39
          }
        },
        {
          "id": 700302,
          "name": "Pepperoni Pizza",
          "name_localized": "Pepperoni Pizza",
          "description": "Tomato sauce, mozzarella and spicy beef pepperoni.",
          "description_localized": "Tomato sauce, mozzarella and spicy beef pepperoni.",
          "image_url": "https://careem-catalog-media.media.careem.com/food/items/700302.jpg",
          "active": true,
          "price": {
            "discount": 0,
            "discount_percentage": 0,
            "original": 46,
            "total": 46
          }
        }
      ]
    }
  ]
}
```

## Scenario: no-results

`query` containing `xyz` → the classifier cannot decide, falls back to the restaurant branch, which is empty (not an error).

```json match
{
  "query": "~xyz"
}
```

```json response
{
  "page": "food_merchant_search",
  "type": "restaurants",
  "classifier_status": "fallback_default",
  "restaurants": []
}
```

## Scenario: fallback-default

Default: a vague query ("something for lunch") → classifier falls back to a restaurant search (`classifier_status: "fallback_default"`) returning popular nearby merchants without per-merchant dishes.

```json response
{
  "page": "food_merchant_search",
  "type": "restaurants",
  "classifier_status": "fallback_default",
  "restaurants": [
    {
      "_score": 1.0,
      "ads_badge_hidden": true,
      "arc_distance": "0.4 km",
      "arc_distance_localized": "0.4 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130104,
        "name": "Morning Syrniki Café",
        "name_localized": "Morning Syrniki Café",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/morning-syrniki-cafe.png",
        "link": "careem://food.careem.com/restaurants/brands/130104",
        "brand_media": []
      },
      "brand_id": 130104,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530104,
      "coordinate": {
        "lat": 25.0851,
        "lng": 55.1462
      },
      "cuisines": [
        {
          "id": 21,
          "name": "Breakfast",
          "name_localized": "Breakfast",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/breakfast.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 47,
          "name": "Eastern European",
          "name_localized": "Eastern European",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/ukrainian.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 25,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "20 - 30",
        "original_in_minutes": 25,
        "distance": 400,
        "distance_in_km": 0.4,
        "fee": 5,
        "careem_delivery_fee": 5,
        "merchant_delivery_fee": 5,
        "schedule_delivery_fee": 5,
        "options": "careem",
        "eta_promise_minutes": 30,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 5,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 0.5,
      "driving_distance_localized": "0.5 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30104,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": true,
      "is_new": false,
      "item_count": 2,
      "link": "careemfood://restaurants/30104?business_type=restaurants&merchant_type=normal",
      "location": "Dubai Marina",
      "location_localized": "Dubai Marina",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/morning-syrniki-cafe-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Morning Syrniki Café",
      "name_localized": "Morning Syrniki Café",
      "preparation_time": 12,
      "price": {
        "average": 45,
        "range": "",
        "scale": {
          "value": 1,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.8,
        "average_text": "4.8",
        "count": 640,
        "count_text": "640",
        "state": "highlight"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30104",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30104?business_type=restaurants&merchant_type=normal"
    },
    {
      "_score": 0.93,
      "ads_badge_hidden": true,
      "arc_distance": "1.1 km",
      "arc_distance_localized": "1.1 km",
      "availability_details": {
        "is_available": true,
        "title": "Open",
        "subtitle": "Delivering now"
      },
      "brand": {
        "id": 130101,
        "name": "Shawarma Station",
        "name_localized": "Shawarma Station",
        "count": 1,
        "image_url": "https://careem-catalog-media.media.careem.com/food/brands/shawarma-station.png",
        "link": "careem://food.careem.com/restaurants/brands/130101",
        "brand_media": []
      },
      "brand_id": 130101,
      "business_type": "restaurants",
      "busyness": null,
      "closed_status": "open",
      "contract_id": 530101,
      "coordinate": {
        "lat": 25.0812,
        "lng": 55.1405
      },
      "cuisines": [
        {
          "id": 5,
          "name": "Arabic",
          "name_localized": "Arabic",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/arabic.jpg",
          "keywords": null,
          "keywords_localized": null
        },
        {
          "id": 318,
          "name": "Shawarma",
          "name_localized": "Shawarma",
          "image_url": "https://careem-catalog-media.media.careem.com/food/cuisines/shawarma.jpg",
          "keywords": null,
          "keywords_localized": null
        }
      ],
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
      "delivery": {
        "average": 25,
        "unit": "min",
        "unit_localized": "mins",
        "source": "eta_service",
        "range": "20 - 30",
        "original_in_minutes": 25,
        "distance": 1100,
        "distance_in_km": 1.1,
        "fee": 7,
        "careem_delivery_fee": 7,
        "merchant_delivery_fee": 7,
        "schedule_delivery_fee": 7,
        "options": "careem",
        "eta_promise_minutes": 30,
        "pricing_tag": null,
        "delivery_method": "on_demand",
        "ddf_title": "Delivery fees are based on distance",
        "ddf_message": "Fees are calculated based on how far the Captain travels.",
        "eta_color_state": "default",
        "discounted_fee": 7,
        "discount": 0,
        "discount_tag": ""
      },
      "delivery_type": "careem",
      "delivery_visibility": "visible",
      "driving_distance": 1.4,
      "driving_distance_localized": "1.4 km",
      "has_items": true,
      "highlighted_text": null,
      "id": 30101,
      "image_url": "https://careem-catalog-media.media.careem.com/food/restaurants/shawarma-station-hero.jpg",
      "is_careem_delivery_supported": true,
      "is_favourite": false,
      "is_new": false,
      "item_count": 3,
      "link": "careemfood://restaurants/30101?business_type=restaurants&merchant_type=normal",
      "location": "Dubai Marina",
      "location_localized": "Dubai Marina",
      "logo_url": "https://careem-catalog-media.media.careem.com/food/restaurants/shawarma-station-logo.png",
      "merchant_sub_text": [],
      "merchant_type": "normal",
      "min_order": 0,
      "name": "Shawarma Station",
      "name_localized": "Shawarma Station",
      "preparation_time": 12,
      "price": {
        "average": 35,
        "range": "",
        "scale": {
          "value": 1,
          "upper_bound": 3
        }
      },
      "promotions": [],
      "rating": {
        "average": 4.6,
        "average_text": "4.6",
        "count": 2310,
        "count_text": "999+",
        "state": "highlight"
      },
      "restaurant_link": "careem://food.careem.com/restaurants/30101",
      "superapp_link": "careem://now.careem.com/shops/restaurants/30101?business_type=restaurants&merchant_type=normal"
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
  "description": "Search food with one query. The search service decides whether the user is looking for a dish or a restaurant and returns matching restaurants with their relevant items.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "ads_disabled": {
        "type": "boolean"
      },
      "avr_rating": {
        "type": "string"
      },
      "careem_plus": {
        "type": "boolean"
      },
      "city_id": {
        "description": "city ID for scoping results",
        "type": "string"
      },
      "cuisine_ids": {
        "type": "string"
      },
      "delivery_distance": {
        "description": "distance range in km",
        "type": "string"
      },
      "delivery_time": {
        "type": "integer"
      },
      "exclude_busy": {
        "type": "boolean"
      },
      "items_limit": {
        "type": "integer"
      },
      "latitude": {
        "description": "user's current location latitude",
        "type": "number"
      },
      "limit": {
        "type": "integer"
      },
      "longitude": {
        "description": "user's current location longitude",
        "type": "number"
      },
      "offer_type": {
        "type": "string"
      },
      "offset": {
        "type": "integer"
      },
      "page": {
        "type": "integer"
      },
      "price": {
        "type": "string"
      },
      "promotions_ids": {
        "type": "string"
      },
      "promotions_percentage": {
        "type": "string"
      },
      "promotions_promo_code": {
        "type": "string"
      },
      "query": {
        "description": "the complete food search query",
        "type": "string"
      },
      "search_tab": {
        "description": "optional explicit tab override: dishes | restaurants; omit to classify automatically",
        "type": "string"
      },
      "sort": {
        "description": "recommended | delivery_time | nearby | rating | price",
        "type": "string"
      },
      "tag_ids": {
        "type": "string"
      },
      "view": {
        "type": "string"
      }
    },
    "required": [
      "query",
      "latitude",
      "longitude"
    ],
    "type": "object"
  },
  "name": "food_dynamic_search",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "classifier_status": {
        "type": "string"
      },
      "error": {
        "type": "string"
      },
      "page": {
        "type": "string"
      },
      "restaurants": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "_score": {
              "type": "number"
            },
            "ads_badge_hidden": {
              "type": "boolean"
            },
            "arc_distance": {
              "type": "string"
            },
            "arc_distance_localized": {
              "type": "string"
            },
            "availability_details": {
              "additionalProperties": false,
              "properties": {
                "is_available": {
                  "type": "boolean"
                },
                "scheduling": {
                  "additionalProperties": false,
                  "properties": {
                    "requested_slot": {
                      "additionalProperties": false,
                      "properties": {
                        "end": {
                          "type": "string"
                        },
                        "is_available": {
                          "type": "boolean"
                        },
                        "start": {
                          "type": "string"
                        },
                        "subtitle": {
                          "type": "string"
                        },
                        "title": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "start",
                        "end",
                        "is_available",
                        "title",
                        "subtitle"
                      ],
                      "type": "object"
                    }
                  },
                  "required": [
                    "requested_slot"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "subtitle": {
                  "type": "string"
                },
                "title": {
                  "type": "string"
                }
              },
              "required": [
                "is_available",
                "title",
                "subtitle"
              ],
              "type": "object"
            },
            "brand": {
              "additionalProperties": false,
              "properties": {
                "brand_media": {
                  "items": {
                    "type": "string"
                  },
                  "type": [
                    "null",
                    "array"
                  ]
                },
                "count": {
                  "maximum": 2147483647,
                  "minimum": -2147483648,
                  "type": "integer"
                },
                "id": {
                  "type": "integer"
                },
                "image_url": {
                  "type": "string"
                },
                "link": {
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
                "name",
                "name_localized",
                "count",
                "image_url",
                "link"
              ],
              "type": "object"
            },
            "brand_id": {
              "type": "integer"
            },
            "business_type": {
              "type": "string"
            },
            "busyness": {
              "type": [
                "null",
                "string"
              ]
            },
            "closed_status": {
              "type": "string"
            },
            "contract_id": {
              "type": "integer"
            },
            "coordinate": {
              "additionalProperties": false,
              "properties": {
                "lat": {
                  "type": "number"
                },
                "lng": {
                  "type": "number"
                }
              },
              "required": [
                "lat",
                "lng"
              ],
              "type": "object"
            },
            "cuisines": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "integer"
                  },
                  "image_url": {
                    "type": "string"
                  },
                  "keywords": {
                    "type": [
                      "null",
                      "string"
                    ]
                  },
                  "keywords_localized": {
                    "type": [
                      "null",
                      "string"
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
                  "image_url",
                  "keywords",
                  "keywords_localized"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
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
            "delivery": {
              "additionalProperties": false,
              "properties": {
                "average": {
                  "maximum": 2147483647,
                  "minimum": -2147483648,
                  "type": "integer"
                },
                "careem_delivery_fee": {
                  "type": "number"
                },
                "ddf_message": {
                  "type": "string"
                },
                "ddf_title": {
                  "type": "string"
                },
                "delivery_method": {
                  "type": "string"
                },
                "discount": {
                  "type": "number"
                },
                "discount_tag": {
                  "type": "string"
                },
                "discounted_fee": {
                  "type": "number"
                },
                "distance": {
                  "maximum": 2147483647,
                  "minimum": -2147483648,
                  "type": "integer"
                },
                "distance_in_km": {
                  "type": "number"
                },
                "eta_color_state": {
                  "type": "string"
                },
                "eta_promise_minutes": {
                  "maximum": 2147483647,
                  "minimum": -2147483648,
                  "type": "integer"
                },
                "fee": {
                  "type": "number"
                },
                "merchant_delivery_fee": {
                  "type": "number"
                },
                "options": {
                  "type": "string"
                },
                "original_in_minutes": {
                  "maximum": 2147483647,
                  "minimum": -2147483648,
                  "type": "integer"
                },
                "pricing_tag": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "range": {
                  "type": "string"
                },
                "schedule_delivery_fee": {
                  "type": "number"
                },
                "source": {
                  "type": "string"
                },
                "unit": {
                  "type": "string"
                },
                "unit_localized": {
                  "type": "string"
                }
              },
              "required": [
                "average",
                "unit",
                "unit_localized",
                "source",
                "range",
                "original_in_minutes",
                "distance",
                "fee",
                "options",
                "careem_delivery_fee",
                "merchant_delivery_fee",
                "eta_promise_minutes",
                "pricing_tag",
                "distance_in_km",
                "delivery_method",
                "schedule_delivery_fee",
                "ddf_title",
                "ddf_message",
                "eta_color_state",
                "discounted_fee",
                "discount",
                "discount_tag"
              ],
              "type": "object"
            },
            "delivery_type": {
              "type": "string"
            },
            "delivery_visibility": {
              "type": "string"
            },
            "delivery_zones": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "eta_promise_minutes": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": [
                      "null",
                      "integer"
                    ]
                  },
                  "id": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "zone_id": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "zone_type": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "zone_id",
                  "zone_type",
                  "eta_promise_minutes"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
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
                    "type": "string"
                  },
                  "name": {
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
                      "original",
                      "discount",
                      "total",
                      "discount_percentage"
                    ],
                    "type": "object"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "price",
                  "active"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "driving_distance": {
              "type": [
                "null",
                "number"
              ]
            },
            "driving_distance_localized": {
              "type": [
                "null",
                "string"
              ]
            },
            "has_items": {
              "type": "boolean"
            },
            "highlighted_text": {
              "type": [
                "null",
                "string"
              ]
            },
            "id": {
              "type": "integer"
            },
            "image_url": {
              "type": "string"
            },
            "is_careem_delivery_supported": {
              "type": "boolean"
            },
            "is_favourite": {
              "type": "boolean"
            },
            "is_new": {
              "type": "boolean"
            },
            "item_count": {
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
                        "active": {
                          "type": "boolean"
                        },
                        "description": {
                          "type": "string"
                        },
                        "description_localized": {
                          "type": "string"
                        },
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
                              "active": {
                                "type": "boolean"
                              },
                              "groups": {
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
                                          "active": {
                                            "type": "boolean"
                                          },
                                          "id": {
                                            "type": "integer"
                                          },
                                          "item": {
                                            "type": "string"
                                          },
                                          "item_localized": {
                                            "type": "string"
                                          },
                                          "master_product_id": {
                                            "type": [
                                              "null",
                                              "string"
                                            ]
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
                                              "original",
                                              "discount",
                                              "total",
                                              "discount_percentage"
                                            ],
                                            "type": "object"
                                          }
                                        },
                                        "required": [
                                          "id",
                                          "master_product_id",
                                          "item",
                                          "item_localized",
                                          "active",
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
                                    "description",
                                    "description_localized",
                                    "multi_select",
                                    "min",
                                    "max",
                                    "active",
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
                              "item": {
                                "type": "string"
                              },
                              "item_localized": {
                                "type": "string"
                              },
                              "master_product_id": {
                                "type": [
                                  "null",
                                  "string"
                                ]
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
                                  "original",
                                  "discount",
                                  "total",
                                  "discount_percentage"
                                ],
                                "type": "object"
                              }
                            },
                            "required": [
                              "id",
                              "master_product_id",
                              "item",
                              "item_localized",
                              "active",
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
                        "description",
                        "description_localized",
                        "multi_select",
                        "min",
                        "max",
                        "active",
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
                      "original",
                      "discount",
                      "total",
                      "discount_percentage"
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
                  "active"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "link": {
              "type": "string"
            },
            "location": {
              "type": "string"
            },
            "location_localized": {
              "type": "string"
            },
            "logo_url": {
              "type": "string"
            },
            "merchant_sub_text": true,
            "merchant_type": {
              "type": "string"
            },
            "min_order": {
              "maximum": 2147483647,
              "minimum": -2147483648,
              "type": "integer"
            },
            "name": {
              "type": "string"
            },
            "name_localized": {
              "type": "string"
            },
            "preparation_time": {
              "maximum": 2147483647,
              "minimum": -2147483648,
              "type": "integer"
            },
            "price": {
              "additionalProperties": false,
              "properties": {
                "average": {
                  "type": "number"
                },
                "range": {
                  "type": "string"
                },
                "scale": {
                  "additionalProperties": false,
                  "properties": {
                    "upper_bound": {
                      "maximum": 2147483647,
                      "minimum": -2147483648,
                      "type": "integer"
                    },
                    "value": {
                      "maximum": 2147483647,
                      "minimum": -2147483648,
                      "type": "integer"
                    }
                  },
                  "required": [
                    "value",
                    "upper_bound"
                  ],
                  "type": "object"
                }
              },
              "required": [
                "average",
                "range",
                "scale"
              ],
              "type": "object"
            },
            "promotions": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "active": {
                    "type": "boolean"
                  },
                  "badge_type": {
                    "type": "string"
                  },
                  "cap": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "creation_user_type": {
                    "type": "string"
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
                  "internal_subsidize": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "is_auto_applied": {
                    "type": "boolean"
                  },
                  "is_card_series_based": {
                    "type": "boolean"
                  },
                  "min_basket_value": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "offer_type": {
                    "type": "string"
                  },
                  "offer_value": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "partner_contribution": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "percentage": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "promo_code": {
                    "type": [
                      "null",
                      "string"
                    ]
                  },
                  "subtitle": {
                    "type": "string"
                  },
                  "terms": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "term": {
                          "type": "string"
                        },
                        "term_localized": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "term",
                        "term_localized"
                      ],
                      "type": "object"
                    },
                    "type": [
                      "null",
                      "array"
                    ]
                  },
                  "text": {
                    "type": "string"
                  },
                  "text_attributes": {
                    "type": [
                      "null",
                      "string"
                    ]
                  },
                  "text_localized": {
                    "type": "string"
                  },
                  "title": {
                    "type": "string"
                  },
                  "total_percentage": {
                    "maximum": 2147483647,
                    "minimum": -2147483648,
                    "type": "integer"
                  },
                  "type": {
                    "type": "string"
                  },
                  "whitelist_items": {
                    "items": true,
                    "type": [
                      "null",
                      "array"
                    ]
                  }
                },
                "required": [
                  "id",
                  "active",
                  "promo_code",
                  "percentage",
                  "total_percentage",
                  "internal_subsidize",
                  "cap",
                  "text",
                  "text_localized",
                  "badge_type",
                  "is_auto_applied",
                  "type",
                  "creation_user_type",
                  "offer_type",
                  "offer_value",
                  "partner_contribution",
                  "image_url",
                  "min_basket_value",
                  "text_attributes",
                  "title",
                  "subtitle",
                  "is_card_series_based"
                ],
                "type": "object"
              },
              "type": [
                "null",
                "array"
              ]
            },
            "rating": {
              "additionalProperties": false,
              "properties": {
                "average": {
                  "type": "number"
                },
                "average_text": {
                  "type": "string"
                },
                "count": {
                  "type": "integer"
                },
                "count_text": {
                  "type": "string"
                },
                "state": {
                  "type": "string"
                }
              },
              "required": [
                "average",
                "average_text",
                "count",
                "count_text",
                "state"
              ],
              "type": "object"
            },
            "restaurant_link": {
              "type": "string"
            },
            "superapp_link": {
              "type": "string"
            },
            "tags": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "global": {
                    "type": "boolean"
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
                  "keywords": {
                    "type": [
                      "null",
                      "string"
                    ]
                  },
                  "keywords_localized": {
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
                  "old_id": {
                    "type": [
                      "null",
                      "integer"
                    ]
                  },
                  "type": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "old_id",
                  "name",
                  "name_localized",
                  "link",
                  "image_url",
                  "global",
                  "keywords",
                  "keywords_localized",
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
            "id",
            "name",
            "name_localized",
            "link",
            "superapp_link",
            "restaurant_link",
            "location",
            "location_localized",
            "coordinate",
            "arc_distance",
            "arc_distance_localized",
            "min_order",
            "currency",
            "rating",
            "image_url",
            "logo_url",
            "price",
            "delivery",
            "delivery_type",
            "preparation_time",
            "contract_id",
            "business_type",
            "busyness",
            "merchant_type",
            "is_careem_delivery_supported",
            "item_count",
            "delivery_visibility",
            "closed_status",
            "has_items",
            "brand",
            "is_new",
            "brand_id",
            "_score",
            "merchant_sub_text",
            "highlighted_text",
            "ads_badge_hidden",
            "availability_details",
            "driving_distance",
            "driving_distance_localized",
            "is_favourite"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "type": {
        "type": "string"
      }
    },
    "required": [
      "page",
      "type",
      "classifier_status",
      "restaurants"
    ],
    "type": "object"
  },
  "title": "Food Search"
}
```
