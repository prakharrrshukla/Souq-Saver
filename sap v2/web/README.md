# Souq Saver web (sample frontend)

A plain starter UI meant to be redesigned. It holds no business logic: it calls the backend API and
shows what comes back. Types are imported from `../server/src/contract.ts`.

## Run

```bash
npm run dev                      # from the repo root: sandbox + backend + this app
npm --workspace web run dev      # only this app, on http://localhost:5173
VITE_MOCK=true npm --workspace web run dev    # mock mode: no backend needed
```

If the backend is down the page says "Backend not reachable on localhost:8080" with a Retry button.
`VITE_API_URL` changes the backend address (default `http://localhost:8080/api`).

## The four phones (default view)

http://localhost:5173 shows three Careem-style phones, one per demo household (Leonardo, Khan family,
Joy), and a fourth phone that X-rays whichever household phone is running: live tool steps and every
backend step. Each phone opens on a short splash, then Home; the Souq Saver card under the service
tiles slides the planner in. Back keeps Home's scroll position, and the basket and chat stay until
"Start a new chat".

One phone runs at a time, because the Careem MCP sandbox serves one household at a time: before a
phone's request the app switches the sandbox to that phone's household (`POST /api/persona`). The
backend keeps each session bound to its own household, so the other phones' baskets survive and can
still be approved later. Under 720 px wide, each phone fills the screen and you swipe between them.

| File | What it is |
|---|---|
| `src/phones/Phones.tsx` | The stage: phone frames, scaling, the one-at-a-time lock, the X-ray phone's live feed |
| `src/phones/usePlanner.ts` | One phone's planner session (chat, budget, plan, cart, approve) |
| `src/phones/Home.tsx` | Careem-style Home: search, offer banner, service tiles, Souq Saver card, payment cards, tab bar |
| `src/phones/SouqSaverScreen.tsx` | The Souq Saver screen inside a phone, reusing the planner components |
| `src/phones/art.tsx` | Inline SVG illustrations and icons (the project has no image assets) |
| `src/phones/phones.css` | Stage, phone and Careem-style styles (tokens at the top) |

The earlier one-page dashboard is still available at http://localhost:5173/#desk.

## Restyle

Everything visual is in [src/styles.css](src/styles.css). The design tokens are at the top
(`--accent`, `--bg`, `--card`, `--text`, `--muted`, `--success`, `--warning`, `--danger`, `--radius`,
spacing and fonts). Change those first; the rest of the file uses them.

## Where things live

| File | What it is |
|---|---|
| `src/App.tsx` | Page layout and all state |
| `src/api.ts` | Every backend call: config, health, chat SSE, approve SSE, reset, X-ray |
| `src/examples.ts` | The pre-filled message and the example chips (Arabic, Hindi, Urdu, Tagalog lines) |
| `src/mock.ts`, `src/mock.recording.json` | Mock mode: replays a run recorded from the real backend |
| `src/components/Header.tsx` | Name, language switch, X-ray toggle, Reset |
| `src/components/SampleBanner.tsx` | Yellow "Sample data" banner |
| `src/components/Chat.tsx` | Bubbles, input, example chips, weekly budget |
| `src/components/ToolSteps.tsx` | Live Careem MCP and engine steps (`trace` events) |
| `src/components/StoreComparison.tsx` | Stores, totals, Cheapest and Missing tags |
| `src/components/Basket.tsx` | Items with reason chips, totals, Approve button |
| `src/components/CartResult.tsx` | "Cart ready … Nothing has been charged" |
| `src/components/Insights.tsx` | Price drift and weekly spend by category |
| `src/components/XRay.tsx` | Every backend step with full input and output, plus past runs |
| `src/components/Footer.tsx` | Model id and Careem MCP mode |

Re-record the mock after a contract change: `npm run dev:backend`, then `npm --workspace web run record-mock`.

Rules to keep when redesigning: never compute totals in the browser, keep the Sample banner, keep
"Nothing has been charged" next to Approve and after it, and never add a Pay or Checkout button.
