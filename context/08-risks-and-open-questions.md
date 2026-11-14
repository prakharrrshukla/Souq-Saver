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
| Is Kiro use expected to be visible in the repo? | Organisers / AWS | Open |
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
| 14 Nov | Hackathon production client found on the training page; production attempt becomes a real option |
| 14 Nov | Laith: generate random data inspired by the sandbox fixtures, same file pattern. Real account data not used; build fully on sandbox + generated fixtures |

## After the event

Record: result, what was built, what was cut, repo link, demo video location, judge feedback.
