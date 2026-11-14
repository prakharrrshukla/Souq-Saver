# 01. Event and Rules

## The event

- **Name:** Careem Builders '26: Hack To The Future (powered by AWS). The judging sheet footer reads "Careem, AWS & DataCamp Hackathon".
- **Date and place:** Saturday 14 November 2026, Dubai. Teams of 1 to 3.
- **Selection:** our team is one of 15 finalists chosen from hundreds of entries.
- **Team:** Sameer Pahwa and Prakhar Shukla. Aahan Bhatnagar is also named on the finalist email.
- **Theme:** simplify and improve daily life in the region, at super-app scale.

## Format (all times Gulf Standard Time)

| Time | Block |
|---|---|
| 09:30 to 10:00 | MCP training |
| 10:00 to 18:00 | Build. **Code freeze at 18:00.** |
| 18:00 to 19:30 | Demos: 3 minutes each plus 2 minutes of jury Q&A |
| 19:30 to 20:15 | Deliberation |
| 20:15 to 21:00 | Awards |

Build window is 8 hours. Plan for a working end-to-end flow by about 14:00, polish and demo rehearsal after that.

## Prizes

1st place $3,000. 2nd place $1,500. 3rd place $600. Swag for all participants.

## Tools provided

- **Careem MCP**: sandbox (local and hosted) and production.
- **AWS**: prototype credits for Amazon Bedrock (Claude, GPT, Grok behind one API) and Amazon Bedrock AgentCore (managed agent hosting with memory, tools and identity).
- **Kiro**: free subscriptions to the AWS agentic IDE that turns specs into code.
- **Also usable:** Claude Code.

## Terms and conditions that constrain us

Full terms: https://builders.careem.com/hackathon/terms

- **4.2:** the project must be created during the hackathon.
- **5.1:** Careem owns the hackathon IP.
- **6.3:** the project and demo may not be shared publicly without Careem's consent.

**Consequence for this repository:** it holds planning context only, no product code written before the event. Check with the organisers before making any repo with demo material public. **[VERIFY]**

## Access facts relevant to the rules

- Production Careem MCP runs on the user's own real Careem account. Mutating tools place real orders and spend real money.
- The hackathon provides a production client for teams (public client, PKCE, no secret). The client ID is published on the training page, Stop 6. It is not copied into this repo.
- Rides is early access for hackathon teams on production only. We do not build on Rides.
