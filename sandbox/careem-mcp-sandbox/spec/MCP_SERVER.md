# MCP server surface

How `careem-mcp-service` behaves at the protocol and HTTP level, independent of any one tool.
A local build ([BUILD.md](BUILD.md)) reproduces everything a client can observe; production-only
behaviour (OAuth) is summarised for completeness.

## Transport (required)

| Production | Local build |
| --- | --- |
| `ANY /mcp` — MCP **streamable HTTP** (go-sdk `NewStreamableHTTPHandler`, stateful sessions) | same: `/mcp` |
| — | `/sse` legacy SSE transport, plus `--stdio` for clients that spawn a process |
| CORS on `/mcp`: `Access-Control-Allow-Origin/Methods/Headers: *`, `OPTIONS` → `200` with no body | not needed for local clients |
| SSE keep-alive: on `GET /mcp` streams the server writes the SSE comment `: keepalive\n\n` every **15 s** so idle connections aren't dropped | optional |

### initialize

```json response
{
  "protocolVersion": "2025-06-18",
  "capabilities": { "tools": { "listChanged": true }, "resources": { "listChanged": true }, "logging": {} },
  "serverInfo": { "name": "careem-mcp-service", "version": "<service.version from config>" }
}
```

The local build answers identically: `careem-mcp-service` / `v1.0.0`, no `title`, no
`instructions`.

### tools/list (required)

Returns the `json tool` block of every file in [`tools/`](tools/) (the count is in
[SOURCE.md](SOURCE.md)). Production tool objects carry
`"_meta": { "ui": { "resourceUri": "ui://careem-mcp-app", "visibility": ["model"] } }` on the
tools that render the ChatGPT widget; the local build keeps `_meta` and serves the widget
resource (below). `outputSchema` is advertised as in production — every scenario validates
against it.

### tools/call (required)

Production handlers are go-sdk typed handlers (`mcp.AddTool`), so every result has:

- `content`: one `text` item whose text is the JSON encoding of the output object.
- `structuredContent`: the same output object.
- `isError: false` — **even for business failures**. Failures are reported in the output's
  `"error"` string field, e.g. `{ "error": "rideId is required" }`. `isError: true` only happens
  for auth failures (see below), when arguments fail schema validation
  (`validating "arguments": …`), or when a handler returns a Go error; the text content then
  holds the message.

Unknown tool → JSON-RPC error `-32602` (`unknown tool "<name>"`).

## Resources

`resources/list`:

```json response
{
  "resources": [
    {
      "uri": "ui://careem-mcp-app",
      "name": "ui://careem-mcp-app",
      "description": "Careem Widget",
      "mimeType": "text/html;profile=mcp-app",
      "_meta": {
        "ui": {
          "resourceUri": "ui://careem-mcp-app",
          "csp": {
            "connectDomains": ["https://careem-mcp-app.pages.dev"],
            "resourceDomains": [
              "https://careem-mcp-app.pages.dev",
              "https://careem.s3.eu-west-1.amazonaws.com",
              "https://d1a3f4spazzrp4.cloudfront.net",
              "https://careem-catalog-media.media.careem.com",
              "https://partner-mot-prod.media.careem.com"
            ],
            "frameDomains": [],
            "baseUriDomains": []
          }
        },
        "prefersBorder": false,
        "domain": "https://careem-mcp-app.pages.dev",
        "annotations": { "ttlMs": 60000, "destructiveHint": false, "openWorldHint": false, "readOnlyHint": true }
      }
    }
  ]
}
```

`resources/read` `{ "uri": "ui://careem-mcp-app" }` returns one content item with the same
`uri`, `mimeType` and `_meta`, and `text` set to a minimal HTML shell that loads the React
widget (`mcp-app/` in this repo) from config `mcp-app.public-domain` +
`mcp-app.js-file-endpoint` / `mcp-app.css-file-endpoint`:

```text response
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>Careem MCP App</title>
<link rel="stylesheet" href="https://careem-mcp-app.pages.dev/assets/index.css">
</head>
<body>
<div id="root"></div>
<script type="module" src="https://careem-mcp-app.pages.dev/assets/index.js"></script>
</body>
</html>
```

The local build serves this resource exactly as above with the production widget domain
`https://careem-mcp-app.pages.dev` (configurable, e.g. to a locally served `mcp-app/dist`).

## Authentication and user identity

Production is an OAuth 2.0 protected resource; the local build has **no auth**.

1. **Discovery (RFC 9728).** An unauthenticated client fetches
   `GET /.well-known/oauth-protected-resource`, which names Careem Identity as the authorization
   server, then runs authorization code + PKCE there. See
   https://builders.careem.com/docs/authentication.
2. **Calls.** The client sends `Authorization: Bearer <access token>` on every `/mcp` request.
3. **Auth failures** are the one place production answers with `isError: true` (text content):

   | Condition | Text |
   | --- | --- |
   | no request headers | `missing request headers` |
   | no `Authorization` header | `missing Authorization header` |
   | bearer token is not a JWT with a `sub` claim | `token missing subject claim` |
   | the token carries no user identity | `missing X-User-ID header` |

Everything a handler decides is a normal result with an `"error"` field.

The local build behaves as if every request carried a valid token for the [FIXTURES](FIXTURES.md)
persona, user `900000001`.

## Other HTTP routes

| Route | Response |
| --- | --- |
| `GET /` | `200` with a favicon link |
| `GET /favicon.*` | `301` redirect to `https://www.careem.com/<same path>` |
| `GET /.well-known/oauth-protected-resource` | OAuth discovery (above) |
| `GET /.well-known/openai-apps-challenge` | `200` text: OpenAI apps domain-verification token |

The local build exposes `GET /health` → `{ "status": "ok", "tools": <number of tools> }`.
