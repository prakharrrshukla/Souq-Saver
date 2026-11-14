# Souq Saver: Project Context Pack

Context for **Careem Builders '26: Hack To The Future (powered by AWS)**, 14 Nov 2026, Dubai.
Read this folder first. It is written so a human teammate or a coding agent (Claude Code, Fable) can pick up the project cold.

> Status: planning context, written before the build. Anything marked **[VERIFY]** is unconfirmed and must be checked on the day.

## One-paragraph summary

Souq Saver is a budget-aware household grocery agent built on the Careem MCP. It reads a user's Careem order history, models their spend by category, price drift and consumption cycles, then builds a weekly basket that fits a budget. When money is tight it fills the cart by necessity (water and staples first, snacks last) and cuts from the bottom. It picks the cheapest store for the whole basket (Careem Quik or a Careem Shops merchant), reports projected monthly savings, and never charges anything without the user's confirmation. It accepts requests in Arabic, English, Hindi, Urdu and Tagalog, such as "same as last week, cut 15%".

**Building?** The step-by-step build prompt for the coding agent is [../FABLE_BUILD_PROMPT.md](../FABLE_BUILD_PROMPT.md).

## Files

| File | What it holds |
|---|---|
| [01-event-and-rules.md](01-event-and-rules.md) | The hackathon, format, prizes, T&C rules that constrain us |
| [02-judging-criteria.md](02-judging-criteria.md) | The 100-point scoresheet and how each point is targeted |
| [03-product-spec.md](03-product-spec.md) | What we build: features, decisions, scope cuts, behaviours |
| [04-careem-mcp-reference.md](04-careem-mcp-reference.md) | Careem MCP tools, chains, auth, sandbox, playbook rules |
| [05-architecture-and-build-plan.md](05-architecture-and-build-plan.md) | System design, algorithms, data flow, build order, split of work |
| [06-test-data-spec.md](06-test-data-spec.md) | Fixtures to write so the sandbox can show our features |
| [07-demo-and-pitch.md](07-demo-and-pitch.md) | 3-minute demo script, pitch lines, jury Q&A |
| [08-risks-and-open-questions.md](08-risks-and-open-questions.md) | What can go wrong, fallbacks, unanswered questions |

## The five rules that override everything else

1. **The project must be built during the hackathon.** Do not reuse pre-written code. The clickable mock-up from planning is a look-alike only and is not part of this repo.
2. **Nothing is charged without confirmation.** Every mutating tool call needs an explicit user yes. Never retry a mutating call blindly.
3. **Price before checkout, always.** Use `cart_get_basket_price`. The demo stops at an approved, priced cart. No checkout on stage.
4. **Be honest about data.** Sample or fixture data is labelled as sample. Voice is not built and we say so.
5. **Show the tools we use.** Judges score integration of the suggested tools (AWS Bedrock, Kiro, Careem MCP; 30 points). **We do not use Kiro (team decision, 14 Nov).** Bedrock and Careem MCP must be deep and visibly used to make up for it.

## Glossary

- **MCP**: Model Context Protocol, the standard way an AI agent calls tools.
- **Careem Quik**: Careem's dark-store grocery delivery.
- **Careem Shops**: specialty and supermarket merchants, each with a `merchant_id`.
- **Mutating tool**: a tool that changes real state (basket, order, money). Marked with a warning sign in the Careem docs.
- **Priority tier**: our ranking of grocery categories by necessity.
- **Price drift**: the same item getting more expensive over successive orders.
- **Consumption cycle**: how often a household reorders an item.
