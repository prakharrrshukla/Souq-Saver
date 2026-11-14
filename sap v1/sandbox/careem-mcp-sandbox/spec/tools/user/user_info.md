---
tool: user_info
domain: user
---

# user_info

Session bootstrap for the persona Leonardo DiCappuccino (user `900000001`): identity, saved
addresses (bookmark service), routine suggestions (personalization) and ready-to-display
welcome suggestions per vertical (food, groceries, rides). City fields (`city_id`,
`city_timezone`, `city_currency`) and ride suggestions need coordinates, as in production;
grocery suggestions need a Quik-serviceable location.

Magic `service_area_id` values: `999` personalization down, `998` identity down,
`997` identity + personalization + bookmarks + food history down, `996` no personalization data,
`995` bookmarks down, `994` brand-new user (generic suggestions). `latitude: 0` (non-zero
longitude) is outside the Quik area.

## Scenario: personalization-down

`service_area_id: 999` — personalization answers 503; identity and bookmarks still come back.

```json match
{
  "service_area_id": 999
}
```

```json response
{
  "user_info": {
    "name": "Leonardo DiCappuccino",
    "preferred_username": "leo.dicappuccino@finally-won-an-oscar.coffee",
    "kind": "CUSTOMER",
    "given_name": "Leonardo",
    "family_name": "DiCappuccino",
    "gender": "MALE",
    "zoneinfo": "Asia/Dubai",
    "locale": "en",
    "currency": "AED"
  },
  "saved_bookmarks": [
    {
      "id": "LOC-50001",
      "title": "Home",
      "subTitle": "Marina Gate 1, Dubai Marina, Dubai",
      "latitude": 25.0866,
      "longitude": 55.1474,
      "bookmark_id": "50001",
      "location_tag": "home"
    },
    {
      "id": "LOC-50002",
      "title": "Work",
      "subTitle": "Emirates Towers, Sheikh Zayed Rd, Dubai",
      "latitude": 25.2172,
      "longitude": 55.2826,
      "bookmark_id": "50002",
      "location_tag": "work"
    },
    {
      "id": "LOC-50003",
      "title": "Gym",
      "subTitle": "Fitness Hub, JLT Cluster D, Dubai",
      "latitude": 25.0702,
      "longitude": 55.143,
      "bookmark_id": "50003"
    }
  ],
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Reorder from Morning Syrniki Café"
    },
    {
      "vertical": "food",
      "suggestion": "Reorder from Shawarma Station"
    }
  ],
  "error": "failed to fetch personalization: unexpected status 503 from personalization service"
}
```

## Scenario: identity-down

`service_area_id: 998` — the upstream API answers 401 (expired token); bookmarks, routines and
suggestions still come back.

```json match
{
  "service_area_id": 998
}
```

```json response
{
  "saved_bookmarks": [
    {
      "id": "LOC-50001",
      "title": "Home",
      "subTitle": "Marina Gate 1, Dubai Marina, Dubai",
      "latitude": 25.0866,
      "longitude": 55.1474,
      "bookmark_id": "50001",
      "location_tag": "home"
    },
    {
      "id": "LOC-50002",
      "title": "Work",
      "subTitle": "Emirates Towers, Sheikh Zayed Rd, Dubai",
      "latitude": 25.2172,
      "longitude": 55.2826,
      "bookmark_id": "50002",
      "location_tag": "work"
    },
    {
      "id": "LOC-50003",
      "title": "Gym",
      "subTitle": "Fitness Hub, JLT Cluster D, Dubai",
      "latitude": 25.0702,
      "longitude": 55.143,
      "bookmark_id": "50003"
    }
  ],
  "routines": [
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50002",
      "header": "Morning commute",
      "img": "https://careem-catalog-media.media.careem.com/routines/work.png",
      "routine_suggestion": "Book a ride to Work",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50001",
      "header": "Heading home?",
      "img": "https://careem-catalog-media.media.careem.com/routines/home.png",
      "routine_suggestion": "Book a ride to Home",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://food.careem.com/merchant/30104",
      "header": "Breakfast time",
      "img": "https://careem-catalog-media.media.careem.com/routines/syrniki.png",
      "routine_suggestion": "Reorder Classic Syrniki from Morning Syrniki Café",
      "metadata": {
        "service": "food"
      }
    }
  ],
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Reorder from Morning Syrniki Café"
    },
    {
      "vertical": "food",
      "suggestion": "Reorder from Shawarma Station"
    }
  ],
  "error": "failed to fetch user info: unexpected response status 401"
}
```

## Scenario: upstream-unavailable

`service_area_id: 997` — identity, personalization and bookmarks all answer 503 (and the food
history too, so only the generic food suggestion is left).

```json match
{
  "service_area_id": 997
}
```

```json response
{
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Show me trending restaurants"
    }
  ],
  "error": "failed to fetch user info: unexpected response status 503; failed to fetch personalization: unexpected status 503 from personalization service; failed to fetch saved bookmarks: unexpected response status 503"
}
```

## Scenario: no-personalization

`service_area_id: 996` — personalization knows nothing about the user (`response: []`), so
`routines` is omitted.

```json match
{
  "service_area_id": 996
}
```

```json response
{
  "user_info": {
    "name": "Leonardo DiCappuccino",
    "preferred_username": "leo.dicappuccino@finally-won-an-oscar.coffee",
    "kind": "CUSTOMER",
    "given_name": "Leonardo",
    "family_name": "DiCappuccino",
    "gender": "MALE",
    "zoneinfo": "Asia/Dubai",
    "locale": "en",
    "currency": "AED"
  },
  "saved_bookmarks": [
    {
      "id": "LOC-50001",
      "title": "Home",
      "subTitle": "Marina Gate 1, Dubai Marina, Dubai",
      "latitude": 25.0866,
      "longitude": 55.1474,
      "bookmark_id": "50001",
      "location_tag": "home"
    },
    {
      "id": "LOC-50002",
      "title": "Work",
      "subTitle": "Emirates Towers, Sheikh Zayed Rd, Dubai",
      "latitude": 25.2172,
      "longitude": 55.2826,
      "bookmark_id": "50002",
      "location_tag": "work"
    },
    {
      "id": "LOC-50003",
      "title": "Gym",
      "subTitle": "Fitness Hub, JLT Cluster D, Dubai",
      "latitude": 25.0702,
      "longitude": 55.143,
      "bookmark_id": "50003"
    }
  ],
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Reorder from Morning Syrniki Café"
    },
    {
      "vertical": "food",
      "suggestion": "Reorder from Shawarma Station"
    }
  ]
}
```

## Scenario: bookmarks-down

`service_area_id: 995` — the bookmark service answers 503; everything else is returned.

```json match
{
  "service_area_id": 995
}
```

```json response
{
  "user_info": {
    "name": "Leonardo DiCappuccino",
    "preferred_username": "leo.dicappuccino@finally-won-an-oscar.coffee",
    "kind": "CUSTOMER",
    "given_name": "Leonardo",
    "family_name": "DiCappuccino",
    "gender": "MALE",
    "zoneinfo": "Asia/Dubai",
    "locale": "en",
    "currency": "AED"
  },
  "routines": [
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50002",
      "header": "Morning commute",
      "img": "https://careem-catalog-media.media.careem.com/routines/work.png",
      "routine_suggestion": "Book a ride to Work",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50001",
      "header": "Heading home?",
      "img": "https://careem-catalog-media.media.careem.com/routines/home.png",
      "routine_suggestion": "Book a ride to Home",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://food.careem.com/merchant/30104",
      "header": "Breakfast time",
      "img": "https://careem-catalog-media.media.careem.com/routines/syrniki.png",
      "routine_suggestion": "Reorder Classic Syrniki from Morning Syrniki Café",
      "metadata": {
        "service": "food"
      }
    }
  ],
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Reorder from Morning Syrniki Café"
    },
    {
      "vertical": "food",
      "suggestion": "Reorder from Shawarma Station"
    }
  ],
  "error": "failed to fetch saved bookmarks: unexpected response status 503"
}
```

## Scenario: new-user

`service_area_id: 994` (with coordinates) — no food orders, no Quik history and no saved or
suggested places yet: every vertical falls back to its generic suggestion (airport + mall rides).

```json match
{
  "service_area_id": 994
}
```

```json response
{
  "user_info": {
    "name": "Leonardo DiCappuccino",
    "preferred_username": "leo.dicappuccino@finally-won-an-oscar.coffee",
    "kind": "CUSTOMER",
    "given_name": "Leonardo",
    "family_name": "DiCappuccino",
    "gender": "MALE",
    "zoneinfo": "Asia/Dubai",
    "locale": "en",
    "currency": "AED",
    "city_id": 1,
    "city_timezone": "Asia/Dubai",
    "city_currency": "AED"
  },
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Show me trending restaurants"
    },
    {
      "vertical": "groceries",
      "suggestion": "Show All Deals in Quik"
    },
    {
      "vertical": "rides",
      "suggestion": "Ride to Dubai International Airport T3",
      "dropoff_location": {
        "id": "poi_dxb_t3",
        "title": "Dubai International Airport T3",
        "subTitle": "Airport Rd, Al Garhoud, Dubai",
        "latitude": 25.2528,
        "longitude": 55.3644,
        "locationUuid": "LOC-poi-dxb-t3",
        "locationType": "AIRPORT",
        "mode": "GLOBAL"
      }
    },
    {
      "vertical": "rides",
      "suggestion": "Ride to Dubai Mall, Downtown Dubai",
      "dropoff_location": {
        "id": "poi_dubai_mall",
        "title": "Dubai Mall, Downtown Dubai",
        "subTitle": "Financial Centre Rd, Downtown Dubai",
        "latitude": 25.1972,
        "longitude": 55.2796,
        "locationUuid": "LOC-poi-dubai-mall",
        "locationType": "SHOPPING",
        "mode": "GLOBAL"
      }
    }
  ]
}
```

## Scenario: outside-quik-area

`latitude: 0` — Quik does not serve the point, so there is no groceries suggestion (no city or
ride suggestions resolve there either).

```json match
{
  "latitude": 0
}
```

```json response
{
  "user_info": {
    "name": "Leonardo DiCappuccino",
    "preferred_username": "leo.dicappuccino@finally-won-an-oscar.coffee",
    "kind": "CUSTOMER",
    "given_name": "Leonardo",
    "family_name": "DiCappuccino",
    "gender": "MALE",
    "zoneinfo": "Asia/Dubai",
    "locale": "en",
    "currency": "AED"
  },
  "saved_bookmarks": [
    {
      "id": "LOC-50001",
      "title": "Home",
      "subTitle": "Marina Gate 1, Dubai Marina, Dubai",
      "latitude": 25.0866,
      "longitude": 55.1474,
      "bookmark_id": "50001",
      "location_tag": "home"
    },
    {
      "id": "LOC-50002",
      "title": "Work",
      "subTitle": "Emirates Towers, Sheikh Zayed Rd, Dubai",
      "latitude": 25.2172,
      "longitude": 55.2826,
      "bookmark_id": "50002",
      "location_tag": "work"
    },
    {
      "id": "LOC-50003",
      "title": "Gym",
      "subTitle": "Fitness Hub, JLT Cluster D, Dubai",
      "latitude": 25.0702,
      "longitude": 55.143,
      "bookmark_id": "50003"
    }
  ],
  "routines": [
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50002",
      "header": "Morning commute",
      "img": "https://careem-catalog-media.media.careem.com/routines/work.png",
      "routine_suggestion": "Book a ride to Work",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50001",
      "header": "Heading home?",
      "img": "https://careem-catalog-media.media.careem.com/routines/home.png",
      "routine_suggestion": "Book a ride to Home",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://food.careem.com/merchant/30104",
      "header": "Breakfast time",
      "img": "https://careem-catalog-media.media.careem.com/routines/syrniki.png",
      "routine_suggestion": "Reorder Classic Syrniki from Morning Syrniki Café",
      "metadata": {
        "service": "food"
      }
    }
  ],
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Reorder from Morning Syrniki Café"
    },
    {
      "vertical": "food",
      "suggestion": "Reorder from Shawarma Station"
    }
  ]
}
```

## Scenario: with-location

Coordinates passed (Home) → city fields (Dubai), Quik reorder suggestion and two ride suggestions
(Work, Dubai Mall — Home is only in `Saved`, and the user is already there).

```json match
{
  "latitude": "*",
  "longitude": "*"
}
```

```json response
{
  "user_info": {
    "name": "Leonardo DiCappuccino",
    "preferred_username": "leo.dicappuccino@finally-won-an-oscar.coffee",
    "kind": "CUSTOMER",
    "given_name": "Leonardo",
    "family_name": "DiCappuccino",
    "gender": "MALE",
    "zoneinfo": "Asia/Dubai",
    "locale": "en",
    "currency": "AED",
    "city_id": 1,
    "city_timezone": "Asia/Dubai",
    "city_currency": "AED"
  },
  "saved_bookmarks": [
    {
      "id": "LOC-50001",
      "title": "Home",
      "subTitle": "Marina Gate 1, Dubai Marina, Dubai",
      "latitude": 25.0866,
      "longitude": 55.1474,
      "bookmark_id": "50001",
      "location_tag": "home"
    },
    {
      "id": "LOC-50002",
      "title": "Work",
      "subTitle": "Emirates Towers, Sheikh Zayed Rd, Dubai",
      "latitude": 25.2172,
      "longitude": 55.2826,
      "bookmark_id": "50002",
      "location_tag": "work"
    },
    {
      "id": "LOC-50003",
      "title": "Gym",
      "subTitle": "Fitness Hub, JLT Cluster D, Dubai",
      "latitude": 25.0702,
      "longitude": 55.143,
      "bookmark_id": "50003"
    }
  ],
  "routines": [
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50002",
      "header": "Morning commute",
      "img": "https://careem-catalog-media.media.careem.com/routines/work.png",
      "routine_suggestion": "Book a ride to Work",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50001",
      "header": "Heading home?",
      "img": "https://careem-catalog-media.media.careem.com/routines/home.png",
      "routine_suggestion": "Book a ride to Home",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://food.careem.com/merchant/30104",
      "header": "Breakfast time",
      "img": "https://careem-catalog-media.media.careem.com/routines/syrniki.png",
      "routine_suggestion": "Reorder Classic Syrniki from Morning Syrniki Café",
      "metadata": {
        "service": "food"
      }
    }
  ],
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Reorder from Morning Syrniki Café"
    },
    {
      "vertical": "food",
      "suggestion": "Reorder from Shawarma Station"
    },
    {
      "vertical": "groceries",
      "suggestion": "Reorder my usual groceries"
    },
    {
      "vertical": "rides",
      "suggestion": "Ride to Emirates Towers, Sheikh Zayed Rd",
      "dropoff_location": {
        "id": "50002",
        "title": "Emirates Towers, Sheikh Zayed Rd",
        "subTitle": "Work · Trade Centre 2, Dubai",
        "latitude": 25.2172,
        "longitude": 55.2826,
        "locationUuid": "LOC-50002",
        "locationType": "OFFICE_BUILDING",
        "mode": "GLOBAL"
      }
    },
    {
      "vertical": "rides",
      "suggestion": "Ride to Dubai Mall, Downtown Dubai",
      "dropoff_location": {
        "id": "poi_dubai_mall",
        "title": "Dubai Mall, Downtown Dubai",
        "subTitle": "Financial Centre Rd, Downtown Dubai",
        "latitude": 25.1972,
        "longitude": 55.2796,
        "locationUuid": "LOC-poi-dubai-mall",
        "locationType": "SHOPPING",
        "mode": "GLOBAL"
      }
    }
  ]
}
```

## Scenario: no-location

Default: no coordinates — no city fields, no ride suggestions, and (0,0) is outside the Quik area
so no groceries suggestion.

```json response
{
  "user_info": {
    "name": "Leonardo DiCappuccino",
    "preferred_username": "leo.dicappuccino@finally-won-an-oscar.coffee",
    "kind": "CUSTOMER",
    "given_name": "Leonardo",
    "family_name": "DiCappuccino",
    "gender": "MALE",
    "zoneinfo": "Asia/Dubai",
    "locale": "en",
    "currency": "AED"
  },
  "saved_bookmarks": [
    {
      "id": "LOC-50001",
      "title": "Home",
      "subTitle": "Marina Gate 1, Dubai Marina, Dubai",
      "latitude": 25.0866,
      "longitude": 55.1474,
      "bookmark_id": "50001",
      "location_tag": "home"
    },
    {
      "id": "LOC-50002",
      "title": "Work",
      "subTitle": "Emirates Towers, Sheikh Zayed Rd, Dubai",
      "latitude": 25.2172,
      "longitude": 55.2826,
      "bookmark_id": "50002",
      "location_tag": "work"
    },
    {
      "id": "LOC-50003",
      "title": "Gym",
      "subTitle": "Fitness Hub, JLT Cluster D, Dubai",
      "latitude": 25.0702,
      "longitude": 55.143,
      "bookmark_id": "50003"
    }
  ],
  "routines": [
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50002",
      "header": "Morning commute",
      "img": "https://careem-catalog-media.media.careem.com/routines/work.png",
      "routine_suggestion": "Book a ride to Work",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://ride.careem.com/book?dropoff_bookmark_id=50001",
      "header": "Heading home?",
      "img": "https://careem-catalog-media.media.careem.com/routines/home.png",
      "routine_suggestion": "Book a ride to Home",
      "metadata": {
        "service": "rides"
      }
    },
    {
      "deep_link": "careem://food.careem.com/merchant/30104",
      "header": "Breakfast time",
      "img": "https://careem-catalog-media.media.careem.com/routines/syrniki.png",
      "routine_suggestion": "Reorder Classic Syrniki from Morning Syrniki Café",
      "metadata": {
        "service": "food"
      }
    }
  ],
  "suggestions": [
    {
      "vertical": "food",
      "suggestion": "Reorder from Morning Syrniki Café"
    },
    {
      "vertical": "food",
      "suggestion": "Reorder from Shawarma Station"
    }
  ]
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Retrieve the authenticated user's profile and saved bookmarks (e.g., Home, Work) to personalise suggestions and responses",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "latitude": {
        "description": "user's current latitude, used to personalise ride routine suggestions",
        "type": "number"
      },
      "longitude": {
        "description": "user's current longitude, used to personalise ride routine suggestions",
        "type": "number"
      },
      "service_area_id": {
        "description": "user's service area ID, used to personalise ride routine suggestions",
        "type": "integer"
      }
    },
    "type": "object"
  },
  "name": "user_info",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "description": "error message if the operation failed",
        "type": "string"
      },
      "routines": {
        "description": "personalised routine suggestions such as book ride to Home",
        "items": {
          "additionalProperties": false,
          "properties": {
            "deep_link": {
              "type": "string"
            },
            "header": {
              "type": "string"
            },
            "img": {
              "type": "string"
            },
            "metadata": {
              "additionalProperties": false,
              "properties": {
                "service": {
                  "type": "string"
                }
              },
              "required": [
                "service"
              ],
              "type": "object"
            },
            "routine_suggestion": {
              "type": "string"
            }
          },
          "required": [
            "deep_link",
            "header",
            "img",
            "routine_suggestion",
            "metadata"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "saved_bookmarks": {
        "description": "user's saved/bookmarked locations such as Home and Work",
        "items": {
          "additionalProperties": false,
          "properties": {
            "bookmark_id": {
              "description": "the location's saved-bookmark id (bookmark_\u003cuuid\u003e format) — this is the identifier space a client_sent location_identifier will match, NOT id above (LOC-\u003cuuid\u003e format, used for checkout instead)",
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "latitude": {
              "type": "number"
            },
            "location_tag": {
              "description": "the user's own tag for this bookmark: home, work, or other — set by the user when they saved it. More than one bookmark can share the same tag (e.g. a friend's address also saved as home), so this alone does not identify a single canonical location and must not be used to auto-pick when several bookmarks share a tag",
              "type": "string"
            },
            "longitude": {
              "type": "number"
            },
            "subTitle": {
              "type": "string"
            },
            "title": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "title",
            "subTitle",
            "latitude",
            "longitude"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "suggestions": {
        "description": "ready-to-display personalised suggestions across the food and groceries verticals",
        "items": {
          "additionalProperties": false,
          "properties": {
            "dropoff_location": {
              "additionalProperties": false,
              "description": "resolved dropoff location for a rides suggestion, ready to pass straight into request_ride's dropoff_location",
              "properties": {
                "distance": {
                  "type": "number"
                },
                "id": {
                  "description": "unique location identifier",
                  "type": "string"
                },
                "latitude": {
                  "description": "decimal latitude coordinate",
                  "type": "number"
                },
                "locationIcon": {
                  "type": "string"
                },
                "locationType": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "locationUuid": {
                  "description": "stable location ID for bookings; pass when available from saved bookmarks to reuse indexed location instead of minting new",
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "longitude": {
                  "description": "decimal longitude coordinate",
                  "type": "number"
                },
                "mode": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "openingHours": {
                  "additionalProperties": false,
                  "properties": {
                    "openNow": {
                      "type": "boolean"
                    },
                    "utcOffset": {
                      "type": "integer"
                    },
                    "weekdayText": {
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
                    "openNow",
                    "utcOffset",
                    "weekdayText"
                  ],
                  "type": [
                    "null",
                    "object"
                  ]
                },
                "subTitle": {
                  "description": "address or area description",
                  "type": "string"
                },
                "title": {
                  "description": "place name",
                  "type": "string"
                }
              },
              "required": [
                "id",
                "title",
                "subTitle",
                "latitude",
                "longitude"
              ],
              "type": [
                "null",
                "object"
              ]
            },
            "suggestion": {
              "description": "human-readable suggestion text, ready to display as-is",
              "type": "string"
            },
            "vertical": {
              "description": "vertical this suggestion belongs to: food, groceries, or rides",
              "type": "string"
            }
          },
          "required": [
            "vertical",
            "suggestion"
          ],
          "type": "object"
        },
        "type": [
          "null",
          "array"
        ]
      },
      "user_info": {
        "additionalProperties": false,
        "description": "the user information",
        "properties": {
          "city_currency": {
            "description": "currency code (e.g. AED) — used by checkout for card deep link",
            "type": "string"
          },
          "city_id": {
            "description": "numeric city ID — pass to all cart tools to skip per-call city lookup",
            "type": "integer"
          },
          "city_timezone": {
            "description": "IANA timezone (e.g. Asia/Dubai) — pass as timezone to cart tools",
            "type": "string"
          },
          "currency": {
            "description": "the preferred currency",
            "type": "string"
          },
          "family_name": {
            "description": "the last name",
            "type": "string"
          },
          "gender": {
            "description": "the gender of the user",
            "type": "string"
          },
          "given_name": {
            "description": "the first name",
            "type": "string"
          },
          "kind": {
            "description": "the kind of user (CUSTOMER, CAPTAIN, etc.)",
            "type": "string"
          },
          "locale": {
            "description": "the locale preference",
            "type": "string"
          },
          "name": {
            "description": "the full name of the user",
            "type": "string"
          },
          "preferred_username": {
            "description": "the preferred username (usually email)",
            "type": "string"
          },
          "zoneinfo": {
            "description": "the timezone",
            "type": "string"
          }
        },
        "required": [
          "name",
          "preferred_username",
          "kind",
          "given_name",
          "family_name",
          "gender",
          "zoneinfo",
          "locale",
          "currency"
        ],
        "type": [
          "null",
          "object"
        ]
      }
    },
    "type": "object"
  },
  "title": "Get User Information"
}
```
