# Source

The definitions in this folder were exported from **careem-mcp-service** at ref `origin/master`, commit `1007a637cc83f110402ccbb6ccf69d99af4da955` (2026-10-06). Synced at 2026-10-06T21:26:02Z.

42 tools (the rides domain is not part of this public package yet):

- **box** (5): `box_create_order`, `box_get_categories`, `box_get_config`, `box_get_vehicle_types`, `box_pre_checkout`
- **cart** (14): `cart_add_item`, `cart_add_items`, `cart_checkout`, `cart_delete_basket`, `cart_delete_items`, `cart_get_basket`, `cart_get_basket_price`, `cart_get_checkout_promos`, `cart_get_global_view`, `cart_get_quik_basket`, `cart_grocery_checkout`, `cart_reorder`, `cart_reschedule_basket`, `cart_update_item`
- **food** (10): `food_check_slot_availability`, `food_dish_search`, `food_dynamic_search`, `food_get_item_options`, `food_get_items_options`, `food_get_restaurant_menu`, `food_get_scheduling_slots`, `food_get_user_discovery_filters`, `food_merchant_search`, `food_search_restaurant_items`
- **groceries** (7): `create_grocery_cart_with_quantities`, `global_search`, `groceries_get_items_details`, `is_grocery_area_serviceable`, `search_groceries_get_all_deals`, `search_groceries_get_top_user_items`, `search_groceries_items`
- **location** (2): `reverse_geocode`, `save_new_address`
- **maps** (1): `maps_get_resources`
- **user** (3): `get_activities`, `track_activity`, `user_info`
