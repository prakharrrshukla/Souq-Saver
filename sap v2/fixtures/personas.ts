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

const F = weeksOf(14, []);
const FAMILY_HISTORY: HistoryLine[] = [
  { sku: 'sku_oasis_water_6x1500', weeks: F.every, qty: 4 },
  // Monthly bulk staples run at Marina Fresh Market, always the same brands. Due again this week.
  { sku: 'sku_royal_basmati_10kg', weeks: [2, 6, 10], store: 'marina' },
  { sku: 'sku_chakki_atta_10kg', weeks: [2, 6, 10], store: 'marina' },
  { sku: 'sku_chana_dal_1kg', weeks: [2, 6, 10], qty: 2, store: 'marina' },
  { sku: 'sku_ghee_1l', weeks: [6, 14], store: 'marina' }, // every 8 weeks, bought last week: not due
  // Dislike: tried the cheaper Golden Sella rice once at Quik, never again.
  { sku: 'sku_golden_sella_5kg', weeks: [5] },
  // The household grew in week 8 (new baby): more milk and eggs every week since.
  { sku: 'sku_marmoom_milk_2l', weeks: F.every, qty: 3, qtyByWeek: Object.fromEntries(F.from(8).map((w) => [w, 4])) },
  { sku: 'sku_golden_eggs_30', weeks: F.every, qty: 1, qtyByWeek: Object.fromEntries(F.from(8).map((w) => [w, 2])) },
  { sku: 'sku_diapers_44', weeks: [8, 10, 12, 14] }, // new need since the baby: every 2 weeks
  { sku: 'sku_khayma_bread_6', weeks: F.every, qty: 3 },
  { sku: 'sku_red_onions_1kg', weeks: F.every, qty: 2, wobble: 0.5 },
  { sku: 'sku_tomatoes_1kg', weeks: F.every, qty: 2, wobble: 0.5 },
  { sku: 'sku_potatoes_2kg', weeks: F.every },
  // Chicken every week; week 10 had guests (double order), not a new habit.
  { sku: 'sku_valley_chicken_1kg', weeks: F.every, qty: 3, qtyByWeek: { 10: 6 } },
  { sku: 'sku_laban_yogurt_2kg', weeks: F.every },
  { sku: 'sku_tea_dust_900', weeks: F.stepping(2, 3) }, // every 3 weeks, bought last week
  { sku: 'sku_sparkle_dish_750', weeks: F.stepping(1, 3) },
  { sku: 'sku_brightwash_3l', weeks: [2, 6, 10, 14] },
  { sku: 'sku_softcloud_12', weeks: F.stepping(2, 2) },
  // Treats: cola and mango drink every week (doubled for the guests), biscuits, ice cream creeping in.
  { sku: 'sku_fizzup_cola_6', weeks: F.every, qty: 2, qtyByWeek: { 10: 4 } },
  { sku: 'sku_mango_drink_6', weeks: F.every },
  { sku: 'sku_teatime_biscuits_400', weeks: F.every, qty: 2 },
  { sku: 'sku_chocojoy_4', weeks: [4, 9, 13] },
  { sku: 'sku_polar_icecream_1l', weeks: [12, 13, 14] },
];

export const FAMILY: Persona = {
  key: 'family',
  story: 'The Khan family: six people in Al Barsha, a new baby since week 8, monthly bulk staples run at Marina Fresh Market, guests in week 10.',
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
