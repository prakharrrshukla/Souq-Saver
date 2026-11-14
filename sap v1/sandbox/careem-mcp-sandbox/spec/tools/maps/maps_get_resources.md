---
tool: maps_get_resources
domain: maps
---

# maps_get_resources

Widget-only proxy for the ride map's basemap assets (style document, vector tiles, glyph
ranges, sprite). The tool is registered with `_meta.ui.visibility: ["app"]`, so only the
embedded Careem widget calls it over the MCP session — the model never sees it. Each path is
fetched from the maps API with the user's own token and returned base64-encoded, in input
order, with its upstream status and content type, so the widget can treat the result exactly
like a direct `fetch`.

The local server answers **for the first path** (`results[0].url` echoes `paths[0]`); production
returns one result per path (max 32). Bodies are short placeholders, not real tiles.

Try: `["/v1/tiles/styles/careem_base"]` (style JSON), `["/v1/tiles/fonts/glyphs/0-255.pbf"]`,
`["/v1/tiles/sprites/careem.json"]`, `["/v1/tiles/vector-tiles/base/12/2650/1754"]`
(default), a path containing `missing` (404 tile), `huge` (size cap), `trigger_upstream_down`
(transport error), `..` or a non-`/v1/tiles/` path (rejected).

## Scenario: paths-required

`paths: null` (or `[]`, forced with `./careem-mcp.sh scenario` since an empty array cannot be
matched).

```json match
{"paths": null}
```

```json response
{
  "results": [],
  "error": "paths is required"
}
```

## Scenario: too-many-paths

More than 32 paths in one call (trigger: a path containing `trigger_too_many`).

```json match
{"paths": ["~trigger_too_many"]}
```

```json response
{
  "results": [],
  "error": "too many paths: max 32 per call"
}
```

## Scenario: path-traversal

A path with a `..` segment (e.g. `/v1/tiles/../v2/admin`): rejected before any request is
made. The local server echoes the first path.

```json match
{"paths": ["~.."]}
```

```json response
{
  "results": [],
  "error": "invalid path \"{{args.paths.0}}\": invalid path"
}
```

## Scenario: path-outside-allowlist

A path outside `/v1/tiles/` (trigger: a path containing `/v2/`, e.g. `/v2/admin`): the whole
batch is rejected. The local server echoes the first path.

```json match
{"paths": ["~/v2/"]}
```

```json response
{
  "results": [],
  "error": "invalid path \"{{args.paths.0}}\": path must start with \"/v1/tiles/\""
}
```

## Scenario: upstream-unavailable

A path containing `trigger_upstream_down`: the request to the maps API times out; only that
entry carries an `error`, with status 0 and no body.

```json match
{"paths": ["~trigger_upstream_down"]}
```

```json response
{
  "results": [
    {
      "url": "{{args.paths.0}}",
      "status": 0,
      "content_type": "",
      "body_base64": "",
      "error": "Get \"{base}{{args.paths.0}}\": context deadline exceeded (Client.Timeout exceeded while awaiting headers)"
    }
  ]
}
```

## Scenario: oversized-asset

A path containing `huge`: the upstream body is larger than 4 MiB, so it is dropped and
flagged (status still reported).

```json match
{"paths": ["~huge"]}
```

```json response
{
  "results": [
    {
      "url": "{{args.paths.0}}",
      "status": 200,
      "content_type": "",
      "body_base64": "",
      "error": "response exceeds size limit"
    }
  ]
}
```

## Scenario: missing-tile

A path containing `missing`: the maps API answers 404; this is a normal result (no `error`),
the widget simply skips the tile. Body = base64 of `{"error":"missing tile"}`.

```json match
{"paths": ["~missing"]}
```

```json response
{
  "results": [
    {
      "url": "{{args.paths.0}}",
      "status": 404,
      "content_type": "application/json",
      "body_base64": "eyJlcnJvciI6Im1pc3NpbmcgdGlsZSJ9"
    }
  ]
}
```

## Scenario: style-document

A path under `/v1/tiles/styles/` (e.g. `/v1/tiles/styles/careem_base`): the Mapbox-style
document (base64 of a minimal style pointing at the tile, glyph and sprite paths).

```json match
{"paths": ["~/styles/"]}
```

```json response
{
  "results": [
    {
      "url": "{{args.paths.0}}",
      "status": 200,
      "content_type": "application/json",
      "body_base64": "eyJ2ZXJzaW9uIjo4LCJuYW1lIjoiY2FyZWVtX2Jhc2UiLCJzb3VyY2VzIjp7ImJhc2UiOnsidHlwZSI6InZlY3RvciIsInRpbGVzIjpbIi92MS90aWxlcy92ZWN0b3ItdGlsZXMvYmFzZS97en0ve3h9L3t5fSJdfX0sImdseXBocyI6Ii92MS90aWxlcy9mb250cy9nbHlwaHMve3JhbmdlfS5wYmYiLCJzcHJpdGUiOiIvdjEvdGlsZXMvc3ByaXRlcy9jYXJlZW0iLCJsYXllcnMiOltdfQ=="
    }
  ]
}
```

## Scenario: glyph-range

A path under `/v1/tiles/fonts/` (e.g. `/v1/tiles/fonts/glyphs/0-255.pbf`).

```json match
{"paths": ["~/fonts/"]}
```

```json response
{
  "results": [
    {
      "url": "{{args.paths.0}}",
      "status": 200,
      "content_type": "application/x-protobuf",
      "body_base64": "c2J4LWdseXBoLXJhbmdl"
    }
  ]
}
```

## Scenario: sprite-index

A path under `/v1/tiles/sprites/` (e.g. `/v1/tiles/sprites/careem.json`).

```json match
{"paths": ["~/sprites/"]}
```

```json response
{
  "results": [
    {
      "url": "{{args.paths.0}}",
      "status": 200,
      "content_type": "application/json",
      "body_base64": "eyJjYXIiOnsieCI6MCwieSI6MCwid2lkdGgiOjMyLCJoZWlnaHQiOjMyLCJwaXhlbFJhdGlvIjoxfX0="
    }
  ]
}
```

## Scenario: vector-tile

Default: a vector tile (e.g. `/v1/tiles/vector-tiles/base/12/2650/1754`), returned as
protobuf bytes (placeholder body).

```json response
{
  "results": [
    {
      "url": "{{args.paths.0}}",
      "status": 200,
      "content_type": "application/x-protobuf",
      "body_base64": "c2J4LXZlY3Rvci10aWxl"
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
        "app"
      ]
    }
  },
  "annotations": {
    "readOnlyHint": true
  },
  "description": "Fetch basemap assets (map style, vector tiles, glyph ranges, sprite) for the Careem widget's ride map. Called by the embedded widget over the MCP session, not by the model — the host authenticates with the user's own session.",
  "inputSchema": {
    "additionalProperties": false,
    "properties": {
      "paths": {
        "description": "relative /v1/tiles/... asset paths to fetch (map style doc, vector tiles, glyph ranges, sprite), max 32 per call; the host resolves them against the maps API with the user's session auth",
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
      "paths"
    ],
    "type": "object"
  },
  "name": "maps_get_resources",
  "outputSchema": {
    "additionalProperties": false,
    "properties": {
      "error": {
        "type": "string"
      },
      "results": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "body_base64": {
              "type": "string"
            },
            "content_type": {
              "type": "string"
            },
            "error": {
              "type": "string"
            },
            "status": {
              "type": "integer"
            },
            "url": {
              "type": "string"
            }
          },
          "required": [
            "url",
            "status",
            "content_type",
            "body_base64"
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
      "results"
    ],
    "type": "object"
  },
  "title": "Get Map Resources"
}
```
