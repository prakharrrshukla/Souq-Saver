// Two more demo households, each with its own Careem order history. Invented sample data in
// Careem's format. Every habit below shows only through ordinary order fields (items, quantities,
// prices, dates, stores), so the AI engine has to learn it from get_activities alone.
import type { HistoryLine, Persona } from './household.config.ts';

const weeksOf = (total: number, skipped: number[]) => {
  const every = Array.from({ length: total }, (_, i) => i + 1).filter((w) => !skipped.includes(w));
  return {
    every,
    except: (...skip: number[]) => every.filter((w) => !skip.includes(w)),
    from: (first: number) => every.filter((w) => w >= first),
    until: (last: number) => every.filter((w) => w <= last),
    stepping: (first: number, gap: number) => every.filter((w) => w >= first && (w - first) % gap === 0),
  };
};

// ---------- 2. The Khan family: six people in Al Barsha, a baby arrived two months ago ----------
// Long-shelf-life shoppers: every week they stock the pantry through Careem (Careem Shops, Marina Fresh
// Market) and buy their fresh food at the neighbourhood market, so fresh produce barely shows in their
// Careem orders.

const F = weeksOf(14, []);
const M = 'marina' as const;
const FAMILY_HISTORY: HistoryLine[] = [
  { sku: 'sku_oasis_water_6x1500', weeks: F.every, qty: 4, store: M },
  // Monthly bulk staples, always the same brands. Bought last week: not due again for about a month.
  { sku: 'sku_royal_basmati_10kg', weeks: [2, 6, 10, 14], store: M },
  { sku: 'sku_chakki_atta_10kg', weeks: [2, 6, 10, 14], store: M },
  { sku: 'sku_chana_dal_1kg', weeks: [2, 6, 10, 14], qty: 2, store: M },
  { sku: 'sku_ghee_1l', weeks: [6, 14], store: M }, // every 8 weeks, bought last week: not due
  { sku: 'sku_noor_sunflower_1800', weeks: F.stepping(2, 2), store: M },
  { sku: 'sku_wadi_sugar_2kg', weeks: F.stepping(2, 2), store: M },
  { sku: 'sku_tea_dust_900', weeks: F.stepping(2, 3), store: M }, // every 3 weeks
  // Dislike: tried the cheaper Golden Sella rice once (a small Quik order), never again.
  { sku: 'sku_golden_sella_5kg', weeks: [5] },
  // The weekly pantry run: canned food, pasta and dates for six people.
  { sku: 'sku_chickpeas_can_400', weeks: F.every, qty: 4, store: M },
  { sku: 'sku_tuna_can_160', weeks: F.every, qty: 3, store: M },
  { sku: 'sku_spaghetti_500', weeks: F.every, qty: 3, store: M },
  { sku: 'sku_tomato_paste_400', weeks: F.every, qty: 2, store: M },
  { sku: 'sku_dates_1kg', weeks: F.stepping(1, 2), store: M },
  // Switch when the baby arrived in week 8: fresh milk (small Quik orders) replaced by long-life milk,
  // plus formula and diapers every two weeks.
  { sku: 'sku_marmoom_milk_2l', weeks: F.until(7), qty: 3 },
  { sku: 'sku_uht_milk_6x1l', weeks: F.from(8), qty: 2, store: M },
  { sku: 'sku_baby_formula_800', weeks: [8, 10, 12, 14], store: M },
  { sku: 'sku_diapers_44', weeks: [8, 10, 12, 14], store: M },
  { sku: 'sku_sparkle_dish_750', weeks: F.stepping(1, 3), store: M },
  { sku: 'sku_brightwash_3l', weeks: [2, 6, 10, 14], store: M },
  { sku: 'sku_softcloud_12', weeks: F.stepping(2, 2), store: M },
  // Treats: cola and mango drink every week (doubled for guests in week 10), biscuits, ice cream creeping in.
  { sku: 'sku_fizzup_cola_6', weeks: F.every, qty: 2, qtyByWeek: { 10: 4 }, store: M },
  { sku: 'sku_mango_drink_6', weeks: F.every, store: M },
  { sku: 'sku_teatime_biscuits_400', weeks: F.every, qty: 2, store: M },
  { sku: 'sku_chocojoy_4', weeks: [4, 9, 13], store: M },
  { sku: 'sku_polar_icecream_1l', weeks: [12, 13, 14], store: M },
  // Guests in week 10: the only time fresh chicken came through Careem.
  { sku: 'sku_valley_chicken_1kg', weeks: [10], qty: 3 },
];

export const FAMILY: Persona = {
  key: 'family',
  story: 'The Khan family: six people in Al Barsha who stock the pantry through Careem every week (bulk rice, atta, dal, canned food, long-life milk) and buy fresh food at the local market; new baby since week 8 (long-life milk, formula, diapers), guests in week 10.',
  user: { given: 'Ayesha', family: 'Khan', email: 'ayesha.khan@family-of-six.example', gender: 'FEMALE' },
  home: {
    name: 'Home', locationUuid: 'LOC-60001', latitude: 25.1124, longitude: 55.2003,
    addressDetails: { buildingName: 'Al Barsha 1, Villa 27', area: 'Al Barsha', city: 'Dubai', country: 'AE', formattedName: 'Villa 27, Al Barsha 1', savedName: 'Home' },
  },
  weeks: 14, skippedWeeks: [], history: FAMILY_HISTORY,
};

// ---------- 3. Joy: a young professional living alone in JLT, switched to eating healthy ----------

const S = weeksOf(12, [9]);
const SINGLE_HISTORY: HistoryLine[] = [
  // No bottled drinking water: Joy has a filter. Oat milk every week, always the same brand.
  { sku: 'sku_greenoat_oat_milk_1l', weeks: S.every, qty: 2 },
  { sku: 'sku_eggs_12', weeks: S.every },
  { sku: 'sku_bananas_1kg', weeks: S.every, wobble: 0.5 },
  // Weeks 1 to 6: instant noodles, cola and chips. From week 7: the healthy switch.
  { sku: 'sku_instant_noodles_5', weeks: S.until(6) },
  { sku: 'sku_fizzup_cola_6', weeks: S.until(6) },
  { sku: 'sku_crunchos_150', weeks: S.until(6) },
  { sku: 'sku_sparkling_water_6', weeks: S.from(7) },
  { sku: 'sku_mixed_nuts_200', weeks: S.from(7) },
  { sku: 'sku_chicken_breast_500', weeks: S.from(7), qty: 2 },
  { sku: 'sku_spinach_200', weeks: S.from(7) },
  { sku: 'sku_avocado_2', weeks: S.from(7) },
  { sku: 'sku_yogurt_500', weeks: S.from(7) },
  { sku: 'sku_brown_rice_2kg', weeks: [7, 10] }, // every 3 weeks: due this week
  { sku: 'sku_protein_bars_4', weeks: [8, 10, 12] },
  // Specialty coffee beans every 3 weeks from JLT Organic Pantry, never anywhere else.
  { sku: 'sku_coffee_beans_250', weeks: [2, 5, 8, 11], store: 'jlt' },
  // Still the odd treat.
  { sku: 'sku_chocojoy_4', weeks: [2, 4, 11] },
  { sku: 'sku_softcloud_12', weeks: [4, 10] },
  { sku: 'sku_sparkle_dish_750', weeks: [3, 7, 12] },
];

export const SINGLE: Persona = {
  key: 'single',
  story: 'Joy: lives alone in JLT, small weekly Quik orders, switched from noodles, cola and chips to healthy food in week 7, coffee beans from JLT Organic Pantry, away in week 9.',
  user: { given: 'Joy', family: 'Dela Cruz', email: 'joy.delacruz@jlt-sunrise.example', gender: 'FEMALE' },
  home: {
    name: 'Home', locationUuid: 'LOC-70001', latitude: 25.0693, longitude: 55.1412,
    addressDetails: { buildingName: 'Lake Terrace, Cluster D', area: 'Jumeirah Lake Towers', city: 'Dubai', country: 'AE', formattedName: 'Lake Terrace, Cluster D, JLT', savedName: 'Home' },
  },
  weeks: 12, skippedWeeks: [9], history: SINGLE_HISTORY,
};
