# Contract notes

Points where the written contract (FABLE_PROMPT_2_BACKEND.md section 4) left room, and what was built.
`server/src/contract.ts` is the source of truth.

- `message` events carry an `id` (the contract text mentions chunks "with the same id" but the example
  omits the field). The backend currently sends one chunk per message.
- `cart.promo` is `null` when no promo applies.
- `plan.items[].lineTotal` is `0` for items not in the basket (`deferred`, `cut`), so the UI never has
  to work out which rows count.
- `budget.source` can be `cut_percent`, `absolute` or `last_week` (no budget given).
- `GET /api/xray` returns `{ runs, sampleData }`; `GET /api/xray/:runId` returns the run summary plus
  `ordered` (flat, by `seq`) and `tree` (nested by `parentId`).
- `GET /api/health` has `ok: false` while the stub model is in use, because `bedrock` is false.
- `modelProvider` is "AWS Bedrock", or "Local stub (AWS Bedrock pending)" while the stub is in use.
- `trace.tool` also uses `approval:<name>` and `guard:<name>` besides Careem tool names and `engine:<name>`.
- The UI adds an Insights panel (from `plan.insights`) that the layout sketch did not list.
