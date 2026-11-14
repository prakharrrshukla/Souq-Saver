// API contract shared by the backend and /web (FABLE_PROMPT_2_BACKEND.md section 4).
// Types only, no runtime code and no imports, so the frontend can import this file directly.
// Do not change these shapes without updating both prompts.

export type Language = 'en' | 'ar' | 'hi' | 'ur' | 'tl';
export type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
/** "unavailable": the user asked for it (or the household needs it) but no nearby store sells a matching product. */
export type Reason = 'kept' | 'swapped' | 'reduced' | 'deferred' | 'cut' | 'unavailable';

/** What went wrong, so the UI can tell a typo from an outage. Only "network" means the backend could not be reached. */
export type ErrorKind = 'validation' | 'model' | 'careem' | 'timeout' | 'network' | 'approval' | 'busy' | 'internal';
/** Body of every 4xx/5xx JSON response. `error` is the human message; `code` is stable; `field` names the bad input. */
export type ApiErrorBody = { error: string; code: string; kind: ErrorKind; field?: string; sampleData: boolean };

// GET /api/config
export type Config = {
  modelId: string;
  modelProvider: string; // "AWS Bedrock"
  mcpMode: 'sandbox' | 'production';
  sampleData: boolean;
  languages: Language[];
  currency: 'AED';
};

// GET /api/health
export type Health = { ok: boolean; mcp: boolean; bedrock: boolean };

// POST /api/chat (response is Server-Sent Events)
export type ChatRequest = { sessionId: string; message: string; language?: Language; budgetAed?: number };

// POST /api/approve (response is Server-Sent Events)
export type ApproveRequest = { sessionId: string; planId: string; approvalToken: string };

// GET /api/persona, POST /api/persona { persona } (sandbox only): the demo household being served
export type PersonaKey = 'leonardo' | 'family' | 'single';
export type PersonaInfo = { current: PersonaKey | null; personas: { key: PersonaKey; label: string; area: string }[]; switchable: boolean };

// POST /api/reset
export type ResetRequest = { sessionId: string };

export type StoreQuote = {
  merchantId: string;
  name: string;
  type: 'quik' | 'shops';
  itemsTotal: number;
  deliveryFee: number;
  serviceFee: number;
  estTotal: number;
  missing: string[];
  valid: boolean;
  chosen: boolean;
};

export type PlanItem = {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  /** 0 for items that are not in the basket (reason "deferred" or "cut"). */
  lineTotal: number;
  tier: Tier;
  reason: Reason;
  note: string;
  replaces?: string | null;
  nextDue: string | null; // YYYY-MM-DD
};

export type Plan = {
  planId: string;
  sampleData: boolean;
  lastWeekTotal: number;
  budget: { aed: number; source: 'cut_percent' | 'absolute' | 'last_week'; cutPercent?: number };
  stores: StoreQuote[];
  items: PlanItem[];
  estTotal: number;
  withinBudget: boolean;
  shortfall: number;
  monthlySavingEstimate: number;
  insights: {
    categorySpend: { category: string; weeklyAvg: number }[];
    /** Share of the household's Careem spend on fresh produce, computed from its orders. */
    focus?: { freshShare: number; label: 'fresh' | 'long_shelf' | 'mixed' };
    priceDrift: { name: string; driftPct: number }[];
    /** v2: how the AI engine describes this household, learned from its Careem orders. Absent on the rule-based engine. */
    household?: { summary: string; routines: string[]; likes: string[]; dislikes: string[]; switches: string[]; model: string };
  };
  /** Empty when approval is not allowed (see `approval`). */
  approvalToken: string;
  /** Whether this exact plan may be approved, and why not. */
  approval?: { allowed: boolean; code?: 'over_budget' | 'invalid_plan' | 'no_store' | 'limits'; message?: string };
  /** Who built the basket. basket "rules" means the AI's basket failed the checks (or Bedrock is off) and the rule-based planner was used. */
  engine?: { basket: 'ai' | 'rules'; profile: 'ai' | 'history'; model?: string; fallbackReason?: string };
  /** Why the chosen store: fresh produce sends the whole basket to Careem Quik; long-shelf-life-only baskets go to the cheapest supermarket. */
  routing?: { merchantId: string; storeName: string; rule: 'fresh_to_quik' | 'long_shelf_to_shops' | 'no_quik' | 'no_shops'; reason: string; fresh: string[] };
};

export type Cart = {
  merchantId: string;
  storeName: string;
  basketId: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  promo: { code: string; saving: number } | null;
  total: number;
  charged: false;
  sampleData: boolean;
};

export type XrayKind = 'api' | 'model' | 'agent-tool' | 'mcp' | 'engine' | 'data' | 'approval' | 'guard';
export type XrayStatus = 'running' | 'ok' | 'error' | 'blocked';

export type XrayStep = {
  runId: string; // one per /api/chat or /api/approve request
  stepId: string;
  parentId?: string; // nesting: model call -> agent tool -> mcp/engine steps
  seq: number; // order within the run
  kind: XrayKind;
  name: string; // e.g. "get_activities", "priceDrift", "Bedrock Converse"
  source: string; // e.g. "careem-mcp:sandbox@127.0.0.1:8787", "engine:analysis.ts#priceDrift"
  dataOrigin: 'sample' | 'live' | 'computed';
  status: XrayStatus;
  startedAt: string; // ISO
  endedAt?: string;
  ms?: number;
  input: unknown; // full input (arguments, request, function params)
  output?: unknown; // full output (raw MCP response, function result, model reply)
  summary: string; // one human line: "10 orders, AED 1,842 total"
  error?: string;
  meta?: { tokensIn?: number; tokensOut?: number; retries?: number; sizeBytes?: number };
};

// GET /api/xray
export type XrayRunSummary = {
  runId: string;
  startedAt: string;
  request: unknown;
  steps: number;
  ms?: number;
  status: XrayStatus;
};

// GET /api/xray
export type XrayList = { runs: XrayRunSummary[]; sampleData: boolean };

// GET /api/xray/:runId  (all steps of the run: `ordered` is flat by seq, `tree` is nested by parentId)
export type XrayTreeNode = XrayStep & { children: XrayTreeNode[] };
export type XrayRun = XrayRunSummary & { ordered: XrayStep[]; tree: XrayTreeNode[]; sampleData?: boolean };

// Server-Sent Events of /api/chat and /api/approve. Every stream starts with "run" and ends with "done".
export type TraceEvent = { id: string; tool: string; status: 'running' | 'ok' | 'error'; summary: string; ms?: number };
export type MessageEvent = { id: string; role: 'assistant'; text: string; language: Language; rtl: boolean };
export type ErrorEvent = { message: string; retryable: boolean; code?: string; kind?: ErrorKind; field?: string };

export type SseEvent =
  | { event: 'run'; data: { runId: string } }
  | { event: 'trace'; data: TraceEvent }
  | { event: 'xray'; data: { step: XrayStep } }
  | { event: 'message'; data: MessageEvent }
  | { event: 'plan'; data: Plan }
  | { event: 'cart'; data: Cart }
  | { event: 'error'; data: ErrorEvent }
  | { event: 'done'; data: { runId: string } };
