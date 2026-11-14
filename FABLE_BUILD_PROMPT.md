# Build Prompts for Fable: Souq Saver

**Repository:** https://github.com/prakharrrshukla/Souq-Saver (branch `main`)

The build is split into two prompts that share one fixed API contract:

| # | File | Scope | Status |
|---|---|---|---|
| 1 | [FABLE_PROMPT_1_FRONTEND.md](FABLE_PROMPT_1_FRONTEND.md) | Minimalist localhost web UI in `/web`. A sample the team will redesign later. | Build simple |
| 2 | [FABLE_PROMPT_2_BACKEND.md](FABLE_PROMPT_2_BACKEND.md) | Careem MCP sandbox, generated sample data, engine, Bedrock agent, HTTP API. Everything except the UI. | Build fully |

**Order:** start with Prompt 2 (backend). Prompt 1 can run in parallel using its mock mode, then switches to the real backend.

**X-ray:** every backend step (API, Bedrock call, agent tool, Careem MCP call, engine function, approval, guard) is recorded with what it was, full input, full output and source. Spec in Prompt 2 section 2a; viewer in Prompt 1's X-ray panel.

**The contract** is section 4 of Prompt 2, with types in `server/src/contract.ts`. Neither side changes it alone.

**Ports (localhost only):** frontend `5173`, backend API `8080`, Careem sandbox `8787`.

Planning context for both prompts is in [context/](context/README.md).
