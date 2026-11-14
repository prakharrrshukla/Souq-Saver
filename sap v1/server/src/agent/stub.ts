// ==========================================================================================
// STUB MODEL ADAPTER. NOT AN AI MODEL.
// A small rule-based stand-in for Claude on Bedrock with the same interface (bedrock.ts).
// It exists for two reasons: (1) tests must not depend on the network, and (2) the app must
// keep working while Bedrock access is pending. When it is active, GET /api/config reports
// modelId "stub-rule-based (Bedrock not connected)" and GET /api/health reports bedrock: false.
// It only recognises the demo intents below. All numbers still come from the engine.
// ==========================================================================================
import type { Language } from '../contract.ts';
import { step } from '../xray.ts';
import { toTurn, type Block, type ChatMessage, type ModelAdapter, type ToolSpec, type Turn } from './bedrock.ts';
import { TEXTS, detectLanguage } from './texts.ts';

export const STUB_MODEL_ID = 'stub-rule-based (Bedrock not connected)';

// Item words in the five languages, mapped to the English term the tools understand.
const ITEM_WORDS: [string, RegExp][] = [
  ['chocolate', /chocolate|شوكولات|شوكولا|चॉकलेट|चाकलेट|چاکلیٹ|tsokolate/i],
  ['cola', /cola|coke|soda|soft drink|كولا|مشروبات غازية|कोला|کولا/i],
  ['chips', /chips|crisps|شيبس|رقائق|चिप्स|چپس|tsitsirya/i],
  ['rice', /rice|أرز|ارز|الرز|चावल|چاول|bigas|kanin/i],
  ['chicken', /chicken|دجاج|चिकन|मुर्ग|چکن|مرغی|manok/i],
  ['milk', /milk|حليب|दूध|دودھ|gatas/i],
  ['eggs', /eggs?|بيض|अंड|انڈ|itlog/i],
  ['water', /water|ماء|مياه|पानी|پانی|tubig/i],
  ['dish soap', /dish ?soap|dishwashing|صابون|साबुन|صابن|sabon/i],
  ['bread', /bread|خبز|रोटी|ब्रेड|روٹی|tinapay/i],
  ['atta', /atta|flour|طحين|دقيق|आटा|آٹا|harina/i],
  ['oil', /\boil\b|زيت|तेल|تیل|mantika/i],
  ['sugar', /sugar|سكر|चीनी|چینی|asukal/i],
  ['tea', /\btea\b|شاي|चाय|چائے|tsaa/i],
  ['tissue', /tissue|مناديل|टिशू|ٹشو/i],
  ['detergent', /detergent|laundry|منظف|डिटर्जेंट|ڈٹرجنٹ/i],
  ['yogurt', /yogh?urt|laban|لبن|زبادي|दही|دہی/i],
  ['bananas', /bananas?|موز|केला|केले|کیلا|کیلے|saging/i],
];

const INTENT = {
  approve: /\b(approve|confirm|go ahead|place (the )?order|check ?out|pay)\b|وافق|موافق|أوافق|اعتمد|ادفع|मंज़ूर|मंजूर|स्वीकृत|ऑर्डर कर|منظور|آرڈر کر|aprubahan|aprobahan|\bsige\b|i-order/i,
  why: /\bwhy\b|how come|لماذا|ليش|لمَ|क्यों|کیوں|\bbakit\b/i,
  stores: /which store|cheapest|compare|أرخص|ارخص|أي متجر|قارن|सबसे सस्त|कौन सी दुकान|कौन-सी दुकान|سب سے سست|کون سی دکان|pinakamura|aling tindahan/i,
  keep: /\bkeep\b|essential|don'?t (cut|drop|remove)|أبق|ابق|احتفظ|لا تحذف|रखो|रखें|रहने दो|मत हटा|رکھو|رکھیں|رہنے دو|مت ہٹا|panatilihin|itira|huwag alisin/i,
  drop: /\b(drop|remove|skip|no need for|without)\b|احذف|أزل|بدون|हटा दो|हटाओ|ہٹا دو|ہٹاؤ|\balisin\b|tanggalin/i,
  add: /\b(add|more|extra|guests?)\b|أضف|اضف|زد|ضيوف|जोड़|और चाहिए|मेहमान|شامل کر|مزید|مہمان|dagdag|bisita/i,
  plan: /last week|same as|budget|basket|cut|reduce|plan|الأسبوع الماضي|ميزانية|سلة|خفّض|خفض|تخفيض|पिछले हफ़्ते|पिछले हफ्ते|बजट|टोकरी|कम कर|پچھلے ہفتے|بجٹ|ٹوکری|کم کر|nakaraang linggo|badyet|bawasan|basket/i,
  history: /history|spend|spent|analy[sz]e|price|سجل|إنفاق|صرفت|تحليل|खर्च|इतिहास|विश्लेषण|خرچ|تاریخ|تجزیہ|gastos|nagastos|kasaysayan/i,
};

const DIGITS: Record<string, string> = Object.fromEntries([...'٠١٢٣٤٥٦٧٨٩'].map((d, i) => [d, String(i)]).concat([...'۰۱۲۳۴۵۶۷۸۹'].map((d, i) => [d, String(i)]), [...'०१२३४५६७८९'].map((d, i) => [d, String(i)])));
const westernDigits = (s: string) => s.replace(/[٠-٩۰-۹०-९]/g, (d) => DIGITS[d]).replace(/٫/g, '.');

type Decision = { tool?: { name: string; input: Record<string, unknown> } };

/** The demo intents, read from the user's message. */
export function decide(message: string): Decision {
  // The UI budget arrives as a note appended to the message; a budget typed by the user wins.
  const note = /\[UI weekly budget: AED (\d+(?:\.\d+)?)\]/.exec(message);
  const text = westernDigits(message.replace(/\[UI weekly budget:[^\]]*\]/, ''));
  const items = ITEM_WORDS.filter(([, pattern]) => pattern.test(text)).map(([term]) => term);
  const percent = /(\d+(?:\.\d+)?)\s*(?:%|٪|percent|في المئة|بالمئة|प्रतिशत|فیصد|فی صد|porsyento)/i.exec(text);
  const amount = /(\d+(?:\.\d+)?)\s*(?:aed|dhs?|dirhams?|درهم|दिरहम|درہم)|(?:aed|dhs?)\s*(\d+(?:\.\d+)?)/i.exec(text);
  const budget: Record<string, unknown> = percent ? { cutPercent: Number(percent[1]) } : amount ? { budgetAed: Number(amount[1] ?? amount[2]) } : {};

  if (INTENT.approve.test(text)) return { tool: { name: 'request_approval', input: {} } };
  if (INTENT.why.test(text) && items.length) return { tool: { name: 'explain_change', input: { item: items[0] } } };
  if (INTENT.stores.test(text)) return { tool: { name: 'compare_stores', input: {} } };
  if (items.length && INTENT.keep.test(text)) return { tool: { name: 'plan_basket', input: { ...budget, overrides: items.map((item) => ({ item, keep: true })) } } };
  if (items.length && INTENT.add.test(text)) return { tool: { name: 'plan_basket', input: { ...budget, additions: items.map((item) => ({ item, qty: 1 })) } } };
  if (items.length && INTENT.drop.test(text)) return { tool: { name: 'plan_basket', input: { ...budget, overrides: items.map((item) => ({ item, drop: true })) } } };
  if (percent || amount || INTENT.plan.test(text)) return { tool: { name: 'plan_basket', input: Object.keys(budget).length ? budget : note ? { budgetAed: Number(note[1]) } : {} } };
  if (INTENT.history.test(text)) return { tool: { name: 'analyse_history', input: {} } };
  return {};
}

const inBasket = (reason: string) => reason === 'kept' || reason === 'swapped' || reason === 'reduced';

/** Turns a tool result into a short reply, in the user's language, from fixed sentences. */
export function compose(tool: string, result: any, language: Language): string {
  const t = TEXTS[language];
  if (result?.error) return result.kind === 'careem' ? t.careemDown : result.kind === 'no_plan' ? t.needPlan : t.genericError;
  if (tool === 'plan_basket') {
    if (!result.store) return t.noStore;
    const items: any[] = result.items ?? [];
    return t.plan({
      store: result.store, total: result.estTotal, budget: result.budget.aed, withinBudget: result.withinBudget, shortfall: result.shortfall,
      cut: items.filter((i) => i.reason === 'cut').map((i) => i.name),
      swapped: items.filter((i) => i.reason === 'swapped').map((i) => `${i.replaces} → ${i.name}`),
      deferred: items.filter((i) => i.reason === 'deferred').map((i) => `${i.name} (${i.nextDue})`),
      saving: result.monthlySavingEstimate,
    });
  }
  if (tool === 'compare_stores') return t.stores((result.stores ?? []).map((s: any) => ({ name: s.name, total: s.estTotal, valid: s.valid, missing: s.missing, chosen: s.chosen })));
  if (tool === 'explain_change') return result.found ? t.explain(result.name, `${result.note}${inBasket(result.reason) ? '' : ` (${result.reason})`}`) : t.explainUnknown(result.item);
  if (tool === 'request_approval') return t.approval(result.store);
  if (tool === 'analyse_history') return t.analysis(result.orders, result.lastWeekTotal, (result.priceDrift ?? []).filter((d: any) => d.flagged).map((d: any) => `${d.name} +${d.driftPct}%`));
  return t.help;
}

const lastUserText = (messages: ChatMessage[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].role === 'user' ? messages[i].content.flatMap((b) => ('text' in b ? [b.text] : [])).join(' ') : '';
    if (text) return text;
  }
  return '';
};

export class StubModel implements ModelAdapter {
  readonly id = STUB_MODEL_ID;
  readonly provider = 'Local stub (AWS Bedrock pending)';
  readonly isBedrock = false;

  converse(system: string, messages: ChatMessage[], tools: ToolSpec[], ref?: { stepId?: string }): Promise<Turn> {
    return step('model', 'Stub model (not Bedrock)', `stub:${this.id}`, { modelId: this.id, system, messages, tools: tools.map((t) => t.name) }, () => {
      const userText = lastUserText(messages);
      const hint = /Reply language hint: (\w\w)/.exec(system)?.[1] as Language | undefined;
      const language = detectLanguage(userText.replace(/\[UI weekly budget:[^\]]*\]/, ''), hint);
      const last = messages[messages.length - 1];
      const results = last.content.flatMap((b) => ('toolResult' in b ? [b.toolResult] : []));

      let content: Block[];
      if (results.length) {
        // Second half of a turn: explain the tool result.
        const calls = messages[messages.length - 2].content.flatMap((b) => ('toolUse' in b ? [b.toolUse] : []));
        const name = calls.find((c) => c.toolUseId === results[0].toolUseId)?.name ?? '';
        content = [{ text: compose(name, results[0].content[0]?.json, language) }];
      } else {
        const { tool } = decide(userText);
        content = tool && tools.some((t) => t.name === tool.name)
          ? [{ toolUse: { toolUseId: `stub_${Date.now().toString(36)}`, name: tool.name, input: tool.input } }]
          : [{ text: TEXTS[language].help }];
      }
      return toTurn(content, content.some((b) => 'toolUse' in b) ? 'tool_use' : 'end_turn', this.id);
    }, { ref, summary: (t) => (t.toolCalls.length ? `asked for ${t.toolCalls.map((c) => c.name).join(', ')}` : `replied (${t.text.length} chars)`) });
  }
}
