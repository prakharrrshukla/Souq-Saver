# careem-mcp — local specification

A self-contained specification of the Careem MCP server (`careem-mcp-service`) with scenario
data, so careem-mcp can run locally and behave like production. Hand it to any coding agent with:

> Read `README.md` and `BUILD.md` in this folder and build careem-mcp from it.

It has everything the local server needs: the exact tool contracts and canned responses for every
outcome. Nothing in here is real: no real users, hosts, tokens or payment data.

## Contents

| Path | What it is |
| --- | --- |
| [BUILD.md](BUILD.md) | Language-agnostic spec for implementing careem-mcp locally from this folder, with acceptance tests |
| [MCP_SERVER.md](MCP_SERVER.md) | Protocol/HTTP surface of the real server: transport, initialize, auth & user identity, resources, error conventions |
| [FORMAT.md](FORMAT.md) | Format of a tool file, match rules, placeholders |
| [SCENARIOS.md](SCENARIOS.md) | Every tool → every scenario, its trigger arguments and what it simulates |
| [SOURCE.md](SOURCE.md) | Which production version the definitions were exported from, and the tool list |
| [FIXTURES.md](FIXTURES.md) | The shared fixture world: persona, addresses, ride products, restaurants, menu, groceries, baskets, orders |
| [tools/](tools/) | **One file per MCP tool**, grouped by domain (`rides/ location/ maps/ food/ groceries/ cart/ box/ user/`) |

## A tool file at a glance

```
tools/rides/get_ride_cancellation_reasons.md
├── notes        what the scenarios simulate, which arguments trigger which one
├── ## Scenario: one per outcome; ```json match (when) + ```json response (what)
└── ## Definition  exact MCP tool object (name, description, annotations, input/output
                   JSON Schema), exported from production
```

The local server serves each tool's `## Definition` in `tools/list` and answers `tools/call`
from its `## Scenario` sections. FORMAT.md also describes a `## Flow` section and upstream
contracts; those document Careem internals and are not part of this public package.
