# 08. Risks and Open Questions

## Risks and fallbacks

| Risk | Likelihood | Impact | Fallback |
|---|---|---|---|
| Sandbox build takes too long | Medium | High | Start it first at 10:00 with Claude Code; meanwhile write fixtures and planner against recorded JSON |
| Bedrock access or credits not ready | Medium | High | Ask AWS team at once; temporary fallback to another Claude endpoint for development only, switch back before demo **[VERIFY]** |
| Model unreliable with many tools | Medium | Medium | Expose only 5 high-level tools; planner does the work in code |
| Sandbox cart is stateless (fixed basket) | Certain | Medium | Show our planned list as the basket; label sandbox cart response as sample |
| Production OAuth fails or is slow | Medium | Low | Stay on sandbox; it is the plan, not a downgrade |
| Production places a real order | Low | Very high | Checkout tools blocked in code; approval gate; never retry mutating calls |
| Arabic/Urdu right-to-left layout breaks | Low | Low | Test at 15:30; fall back to left-aligned text |
| Live demo fails on stage | Medium | High | Backup video, same script |
| Wi-Fi drops | Medium | High | Everything on localhost; Bedrock needs internet, so the video is the fallback |
| Running out of time | High | High | Build order in 05; cut nice-to-haves, never the confirmation gate |

## Open questions

| Question | Ask whom | Status |
|---|---|---|
| Can we use the hackathon production client for real order history, and is placing a cart (no checkout) acceptable? | Laith at MCP training, 09:30 | **Answered:** use the sandbox's fake data and generate random data inspired by it, in the same file pattern |
| Which sandbox should judges see: local, hosted or production? | Organisers | Open |
| Bedrock region, model access and credit limits | AWS team | Open |
| Can the repo be public during and after the event (T&C 6.3)? | Organisers | Open |
| What exactly must be submitted at code freeze (repo link, video, slides)? | Organisers | Open |

Questions emailed to the organisers on 7 Nov got no reply; ask in person.

## Decisions log

| Date | Decision |
|---|---|
| 7 Nov | Split of work: Sameer analysis and budget logic; Prakhar agent, Careem connection, chat |
| 12 Nov | Priority filling and store choice added; store choice marked extremely important |
| 12 Nov | Voice cut; checkout not on stage; promo advisor and split orders out |
| 12 Nov | Build on local sandbox with labelled fixtures; production only if access works |
| 14 Nov | Judging sheet received: 30 points for technical execution incl. Bedrock, Kiro, Careem MCP integration; plan updated to show all three |
| 14 Nov | **Kiro dropped** (team decision). Planner built with Claude Code (Opus 5.5); pitch leans on Bedrock and Careem MCP |
| 14 Nov | Hackathon production client found on the training page; production attempt becomes a real option |
| 14 Nov | Laith: generate random data inspired by the sandbox fixtures, same file pattern. Real account data not used; build fully on sandbox + generated fixtures |
| 14 Nov | Sample data is served **through the sandbox**: `fixtures/generate.ts` writes scenario files in Careem's tool-file format to `fixtures/out/tools`, which the sandbox reads as an overlay ahead of Careem's own scenarios. Careem's files are unchanged |
| 14 Nov | Fixture records do not carry a `sample: true` field: Careem's output schemas reject extra fields and the sandbox must not hint that it is a local copy. Labelling is done by our API (`sampleData: true` on every response, `dataOrigin: sample` in X-ray) and the UI banner |
| 14 Nov | History is 10 weekly **Quik** orders; the store comparison then shows Marina Fresh Market is cheaper. JLT lacks water, atta and soft drinks |
| 14 Nov | "Due this week" follows the build prompt (`nextDue <= today + 7`), compared in whole days |
| 14 Nov | Fit order: cut T5, then cheaper swaps, then reduce T3, then remove T4 and T3. Swaps come before reducing fresh food because a swap loses nothing the household needs |
| 14 Nov | Tier promotion (in 75% of orders) applies to T3 and T4 only. Treats are never promoted automatically, otherwise weekly cola could not be cut; the user can pin them ("keep the chips") |
| 14 Nov | Store comparison on screen prices the **final** basket at every store; the store is chosen on this week's full candidate list before fitting |
| 14 Nov | Sandbox cart is stateless: after approval the subtotal is our planned basket, fees and promo come from `cart_get_basket_price`. Fee estimates before approval use the same read-only call per store |
| 14 Nov | Bedrock session was expired on the build machine, so a clearly marked rule-based stub model stands in until `aws login`; the backend switches by itself. Tests always use the stub |

## After the event

Record: result, what was built, what was cut, repo link, demo video location, judge feedback.
