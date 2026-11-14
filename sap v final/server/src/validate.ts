// Runtime validation: request fields, the five agent tools' arguments, and explicit numbers in the
// user's own words. Every failure is a FieldError with a stable code, so the API, the model and the
// UI all get the same answer.
import { limits } from './limits.ts';

export type FieldError = { code: string; field: string; message: string };
/** Codes caused by what the user asked for (as opposed to a model mistake). */
export const USER_INPUT_CODES = new Set(['budget_out_of_range', 'cut_out_of_range', 'quantity_out_of_range', 'too_many_items', 'basket_limit']);

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function checkBudget(value: unknown, field = 'budgetAed'): FieldError | null {
  const { minBudgetAed: min, maxBudgetAed: max } = limits();
  if (isNumber(value) && value >= min && value <= max) return null;
  return { code: 'budget_out_of_range', field, message: `The weekly budget must be a number from AED ${min} to AED ${max}.` };
}

export function checkCut(value: unknown, field = 'cutPercent'): FieldError | null {
  const { minCutPercent: min, maxCutPercent: max } = limits();
  if (isNumber(value) && value >= min && value <= max) return null;
  return { code: 'cut_out_of_range', field, message: `A cut must be from ${min}% to ${max}% of last week's total.` };
}

export function checkQty(value: unknown, field: string): FieldError | null {
  const { maxQtyPerLine: max } = limits();
  if (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max) return null;
  return { code: 'quantity_out_of_range', field, message: `A quantity must be a whole number from 1 to ${max} per item.` };
}

// ---------- the five tools ----------

export const TOOL_NAMES = ['analyse_history', 'plan_basket', 'compare_stores', 'explain_change', 'request_approval'] as const;
const TIERS = ['T1', 'T2', 'T3', 'T4', 'T5'];

export type ToolCallError = { error: string; code: string; issues: FieldError[]; hint: string };
export type ToolCheck = { ok: true; input: Record<string, any> } | { ok: false; error: ToolCallError };

const shortText = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 60;
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function onlyKeys(input: Record<string, unknown>, allowed: string[], path: string, issues: FieldError[]) {
  for (const key of Object.keys(input)) if (!allowed.includes(key)) issues.push({ code: 'invalid_arguments', field: `${path}${key}`, message: `Unknown field "${key}". Allowed: ${allowed.join(', ') || 'none'}.` });
}

function planBasketIssues(input: Record<string, unknown>): FieldError[] {
  const issues: FieldError[] = [];
  const { maxDistinctItems } = limits();
  onlyKeys(input, ['budgetAed', 'cutPercent', 'additions', 'overrides'], '', issues);
  if (input.budgetAed !== undefined) { const e = checkBudget(input.budgetAed); if (e) issues.push(e); }
  if (input.cutPercent !== undefined) { const e = checkCut(input.cutPercent); if (e) issues.push(e); }
  if (input.budgetAed !== undefined && input.cutPercent !== undefined) issues.push({ code: 'invalid_arguments', field: 'budgetAed', message: 'Give either budgetAed or cutPercent, not both.' });
  for (const [key, entryKeys] of [['additions', ['item', 'qty']], ['overrides', ['item', 'keep', 'drop', 'tier']]] as const) {
    const list = input[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) { issues.push({ code: 'invalid_arguments', field: key, message: `${key} must be an array of objects.` }); continue; }
    if (list.length > maxDistinctItems) issues.push({ code: 'too_many_items', field: key, message: `At most ${maxDistinctItems} ${key} per request.` });
    list.forEach((entry, i) => {
      const at = `${key}[${i}]`;
      if (!isObject(entry)) { issues.push({ code: 'invalid_arguments', field: at, message: 'Must be an object.' }); return; }
      onlyKeys(entry, [...entryKeys], `${at}.`, issues);
      if (!shortText(entry.item)) issues.push({ code: 'invalid_arguments', field: `${at}.item`, message: 'item is required: a short English word, e.g. "rice".' });
      if (key === 'additions' && entry.qty !== undefined) { const e = checkQty(entry.qty, `${at}.qty`); if (e) issues.push(e); }
      if (key === 'overrides') {
        for (const flag of ['keep', 'drop'] as const) if (entry[flag] !== undefined && typeof entry[flag] !== 'boolean') issues.push({ code: 'invalid_arguments', field: `${at}.${flag}`, message: `${flag} must be true or false.` });
        if (entry.keep === true && entry.drop === true) issues.push({ code: 'invalid_arguments', field: at, message: 'An item cannot be both kept and dropped.' });
        if (entry.tier !== undefined && !TIERS.includes(entry.tier as string)) issues.push({ code: 'invalid_arguments', field: `${at}.tier`, message: `tier must be one of ${TIERS.join(', ')}.` });
      }
    });
  }
  return issues;
}

/** Checks a tool call from the model before anything runs. Errors go back to the model so it can fix the call. */
export function validateToolCall(name: unknown, rawInput: unknown): ToolCheck {
  const fail = (code: string, issues: FieldError[], hint = 'Fix the arguments and call the tool again, or ask the user if their request is unclear.'): ToolCheck => ({ ok: false, error: { error: code, code, issues, hint } });
  if (typeof name !== 'string' || !(TOOL_NAMES as readonly string[]).includes(name)) {
    return fail('unknown_tool', [{ code: 'unknown_tool', field: 'name', message: `There is no tool "${String(name)}".` }], `Use one of: ${TOOL_NAMES.join(', ')}.`);
  }
  let input = rawInput ?? {};
  if (typeof input === 'string') {
    try { input = input.trim() ? JSON.parse(input) : {}; } catch { return fail('malformed_json', [{ code: 'malformed_json', field: 'input', message: 'The arguments are not valid JSON.' }]); }
  }
  if (!isObject(input)) return fail('invalid_arguments', [{ code: 'invalid_arguments', field: 'input', message: 'The arguments must be a JSON object.' }]);
  const issues: FieldError[] = [];
  if (name === 'plan_basket') issues.push(...planBasketIssues(input));
  else if (name === 'explain_change') {
    onlyKeys(input, ['item'], '', issues);
    if (!shortText(input.item)) issues.push({ code: 'invalid_arguments', field: 'item', message: 'item is required: a short English word, e.g. "chocolate".' });
  } else onlyKeys(input, [], '', issues);
  if (!issues.length) return { ok: true, input };
  const specific = issues.find((i) => USER_INPUT_CODES.has(i.code));
  return fail(specific ? specific.code : 'invalid_arguments', issues);
}

// ---------- explicit numbers in the user's own words ----------

const DIGIT_SETS = ['٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹', '०१२३४५६७८९'];
export const westernDigits = (s: string) => s
  .replace(/[٠-٩۰-۹०-९]/g, (d) => String(DIGIT_SETS.map((set) => set.indexOf(d)).find((i) => i >= 0)))
  .replace(/٫/g, '.').replace(/[−–]/g, '-');

// 1,000 and 1000 both read as one thousand.
const NUM = String.raw`(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?)`;
const toNumber = (s: string) => Number(s.replace(/,/g, ''));
const PERCENT = new RegExp(String.raw`${NUM}\s*(?:%|٪|percent|per cent|في المئة|بالمئة|प्रतिशत|فیصد|فی صد|porsyento)`, 'gi');
const CURRENCY = String.raw`(?:aed|dhs?|dirhams?|درهم|دراهم|درهماً|दिरहम|درہم)`;
const MONEY = new RegExp(String.raw`${NUM}\s*${CURRENCY}(?![a-z])|(?<![a-z])(?:aed|dhs?)\s*${NUM}`, 'gi');
const BUDGET_WORD = String.raw`(?:budget|ميزانيت?ي?|ميزانية|बजट|بجٹ|badyet)`;
const BUDGET_NUMBER = new RegExp(String.raw`(?:${BUDGET_WORD}|under|below|max(?:imum)?|at most|within|up to|limit)\D{0,14}?${NUM}`, 'gi');
const BUDGET_CONTEXT = new RegExp(String.raw`${BUDGET_WORD}|only have|i have|لدي|معي|सिर्फ़|सिर्फ|صرف|lang ang`, 'i');
const UNIT = String.raw`(?:x(?![a-z])|×|bags?|packs?|packets?|bottles?|cartons?|boxes|box|tins?|cans?|units?|pieces?|pcs|kgs?|kilos?|loaves|dozens?|كيس|أكياس|اكياس|علب|علبة|كيلو|كغ|बैग|पैकेट|किलो|थैली|بیگ|پیکٹ|کلو|supot|kilo)`;
const QTY = new RegExp(String.raw`(\d+)\s*${UNIT}|(?:\badd|أضف|اضف|जोड़ो?|dagdag)\s+(\d+)`, 'gi');

/** `numbers`: values the user stated as a budget or a cut, the only ones a tool may accept from the model. */
export type Extracted = { numbers: number[]; budgetAed?: number; cutPercent?: number; problems: FieldError[] };

/**
 * Budgets, cuts and quantities the user typed explicitly ("cut 150%", "budget -50 AED", "500 bags").
 * Missing values are not problems; explicit invalid ones are. `numbers` lets tools check that a budget
 * the model passes was really given by the user.
 */
export function extractRequest(message: string): Extracted {
  const text = westernDigits(message.replace(/\[UI weekly budget:[^\]]*\]/g, ''));
  const out: Extracted = { numbers: [], problems: [] };
  const add = (e: FieldError | null) => { if (e && !out.problems.some((p) => p.code === e.code)) out.problems.push(e); };
  for (const m of text.matchAll(PERCENT)) {
    const value = toNumber(m[1]);
    out.numbers.push(value);
    const e = checkCut(value);
    if (e) add(e); else out.cutPercent ??= value;
  }
  // A message that is only an amount ("150", "AED 150") is the weekly budget.
  const bare = new RegExp(String.raw`^\s*(?:aed|dhs?)?\s*${NUM}\s*${CURRENCY}?\s*$`, 'i').exec(text);
  const budgetContext = !!bare || BUDGET_CONTEXT.test(text);
  if (bare) {
    const value = toNumber(bare[1]);
    out.numbers.push(value);
    const e = checkBudget(value);
    if (e) add(e); else out.budgetAed = value;
  }
  for (const m of [...text.matchAll(MONEY), ...text.matchAll(BUDGET_NUMBER)]) {
    const value = toNumber(m[1] ?? m[2]);
    out.numbers.push(value);
    const e = checkBudget(value);
    if (!e) out.budgetAed ??= value;
    else if (budgetContext) add(e); // "I spent 9000 AED last year" or "it costs AED 0" is not a budget
  }
  for (const m of text.matchAll(QTY)) {
    const value = Number(m[1] ?? m[2]);
    if (value > limits().maxQtyPerLine) add(checkQty(value, 'qty'));
  }
  return out;
}
