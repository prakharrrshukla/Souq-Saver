# 04. Careem MCP Reference

Sources: https://builders.careem.com/ docs (overview, getting started, authentication, sandbox, tool catalog, typical journeys, agent playbook) and the Careem training course (6 stops plus quiz), read 14 Nov 2026.

## At a glance

| Item | Value |
|---|---|
| Production endpoint | `https://mcp.careemapis.com/mcp` |
| Transport | Streamable HTTP (JSON-RPC 2.0) |
| Auth | OAuth 2.0 Authorization Code + PKCE (S256 only), public client, no secret |
| Tools | 50 across 8 domains |
| Server identity | `careem-mcp-service` v1.0.0 |
| UI resource | `ui://careem-mcp-app` (embedded widgets for UI-capable clients; JSON always returned too) |

Tools per domain: Rides 10 (early access, production only), Food 10, Groceries 5, Shops 1, Cart and Checkout 14, Box 5, User 3, Location 2.

Every request is scoped to the signed-in user's OAuth token: addresses, carts, orders, payments.

## Tools we use

Warning sign = mutating (needs user confirmation).

### User
| Tool | Use for us | Key parameters |
|---|---|---|
| `user_info` | Home coordinates, saved addresses, `service_area_id`, `city_id` | optional coords, `service_area_id` |
| `get_activities` | Order history for analysis | `activity_status` past/upcoming/ongoing, `activity_type` groceries/shops/food/ride/delivery, `next_cursor`. 35 per call, up to 3 calls = 105 |
| `track_activity` | Not needed | `activity_type`, `reference_id` |

Per grocery or shops order, `get_activities` returns item id, name, quantity, amount, merchant, date and total.

### Groceries (Careem Quik)
| Tool | Use for us | Key parameters |
|---|---|---|
| `search_groceries_items` | Resolve each list item at Quik (no `merchant_id`) or at one Shops merchant (with `merchant_id`) | `search_terms[]`, coords, `merchant_id?`, `page?`, `limit?`, `tags?` (dietary), `on_discount?`, `previously_ordered?`, `careem_recommended?`, `sort?`, `max_delivery_minutes?` (returns an ETA error instead of items if exceeded) |
| `search_groceries_get_top_user_items` | Fallback for new users; Quik only | coords |
| `search_groceries_get_all_deals` | Quik deals | coords |
| `is_grocery_area_serviceable` | Check coverage first | coords |
| `create_grocery_cart_with_quantities` (mutating) | Build the approved basket in one call | `items[]` with quantities and `catalog_item_id`, `merchant_id`, coords |
| `groceries_get_items_details` | Category, price, promos, variants for up to 20 items | item ids |

Quik responses always carry the resolved `merchant_id`, even when the request omitted it. Quik search can suggest up to 3 Shops fallback merchants.

### Shops
| Tool | Use for us | Key parameters |
|---|---|---|
| `global_search` | Find supermarkets and specialty merchants (never returns Quik) | `query`, coords, `location?`, `page?`, `limit?`, `tag_ids[]?`, `exclude_brand_ids[]?` |

Then `search_groceries_items` with that `merchant_id`. Shops deals come through `search_groceries_items` with `on_discount`.

### Cart and Checkout
| Tool | Use for us | Notes |
|---|---|---|
| `cart_get_basket_price` | Exact total after approval | `merchant_id`, coords, `business_type?`, `payment_type?`, `use_wallet?`. Subtotal + delivery + service minus best promo, auto-applied |
| `cart_get_checkout_promos` | Optional: show available promos | lists codes with conditions, `is_best_saving`, locked, deactivated. No tool applies a chosen code |
| `cart_get_basket` / `cart_get_quik_basket` / `cart_get_global_view` | Read baskets | read-only |
| `cart_reorder` (mutating) | "Same as last week" path: draft basket from a past order | `order_id`, coords |
| `cart_add_item(s)`, `cart_update_item`, `cart_delete_items`, `cart_delete_basket` (mutating) | Adjusting a basket | `cart_delete_items` takes `item_uuids` as a comma-separated string |
| `cart_grocery_checkout` (mutating) | Quik checkout. **Not used on stage** | `basket_id`, `total_price` |
| `cart_checkout` (mutating) | Shops checkout with `domain=shops`. **Not used on stage** | `basket_id`, `total_price` |

`domain` on cart tools is only `shops` (default; covers Quik and Shops) or `food`. `business_type` is separate (e.g. `quik`, `food`).

### Location
`reverse_geocode` (coords to address with `providerId`), then `save_new_address` (mutating). Not needed for the demo.

## Journeys

Groceries:
```
search_groceries_items (one term per item; Quik returns merchant_id)
  -> create_grocery_cart_with_quantities (catalog_item_id + merchant_id)   [confirm first]
  -> cart_get_basket_price
  -> cart_grocery_checkout                                               [confirm first; not on stage]
```

Reorder:
```
get_activities(past) -> cart_reorder(order_id) -> cart_get_basket_price -> cart_checkout
```

Shops:
```
global_search -> search_groceries_items(merchant_id) -> create_grocery_cart_with_quantities
  -> cart_get_basket_price -> cart_checkout(domain=shops)
```

## Agent playbook (paste into the system prompt)

Full text: https://builders.careem.com/docs/agent-playbook.md

- Always pass the user's latitude and longitude. Resolve "home" or "work" with `user_info`.
- Respect chain dependencies: ids from one call feed the next.
- **Never check out blind.** Call `cart_get_basket_price` first, pass its total as `total_price`, confirm contents, address and price with the user before any mutating tool.
- Payment resolves automatically (working card, then wallet, then cash). Only pass `payment_type` if the user asks.
- Personalise with `get_activities(past)`; prefer known favourites over cold search.
- Budget for many sequential tool calls; keep tool-loop limits generous.
- Errors arrive as an `error` string in the structured output, or as MCP tool errors. Retry reads; never blind-retry mutating tools (a timed-out checkout retried can order twice).
- Ignore `: keepalive` comments on SSE streams (every 15 seconds).

## Local sandbox

- No-code package: https://builders.careem.com/sandbox/careem-mcp-sandbox.zip
- Instruction for a coding agent: "Download the zip, unzip it, read careem-mcp-sandbox/README.md and follow it to build and run the Careem MCP sandbox in TypeScript. When it's running, tell me the URL and how to connect my MCP client."
- The agent implements `spec/BUILD.md` with an official MCP SDK, runs acceptance tests, starts the server at `http://127.0.0.1:8787/mcp`. A few hundred lines of code.
- Package files: `README.md`, `spec/BUILD.md`, `spec/SCENARIOS.md`, `spec/FIXTURES.md`, `spec/MCP_SERVER.md`, `spec/FORMAT.md`, `spec/tools/<domain>/<tool>.md` (one per tool with the exact tool definition). All browsable as Markdown on the site.
- Same tool names, descriptions, schemas and server identity as production. No OAuth, no client ID.
- **No state:** adding an item does not change what `cart_get_basket` returns. Cart creation always returns the same fixed basket.
- Rides is not in the sandbox.

### Test world
- User Leonardo DiCappuccino, Dubai, AED.
- Home LOC-50001 (Marina Gate 1, Dubai Marina, 25.0866, 55.1474), Work LOC-50002 (Emirates Towers), Gym LOC-50003.
- Quik: Careem Quik Dubai Marina, merchant 40001, 8 products.
- Shops: Marina Fresh Market 40101 (AED 7 delivery), JLT Organic Pantry 40201 (AED 9 delivery).
- Restaurants 30101 to 30105.
- Payment: Visa 4242 (preferred), Careem Wallet AED 125.50, cash.
- Only 2 grocery orders; no rice, atta or most vegetables. **We must add fixtures**, see [06-test-data-spec.md](06-test-data-spec.md).

### Triggering outcomes
| Argument | Outcome |
|---|---|
| id or text containing `missing` | Not found |
| text containing `trigger_upstream_down`, merchant 99999, restaurant 39999 | Upstream unavailable |
| latitude 0 with non-zero longitude | Outside service area |
| food query containing `xyz` | No results |
| `cart_checkout` with `payment_type: "card"`, `payment_id: 4000002` | Card declined |

Forcing: `./careem-mcp.sh scenario <tool> <scenario>`, `./careem-mcp.sh scenarios <tool>`, `./careem-mcp.sh reset`. Writes `.run/overrides.json`, re-read on every call, no restart.

### Connecting clients
| Client | Setup |
|---|---|
| Claude Code | `claude mcp add --transport http careem-mcp http://127.0.0.1:8787/mcp` |
| Cursor / VS Code / Windsurf / Kiro-style JSON | `{"mcpServers":{"careem-mcp":{"url":"http://127.0.0.1:8787/mcp"}}}` |
| Claude Desktop | `{"mcpServers":{"careem-mcp":{"command":"<binary>","args":["--stdio"]}}}` |
| MCP Inspector | `npx @modelcontextprotocol/inspector`, Streamable HTTP, the URL above |

Connection check: `food_get_restaurant_menu` with `restaurant_id` 30104 and Home coordinates should list Classic Syrniki.

## Production

1. Discovery: `GET https://mcp.careemapis.com/.well-known/oauth-protected-resource` points to `https://identity.careem.com/`. Then fetch its `/.well-known/openid-configuration`.
2. Authorization Code + PKCE (S256) against Careem Identity. Scopes `openid profile offline_access` (+ `locations` if needed).
3. Redirect URI must match exactly. Registered for the hackathon client: `http://localhost/callback`, `http://localhost:8080/callback`, `http://localhost:3000/callback`, `http://127.0.0.1/callback`.
4. Bearer token on every `/mcp` request. Wire refresh-token rotation.
5. Hosted sandbox: `https://mcp.sandbox.careemapis.com/mcp` with `https://identity.qa.careem-engineering.com/` (needs a client ID).

Moving from sandbox to production = change the URL and add OAuth. The contract is identical.

**Production uses a real Careem account. Mutating tools place real orders and spend real money.**
