---
tool: get_activities
domain: user
---

# get_activities

Leo's activity feed from one upstream page
(GetActivities ok), 35 per page:
past — ride `ride_0999` (yesterday), Careem Shops order `order_9201` from Marina Fresh
Market (2 days ago) and food order `order_8001` (3 days ago); upcoming — scheduled Business
ride `ride_1002` to DXB T3; ongoing — booked ride `ride_1001`, Quik order
`order_9002` and Careem Box delivery `box_7001` (Home → Work). Past activities page:
`paging.next_cursor` `cursor_page2` returns two older food orders (`order_8000`,
`order_7999`). Status/type filters return the matching subset.

The scenario matches one filter at a time (type before status), so combined filters other than
`past` + `groceries` (→ `nothing-matches`) return the single-filter answer. `next_cursor`
containing `trigger_upstream_down` (magic trigger) forces `upstream-unavailable`.

## Scenario: invalid-status

`activity_status: cancelled` — not a supported status.

```json match
{
  "activity_status": "cancelled"
}
```

```json response
{
  "page": "get_activities",
  "error": "invalid activity_status \"cancelled\": must be one of past, upcoming, ongoing, or omit for all"
}
```

## Scenario: invalid-type

`activity_type` containing `taxi` — stands in for any unsupported vertical.

```json match
{
  "activity_type": "~taxi"
}
```

```json response
{
  "page": "get_activities",
  "error": "invalid activity_type \"{{args.activity_type}}\": must be one of ride, food, groceries, shops, delivery, or omit for all"
}
```

## Scenario: upstream-unavailable

`next_cursor` containing `trigger_upstream_down` (magic trigger): upstream answers 503 with a
JSON `message`.

```json match
{
  "next_cursor": "~trigger_upstream_down"
}
```

```json response
{
  "page": "get_activities",
  "error": "upstream service error: upstream temporarily unavailable"
}
```

## Scenario: next-page

`next_cursor: cursor_page2` — the second page of past activities: two older food orders,
no further page.

```json match
{
  "next_cursor": "cursor_page2"
}
```

```json response
{
  "page": "get_activities",
  "past_activities": [
    {
      "id": "act_food_8000",
      "provider_id": 1,
      "provider": "careem-food",
      "type": "food",
      "reference_id": "order_8000",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "activity_time": "{{now-240h}}",
      "created_at": "{{now-240h}}",
      "updated_at": "{{now-240h}}",
      "data": {
        "status": "DELIVERED",
        "merchant_id": 30101,
        "merchant_name": "Shawarma Station",
        "care_deep_link": "careem://care.careem.com/reportProblem?orderId=order_8000",
        "payment_type": "CARD",
        "completed_at": {{unixms-240h}},
        "items": [
          {
            "item_id": 700101,
            "name": "Chicken Shawarma Wrap",
            "quantity": 2,
            "amount": 36
          },
          {
            "item_id": 700102,
            "name": "Falafel Plate",
            "quantity": 1,
            "amount": 22
          }
        ],
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "65.00"
      },
      "presentation_data": {
        "title": "Shawarma Station",
        "subtitle": "2x Chicken Shawarma Wrap, 1x Falafel Plate",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/food.png",
        "trailing": "AED 65.00",
        "thirdline": "Delivered to Home"
      }
    },
    {
      "id": "act_food_7999",
      "provider_id": 1,
      "provider": "careem-food",
      "type": "food",
      "reference_id": "order_7999",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "activity_time": "{{now-336h}}",
      "created_at": "{{now-336h}}",
      "updated_at": "{{now-336h}}",
      "data": {
        "status": "DELIVERED",
        "merchant_id": 30103,
        "merchant_name": "Pizza Piazza",
        "care_deep_link": "careem://care.careem.com/reportProblem?orderId=order_7999",
        "payment_type": "CARD",
        "completed_at": {{unixms-336h}},
        "items": [
          {
            "item_id": 700301,
            "name": "Margherita Pizza",
            "quantity": 1,
            "amount": 39
          },
          {
            "item_id": 700302,
            "name": "Pepperoni Pizza",
            "quantity": 1,
            "amount": 46
          }
        ],
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "90.00"
      },
      "presentation_data": {
        "title": "Pizza Piazza",
        "subtitle": "1x Margherita Pizza, 1x Pepperoni Pizza",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/food.png",
        "trailing": "AED 90.00",
        "thirdline": "Delivered to Home"
      }
    }
  ],
  "paging": {}
}
```

## Scenario: nothing-matches

`activity_status: past` + `activity_type: groceries` — Leo has no past Quik orders (his past
`order_9201` is a Careem Shops order), so every bucket is empty and omitted.

```json match
{
  "activity_status": "past",
  "activity_type": "groceries"
}
```

```json response
{
  "page": "get_activities",
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: rides-only

`activity_type: ride`.

```json match
{
  "activity_type": "ride"
}
```

```json response
{
  "page": "get_activities",
  "past_activities": [
    {
      "id": "act_ride_0999",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_0999",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "data": {
        "status": "COMPLETED",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=ride_0999&provider_id=16&partner=rides",
        "pickup_location": {
          "name": "Work",
          "locationUuid": "LOC-50002",
          "latitude": 25.2172,
          "longitude": 55.2826,
          "addressDetails": {
            "buildingName": "Emirates Towers",
            "area": "Sheikh Zayed Rd",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Emirates Towers, Sheikh Zayed Rd",
            "savedName": "Work"
          }
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "captain": {
          "id": 7001,
          "name": "Ahmed K.",
          "rating": "4.92",
          "picture_url": "https://careem-catalog-media.media.careem.com/captains/ahmed.png",
          "contact_info": {
            "phone_number": "+971500000000"
          },
          "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "color": "White",
            "license_plate": "DXB K 48213",
            "vehicle_type": "SEDAN"
          }
        },
        "distance": 21.4,
        "duration": 1680,
        "pickup_time": {{unixms-26h}},
        "dropoff_time": {{unixms-25h}},
        "trip": {
          "id": 10999
        },
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Electric"
        },
        "rating": 5
      },
      "pricing": {
        "currency": "AED",
        "total_price": "38.00"
      },
      "activity_time": "{{now-26h}}",
      "presentation_data": {
        "title": "Ride to Home",
        "subtitle": "Emirates Towers → Marina Gate 1",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 38.00"
      },
      "created_at": "{{now-26h}}",
      "updated_at": "{{now-25h}}"
    }
  ],
  "upcoming_activities": [
    {
      "id": "act_ride_1002",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_1002",
      "user_id": 900000001,
      "status": "scheduled",
      "country": "AE",
      "data": {
        "status": "SCHEDULED",
        "pickup_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "dropoff_location": {
          "name": "Dubai International Airport T3",
          "latitude": 25.2528,
          "longitude": 55.3644,
          "addressDetails": {
            "placeName": "Dubai International Airport T3",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Dubai International Airport T3"
          }
        },
        "pickup_time": {{unixms+20h}},
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Executive"
        },
        "pricing_extras": {
          "price_low": "85.00",
          "price_high": "95.00"
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "89.00"
      },
      "activity_time": "{{now+20h}}",
      "presentation_data": {
        "title": "Scheduled Business ride to DXB T3",
        "subtitle": "Tomorrow, pickup from Home",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 89.00"
      },
      "created_at": "{{now-2h}}",
      "updated_at": "{{now-2h}}"
    }
  ],
  "ongoing_activities": [
    {
      "id": "act_ride_1001",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_1001",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "data": {
        "status": "CAPTAIN_ON_THE_WAY",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=ride_1001&provider_id=16&partner=rides",
        "pickup_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "dropoff_location": {
          "name": "Dubai Mall",
          "latitude": 25.1972,
          "longitude": 55.2796,
          "addressDetails": {
            "placeName": "Dubai Mall",
            "area": "Downtown Dubai",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Dubai Mall, Downtown Dubai"
          }
        },
        "estimate": {
          "duration": 1320,
          "distance": 17.8
        },
        "captain": {
          "id": 7001,
          "name": "Ahmed K.",
          "rating": "4.92",
          "picture_url": "https://careem-catalog-media.media.careem.com/captains/ahmed.png",
          "contact_info": {
            "phone_number": "+971500000000"
          },
          "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "color": "White",
            "license_plate": "DXB K 48213",
            "vehicle_type": "SEDAN"
          }
        },
        "pickup_time": {{unixms+4m}},
        "trip": {
          "id": 11001
        },
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Comfort"
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "49.00"
      },
      "activity_time": "{{now-5m}}",
      "presentation_data": {
        "title": "Comfort to Dubai Mall",
        "subtitle": "Captain Ahmed K. arrives in 4 min",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 49.00",
        "thirdline": "White Toyota Camry · DXB K 48213"
      },
      "created_at": "{{now-5m}}",
      "updated_at": "{{now-1m}}"
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: food-only

`activity_type: food`.

```json match
{
  "activity_type": "food"
}
```

```json response
{
  "page": "get_activities",
  "past_activities": [
    {
      "id": "act_food_8001",
      "provider_id": 1,
      "provider": "careem-food",
      "type": "food",
      "reference_id": "order_8001",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "data": {
        "status": "DELIVERED",
        "merchant_id": 30104,
        "merchant_name": "Morning Syrniki Café",
        "care_deep_link": "careem://care.careem.com/reportProblem?orderId=order_8001",
        "payment_type": "CARD",
        "completed_at": {{unixms-72h}},
        "items": [
          {
            "item_id": 700401,
            "name": "Classic Syrniki with Sour Cream",
            "quantity": 2,
            "amount": 68
          },
          {
            "item_id": 700402,
            "name": "Cappuccino",
            "quantity": 1,
            "amount": 19
          }
        ],
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "87.00"
      },
      "activity_time": "{{now-72h}}",
      "presentation_data": {
        "title": "Morning Syrniki Café",
        "subtitle": "2x Classic Syrniki with Sour Cream, 1x Cappuccino",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/food.png",
        "trailing": "AED 87.00",
        "thirdline": "Delivered to Home"
      },
      "created_at": "{{now-72h}}",
      "updated_at": "{{now-72h}}"
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: groceries-only

`activity_type: groceries` — the ongoing Quik order only (`merchant_type: ufd`).

```json match
{
  "activity_type": "groceries"
}
```

```json response
{
  "page": "get_activities",
  "ongoing_activities": [
    {
      "id": "act_groc_9002",
      "provider_id": 3,
      "provider": "careem-grocery",
      "type": "groceries",
      "reference_id": "order_9002",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "data": {
        "status": "ON_THE_WAY",
        "basket_id": 6000002,
        "brand_id": 40000,
        "merchant_id": 40001,
        "merchant_name": "Careem Quik Dubai Marina",
        "merchant_type": "ufd",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=order_9002&provider_id=3&partner=shops",
        "payment_type": "WALLET",
        "items": [
          {
            "item_id": 4000101,
            "name": "Fresh Farm Full Cream Milk 1L",
            "quantity": 2,
            "amount": 13.5
          },
          {
            "item_id": 4000102,
            "name": "Free Range Eggs 12pk",
            "quantity": 1,
            "amount": 14.5
          },
          {
            "item_id": 4000103,
            "name": "Sourdough Loaf",
            "quantity": 1,
            "amount": 12
          }
        ],
        "order_delivery": {
          "type": "CAREEM",
          "eta": 9
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "45.50"
      },
      "activity_time": "{{now-6m}}",
      "presentation_data": {
        "title": "Careem Quik",
        "subtitle": "Fresh Farm Full Cream Milk 1L, Free Range Eggs 12pk, Sourdough Loaf",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/quik.png",
        "trailing": "AED 45.50",
        "thirdline": "Arriving in 9 min"
      },
      "created_at": "{{now-6m}}",
      "updated_at": "{{now-2m}}"
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: shops-only

`activity_type: shops` — the Careem Shops order from Marina Fresh Market (upstream type
`groceries`, `merchant_type: retail`, normalised to `shops`).

```json match
{
  "activity_type": "shops"
}
```

```json response
{
  "page": "get_activities",
  "past_activities": [
    {
      "id": "act_shops_9201",
      "provider_id": 3,
      "provider": "careem-grocery",
      "type": "shops",
      "reference_id": "order_9201",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "activity_time": "{{now-48h}}",
      "created_at": "{{now-48h}}",
      "updated_at": "{{now-47h}}",
      "data": {
        "status": "DELIVERED",
        "basket_id": 6000101,
        "brand_id": 40100,
        "merchant_id": 40101,
        "merchant_name": "Marina Fresh Market",
        "merchant_type": "retail",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=order_9201&provider_id=3&partner=shops",
        "payment_type": "WALLET",
        "completed_at": {{unixms-48h}},
        "items": [
          {
            "item_id": 4010101,
            "name": "Organic Full Cream Milk 1L",
            "quantity": 2,
            "amount": 17
          },
          {
            "item_id": 4010103,
            "name": "Ginger Kombucha 330ml",
            "quantity": 2,
            "amount": 28
          }
        ],
        "order_delivery": {
          "type": "CAREEM",
          "eta": 35
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "52.00"
      },
      "presentation_data": {
        "title": "Marina Fresh Market",
        "subtitle": "2x Organic Full Cream Milk 1L, 2x Ginger Kombucha 330ml",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/shops.png",
        "trailing": "AED 52.00",
        "thirdline": "Delivered to Home"
      }
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: delivery-only

`activity_type: delivery` — the ongoing Careem Box delivery, with the default Help Center
`care_deep_link` filled in.

```json match
{
  "activity_type": "delivery"
}
```

```json response
{
  "page": "get_activities",
  "ongoing_activities": [
    {
      "id": "act_box_7001",
      "provider_id": 52,
      "provider": "careem-delivery",
      "type": "delivery",
      "reference_id": "box_7001",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "activity_time": "{{now-12m}}",
      "created_at": "{{now-12m}}",
      "updated_at": "{{now-3m}}",
      "data": {
        "status": "PICKED_UP",
        "business_type": "SEND",
        "comment": "Please call on arrival",
        "payment_type": "CASH",
        "captain_name": "Khalid M.",
        "captain_phone": "+971500000021",
        "items": [
          {
            "name": "Documents",
            "quantity": 1
          }
        ],
        "order_delivery": {
          "type": "BIKE",
          "eta": 18
        },
        "pricing_break_through_detail": [
          {
            "key": "delivery_fee",
            "name": "Delivery fee",
            "amount": 22,
            "is_discount": false
          }
        ],
        "pickup": {
          "name": "Marina Gate 1, Dubai Marina",
          "nickname": "Home",
          "building": "Marina Gate 1",
          "location_identifier": "LOC-50001"
        },
        "dropOff": {
          "name": "Emirates Towers, Sheikh Zayed Rd",
          "nickname": "Work",
          "building": "Emirates Towers",
          "location_identifier": "LOC-50002"
        },
        "care_deep_link": "careem://care.careem.com/issueTypes?activity_id=box_7001&source_miniapp=com.careem.delivery"
      },
      "pricing": {
        "currency": "AED",
        "total_price": "22.00"
      },
      "presentation_data": {
        "title": "Careem Box",
        "subtitle": "Home → Work",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/box.png",
        "trailing": "AED 22.00",
        "thirdline": "Arriving in 18 min"
      }
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: ongoing-only

`activity_status: ongoing`.

```json match
{
  "activity_status": "ongoing"
}
```

```json response
{
  "page": "get_activities",
  "ongoing_activities": [
    {
      "id": "act_ride_1001",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_1001",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "data": {
        "status": "CAPTAIN_ON_THE_WAY",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=ride_1001&provider_id=16&partner=rides",
        "pickup_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "dropoff_location": {
          "name": "Dubai Mall",
          "latitude": 25.1972,
          "longitude": 55.2796,
          "addressDetails": {
            "placeName": "Dubai Mall",
            "area": "Downtown Dubai",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Dubai Mall, Downtown Dubai"
          }
        },
        "estimate": {
          "duration": 1320,
          "distance": 17.8
        },
        "captain": {
          "id": 7001,
          "name": "Ahmed K.",
          "rating": "4.92",
          "picture_url": "https://careem-catalog-media.media.careem.com/captains/ahmed.png",
          "contact_info": {
            "phone_number": "+971500000000"
          },
          "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "color": "White",
            "license_plate": "DXB K 48213",
            "vehicle_type": "SEDAN"
          }
        },
        "pickup_time": {{unixms+4m}},
        "trip": {
          "id": 11001
        },
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Comfort"
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "49.00"
      },
      "activity_time": "{{now-5m}}",
      "presentation_data": {
        "title": "Comfort to Dubai Mall",
        "subtitle": "Captain Ahmed K. arrives in 4 min",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 49.00",
        "thirdline": "White Toyota Camry · DXB K 48213"
      },
      "created_at": "{{now-5m}}",
      "updated_at": "{{now-1m}}"
    },
    {
      "id": "act_groc_9002",
      "provider_id": 3,
      "provider": "careem-grocery",
      "type": "groceries",
      "reference_id": "order_9002",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "data": {
        "status": "ON_THE_WAY",
        "basket_id": 6000002,
        "brand_id": 40000,
        "merchant_id": 40001,
        "merchant_name": "Careem Quik Dubai Marina",
        "merchant_type": "ufd",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=order_9002&provider_id=3&partner=shops",
        "payment_type": "WALLET",
        "items": [
          {
            "item_id": 4000101,
            "name": "Fresh Farm Full Cream Milk 1L",
            "quantity": 2,
            "amount": 13.5
          },
          {
            "item_id": 4000102,
            "name": "Free Range Eggs 12pk",
            "quantity": 1,
            "amount": 14.5
          },
          {
            "item_id": 4000103,
            "name": "Sourdough Loaf",
            "quantity": 1,
            "amount": 12
          }
        ],
        "order_delivery": {
          "type": "CAREEM",
          "eta": 9
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "45.50"
      },
      "activity_time": "{{now-6m}}",
      "presentation_data": {
        "title": "Careem Quik",
        "subtitle": "Fresh Farm Full Cream Milk 1L, Free Range Eggs 12pk, Sourdough Loaf",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/quik.png",
        "trailing": "AED 45.50",
        "thirdline": "Arriving in 9 min"
      },
      "created_at": "{{now-6m}}",
      "updated_at": "{{now-2m}}"
    },
    {
      "id": "act_box_7001",
      "provider_id": 52,
      "provider": "careem-delivery",
      "type": "delivery",
      "reference_id": "box_7001",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "activity_time": "{{now-12m}}",
      "created_at": "{{now-12m}}",
      "updated_at": "{{now-3m}}",
      "data": {
        "status": "PICKED_UP",
        "business_type": "SEND",
        "comment": "Please call on arrival",
        "payment_type": "CASH",
        "captain_name": "Khalid M.",
        "captain_phone": "+971500000021",
        "items": [
          {
            "name": "Documents",
            "quantity": 1
          }
        ],
        "order_delivery": {
          "type": "BIKE",
          "eta": 18
        },
        "pricing_break_through_detail": [
          {
            "key": "delivery_fee",
            "name": "Delivery fee",
            "amount": 22,
            "is_discount": false
          }
        ],
        "pickup": {
          "name": "Marina Gate 1, Dubai Marina",
          "nickname": "Home",
          "building": "Marina Gate 1",
          "location_identifier": "LOC-50001"
        },
        "dropOff": {
          "name": "Emirates Towers, Sheikh Zayed Rd",
          "nickname": "Work",
          "building": "Emirates Towers",
          "location_identifier": "LOC-50002"
        },
        "care_deep_link": "careem://care.careem.com/issueTypes?activity_id=box_7001&source_miniapp=com.careem.delivery"
      },
      "pricing": {
        "currency": "AED",
        "total_price": "22.00"
      },
      "presentation_data": {
        "title": "Careem Box",
        "subtitle": "Home → Work",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/box.png",
        "trailing": "AED 22.00",
        "thirdline": "Arriving in 18 min"
      }
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: upcoming-only

`activity_status: upcoming`.

```json match
{
  "activity_status": "upcoming"
}
```

```json response
{
  "page": "get_activities",
  "upcoming_activities": [
    {
      "id": "act_ride_1002",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_1002",
      "user_id": 900000001,
      "status": "scheduled",
      "country": "AE",
      "data": {
        "status": "SCHEDULED",
        "pickup_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "dropoff_location": {
          "name": "Dubai International Airport T3",
          "latitude": 25.2528,
          "longitude": 55.3644,
          "addressDetails": {
            "placeName": "Dubai International Airport T3",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Dubai International Airport T3"
          }
        },
        "pickup_time": {{unixms+20h}},
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Executive"
        },
        "pricing_extras": {
          "price_low": "85.00",
          "price_high": "95.00"
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "89.00"
      },
      "activity_time": "{{now+20h}}",
      "presentation_data": {
        "title": "Scheduled Business ride to DXB T3",
        "subtitle": "Tomorrow, pickup from Home",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 89.00"
      },
      "created_at": "{{now-2h}}",
      "updated_at": "{{now-2h}}"
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: past-only

`activity_status: past` (the Careem Pay top-up is filtered out).

```json match
{
  "activity_status": "past"
}
```

```json response
{
  "page": "get_activities",
  "past_activities": [
    {
      "id": "act_ride_0999",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_0999",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "data": {
        "status": "COMPLETED",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=ride_0999&provider_id=16&partner=rides",
        "pickup_location": {
          "name": "Work",
          "locationUuid": "LOC-50002",
          "latitude": 25.2172,
          "longitude": 55.2826,
          "addressDetails": {
            "buildingName": "Emirates Towers",
            "area": "Sheikh Zayed Rd",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Emirates Towers, Sheikh Zayed Rd",
            "savedName": "Work"
          }
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "captain": {
          "id": 7001,
          "name": "Ahmed K.",
          "rating": "4.92",
          "picture_url": "https://careem-catalog-media.media.careem.com/captains/ahmed.png",
          "contact_info": {
            "phone_number": "+971500000000"
          },
          "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "color": "White",
            "license_plate": "DXB K 48213",
            "vehicle_type": "SEDAN"
          }
        },
        "distance": 21.4,
        "duration": 1680,
        "pickup_time": {{unixms-26h}},
        "dropoff_time": {{unixms-25h}},
        "trip": {
          "id": 10999
        },
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Electric"
        },
        "rating": 5
      },
      "pricing": {
        "currency": "AED",
        "total_price": "38.00"
      },
      "activity_time": "{{now-26h}}",
      "presentation_data": {
        "title": "Ride to Home",
        "subtitle": "Emirates Towers → Marina Gate 1",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 38.00"
      },
      "created_at": "{{now-26h}}",
      "updated_at": "{{now-25h}}"
    },
    {
      "id": "act_shops_9201",
      "provider_id": 3,
      "provider": "careem-grocery",
      "type": "shops",
      "reference_id": "order_9201",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "activity_time": "{{now-48h}}",
      "created_at": "{{now-48h}}",
      "updated_at": "{{now-47h}}",
      "data": {
        "status": "DELIVERED",
        "basket_id": 6000101,
        "brand_id": 40100,
        "merchant_id": 40101,
        "merchant_name": "Marina Fresh Market",
        "merchant_type": "retail",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=order_9201&provider_id=3&partner=shops",
        "payment_type": "WALLET",
        "completed_at": {{unixms-48h}},
        "items": [
          {
            "item_id": 4010101,
            "name": "Organic Full Cream Milk 1L",
            "quantity": 2,
            "amount": 17
          },
          {
            "item_id": 4010103,
            "name": "Ginger Kombucha 330ml",
            "quantity": 2,
            "amount": 28
          }
        ],
        "order_delivery": {
          "type": "CAREEM",
          "eta": 35
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "52.00"
      },
      "presentation_data": {
        "title": "Marina Fresh Market",
        "subtitle": "2x Organic Full Cream Milk 1L, 2x Ginger Kombucha 330ml",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/shops.png",
        "trailing": "AED 52.00",
        "thirdline": "Delivered to Home"
      }
    },
    {
      "id": "act_food_8001",
      "provider_id": 1,
      "provider": "careem-food",
      "type": "food",
      "reference_id": "order_8001",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "data": {
        "status": "DELIVERED",
        "merchant_id": 30104,
        "merchant_name": "Morning Syrniki Café",
        "care_deep_link": "careem://care.careem.com/reportProblem?orderId=order_8001",
        "payment_type": "CARD",
        "completed_at": {{unixms-72h}},
        "items": [
          {
            "item_id": 700401,
            "name": "Classic Syrniki with Sour Cream",
            "quantity": 2,
            "amount": 68
          },
          {
            "item_id": 700402,
            "name": "Cappuccino",
            "quantity": 1,
            "amount": 19
          }
        ],
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "87.00"
      },
      "activity_time": "{{now-72h}}",
      "presentation_data": {
        "title": "Morning Syrniki Café",
        "subtitle": "2x Classic Syrniki with Sour Cream, 1x Cappuccino",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/food.png",
        "trailing": "AED 87.00",
        "thirdline": "Delivered to Home"
      },
      "created_at": "{{now-72h}}",
      "updated_at": "{{now-72h}}"
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Scenario: all

Default: every supported activity, all three buckets, with paging to the next page.

```json response
{
  "page": "get_activities",
  "past_activities": [
    {
      "id": "act_ride_0999",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_0999",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "data": {
        "status": "COMPLETED",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=ride_0999&provider_id=16&partner=rides",
        "pickup_location": {
          "name": "Work",
          "locationUuid": "LOC-50002",
          "latitude": 25.2172,
          "longitude": 55.2826,
          "addressDetails": {
            "buildingName": "Emirates Towers",
            "area": "Sheikh Zayed Rd",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Emirates Towers, Sheikh Zayed Rd",
            "savedName": "Work"
          }
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "captain": {
          "id": 7001,
          "name": "Ahmed K.",
          "rating": "4.92",
          "picture_url": "https://careem-catalog-media.media.careem.com/captains/ahmed.png",
          "contact_info": {
            "phone_number": "+971500000000"
          },
          "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "color": "White",
            "license_plate": "DXB K 48213",
            "vehicle_type": "SEDAN"
          }
        },
        "distance": 21.4,
        "duration": 1680,
        "pickup_time": {{unixms-26h}},
        "dropoff_time": {{unixms-25h}},
        "trip": {
          "id": 10999
        },
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Electric"
        },
        "rating": 5
      },
      "pricing": {
        "currency": "AED",
        "total_price": "38.00"
      },
      "activity_time": "{{now-26h}}",
      "presentation_data": {
        "title": "Ride to Home",
        "subtitle": "Emirates Towers → Marina Gate 1",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 38.00"
      },
      "created_at": "{{now-26h}}",
      "updated_at": "{{now-25h}}"
    },
    {
      "id": "act_shops_9201",
      "provider_id": 3,
      "provider": "careem-grocery",
      "type": "shops",
      "reference_id": "order_9201",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "activity_time": "{{now-48h}}",
      "created_at": "{{now-48h}}",
      "updated_at": "{{now-47h}}",
      "data": {
        "status": "DELIVERED",
        "basket_id": 6000101,
        "brand_id": 40100,
        "merchant_id": 40101,
        "merchant_name": "Marina Fresh Market",
        "merchant_type": "retail",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=order_9201&provider_id=3&partner=shops",
        "payment_type": "WALLET",
        "completed_at": {{unixms-48h}},
        "items": [
          {
            "item_id": 4010101,
            "name": "Organic Full Cream Milk 1L",
            "quantity": 2,
            "amount": 17
          },
          {
            "item_id": 4010103,
            "name": "Ginger Kombucha 330ml",
            "quantity": 2,
            "amount": 28
          }
        ],
        "order_delivery": {
          "type": "CAREEM",
          "eta": 35
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "52.00"
      },
      "presentation_data": {
        "title": "Marina Fresh Market",
        "subtitle": "2x Organic Full Cream Milk 1L, 2x Ginger Kombucha 330ml",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/shops.png",
        "trailing": "AED 52.00",
        "thirdline": "Delivered to Home"
      }
    },
    {
      "id": "act_food_8001",
      "provider_id": 1,
      "provider": "careem-food",
      "type": "food",
      "reference_id": "order_8001",
      "user_id": 900000001,
      "status": "completed",
      "country": "AE",
      "data": {
        "status": "DELIVERED",
        "merchant_id": 30104,
        "merchant_name": "Morning Syrniki Café",
        "care_deep_link": "careem://care.careem.com/reportProblem?orderId=order_8001",
        "payment_type": "CARD",
        "completed_at": {{unixms-72h}},
        "items": [
          {
            "item_id": 700401,
            "name": "Classic Syrniki with Sour Cream",
            "quantity": 2,
            "amount": 68
          },
          {
            "item_id": 700402,
            "name": "Cappuccino",
            "quantity": 1,
            "amount": 19
          }
        ],
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "87.00"
      },
      "activity_time": "{{now-72h}}",
      "presentation_data": {
        "title": "Morning Syrniki Café",
        "subtitle": "2x Classic Syrniki with Sour Cream, 1x Cappuccino",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/food.png",
        "trailing": "AED 87.00",
        "thirdline": "Delivered to Home"
      },
      "created_at": "{{now-72h}}",
      "updated_at": "{{now-72h}}"
    }
  ],
  "upcoming_activities": [
    {
      "id": "act_ride_1002",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_1002",
      "user_id": 900000001,
      "status": "scheduled",
      "country": "AE",
      "data": {
        "status": "SCHEDULED",
        "pickup_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "dropoff_location": {
          "name": "Dubai International Airport T3",
          "latitude": 25.2528,
          "longitude": 55.3644,
          "addressDetails": {
            "placeName": "Dubai International Airport T3",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Dubai International Airport T3"
          }
        },
        "pickup_time": {{unixms+20h}},
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Executive"
        },
        "pricing_extras": {
          "price_low": "85.00",
          "price_high": "95.00"
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "89.00"
      },
      "activity_time": "{{now+20h}}",
      "presentation_data": {
        "title": "Scheduled Business ride to DXB T3",
        "subtitle": "Tomorrow, pickup from Home",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 89.00"
      },
      "created_at": "{{now-2h}}",
      "updated_at": "{{now-2h}}"
    }
  ],
  "ongoing_activities": [
    {
      "id": "act_ride_1001",
      "provider_id": 16,
      "provider": "careem-rides",
      "type": "ride",
      "reference_id": "ride_1001",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "data": {
        "status": "CAPTAIN_ON_THE_WAY",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=ride_1001&provider_id=16&partner=rides",
        "pickup_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        },
        "dropoff_location": {
          "name": "Dubai Mall",
          "latitude": 25.1972,
          "longitude": 55.2796,
          "addressDetails": {
            "placeName": "Dubai Mall",
            "area": "Downtown Dubai",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Dubai Mall, Downtown Dubai"
          }
        },
        "estimate": {
          "duration": 1320,
          "distance": 17.8
        },
        "captain": {
          "id": 7001,
          "name": "Ahmed K.",
          "rating": "4.92",
          "picture_url": "https://careem-catalog-media.media.careem.com/captains/ahmed.png",
          "contact_info": {
            "phone_number": "+971500000000"
          },
          "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "color": "White",
            "license_plate": "DXB K 48213",
            "vehicle_type": "SEDAN"
          }
        },
        "pickup_time": {{unixms+4m}},
        "trip": {
          "id": 11001
        },
        "payment_method": {
          "id": 4242,
          "type": "CARD",
          "details": {
            "card_last_4_digits": "4242",
            "card_network": "VISA"
          }
        },
        "product": {
          "name": "Comfort"
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "49.00"
      },
      "activity_time": "{{now-5m}}",
      "presentation_data": {
        "title": "Comfort to Dubai Mall",
        "subtitle": "Captain Ahmed K. arrives in 4 min",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/ride.png",
        "trailing": "AED 49.00",
        "thirdline": "White Toyota Camry · DXB K 48213"
      },
      "created_at": "{{now-5m}}",
      "updated_at": "{{now-1m}}"
    },
    {
      "id": "act_groc_9002",
      "provider_id": 3,
      "provider": "careem-grocery",
      "type": "groceries",
      "reference_id": "order_9002",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "data": {
        "status": "ON_THE_WAY",
        "basket_id": 6000002,
        "brand_id": 40000,
        "merchant_id": 40001,
        "merchant_name": "Careem Quik Dubai Marina",
        "merchant_type": "ufd",
        "care_deep_link": "careem://care.careem.com/issueTypes?reference_id=order_9002&provider_id=3&partner=shops",
        "payment_type": "WALLET",
        "items": [
          {
            "item_id": 4000101,
            "name": "Fresh Farm Full Cream Milk 1L",
            "quantity": 2,
            "amount": 13.5
          },
          {
            "item_id": 4000102,
            "name": "Free Range Eggs 12pk",
            "quantity": 1,
            "amount": 14.5
          },
          {
            "item_id": 4000103,
            "name": "Sourdough Loaf",
            "quantity": 1,
            "amount": 12
          }
        ],
        "order_delivery": {
          "type": "CAREEM",
          "eta": 9
        },
        "dropoff_location": {
          "name": "Home",
          "locationUuid": "LOC-50001",
          "latitude": 25.0866,
          "longitude": 55.1474,
          "addressDetails": {
            "buildingName": "Marina Gate 1",
            "area": "Dubai Marina",
            "city": "Dubai",
            "country": "AE",
            "formattedName": "Marina Gate 1, Dubai Marina",
            "savedName": "Home"
          }
        }
      },
      "pricing": {
        "currency": "AED",
        "total_price": "45.50"
      },
      "activity_time": "{{now-6m}}",
      "presentation_data": {
        "title": "Careem Quik",
        "subtitle": "Fresh Farm Full Cream Milk 1L, Free Range Eggs 12pk, Sourdough Loaf",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/quik.png",
        "trailing": "AED 45.50",
        "thirdline": "Arriving in 9 min"
      },
      "created_at": "{{now-6m}}",
      "updated_at": "{{now-2m}}"
    },
    {
      "id": "act_box_7001",
      "provider_id": 52,
      "provider": "careem-delivery",
      "type": "delivery",
      "reference_id": "box_7001",
      "user_id": 900000001,
      "status": "ongoing",
      "country": "AE",
      "activity_time": "{{now-12m}}",
      "created_at": "{{now-12m}}",
      "updated_at": "{{now-3m}}",
      "data": {
        "status": "PICKED_UP",
        "business_type": "SEND",
        "comment": "Please call on arrival",
        "payment_type": "CASH",
        "captain_name": "Khalid M.",
        "captain_phone": "+971500000021",
        "items": [
          {
            "name": "Documents",
            "quantity": 1
          }
        ],
        "order_delivery": {
          "type": "BIKE",
          "eta": 18
        },
        "pricing_break_through_detail": [
          {
            "key": "delivery_fee",
            "name": "Delivery fee",
            "amount": 22,
            "is_discount": false
          }
        ],
        "pickup": {
          "name": "Marina Gate 1, Dubai Marina",
          "nickname": "Home",
          "building": "Marina Gate 1",
          "location_identifier": "LOC-50001"
        },
        "dropOff": {
          "name": "Emirates Towers, Sheikh Zayed Rd",
          "nickname": "Work",
          "building": "Emirates Towers",
          "location_identifier": "LOC-50002"
        },
        "care_deep_link": "careem://care.careem.com/issueTypes?activity_id=box_7001&source_miniapp=com.careem.delivery"
      },
      "pricing": {
        "currency": "AED",
        "total_price": "22.00"
      },
      "presentation_data": {
        "title": "Careem Box",
        "subtitle": "Home → Work",
        "main_icon_url": "https://careem-catalog-media.media.careem.com/icons/box.png",
        "trailing": "AED 22.00",
        "thirdline": "Arriving in 18 min"
      }
    }
  ],
  "paging": {
    "has_next": true,
    "next_cursor": "cursor_page2"
  }
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Retrieve the authenticated user's activities across all Careem services (rides, food, groceries, shops, Careem Box deliveries). Returns past, upcoming, and ongoing activities, 35 past activities per page. Use activity_status to filter by status (past, upcoming, ongoing) and activity_type to filter by vertical (ride, food, groceries, shops, delivery). If a specific past order isn't found and paging.has_next is true, call again with next_cursor set to paging.next_cursor to see older orders (up to 3 calls total, i.e. up to 105 past activities).",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "activity_status": {
        "description": "filter by status: past, upcoming, ongoing, or omit for all",
        "type": "string"
      },
      "activity_type": {
        "description": "filter by vertical: ride, food, groceries, shops, delivery (Careem Box send/receive package), or omit for all",
        "type": "string"
      },
      "next_cursor": {
        "description": "pass the previous call's paging.next_cursor to fetch the next page of past activities; omit for the first page",
        "type": "string"
      }
    },
    "type": "object"
  },
  "name": "get_activities",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "ongoing_activities": {
        "description": "currently in-progress activities",
        "items": {
          "additionalProperties": false,
          "properties": {
            "activity_time": {
              "type": "string"
            },
            "country": {
              "type": "string"
            },
            "created_at": {
              "type": "string"
            },
            "data": true,
            "id": {
              "type": "string"
            },
            "participants": true,
            "presentation_data": {
              "additionalProperties": false,
              "properties": {
                "main_icon_url": {
                  "type": "string"
                },
                "subtitle": {
                  "type": "string"
                },
                "thirdline": {
                  "type": "string"
                },
                "title": {
                  "type": "string"
                },
                "trailing": {
                  "type": "string"
                }
              },
              "required": [
                "title",
                "subtitle",
                "main_icon_url",
                "trailing"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "pricing": {
              "additionalProperties": false,
              "properties": {
                "currency": {
                  "type": "string"
                },
                "total_price": {
                  "type": "string"
                }
              },
              "required": [
                "currency",
                "total_price"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "provider": {
              "type": "string"
            },
            "provider_id": {
              "minimum": 0,
              "type": "integer"
            },
            "reference_id": {
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "type": {
              "type": "string"
            },
            "updated_at": {
              "type": "string"
            },
            "user_id": {
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "id",
            "provider_id",
            "type",
            "reference_id",
            "user_id",
            "status",
            "country",
            "data",
            "activity_time",
            "created_at",
            "updated_at"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "page": {
        "description": "identifies this response as a get_activities result",
        "type": "string"
      },
      "paging": {
        "additionalProperties": false,
        "description": "pagination info for past_activities; if has_next is true, call again with next_cursor to see more",
        "properties": {
          "has_next": {
            "type": "boolean"
          },
          "next_cursor": {
            "type": "string"
          }
        },
        "type": [
          "null",
          "object"
        ]
      },
      "past_activities": {
        "description": "completed activities",
        "items": {
          "additionalProperties": false,
          "properties": {
            "activity_time": {
              "type": "string"
            },
            "country": {
              "type": "string"
            },
            "created_at": {
              "type": "string"
            },
            "data": true,
            "id": {
              "type": "string"
            },
            "participants": true,
            "presentation_data": {
              "additionalProperties": false,
              "properties": {
                "main_icon_url": {
                  "type": "string"
                },
                "subtitle": {
                  "type": "string"
                },
                "thirdline": {
                  "type": "string"
                },
                "title": {
                  "type": "string"
                },
                "trailing": {
                  "type": "string"
                }
              },
              "required": [
                "title",
                "subtitle",
                "main_icon_url",
                "trailing"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "pricing": {
              "additionalProperties": false,
              "properties": {
                "currency": {
                  "type": "string"
                },
                "total_price": {
                  "type": "string"
                }
              },
              "required": [
                "currency",
                "total_price"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "provider": {
              "type": "string"
            },
            "provider_id": {
              "minimum": 0,
              "type": "integer"
            },
            "reference_id": {
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "type": {
              "type": "string"
            },
            "updated_at": {
              "type": "string"
            },
            "user_id": {
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "id",
            "provider_id",
            "type",
            "reference_id",
            "user_id",
            "status",
            "country",
            "data",
            "activity_time",
            "created_at",
            "updated_at"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "upcoming_activities": {
        "description": "scheduled upcoming activities",
        "items": {
          "additionalProperties": false,
          "properties": {
            "activity_time": {
              "type": "string"
            },
            "country": {
              "type": "string"
            },
            "created_at": {
              "type": "string"
            },
            "data": true,
            "id": {
              "type": "string"
            },
            "participants": true,
            "presentation_data": {
              "additionalProperties": false,
              "properties": {
                "main_icon_url": {
                  "type": "string"
                },
                "subtitle": {
                  "type": "string"
                },
                "thirdline": {
                  "type": "string"
                },
                "title": {
                  "type": "string"
                },
                "trailing": {
                  "type": "string"
                }
              },
              "required": [
                "title",
                "subtitle",
                "main_icon_url",
                "trailing"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "pricing": {
              "additionalProperties": false,
              "properties": {
                "currency": {
                  "type": "string"
                },
                "total_price": {
                  "type": "string"
                }
              },
              "required": [
                "currency",
                "total_price"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "provider": {
              "type": "string"
            },
            "provider_id": {
              "minimum": 0,
              "type": "integer"
            },
            "reference_id": {
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "type": {
              "type": "string"
            },
            "updated_at": {
              "type": "string"
            },
            "user_id": {
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "id",
            "provider_id",
            "type",
            "reference_id",
            "user_id",
            "status",
            "country",
            "data",
            "activity_time",
            "created_at",
            "updated_at"
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
      "page"
    ],
    "type": "object"
  },
  "title": "Get Activities"
}
```
