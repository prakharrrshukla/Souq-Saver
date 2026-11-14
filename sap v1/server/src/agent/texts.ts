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
  if ((text.match(new RegExp(TAGALOG.source, 'gi')) ?? []).length >= 2) return 'tl';
  if (hint === 'tl' || hint === 'en') return hint;
  return 'en';
}

const aed = (n: number) => n.toFixed(2);

export type PlanFacts = { store: string; total: number; budget: number; withinBudget: boolean; shortfall: number; cut: string[]; swapped: string[]; deferred: string[]; saving: number };
export type StoreFacts = { name: string; total: number; valid: boolean; missing: string[]; chosen: boolean }[];

type Texts = {
  plan: (f: PlanFacts) => string;
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
      f.swapped.length ? `Swapped: ${list(f.swapped)}.` : '',
      f.deferred.length ? `Not due yet: ${list(f.deferred)}.` : '',
      f.saving > 0 ? `Estimated saving: about AED ${aed(f.saving)} a month.` : '',
      'This is sample data. Nothing has been charged. Press Approve to build the cart.',
    ].filter(Boolean).join(' '),
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
      f.swapped.length ? `استبدلتُ: ${list(f.swapped)}.` : '',
      f.deferred.length ? `غير مطلوب هذا الأسبوع: ${list(f.deferred)}.` : '',
      f.saving > 0 ? `التوفير الشهري التقديري: نحو ${aed(f.saving)} درهم.` : '',
      'هذه بيانات تجريبية. لم يتم خصم أي مبلغ. اضغط «موافقة» لإنشاء السلة.',
    ].filter(Boolean).join(' '),
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
      f.swapped.length ? `बदला गया: ${list(f.swapped)}।` : '',
      f.deferred.length ? `इस हफ़्ते ज़रूरत नहीं: ${list(f.deferred)}।` : '',
      f.saving > 0 ? `अनुमानित मासिक बचत: लगभग AED ${aed(f.saving)}।` : '',
      'यह नमूना डेटा है। कोई पैसा नहीं काटा गया है। कार्ट बनाने के लिए Approve दबाएँ।',
    ].filter(Boolean).join(' '),
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
      f.swapped.length ? `تبدیل کیا گیا: ${list(f.swapped)}۔` : '',
      f.deferred.length ? `اس ہفتے ضرورت نہیں: ${list(f.deferred)}۔` : '',
      f.saving > 0 ? `تخمینی ماہانہ بچت: تقریباً ${aed(f.saving)} درہم۔` : '',
      'یہ نمونہ ڈیٹا ہے۔ کوئی رقم نہیں کاٹی گئی۔ کارٹ بنانے کے لیے Approve دبائیں۔',
    ].filter(Boolean).join(' '),
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
      f.swapped.length ? `Pinalitan: ${list(f.swapped)}.` : '',
      f.deferred.length ? `Hindi pa kailangan ngayong linggo: ${list(f.deferred)}.` : '',
      f.saving > 0 ? `Tinatayang tipid: mga AED ${aed(f.saving)} kada buwan.` : '',
      'Sample data ito. Walang siningil. Pindutin ang Approve para buuin ang cart.',
    ].filter(Boolean).join(' '),
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
