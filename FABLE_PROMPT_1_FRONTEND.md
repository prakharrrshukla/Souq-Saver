# Fable Prompt 1 of 2: Frontend (minimalist, localhost)

**Repository:** https://github.com/prakharrrshukla/Souq-Saver (branch `main`). Clone it, work in it, and push your commits there:

```bash
git clone https://github.com/prakharrrshukla/Souq-Saver.git
```

You are building the **minimalist web frontend of Souq Saver** for the Careem Builders '26 hackathon (Dubai, 14 Nov 2026). Code freeze is **18:00 GST**.

**What this frontend is:** a simple, clean starter UI that runs as a **localhost website on a laptop** (`http://localhost:5173`). It is a *sample* frontend: the team will redesign and edit it later. So optimise for **clarity and easy editing**, not for visual polish or clever abstractions.

**What it is not:** it does not contain business logic. All data, maths, planning and Careem calls happen in the backend (`FABLE_PROMPT_2_BACKEND.md`). The frontend only calls the backend API and displays what comes back.

**Read first:** `context/README.md`, `context/03-product-spec.md`, and **section 4 (API contract) of `FABLE_PROMPT_2_BACKEND.md`**. The contract is fixed; do not invent endpoints or fields. Import the types from `server/src/contract.ts`.

---

## 0. Rules

1. **Only `/web` is yours.** Do not edit `/server`, `/sandbox`, `/fixtures` or `/context`. If the contract seems wrong, note it in `web/CONTRACT_NOTES.md` instead of changing the backend.
2. **No business logic in the UI.** Never compute totals, budgets or savings in the browser. Display backend values as given (format to 2 decimals for AED).
3. **Never fake data.** If the backend is not running, show "Backend not reachable on localhost:8080" with a retry button. No hard-coded plans, except in the mock mode below.
4. **Honesty on screen:** always show the "Sample data" banner when `config.sampleData` is true, and "Nothing has been charged" next to the Approve button and after approval.
5. **No AI attribution** in commits or files. **No Kiro.** Do not publish anything (T&C 6.3).

---

## 1. Stack (keep it boring and editable)

- Vite + React + TypeScript, in `/web`. Dev server on port **5173**.
- **Plain CSS** in one file, `web/src/styles.css`, with all colours, spacing and fonts as CSS variables at the top (`--accent`, `--bg`, `--card`, `--text`, `--muted`, `--success`, `--warning`, `--danger`, `--radius`). So the team can restyle everything from one place.
- No UI component libraries, no Tailwind, no state libraries. React `useState`/`useReducer` only.
- Icons: none, or one tiny icon set via npm (e.g. `@tabler/icons-react`). Optional.
- SSE: use `fetch` with a readable stream (POST with body), parsed in `web/src/api.ts`.
- Light theme only for now. System font stack.

---

## 2. Layout (match the agreed sample)

One page, two columns on a laptop screen (stack to one column under 900px):

```
┌──────────────────────────────────────────────────────────────┐
│ Souq Saver                      [EN] [العربية] [हिन्दी] [اردو] [TL] │
│ ⚠ Sample data in Careem's format, via the Careem MCP sandbox │
├───────────────────────┬──────────────────────────────────────┤
│ Chat                  │ Live tool steps                      │
│  user / assistant     │  ✓ user_info … ✓ get_activities …    │
│  bubbles              ├──────────────────────────────────────┤
│                       │ Store comparison                     │
│                       │  Marina Fresh Market  [Cheapest] AED │
│                       │  Careem Quik                    AED  │
│                       │  JLT Organic Pantry  [Missing …]     │
│  [ message input ][→] ├──────────────────────────────────────┤
│  Weekly budget [AED ] │ Basket                               │
│                       │  item  [Kept|Swapped|Not due|Cut]    │
│                       │  Estimated total     AED …           │
│                       │  Nothing is charged  [Approve basket]│
├───────────────────────┴──────────────────────────────────────┤
│ Model: <modelId> on AWS Bedrock · Careem MCP: sandbox         │
└──────────────────────────────────────────────────────────────┘
```

Components (one file each in `web/src/components/`, small and readable):
| Component | Shows | Data source |
|---|---|---|
| `Header` | Name, language switch | local state |
| `SampleBanner` | Yellow banner | `GET /api/config` → `sampleData` |
| `Chat` | Bubbles, input, send, weekly budget field | `POST /api/chat` → `message` events |
| `ToolSteps` | List of steps with running/ok/error state and ms | `trace` events |
| `StoreComparison` | Each store, total, Cheapest tag, Missing tag | `plan.stores` |
| `Basket` | Items with reason chip and note on hover/tap, estimated total, monthly saving, Approve button | `plan.items`, `plan.estTotal`, `plan.monthlySavingEstimate` |
| `CartResult` | "Cart ready at <store>, total AED X (promo …). Nothing has been charged." | `POST /api/approve` → `cart` event |
| `Footer` | Model and MCP mode | `GET /api/config` |
| `XRay` | Full step-by-step X-ray of the current run (see below) | `xray` events, `GET /api/xray/:runId` |

**X-ray panel (required).** A toggle button "X-ray" in the header opens a full-width panel under the main layout (or a drawer). For the current run it lists every backend step in order, indented by `parentId`:
- Row: `#seq`, kind badge (`api`, `model`, `agent-tool`, `mcp`, `engine`, `data`, `approval`, `guard`), **name**, **source**, `dataOrigin`, status, ms, one-line `summary`.
- Click a row to expand: **Input** and **Output** as pretty-printed, collapsible JSON (monospace, copy button), plus `error` and `meta` if present.
- Live: rows appear as `xray` events arrive (`running` → `ok/error/blocked`).
- A run picker lists recent runs from `GET /api/xray`; selecting one loads `GET /api/xray/:runId`.
- Kind badges use distinct colours; `blocked` and `error` are red. Keep it plain and readable; this is a debugging and proof view, not decoration.

Reason chip colours: `kept` neutral grey, `swapped` accent blue, `reduced` blue, `deferred` amber ("Not due till <nextDue>"), `cut` red. Store tags: `Cheapest` green, `Missing …` red.

---

## 3. Behaviour

1. On load: `GET /api/config` and `GET /api/health`. Create a `sessionId` (random string) for the page.
2. Send: `POST /api/chat` with `{sessionId, message, language, budgetAed?}`. Clear the steps list at the start of each request. Append `trace` events live, stream `message` text into the assistant bubble, render the `plan` when it arrives, show `error` events as a calm red line in chat.
3. Language switch sets `language` for the next request. When a message has `rtl: true`, render that bubble with `dir="rtl"`.
4. Approve: `POST /api/approve` with `{sessionId, planId, approvalToken}`. Disable the button while running (show "Building cart…"), append the new `trace` steps, then show `CartResult`. Never show any "Pay" or "Checkout" button.
5. A small "Reset" text button calls `POST /api/reset` and clears the screen (for demo restarts).
6. Pre-fill the input with "Same as last week, but cut 15%" so the demo starts with one click. Keep an Arabic example line in `web/src/examples.ts` for the demo.

---

## 4. Mock mode (so the UI can be built before the backend is ready)

- `web/src/mock.ts` replays a recorded event sequence that matches the contract exactly (run → trace/xray → message → plan; approve → run → trace/xray → cart).
- Enabled only with `VITE_MOCK=true`. The Sample banner then reads "Mock mode: not connected to the backend". Default is off.
- Delete nothing when the backend arrives; just run without the flag.

---

## 5. Accessibility and demo readability
- Base font 16px, buttons at least 40px tall, clear focus outlines.
- Text contrast readable on a projector.
- Steps and basket panels must be readable from the back of a room: bold tool names, AED values right-aligned.

---

## 6. Files and commands
```
/web
   index.html
   package.json            dev, build, preview
   vite.config.ts          port 5173
   src/main.tsx
   src/App.tsx             layout + state
   src/api.ts              config, health, chat SSE, approve SSE, reset
   src/mock.ts
   src/examples.ts
   src/styles.css          all design tokens at the top
   src/components/*.tsx
   README.md               how to run, how to restyle (edit styles.css tokens), where each panel lives
```
Run: `npm run dev` from the repo root (starts everything) or `npm --workspace web run dev`.

---

## 7. Definition of done
- [ ] `http://localhost:5173` loads, shows banner, header, footer with model ID from the backend.
- [ ] "Same as last week, but cut 15%" shows live steps, store comparison, basket with reason chips and estimated total.
- [ ] Approve shows the exact total and "Nothing has been charged". No checkout button exists.
- [ ] Arabic reply renders right to left.
- [ ] Backend down → clear message and retry, no crash.
- [ ] Mock mode works with `VITE_MOCK=true` (mock includes `run` and `xray` events).
- [ ] X-ray panel shows every step live with kind, name, source, status, ms, and expandable full input and output JSON; past runs can be reopened.
- [ ] All styling lives in `styles.css` variables; `web/README.md` explains how to edit.
- [ ] Pushed to `main`, no AI attribution.
