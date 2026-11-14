// Language detection and the fixed sentences the backend itself says (error events, and the
// replies of the stub model). The real model on Bedrock writes its own replies.
import type { Language } from '../contract.ts';

export const LANGUAGES: Language[] = ['en', 'ar', 'hi', 'ur', 'tl'];
export const isRtl = (language: Language) => language === 'ar' || language === 'ur';

const URDU_ONLY = /[ٹڈڑںےہھگچپکی]/; // letters Urdu uses and Arabic does not
const TAGALOG = /\b(ang|mga|ng|sa|ko|mo|po|natin|namin|ito|iyon|lang|pero|bawasan|gaya|parehas|pareho|linggo|nakaraang|badyet|magkano|bakit|tindahan|pinakamura|idagdag|aprubahan|sige|salamat)\b/i;

/** Script decides for Arabic, Urdu and Hindi; a few common words decide Tagalog; otherwise the hint or English. */
export function detectLanguage(text: string, hint?: Language): Language {
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  if (/[؀-ۿ]/.test(text)) return URDU_ONLY.test(text) || hint === 'ur' ? 'ur' : 'ar';
  // Latin script: Tagalog only when the words are Tagalog. Typing English with the Tagalog button on gets English.
  const tagalogWords = (text.match(new RegExp(TAGALOG.source, 'gi')) ?? []).length;
  if (tagalogWords >= 2 || (hint === 'tl' && tagalogWords >= 1)) return 'tl';
  return 'en';
}

const aed = (n: number) => n.toFixed(2);

export type PlanFacts = {
  store: string; total: number; budget: number; withinBudget: boolean; shortfall: number; cut: string[]; swapped: string[]; deferred: string[]; saving: number;
  /** Cut to fit the budget but not treats (fresh food, household items). `cut` holds the treats. */
  removed: string[];
  unavailable: string[];
  /** ai: the AI built the basket; fallback: the AI's basket failed the checks; rules: no AI model. */
  engine: 'ai' | 'fallback' | 'rules';
  approvable: boolean;
};
export type StoreFacts = { name: string; total: number; valid: boolean; missing: string[]; chosen: boolean }[];
export type LimitFacts = { maxQtyPerLine: number; minBudgetAed: number; maxBudgetAed: number; minCutPercent: number; maxCutPercent: number; maxDistinctItems: number; maxBasketAed: number };

type Texts = {
  plan: (f: PlanFacts) => string;
  /** The user's request asked for something outside the limits. */
  invalid: (code: string, l: LimitFacts) => string;
  approvalBlocked: (shortfall: number) => string;
  loopExhausted: string;
  timeout: string;
  noStore: string;
  stores: (stores: StoreFacts) => string;
  explain: (item: string, note: string) => string;
  explainUnknown: (item: string) => string;
  approval: (store: string) => string;
  needPlan: string;
  analysis: (orders: number, lastWeek: number, rising: string[]) => string;
  help: string;
  careemDown: string;
  modelDown: string;
  genericError: string;
  approvalInvalid: string;
};

const list = (items: string[]) => items.join(', ');

export const TEXTS: Record<Language, Texts> = {
  en: {
    plan: (f) => [
      f.withinBudget
        ? `Here is this week's basket at ${f.store}: estimated AED ${aed(f.total)}, within your budget of AED ${aed(f.budget)}.`
        : `Here is this week's basket at ${f.store}: estimated AED ${aed(f.total)}, which is AED ${aed(f.shortfall)} over your budget of AED ${aed(f.budget)}. I kept water and staples and will not cut them.`,
      f.cut.length ? `Cut first (treats): ${list(f.cut)}.` : '',
      f.removed.length ? `Also removed to fit the budget: ${list(f.removed)}.` : '',
      f.swapped.length ? `Swapped: ${list(f.swapped)}.` : '',
      f.deferred.length ? `Not due yet: ${list(f.deferred)}.` : '',
      f.unavailable.length ? `Not available nearby: ${list(f.unavailable)}.` : '',
      f.saving > 0 ? `Estimated saving: about AED ${aed(f.saving)} a month.` : '',
      f.engine === 'fallback' ? "The AI's basket did not pass our checks, so the rule-based planner built this one from what the AI learned about your household. Every item passed the same checks." : '',
      f.engine === 'rules' ? 'Built by the rule-based planner from your order history, because the AI was not available.' : '',
      f.approvable ? 'This is sample data. Nothing has been charged. Press Approve to build the cart.'
        : 'This is sample data. Nothing has been charged. Approve is turned off until the basket fits: raise the budget or remove items.',
    ].filter(Boolean).join(' '),
    invalid: (code, l) => ({
      quantity_out_of_range: `That quantity is too large: I can add 1 to ${l.maxQtyPerLine} of one item. Please send a smaller number. Nothing was changed.`,
      budget_out_of_range: `Please give a weekly budget from AED ${l.minBudgetAed} to AED ${l.maxBudgetAed}. Nothing was changed.`,
      cut_out_of_range: `Please choose a cut from ${l.minCutPercent}% to ${l.maxCutPercent}% of last week's total. Nothing was changed.`,
      basket_limit: `This basket cannot be planned within the app's limits (at most ${l.maxQtyPerLine} of one item and AED ${l.maxBasketAed} per basket). Nothing was changed.`,
    } as Record<string, string>)[code] ?? `That is too many items for one request (at most ${l.maxDistinctItems}). Nothing was changed.`,
    approvalBlocked: (s) => `Approve is turned off: this basket is AED ${aed(s)} over your budget. Raise the budget or remove items, then ask again. Nothing has been charged.`,
    loopExhausted: 'I could not finish this request. Nothing was changed. Please try again or rephrase it.',
    timeout: 'This took too long, so I stopped. Nothing was changed. Please try again.',
    noStore: 'No store nearby has all your essentials (water and staples) right now, so I did not build a basket. Nothing has been charged.',
    stores: (s) => `${s.map((x) => `${x.name}: ${x.valid ? `AED ${aed(x.total)}` : `missing ${list(x.missing)}`}`).join('. ')}. Cheapest for the whole basket: ${s.find((x) => x.chosen)?.name ?? 'none'}. Fees are included.`,
    explain: (item, note) => `${item}: ${note}.`,
    explainUnknown: (item) => `I could not find "${item}" in this week's plan.`,
    approval: (store) => `Press the Approve button to build the cart at ${store}. Nothing is charged: I never check out, and I cannot change your cart from chat.`,
    needPlan: 'There is no basket yet. Ask me for one first, for example "Same as last week, but cut 15%".',
    analysis: (n, last, rising) => `I looked at ${n} past orders (sample data). Last week you spent AED ${aed(last)}.${rising.length ? ` Prices that went up: ${list(rising)}.` : ''} Tell me a budget and I will plan this week's basket.`,
    help: 'I plan your weekly Careem grocery basket to a budget. Try "Same as last week, but cut 15%" or "My budget this week is 150 dirhams".',
    careemDown: 'Careem is not answering right now. Nothing was changed. Please try again in a moment.',
    modelDown: 'The assistant model is not reachable right now. Please try again in a moment.',
    genericError: 'Something went wrong on our side. Nothing was changed. Please try again.',
    approvalInvalid: 'This approval is no longer valid (it can be used once, for the latest basket). Nothing was changed. Ask for the basket again to approve it.',
  },
  ar: {
    plan: (f) => [
      f.withinBudget
        ? `هذه سلة هذا الأسبوع من ${f.store}: المجموع التقديري ${aed(f.total)} درهم، ضمن ميزانيتك البالغة ${aed(f.budget)} درهم.`
        : `هذه سلة هذا الأسبوع من ${f.store}: المجموع التقديري ${aed(f.total)} درهم، وهو يتجاوز ميزانيتك (${aed(f.budget)} درهم) بمقدار ${aed(f.shortfall)} درهم. أبقيتُ الماء والمواد الأساسية ولن أحذفها.`,
      f.cut.length ? `حذفتُ الكماليات أولاً: ${list(f.cut)}.` : '',
      f.removed.length ? `حذفتُ أيضاً لتناسب الميزانية: ${list(f.removed)}.` : '',
      f.swapped.length ? `استبدلتُ: ${list(f.swapped)}.` : '',
      f.deferred.length ? `غير مطلوب هذا الأسبوع: ${list(f.deferred)}.` : '',
      f.unavailable.length ? `غير متوفر في المتاجر القريبة: ${list(f.unavailable)}.` : '',
      f.saving > 0 ? `التوفير الشهري التقديري: نحو ${aed(f.saving)} درهم.` : '',
      f.engine === 'fallback' ? 'لم تجتز سلة الذكاء الاصطناعي فحوصاتنا، لذلك أنشأ المخطط القائم على القواعد هذه السلة مما تعلّمه الذكاء الاصطناعي عن أسرتك. اجتاز كل منتج الفحوصات نفسها.' : '',
      f.engine === 'rules' ? 'أنشأ هذه السلة المخطط القائم على القواعد من سجل طلباتك، لأن الذكاء الاصطناعي لم يكن متاحاً.' : '',
      f.approvable ? 'هذه بيانات تجريبية. لم يتم خصم أي مبلغ. اضغط «موافقة» لإنشاء السلة.'
        : 'هذه بيانات تجريبية. لم يتم خصم أي مبلغ. زر «موافقة» معطّل حتى تناسب السلة ميزانيتك: ارفع الميزانية أو احذف بعض المنتجات.',
    ].filter(Boolean).join(' '),
    invalid: (code, l) => ({
      quantity_out_of_range: `هذه الكمية كبيرة جداً: يمكنني إضافة من 1 إلى ${l.maxQtyPerLine} من المنتج الواحد. أرسل رقماً أصغر. لم يتغيّر شيء.`,
      budget_out_of_range: `اكتب ميزانية أسبوعية بين ${l.minBudgetAed} و${l.maxBudgetAed} درهم. لم يتغيّر شيء.`,
      cut_out_of_range: `اختر نسبة تخفيض بين ${l.minCutPercent}% و${l.maxCutPercent}% من مجموع الأسبوع الماضي. لم يتغيّر شيء.`,
      basket_limit: `لا يمكن تخطيط هذه السلة ضمن حدود التطبيق (بحد أقصى ${l.maxQtyPerLine} من المنتج الواحد و${l.maxBasketAed} درهم للسلة). لم يتغيّر شيء.`,
    } as Record<string, string>)[code] ?? `عدد المنتجات كبير جداً لطلب واحد (الحد الأقصى ${l.maxDistinctItems}). لم يتغيّر شيء.`,
    approvalBlocked: (s) => `زر «موافقة» معطّل: هذه السلة تتجاوز ميزانيتك بمقدار ${aed(s)} درهم. ارفع الميزانية أو احذف منتجات ثم اطلب السلة مرة أخرى. لم يتم خصم أي مبلغ.`,
    loopExhausted: 'لم أتمكن من إكمال هذا الطلب. لم يتغيّر شيء. حاول مرة أخرى أو أعد صياغته.',
    timeout: 'استغرق الأمر وقتاً طويلاً فتوقفت. لم يتغيّر شيء. حاول مرة أخرى.',
    noStore: 'لا يوجد متجر قريب يوفّر كل الأساسيات (الماء والمواد الأساسية) الآن، لذلك لم أُنشئ سلة. لم يتم خصم أي مبلغ.',
    stores: (s) => `${s.map((x) => `${x.name}: ${x.valid ? `${aed(x.total)} درهم` : `ينقصه ${list(x.missing)}`}`).join('. ')}. الأرخص للسلة كاملة: ${s.find((x) => x.chosen)?.name ?? 'لا يوجد'}. الرسوم مشمولة.`,
    explain: (item, note) => `${item}: السبب: ${note}.`,
    explainUnknown: (item) => `لم أجد «${item}» في خطة هذا الأسبوع.`,
    approval: (store) => `اضغط زر «موافقة» لإنشاء السلة في ${store}. لن يتم خصم أي مبلغ: أنا لا أُتمّ الدفع أبداً، ولا أستطيع تغيير سلتك من المحادثة.`,
    needPlan: 'لا توجد سلة بعد. اطلب سلة أولاً، مثلاً: «نفس الأسبوع الماضي مع تخفيض 15%».',
    analysis: (n, last, rising) => `راجعتُ ${n} طلبات سابقة (بيانات تجريبية). أنفقتَ الأسبوع الماضي ${aed(last)} درهم.${rising.length ? ` أسعار ارتفعت: ${list(rising)}.` : ''} أخبرني بميزانيتك وسأخطط سلة هذا الأسبوع.`,
    help: 'أخطط سلة البقالة الأسبوعية من كريم ضمن ميزانيتك. جرّب: «نفس الأسبوع الماضي مع تخفيض 15%» أو «ميزانيتي هذا الأسبوع 150 درهماً».',
    careemDown: 'خدمة كريم لا تستجيب الآن. لم يتغيّر شيء. حاول مرة أخرى بعد قليل.',
    modelDown: 'نموذج المساعد غير متاح الآن. حاول مرة أخرى بعد قليل.',
    genericError: 'حدث خطأ من جهتنا. لم يتغيّر شيء. حاول مرة أخرى.',
    approvalInvalid: 'هذه الموافقة لم تعد صالحة (تُستخدم مرة واحدة ولآخر سلة فقط). لم يتغيّر شيء. اطلب السلة مرة أخرى للموافقة عليها.',
  },
  hi: {
    plan: (f) => [
      f.withinBudget
        ? `इस हफ़्ते की टोकरी ${f.store} से: अनुमानित कुल AED ${aed(f.total)}, आपके AED ${aed(f.budget)} के बजट के भीतर।`
        : `इस हफ़्ते की टोकरी ${f.store} से: अनुमानित कुल AED ${aed(f.total)}, जो आपके AED ${aed(f.budget)} के बजट से AED ${aed(f.shortfall)} ज़्यादा है। पानी और ज़रूरी राशन नहीं हटाया गया।`,
      f.cut.length ? `सबसे पहले हटाया (शौक़ की चीज़ें): ${list(f.cut)}।` : '',
      f.removed.length ? `बजट में लाने के लिए यह भी हटाया: ${list(f.removed)}।` : '',
      f.swapped.length ? `बदला गया: ${list(f.swapped)}।` : '',
      f.deferred.length ? `इस हफ़्ते ज़रूरत नहीं: ${list(f.deferred)}।` : '',
      f.unavailable.length ? `पास में उपलब्ध नहीं: ${list(f.unavailable)}।` : '',
      f.saving > 0 ? `अनुमानित मासिक बचत: लगभग AED ${aed(f.saving)}।` : '',
      f.engine === 'fallback' ? 'AI की टोकरी हमारी जाँच में पास नहीं हुई, इसलिए नियम-आधारित प्लानर ने यह टोकरी उसी जानकारी से बनाई जो AI ने आपके घर के बारे में सीखी। हर चीज़ उन्हीं जाँचों से गुज़री।' : '',
      f.engine === 'rules' ? 'यह टोकरी नियम-आधारित प्लानर ने आपके ऑर्डर इतिहास से बनाई, क्योंकि AI उपलब्ध नहीं था।' : '',
      f.approvable ? 'यह नमूना डेटा है। कोई पैसा नहीं काटा गया है। कार्ट बनाने के लिए Approve दबाएँ।'
        : 'यह नमूना डेटा है। कोई पैसा नहीं काटा गया है। जब तक टोकरी बजट में न आए, Approve बंद है: बजट बढ़ाएँ या कुछ चीज़ें हटाएँ।',
    ].filter(Boolean).join(' '),
    invalid: (code, l) => ({
      quantity_out_of_range: `यह मात्रा बहुत ज़्यादा है: एक चीज़ की 1 से ${l.maxQtyPerLine} तक मात्रा जोड़ी जा सकती है। कृपया छोटी संख्या भेजें। कुछ भी नहीं बदला गया।`,
      budget_out_of_range: `कृपया AED ${l.minBudgetAed} से AED ${l.maxBudgetAed} के बीच साप्ताहिक बजट बताएँ। कुछ भी नहीं बदला गया।`,
      cut_out_of_range: `कृपया पिछले हफ़्ते के कुल का ${l.minCutPercent}% से ${l.maxCutPercent}% तक कटौती चुनें। कुछ भी नहीं बदला गया।`,
      basket_limit: `यह टोकरी ऐप की सीमाओं में नहीं बन सकती (एक चीज़ की अधिकतम ${l.maxQtyPerLine} मात्रा और प्रति टोकरी AED ${l.maxBasketAed})। कुछ भी नहीं बदला गया।`,
    } as Record<string, string>)[code] ?? `एक अनुरोध में बहुत ज़्यादा चीज़ें हैं (अधिकतम ${l.maxDistinctItems})। कुछ भी नहीं बदला गया।`,
    approvalBlocked: (s) => `Approve बंद है: यह टोकरी आपके बजट से AED ${aed(s)} ज़्यादा है। बजट बढ़ाएँ या चीज़ें हटाएँ, फिर दोबारा माँगें। कोई पैसा नहीं काटा गया है।`,
    loopExhausted: 'मैं यह अनुरोध पूरा नहीं कर सका। कुछ भी नहीं बदला गया। फिर कोशिश करें या दूसरे शब्दों में लिखें।',
    timeout: 'इसमें बहुत समय लगा, इसलिए मैंने रोक दिया। कुछ भी नहीं बदला गया। फिर कोशिश करें।',
    noStore: 'पास की किसी दुकान में अभी सारा ज़रूरी सामान (पानी और राशन) नहीं है, इसलिए टोकरी नहीं बनाई। कोई पैसा नहीं काटा गया है।',
    stores: (s) => `${s.map((x) => `${x.name}: ${x.valid ? `AED ${aed(x.total)}` : `नहीं मिला: ${list(x.missing)}`}`).join('। ')}। पूरी टोकरी के लिए सबसे सस्ता: ${s.find((x) => x.chosen)?.name ?? 'कोई नहीं'}। शुल्क शामिल हैं।`,
    explain: (item, note) => `${item}: कारण: ${note}।`,
    explainUnknown: (item) => `इस हफ़्ते की योजना में "${item}" नहीं मिला।`,
    approval: (store) => `${store} पर कार्ट बनाने के लिए Approve बटन दबाएँ। कोई पैसा नहीं कटेगा: मैं कभी चेकआउट नहीं करता, और चैट से आपका कार्ट नहीं बदल सकता।`,
    needPlan: 'अभी कोई टोकरी नहीं है। पहले टोकरी माँगें, जैसे: "पिछले हफ़्ते जैसा, पर 15% कम"।',
    analysis: (n, last, rising) => `मैंने ${n} पुराने ऑर्डर देखे (नमूना डेटा)। पिछले हफ़्ते आपने AED ${aed(last)} खर्च किए।${rising.length ? ` जिनके दाम बढ़े: ${list(rising)}।` : ''} बजट बताइए, मैं इस हफ़्ते की टोकरी बनाऊँगा।`,
    help: 'मैं आपकी साप्ताहिक Careem किराना टोकरी बजट के अनुसार बनाता हूँ। लिखें: "पिछले हफ़्ते जैसा, पर 15% कम" या "इस हफ़्ते मेरा बजट 150 दिरहम है"।',
    careemDown: 'Careem अभी जवाब नहीं दे रहा है। कुछ भी नहीं बदला गया। थोड़ी देर में फिर कोशिश करें।',
    modelDown: 'सहायक मॉडल अभी उपलब्ध नहीं है। थोड़ी देर में फिर कोशिश करें।',
    genericError: 'हमारी तरफ़ से कुछ गड़बड़ हुई। कुछ भी नहीं बदला गया। फिर कोशिश करें।',
    approvalInvalid: 'यह मंज़ूरी अब मान्य नहीं है (यह एक बार और सबसे नई टोकरी के लिए ही चलती है)। कुछ भी नहीं बदला गया। मंज़ूरी के लिए टोकरी फिर से माँगें।',
  },
  ur: {
    plan: (f) => [
      f.withinBudget
        ? `اس ہفتے کی ٹوکری ${f.store} سے: تخمینی کل ${aed(f.total)} درہم، آپ کے ${aed(f.budget)} درہم کے بجٹ کے اندر۔`
        : `اس ہفتے کی ٹوکری ${f.store} سے: تخمینی کل ${aed(f.total)} درہم، جو آپ کے ${aed(f.budget)} درہم کے بجٹ سے ${aed(f.shortfall)} درہم زیادہ ہے۔ پانی اور بنیادی راشن نہیں ہٹایا گیا۔`,
      f.cut.length ? `سب سے پہلے ہٹائی گئی چیزیں (شوقیہ): ${list(f.cut)}۔` : '',
      f.removed.length ? `بجٹ میں لانے کے لیے یہ بھی ہٹایا: ${list(f.removed)}۔` : '',
      f.swapped.length ? `تبدیل کیا گیا: ${list(f.swapped)}۔` : '',
      f.deferred.length ? `اس ہفتے ضرورت نہیں: ${list(f.deferred)}۔` : '',
      f.unavailable.length ? `قریب میں دستیاب نہیں: ${list(f.unavailable)}۔` : '',
      f.saving > 0 ? `تخمینی ماہانہ بچت: تقریباً ${aed(f.saving)} درہم۔` : '',
      f.engine === 'fallback' ? 'AI کی ٹوکری ہماری جانچ میں پاس نہیں ہوئی، اس لیے اصولوں پر مبنی پلانر نے یہ ٹوکری اسی معلومات سے بنائی جو AI نے آپ کے گھر کے بارے میں سیکھی۔ ہر چیز انہی جانچوں سے گزری۔' : '',
      f.engine === 'rules' ? 'یہ ٹوکری اصولوں پر مبنی پلانر نے آپ کے آرڈر کی تاریخ سے بنائی، کیونکہ AI دستیاب نہیں تھا۔' : '',
      f.approvable ? 'یہ نمونہ ڈیٹا ہے۔ کوئی رقم نہیں کاٹی گئی۔ کارٹ بنانے کے لیے Approve دبائیں۔'
        : 'یہ نمونہ ڈیٹا ہے۔ کوئی رقم نہیں کاٹی گئی۔ جب تک ٹوکری بجٹ میں نہ آئے، Approve بند ہے: بجٹ بڑھائیں یا کچھ چیزیں ہٹائیں۔',
    ].filter(Boolean).join(' '),
    invalid: (code, l) => ({
      quantity_out_of_range: `یہ مقدار بہت زیادہ ہے: ایک چیز کی 1 سے ${l.maxQtyPerLine} تک مقدار شامل کی جا سکتی ہے۔ براہ کرم چھوٹا عدد بھیجیں۔ کچھ نہیں بدلا گیا۔`,
      budget_out_of_range: `براہ کرم ${l.minBudgetAed} سے ${l.maxBudgetAed} درہم کے درمیان ہفتہ وار بجٹ بتائیں۔ کچھ نہیں بدلا گیا۔`,
      cut_out_of_range: `براہ کرم پچھلے ہفتے کے کل کا ${l.minCutPercent}٪ سے ${l.maxCutPercent}٪ تک کمی منتخب کریں۔ کچھ نہیں بدلا گیا۔`,
      basket_limit: `یہ ٹوکری ایپ کی حدود میں نہیں بن سکتی (ایک چیز کی زیادہ سے زیادہ ${l.maxQtyPerLine} مقدار اور فی ٹوکری ${l.maxBasketAed} درہم)۔ کچھ نہیں بدلا گیا۔`,
    } as Record<string, string>)[code] ?? `ایک درخواست میں بہت زیادہ چیزیں ہیں (زیادہ سے زیادہ ${l.maxDistinctItems})۔ کچھ نہیں بدلا گیا۔`,
    approvalBlocked: (s) => `Approve بند ہے: یہ ٹوکری آپ کے بجٹ سے ${aed(s)} درہم زیادہ ہے۔ بجٹ بڑھائیں یا چیزیں ہٹائیں، پھر دوبارہ مانگیں۔ کوئی رقم نہیں کاٹی گئی۔`,
    loopExhausted: 'میں یہ درخواست مکمل نہیں کر سکا۔ کچھ نہیں بدلا گیا۔ دوبارہ کوشش کریں یا دوسرے الفاظ میں لکھیں۔',
    timeout: 'اس میں بہت وقت لگا، اس لیے میں نے روک دیا۔ کچھ نہیں بدلا گیا۔ دوبارہ کوشش کریں۔',
    noStore: 'قریب کی کسی دکان میں ابھی تمام ضروری سامان (پانی اور راشن) نہیں ہے، اس لیے ٹوکری نہیں بنائی گئی۔ کوئی رقم نہیں کاٹی گئی۔',
    stores: (s) => `${s.map((x) => `${x.name}: ${x.valid ? `${aed(x.total)} درہم` : `دستیاب نہیں: ${list(x.missing)}`}`).join('۔ ')}۔ پوری ٹوکری کے لیے سب سے سستا: ${s.find((x) => x.chosen)?.name ?? 'کوئی نہیں'}۔ فیس شامل ہے۔`,
    explain: (item, note) => `${item}: وجہ: ${note}۔`,
    explainUnknown: (item) => `اس ہفتے کے منصوبے میں "${item}" نہیں ملا۔`,
    approval: (store) => `${store} پر کارٹ بنانے کے لیے Approve کا بٹن دبائیں۔ کوئی رقم نہیں کٹے گی: میں کبھی چیک آؤٹ نہیں کرتا، اور چیٹ سے آپ کا کارٹ نہیں بدل سکتا۔`,
    needPlan: 'ابھی کوئی ٹوکری نہیں ہے۔ پہلے ٹوکری مانگیں، مثلاً: "پچھلے ہفتے جیسا، مگر 15٪ کم"۔',
    analysis: (n, last, rising) => `میں نے ${n} پرانے آرڈر دیکھے (نمونہ ڈیٹا)۔ پچھلے ہفتے آپ نے ${aed(last)} درہم خرچ کیے۔${rising.length ? ` جن کی قیمت بڑھی: ${list(rising)}۔` : ''} بجٹ بتائیں، میں اس ہفتے کی ٹوکری بناؤں گا۔`,
    help: 'میں آپ کی ہفتہ وار Careem گروسری ٹوکری بجٹ کے مطابق بناتا ہوں۔ لکھیں: "پچھلے ہفتے جیسا، مگر 15٪ کم" یا "اس ہفتے میرا بجٹ 150 درہم ہے"۔',
    careemDown: 'Careem ابھی جواب نہیں دے رہا۔ کچھ نہیں بدلا گیا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    modelDown: 'معاون ماڈل ابھی دستیاب نہیں ہے۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    genericError: 'ہماری طرف سے کچھ خرابی ہوئی۔ کچھ نہیں بدلا گیا۔ دوبارہ کوشش کریں۔',
    approvalInvalid: 'یہ منظوری اب کارآمد نہیں رہی (یہ ایک بار اور تازہ ترین ٹوکری کے لیے ہی چلتی ہے)۔ کچھ نہیں بدلا گیا۔ منظوری کے لیے ٹوکری دوبارہ مانگیں۔',
  },
  tl: {
    plan: (f) => [
      f.withinBudget
        ? `Narito ang basket ngayong linggo sa ${f.store}: tinatayang AED ${aed(f.total)}, pasok sa budget mong AED ${aed(f.budget)}.`
        : `Narito ang basket ngayong linggo sa ${f.store}: tinatayang AED ${aed(f.total)}, lampas ng AED ${aed(f.shortfall)} sa budget mong AED ${aed(f.budget)}. Hindi ko inalis ang tubig at mga pangunahing bilihin.`,
      f.cut.length ? `Unang inalis (mga pampalipas-gana): ${list(f.cut)}.` : '',
      f.removed.length ? `Inalis din para pumasok sa budget: ${list(f.removed)}.` : '',
      f.swapped.length ? `Pinalitan: ${list(f.swapped)}.` : '',
      f.deferred.length ? `Hindi pa kailangan ngayong linggo: ${list(f.deferred)}.` : '',
      f.unavailable.length ? `Walang mabibili sa malapit: ${list(f.unavailable)}.` : '',
      f.saving > 0 ? `Tinatayang tipid: mga AED ${aed(f.saving)} kada buwan.` : '',
      f.engine === 'fallback' ? 'Hindi pumasa sa aming mga pagsusuri ang basket ng AI, kaya ang rule-based planner ang bumuo nito mula sa natutunan ng AI tungkol sa inyong sambahayan. Pumasa ang bawat item sa parehong mga pagsusuri.' : '',
      f.engine === 'rules' ? 'Binuo ito ng rule-based planner mula sa iyong order history, dahil hindi available ang AI.' : '',
      f.approvable ? 'Sample data ito. Walang siningil. Pindutin ang Approve para buuin ang cart.'
        : "Sample data ito. Walang siningil. Naka-off ang Approve hangga't hindi pasok sa budget ang basket: taasan ang budget o magtanggal ng items.",
    ].filter(Boolean).join(' '),
    invalid: (code, l) => ({
      quantity_out_of_range: `Masyadong malaki ang dami: 1 hanggang ${l.maxQtyPerLine} lang ang maidadagdag sa isang item. Magpadala ng mas maliit na numero. Walang nabago.`,
      budget_out_of_range: `Pakibigay ang lingguhang budget mula AED ${l.minBudgetAed} hanggang AED ${l.maxBudgetAed}. Walang nabago.`,
      cut_out_of_range: `Pumili ng bawas mula ${l.minCutPercent}% hanggang ${l.maxCutPercent}% ng kabuuan noong nakaraang linggo. Walang nabago.`,
      basket_limit: `Hindi mabubuo ang basket na ito sa loob ng mga limit ng app (hanggang ${l.maxQtyPerLine} bawat item at AED ${l.maxBasketAed} bawat basket). Walang nabago.`,
    } as Record<string, string>)[code] ?? `Masyadong maraming item para sa isang request (hanggang ${l.maxDistinctItems} lang). Walang nabago.`,
    approvalBlocked: (s) => `Naka-off ang Approve: lampas ng AED ${aed(s)} sa budget mo ang basket na ito. Taasan ang budget o magtanggal ng items, saka humingi ulit. Walang siningil.`,
    loopExhausted: 'Hindi ko natapos ang request na ito. Walang nabago. Pakisubukan ulit o sabihin ito sa ibang paraan.',
    timeout: 'Masyadong natagalan, kaya itinigil ko. Walang nabago. Pakisubukan ulit.',
    noStore: 'Walang malapit na tindahan na kumpleto sa mga pangunahing bilihin (tubig at staples) ngayon, kaya hindi ako bumuo ng basket. Walang siningil.',
    stores: (s) => `${s.map((x) => `${x.name}: ${x.valid ? `AED ${aed(x.total)}` : `kulang ng ${list(x.missing)}`}`).join('. ')}. Pinakamura para sa buong basket: ${s.find((x) => x.chosen)?.name ?? 'wala'}. Kasama na ang mga bayarin.`,
    explain: (item, note) => `${item}: ang dahilan: ${note}.`,
    explainUnknown: (item) => `Hindi ko nakita ang "${item}" sa plano ngayong linggo.`,
    approval: (store) => `Pindutin ang Approve button para buuin ang cart sa ${store}. Walang sisingilin: hindi ako nagche-checkout kailanman, at hindi ko mababago ang cart mo mula sa chat.`,
    needPlan: 'Wala pang basket. Humingi muna ng basket, halimbawa: "Gaya ng nakaraang linggo, pero bawasan ng 15%".',
    analysis: (n, last, rising) => `Tiningnan ko ang ${n} nakaraang order (sample data). Noong nakaraang linggo, gumastos ka ng AED ${aed(last)}.${rising.length ? ` Tumaas ang presyo ng: ${list(rising)}.` : ''} Sabihin mo ang budget at ipaplano ko ang basket ngayong linggo.`,
    help: 'Ipinaplano ko ang lingguhang Careem grocery basket mo ayon sa budget. Subukan: "Gaya ng nakaraang linggo, pero bawasan ng 15%" o "Ang budget ko ngayong linggo ay 150 dirham".',
    careemDown: 'Hindi sumasagot ang Careem ngayon. Walang nabago. Pakisubukan ulit mamaya.',
    modelDown: 'Hindi maabot ang assistant model ngayon. Pakisubukan ulit mamaya.',
    genericError: 'May nagkaproblema sa panig namin. Walang nabago. Pakisubukan ulit.',
    approvalInvalid: 'Hindi na valid ang approval na ito (isang beses lang ito magagamit, para sa pinakabagong basket). Walang nabago. Humingi ulit ng basket para maaprubahan.',
  },
};
