---
tool: box_get_categories
domain: box
---

# box_get_categories

Package categories the user can pick for a Box order at a pickup point. In Dubai, Box Delivery
(`send`, default) offers five categories with "Others" (`5`) as the default; Box Purchase
(`buy`) has none configured (upstream 204), so the client should skip category selection.
Pass the chosen `id` as `package_category_id` to `box_pre_checkout` / `box_create_order`
(The local server chain uses `2` Documents).

Try: "what kind of package can I send?", business type `buy` (empty list), `latitude: 0`
(outside the Box area), an invalid business type such as `delivery`.

## Scenario: invalid-business-type

Any value other than `send`/`buy`; the triggers it on values containing `deliver`.

```json match
{ "business_type": "~deliver" }
```

```json response
{ "categories": [], "error": "business_type must be either 'send' or 'buy'" }
```

## Scenario: invalid-location

```json match
{ "latitude": 0, "longitude": 0 }
```

```json response
{ "categories": [], "error": "a valid location is required to fetch box categories" }
```

## Scenario: outside-service-area

`latitude: 0` with a non-zero longitude: not a Box city, upstream 400.

```json match
{ "latitude": 0 }
```

```json response
{ "categories": [], "error": "failed to fetch box categories: box service returned status 400" }
```

## Scenario: upstream-unavailable

Internal failure (magic `longitude: 0` with a non-zero latitude, or `./careem-mcp.sh scenario`):
upstream 503. Also stands for transport errors and the unreachable `internal server error`.

```json match
{ "longitude": 0 }
```

```json response
{ "categories": [], "error": "failed to fetch box categories: box service returned status 503" }
```

## Scenario: buy-no-categories

Box Purchase has no categories in Dubai: upstream answers 204, the tool returns an empty list
and no title — skip category selection and omit `package_category_id` later.

```json match
{ "business_type": "buy" }
```

```json response
{ "categories": [] }
```

## Scenario: send-dubai

Default: Box Delivery categories.

```json response
{
  "title": "Package category",
  "sub_title": "This info isn't shared with the captain",
  "default_category_id": 1,
  "categories": [
    { "id": 1, "name": "Food, groceries" },
    { "id": 2, "name": "Documents and others" }
  ]
}
```

## Definition

```json tool
{
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Retrieve the list of package categories (e.g. Food/groceries, Documents) a user can pick from for a Box Delivery or Box Purchase, given a location. An empty categories list means no categories are configured for this city/business_type - skip category selection entirely rather than asking the user. Pass the selected category's id as package_category_id when creating the order.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "business_type": {
        "description": "box business type: send (Box Delivery) or buy (Box Purchase)",
        "type": "string"
      },
      "latitude": {
        "description": "pickup location latitude",
        "type": "number"
      },
      "longitude": {
        "description": "pickup location longitude",
        "type": "number"
      }
    },
    "required": [
      "latitude",
      "longitude",
      "business_type"
    ],
    "type": "object"
  },
  "name": "box_get_categories",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "categories": {
        "description": "empty if no categories are configured for this city/business_type - in that case skip category selection entirely",
        "items": {
          "additionalProperties": false,
          "properties": {
            "id": {
              "description": "pass this as package_category_id when creating the order",
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
        "type": [
          "null",
          "array"
        ]
      },
      "default_category_id": {
        "description": "use this category if the user has no preference",
        "type": "integer"
      },
      "error": {
        "type": "string"
      },
      "sub_title": {
        "type": "string"
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "categories"
    ],
    "type": "object"
  },
  "title": "Get Box Package Categories"
}
```
