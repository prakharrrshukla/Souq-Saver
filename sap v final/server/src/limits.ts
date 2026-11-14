// Hard limits for this prototype, enforced at the API, tool, planner, calculator and approval
// boundaries. Each one can be changed with the environment variable next to it (see README, "Limits").
// Read on every call, so a changed variable applies without a restart.

const num = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export type Limits = ReturnType<typeof limits>;

export const limits = () => ({
  /** Units of one product in one basket line. */
  maxQtyPerLine: num('SOUQ_MAX_QTY_PER_LINE', 20),
  /** Different products in one basket (and additions or overrides in one request). */
  maxDistinctItems: num('SOUQ_MAX_DISTINCT_ITEMS', 40),
  /** Largest basket total, fees included, that can be planned or approved. */
  maxBasketAed: num('SOUQ_MAX_BASKET_AED', 2000),
  /** Weekly budget range. */
  minBudgetAed: num('SOUQ_MIN_BUDGET_AED', 1),
  maxBudgetAed: num('SOUQ_MAX_BUDGET_AED', 5000),
  /** "Cut N%" range. */
  minCutPercent: num('SOUQ_MIN_CUT_PERCENT', 1),
  maxCutPercent: num('SOUQ_MAX_CUT_PERCENT', 90),
  /** Characters in one chat message. */
  maxMessageChars: num('SOUQ_MAX_MESSAGE_CHARS', 4000),
  /** Model turns (each may call tools) per chat request. */
  maxToolTurns: num('SOUQ_MAX_TOOL_TURNS', 8),
  /** Invalid tool calls (bad name or arguments) the model may correct in one request; one more and we stop. */
  maxInvalidToolCalls: num('SOUQ_MAX_INVALID_TOOL_CALLS', 3),
  /** Wall-clock limit for one chat request. */
  turnTimeoutMs: num('SOUQ_TURN_TIMEOUT_MS', 240_000),
});
