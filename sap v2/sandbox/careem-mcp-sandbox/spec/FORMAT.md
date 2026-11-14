# Tool file format

Every tool exposed by `careem-mcp-service` has exactly one file:
`tools/<domain>/<tool_name>.md`. The local server re-reads these files on **every call**,
so you can edit a response and call the tool again without restarting anything.

A tool file has four parts:

1. **Notes** — what the scenarios simulate and which arguments trigger which one.
2. `## Flow` — implementation notes on how production arrives at each scenario. **Omitted from
   this public package**; the local server never reads it.
3. `## Scenario: <name>` sections — the covered by scenarios tool responses.
4. `## Definition` — the exact MCP tool object (name, title, description, annotations,
   inputSchema, outputSchema), exported from production. Never edit it by hand.

## Anatomy

````markdown
---
tool: get_ride_cancellation_reasons   # required, must match the definition name
domain: rides                         # informational
---

# get_ride_cancellation_reasons

Free-form notes for humans: what the scenarios simulate, which ids trigger which one.

## Scenario: ride-not-found

```json match
{ "rideId": "~missing" }
```

```json response
{ "success": false, "rideId": "", "error": "failed to fetch cancellation reasons: RIDE_NOT_FOUND: Ride {{args.rideId}} not found" }
```

## Scenario: captain-assigned-survey

```json response
{ "success": true, "rideId": "{{args.rideId}}", "survey": { "...": "..." } }
```

## Definition

```json tool
{ "name": "get_ride_cancellation_reasons", "inputSchema": { … }, "outputSchema": { … }, … }
```
````

### Scenarios

- Each `## Scenario: <name>` section is one possible answer.
- Scenarios are tried **top to bottom**; the first one whose `json match` block matches the
  call arguments wins.
- A scenario **without** a `json match` block is the default. Every file needs one, and it
  should normally be the last section.
- `./careem-mcp.sh scenario <tool> <scenario>` forces a scenario regardless of arguments,
  e.g. `./careem-mcp.sh scenario cart_checkout payment-declined` (out-of-band, via
  `.run/overrides.json` — never visible to the MCP client).

### `json match` rules

The block is a partial object compared against the call arguments:

| Pattern | Meaning |
| --- | --- |
| `"rideId": "ride_123"` | equal (strings are case-insensitive) |
| `"query": "~pizza"` | contains `pizza` (case-insensitive) |
| `"promo_code": "*"` | argument is present and not null |
| `"code": "=*"` | literal comparison (to match a value that is `*` or starts with `~`) |
| `"limit": 5` | numbers / booleans / null compare exactly (`"5"` would also match, as text) |
| `{ "location": { "city": "dubai" } }` | nested objects match recursively |
| `"search_terms": ["milk"]` | every listed element matches some element of the argument array |

Non-string arguments are compared by their JSON text, string patterns never match `null`, and
a key absent from the arguments never matches. Keys must be real input names of the tool —
`--check` flags typos. Note an empty array `[]`
matches *any* array (there is nothing it requires), so it can't target an empty argument.

### `json response` vs `json error`

- `json response` → returned as `structuredContent` **and** as JSON text content, exactly like
  the real server. Production tools report business failures *inside* the output with an
  `"error"` field (not as protocol errors), so model error cases that way:
  `{ "error": "basket not found" }`.
- `json error` → returned with `isError: true`. Use it only to simulate a hard tool failure.

### Placeholders

Responses are JSON templates. Placeholders work both as bare values and inside strings:

| Placeholder | Example output |
| --- | --- |
| `{{args.rideId}}`, `{{args.items.0.quantity}}` | value of a call argument (`null` if missing) |
| `{{now}}`, `{{now+15m}}`, `{{now-2h}}` | `2026-10-05T12:00:00Z` |
| `{{now+2h@20m}}` | rounded down to a 20-minute boundary |
| `{{now+24h\|date}}`, `\|weekday`, `\|hhmm`, `\|daylabel` | `2026-10-07`, `Wednesday`, `04:20`, `Fri, 9th Oct` (Asia/Dubai) |
| `{{unix}}`, `{{unix+30m}}` | `1791201600` |
| `{{unixms}}`, `{{unixms+30m}}` | `1791201600000` |
| `{{uuid}}` | random UUID v4 |
| `{{rand:1000-9999}}` | random integer in range |

## Keeping scenarios honest

Acceptance test 11 in [BUILD.md](BUILD.md) renders **every** scenario as if it were forced (no selection, no input validation), with
sample arguments built from the tool's input schema:

- every property gets `enum[0]` if it has an enum; otherwise, by its type (for nullable types
  like `["null","string"]` use the first non-null type): `"sample"` (string), `1`
  (integer/number), `false` (boolean), `[<sample item>]` (array), a nested sample object
  (object);
- then the scenario's match block is laid over it: `"~x"` / `"=x"` become `"x"`; `"*"` keeps
  the sample value (or `"sample"` if there is none); nested objects merge recursively; a match
  array **replaces** the sample array, and each object element in it is merged over the sample
  item so required fields stay filled.

So echoing numeric arguments with `{{args.x}}` is fine. Schemas are JSON Schema **draft
2020-12**. (Sample values can collide with magic triggers — e.g. `total_price: 1` — which is
why this check forces scenarios instead of selecting them.)

It fails when a template is broken, a match key is not a real input, a scenario's response does
**not validate against the tool's real output schema**, or a tool file has no default scenario.
