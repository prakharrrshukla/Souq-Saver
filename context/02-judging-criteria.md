# 02. Judging Criteria

Source: the printed evaluation sheet handed to judges ("Judging Criteria: Hackathon Evaluation Sheet"). Each judge fills in a score per criterion, a total out of 100 and free-text notes.

| # | Criterion | Max | What the sheet says |
|---|---|---|---|
| 1 | Innovation and Originality | 25 | How unique, creative and novel is the solution? Does it tackle a regional problem in a new way, or merely replicate existing products? |
| 2 | Technical Execution and Integration | 30 | How functional is the prototype? Quality of the code and system architecture. Effective integration of the suggested tools (AWS Bedrock, Kiro, Careem MCP). |
| 3 | Impact and Relevance to "Super App Scale" | 25 | Alignment with Careem's purpose of "simplifying and improving daily life". Potential for significant impact and scalability within the region. |
| 4 | User Experience (UX) and Design | 10 | Intuitive, user-friendly, accessible. Frontend design, user flows, overall polish. |
| 5 | Quality of Pitch and Presentation | 10 | How effectively the team communicated problem statement, solution and technical approach in the final presentation. |
| | **Total** | **100** | |

## Reading the sheet

- **55 of 100 points** sit in Technical Execution (30) and Impact (25). Build effort should follow that weighting.
- **Technical Execution names three tools.** A judge reading "effective integration of AWS Bedrock, Kiro, Careem MCP" will look for each one. Missing any costs points under the biggest criterion.
- **"Regional problem in a new way"** and **"merely replicate existing products"** warn against a generic grocery list app. Our regional angle is the Gulf household: multilingual (Arabic, English, Hindi, Urdu, Tagalog), price-sensitive, shopping across Quik and supermarket merchants.
- **"Functional prototype"** beats a polished mock. A real tool-call trace running live against the Careem MCP is worth more than slides.
- **UX is only 10** and pitch only 10. Do not let polish eat build time, but both are cheap wins: a clean chat UI, readable tool-step panel, a rehearsed 3-minute demo.

## Our plan per criterion

### 1. Innovation and Originality (25)
- Priority filling: the cart fills by necessity tier and cuts from the bottom, personalised from the household's own history. Most "basket builders" optimise convenience, not hardship.
- Store choice across Quik and Shops merchants: choose where the whole basket is cheapest, with delivery and service fees included.
- Price drift and consumption cycles learned from order history, which turns reordering into planning.
- Five languages in text, chosen for the region's actual household mix.
- One-sentence pitch of novelty: "an agent that treats a grocery budget as a constraint to solve, not a number to display."

### 2. Technical Execution and Integration (30)
- **Careem MCP:** a real MCP client calls the real tool surface (`get_activities`, `groceries_get_items_details`, `global_search`, `search_groceries_items`, `cart_get_basket_price`, `create_grocery_cart_with_quantities`). Show every call live in a trace panel.
- **AWS Bedrock:** the reasoning model runs on Bedrock (Claude), including tool use. Show the model id in the demo. Mention AgentCore if used for hosting or memory. **[VERIFY credits and model access on the day]**
- **Kiro:** use Kiro for spec-driven build of at least one module and say so, with the spec files in the repo. Judges are told to look for Kiro.
- **Code quality and architecture:** a small, clear layering: MCP client, analysis engine, planner, API, UI. Deterministic maths in code (not in the model), the model only for language understanding and explanation. Tests for the planner.
- **Honest limits:** fixtures are labelled; the confirmation gate is enforced in code, not only in the prompt.

### 3. Impact and Super App Scale (25)
- Ties directly to "simplifying and improving daily life": groceries are a weekly pain, cost of living is a regional concern.
- Scale argument: works for every existing Careem user from day one (up to 105 past orders readable). Brand-new users get a 30-second onboarding. Fully personalised in about two months.
- Quantify: projected monthly savings on the sample household (about AED 192 a month in the planning mock-up, **to be recomputed from our real fixtures**).
- Super-app angle: the same pattern extends to Food and Box and, via Rides early access, to errands. Be clear this is future work, not shown.

### 4. UX and Design (10)
- Chat-first web app, one screen. Left: chat. Right: live tool-call steps, spend analysis, store comparison, basket.
- Budget slider or number, language selector, clear "Approve" button, clear "nothing has been charged" line.
- Accessibility: right-to-left rendering for Arabic and Urdu, readable contrast, large tap targets.

### 5. Pitch and Presentation (10)
- Three minutes. Problem, one live flow, architecture in one slide or one sentence, impact number, close. Script in [07-demo-and-pitch.md](07-demo-and-pitch.md).
- Backup video recorded before 17:30.

## Scoring self-check at 17:00

Ask each of these. If any answer is no, fix it before polish.
1. Does a live run call Careem MCP tools and show them on screen?
2. Is Bedrock visibly the model provider?
3. Can we name what Kiro generated?
4. Is there a number for savings that we can defend?
5. Does the demo end at a priced cart that waits for approval?
6. Is there a backup video?
