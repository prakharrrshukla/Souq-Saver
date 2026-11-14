# careem-mcp sandbox (no-code package)

This folder contains **no code**, only Markdown. Give it to a coding agent and ask it to run the
Careem MCP sandbox: the agent builds a local MCP server with the same tools, server identity and
response shapes as production careem-mcp, answering from scenario files. It never calls Careem
systems and needs no credentials.

Downloaded from https://builders.careem.com/docs/sandbox

## For the agent: what to do

You were asked to "run the Careem MCP sandbox" (or similar) and given this folder.

1. Decide the language: use the one the user named; if they named none, ask. Any language with an
   official MCP SDK works (TypeScript `@modelcontextprotocol/sdk`, Python `mcp`, Go, ...).
2. Build into a **new directory outside this folder** (default: a sibling named
   `careem-mcp-<language>`) so the package stays code-free, and copy `spec/` next to your code
   (the server reads the tool files at runtime).
3. Read [spec/README.md](spec/README.md), then implement [spec/BUILD.md](spec/BUILD.md).
4. Implement every acceptance test in spec/BUILD.md §7 and make them all pass.
5. Provide a small CLI with start, stop, status, logs, `scenarios [tool]`, `scenario <tool> <name>`
   and `reset` (the last two write `.run/overrides.json`, see spec/BUILD.md §6). The spec calls
   it `./careem-mcp.sh`; name yours however suits the language.
6. Start it on `http://127.0.0.1:8787/mcp` and tell the user how to connect their client
   (spec/BUILD.md §8).

## Contents

| Path | What it is |
| --- | --- |
| [spec/README.md](spec/README.md) | Start here: what the specification contains |
| [spec/BUILD.md](spec/BUILD.md) | Language-agnostic build spec, with acceptance tests and client setup |
| [spec/MCP_SERVER.md](spec/MCP_SERVER.md) | Protocol and HTTP surface of the real server |
| [spec/FORMAT.md](spec/FORMAT.md) | Format of a tool file, match rules and placeholders |
| [spec/FIXTURES.md](spec/FIXTURES.md) | The shared test world: persona, addresses, restaurants, baskets, orders |
| [spec/SCENARIOS.md](spec/SCENARIOS.md) | Every tool's scenarios and the arguments that trigger them |
| [spec/SOURCE.md](spec/SOURCE.md) | The production version the tool definitions come from, and the tool list |
| [spec/tools/](spec/tools/) | One file per MCP tool: notes, scenarios and the exact tool definition |

## Using the running server

- Every id, name and price comes from one fixture world: [spec/FIXTURES.md](spec/FIXTURES.md).
- [spec/SCENARIOS.md](spec/SCENARIOS.md) lists every scenario and the arguments that trigger it.
- Force an outcome out-of-band: `scenario <tool> <name>`, then `reset`.
- Everything a client can observe is production-identical; nothing tells the model it is a local copy.

## What this public package leaves out

Careem's internal upstream service contracts, the step-by-step `## Flow` section of each tool
file (spec/FORMAT.md still describes it) and the reference Go implementation are not included.
None of them is needed to build or run the sandbox: the server answers from each tool's
`## Scenario` and `## Definition` sections only.
