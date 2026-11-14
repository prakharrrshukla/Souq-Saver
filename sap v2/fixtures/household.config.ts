// The demo stories: three households (Leonardo here, two more in personas.ts), three stores.
// Everything here is invented sample data. Only the file pattern is Careem's
// (see sandbox/careem-mcp-sandbox/spec/FIXTURES.md and the tool files).
// Tune prices and schedules here, then run `npm run generate:data`.

export const SEED = 20261114;

export type StoreKey = 'quik' | 'marina' | 'jlt';

export const STORES: Record<StoreKey, {
  merchantId: number; brandId: number; name: string; kind: 'quik' | 'shops';
  firstItemId: number; categoryBase: number;
  deliveryFee: number; serviceFee: number; promo?: { id: number; code: string; label: string };
  rating?: string; ratingVolume?: string; deliveryTime?: string; cuisine?: string; slug?: string;
}> = {
  // Ids 40001, 40101 and 40201 are Careem's; fees for Quik come from Careem's own basket scenario.
  quik: { merchantId: 40001, brandId: 40000, name: 'Careem Quik Dubai Marina', kind: 'quik', firstItemId: 4000201, categoryBase: 7200, deliveryFee: 4, serviceFee: 1.5 },
  marina: {
    merchantId: 40101, brandId: 40100, name: 'Marina Fresh Market', kind: 'shops', firstItemId: 4010201, categoryBase: 8200,
    deliveryFee: 7, serviceFee: 1, promo: { id: 510030, code: 'FREEDEL', label: 'Free delivery applied' },
    rating: '4.60', ratingVolume: '(850+)', deliveryTime: '30-40 mins', cuisine: 'Supermarket, Groceries', slug: 'marina_fresh',
  },
  jlt: {
    merchantId: 40201, brandId: 40200, name: 'JLT Organic Pantry', kind: 'shops', firstItemId: 4020201, categoryBase: 8300,
    deliveryFee: 9, serviceFee: 1.5,
    rating: '4.40', ratingVolume: '(320+)', deliveryTime: '40-50 mins', cuisine: 'Organic, Groceries', slug: 'jlt_organic',
  },
};

export type Product = {
  sku: string; name: string; size: string; category: string; parent: string;
  /** Price per store in AED; a missing key means the store does not sell it. */
  price: Partial<Record<StoreKey, number>>;
  /** Fixed item ids for products that already exist in Careem's fixture world. */
  ids?: Partial<Record<StoreKey, number>>;
};

const p = (sku: string, name: string, size: string, category: string, parent: string, quik?: number, marina?: number, jlt?: number, ids?: Product['ids']): Product => ({
  sku, name, size, category, parent, ids,
  price: { ...(quik !== undefined && { quik }), ...(marina !== undefined && { marina }), ...(jlt !== undefined && { jlt }) },
});

// The size in the second column is what the engine compares for swaps (same category, size within 25%).
export const PRODUCTS: Product[] = [
  //  sku                       name                                            size         category                 parent                  Quik   Marina  JLT
  p('sku_oasis_water_6x1500', 'Oasis Springs Drinking Water 6x1.5L', '6 x 1.5 L', 'Drinking Water', 'Water & Beverages', 9.5, 8.75),
  p('sku_royal_basmati_5kg', 'Royal Mahal Basmati Rice 5kg', '5 kg', 'Basmati Rice', 'Rice, Flour & Pulses', 42.0, 39.5, 48.0),
  p('sku_golden_sella_5kg', 'Golden Sella Basmati Rice 5kg', '5 kg', 'Basmati Rice', 'Rice, Flour & Pulses', 38.75),
  p('sku_marina_basmati_5kg', 'Marina Fresh Basmati Rice 5kg (store brand)', '5 kg', 'Basmati Rice', 'Rice, Flour & Pulses', undefined, 34.0),
  p('sku_royal_basmati_1kg', 'Royal Mahal Basmati Rice 1kg', '1 kg', 'Basmati Rice', 'Rice, Flour & Pulses', 9.95, 9.5),
  p('sku_chakki_atta_5kg', 'Chakki Gold Atta Wheat Flour 5kg', '5 kg', 'Atta Flour', 'Rice, Flour & Pulses', 18.5, 17.25),
  p('sku_noor_sunflower_1800', 'Noor Al Sahra Sunflower Oil 1.8L', '1.8 L', 'Cooking Oil', 'Cooking Essentials', 16.75, 15.9, 21.0),
  p('sku_desi_toor_dal_1kg', 'Desi Harvest Toor Dal 1kg', '1 kg', 'Lentils & Dal', 'Rice, Flour & Pulses', 9.25, 8.5, 11.0),
  p('sku_wadi_sugar_2kg', 'Al Wadi White Sugar 2kg', '2 kg', 'Sugar', 'Cooking Essentials', 7.25, 6.95, 9.5),
  p('sku_sea_salt_1kg', 'Shams Iodised Sea Salt 1kg', '1 kg', 'Salt', 'Cooking Essentials', 2.5, 2.25, 4.0),
  p('sku_marmoom_milk_2l', 'Marmoom Farms Fresh Milk Full Cream 2L', '2 L', 'Milk', 'Dairy & Eggs', 10.5, 10.25, 13.0),
  p('sku_greenoat_oat_milk_1l', 'GreenOat Oat Milk 1L', '1 L', 'Plant Milk', 'Dairy & Eggs', 10.5, 10.25, 9.95),
  p('sku_milk_1l', 'Fresh Farm Full Cream Milk 1L', '1 L', 'Milk', 'Dairy & Eggs', 6.75, undefined, undefined, { quik: 4000101 }),
  p('sku_org_milk_1l', 'Organic Full Cream Milk 1L', '1 L', 'Milk', 'Dairy & Eggs', undefined, 8.5, undefined, { marina: 4010101 }),
  p('sku_golden_eggs_30', 'Golden Yolk Eggs Tray 30', '30 pcs', 'Eggs', 'Dairy & Eggs', 21.0, 19.5, 26.0),
  p('sku_eggs_12', 'Free Range Eggs 12pk', '12 pcs', 'Eggs', 'Dairy & Eggs', 14.5, undefined, undefined, { quik: 4000102 }),
  p('sku_org_eggs_6', 'Organic Free Range Eggs 6pk', '6 pcs', 'Eggs', 'Dairy & Eggs', undefined, 12.75, undefined, { marina: 4010102 }),
  p('sku_yogurt_500', 'Marmoom Farms Greek Style Yogurt 500g', '500 g', 'Yogurt', 'Dairy & Eggs', 11.5, 10.95, 14.5),
  p('sku_red_onions_1kg', 'Red Onions 1kg', '1 kg', 'Onions', 'Fruits & Vegetables', 4.25, 3.75, 6.0),
  p('sku_tomatoes_1kg', 'Tomatoes 1kg', '1 kg', 'Tomatoes', 'Fruits & Vegetables', 5.5, 4.95, 7.5),
  p('sku_bananas_1kg', 'Bananas 1kg', '1 kg', 'Bananas', 'Fruits & Vegetables', 6.5, 5.95, 8.5),
  p('sku_khayma_bread_6', 'Al Khayma Arabic Bread Large 6pcs', '6 pcs', 'Arabic Bread', 'Bakery', 3.0, 2.75, 4.0),
  p('sku_valley_chicken_1kg', 'Green Valley Fresh Whole Chicken 1kg', '1 kg', 'Fresh Chicken', 'Meat & Poultry', 19.5, 18.25, 27.0),
  p('sku_karak_tea_100', 'Karak Chai Black Tea Bags 100', '100 pcs', 'Tea', 'Coffee & Tea', 14.75, 13.95, 18.0),
  p('sku_sparkle_dish_750', 'Sparkle Lemon Dishwashing Liquid 750ml', '750 ml', 'Dishwashing Liquid', 'Household', 8.25, 7.95, 12.0),
  p('sku_brightwash_3l', 'BrightWash Laundry Detergent Liquid 3L', '3 L', 'Laundry Detergent', 'Household', 34.5, 32.95, 41.0),
  p('sku_softcloud_12', 'SoftCloud Toilet Tissue 12 Rolls', '12 pcs', 'Toilet Tissue', 'Household', 25.65, 23.95, 29.0),
  p('sku_crunchos_150', 'Crunchos Salted Potato Chips Family Pack 150g', '150 g', 'Potato Chips', 'Snacks & Sweets', 7.5, 6.95, 9.0),
  p('sku_fizzup_cola_6', 'FizzUp Cola 6x330ml', '6 x 330 ml', 'Soft Drinks', 'Water & Beverages', 11.0, 10.5),
  p('sku_chocojoy_4', 'ChocoJoy Milk Chocolate Bars 4 Pack', '4 pcs', 'Chocolate', 'Snacks & Sweets', 9.75, 9.25, 14.0),
  p('sku_polar_icecream_1l', 'Polar Scoop Vanilla Ice Cream 1L', '1 L', 'Ice Cream', 'Snacks & Sweets', 18.5, 17.5, 24.0),
  p('sku_teatime_biscuits_400', 'Tea Time Butter Biscuits 400g', '400 g', 'Biscuits', 'Snacks & Sweets', 6.5, 5.95, 8.0),
  p('sku_sunny_juice_1500', 'Sunny Grove Orange Juice 1.5L', '1.5 L', 'Juice', 'Water & Beverages', 9.5, 8.95, 13.0),
  // Added for the Khan family and Joy (personas.ts). Appended so existing item ids stay the same.
  p('sku_royal_basmati_10kg', 'Royal Mahal Basmati Rice 10kg', '10 kg', 'Basmati Rice', 'Rice, Flour & Pulses', 79.0, 74.5),
  p('sku_chakki_atta_10kg', 'Chakki Gold Atta Wheat Flour 10kg', '10 kg', 'Atta Flour', 'Rice, Flour & Pulses', 34.0, 31.5),
  p('sku_chana_dal_1kg', 'Desi Harvest Chana Dal 1kg', '1 kg', 'Lentils & Dal', 'Rice, Flour & Pulses', 8.75, 7.95, 10.5),
  p('sku_ghee_1l', 'Desi Gold Pure Ghee 1L', '1 L', 'Ghee', 'Cooking Essentials', 32.0, 29.95, 38.0),
  p('sku_laban_yogurt_2kg', 'Marmoom Farms Fresh Yogurt 2kg', '2 kg', 'Yogurt', 'Dairy & Eggs', 13.5, 12.75, 17.0),
  p('sku_potatoes_2kg', 'Potatoes 2kg', '2 kg', 'Potatoes', 'Fruits & Vegetables', 6.5, 5.75, 9.0),
  p('sku_tea_dust_900', 'Chaiwala Strong Tea Dust 900g', '900 g', 'Tea', 'Coffee & Tea', 24.0, 22.5, 29.0),
  p('sku_diapers_44', 'TinyCare Baby Diapers Size 4 (44 pcs)', '44 pcs', 'Diapers', 'Baby Care', 54.0, 49.95, 62.0),
  p('sku_mango_drink_6', 'Sunny Grove Mango Drink 6x250ml', '6 x 250 ml', 'Juice', 'Water & Beverages', 8.5, 7.95, 11.0),
  p('sku_sparkling_water_6', 'Alpine Spring Sparkling Water 6x330ml', '6 x 330 ml', 'Sparkling Water', 'Water & Beverages', 12.0, 11.5, 10.95),
  p('sku_avocado_2', 'Avocados 2pcs', '2 pcs', 'Avocados', 'Fruits & Vegetables', 11.0, 10.5, 9.5),
  p('sku_mixed_nuts_200', 'NutriCrunch Mixed Nuts 200g', '200 g', 'Nuts', 'Snacks & Sweets', 16.5, 15.95, 14.5),
  p('sku_protein_bars_4', 'FitFuel Protein Bars 4pk', '4 pcs', 'Protein Bars', 'Snacks & Sweets', 22.0, 21.0, 19.5),
  p('sku_chicken_breast_500', 'Green Valley Chicken Breast 500g', '500 g', 'Chicken Breast', 'Meat & Poultry', 17.5, 16.75, 21.0),
  p('sku_brown_rice_2kg', 'Harvest Brown Rice 2kg', '2 kg', 'Brown Rice', 'Rice, Flour & Pulses', 15.5, 14.95, 13.5),
  p('sku_spinach_200', 'Baby Spinach 200g', '200 g', 'Leafy Greens', 'Fruits & Vegetables', 8.5, 7.95, 7.5),
  p('sku_instant_noodles_5', 'Quickbowl Instant Noodles 5pk', '5 pcs', 'Instant Noodles', 'Pantry', 7.0, 6.5),
  p('sku_coffee_beans_250', 'Roastery Arabica Coffee Beans 250g', '250 g', 'Coffee', 'Coffee & Tea', 32.0, 30.0, 27.5),
];

const WEEKS = 16; // week 1 is the oldest order, week 16 was placed 7 days ago

/** Weeks with no order at all (the household was away on holiday in week 12). */
const SKIPPED_WEEKS = [12];

const every = Array.from({ length: WEEKS }, (_, i) => i + 1).filter((w) => !SKIPPED_WEEKS.includes(w));
const except = (...skip: number[]) => every.filter((w) => !skip.includes(w));
const from = (first: number) => every.filter((w) => w >= first);
const until = (last: number) => every.filter((w) => w <= last);

/**
 * What the household bought, where and when. `weeks` are 1-based week numbers.
 * `store` defaults to Careem Quik (Saturday orders); `marina` lines form a monthly Wednesday
 * top-up order at Marina Fresh Market (Careem Shops).
 * `qtyByWeek` overrides the quantity for a week (bulk buys). `prices` overrides the unit price by week (price drift); otherwise today's store price applies.
 * `wobble` lets the generator vary the price a little in older weeks (fresh produce).
 *
 * Every pattern below is visible only through ordinary order fields (items, quantities, prices,
 * dates, merchants), so an agent can learn it from get_activities and the item details alone.
 */
export type HistoryLine = { sku: string; weeks: number[]; qty?: number; qtyByWeek?: Record<number, number>; store?: StoreKey; prices?: Record<number, number>; wobble?: number };
const HISTORY: HistoryLine[] = [
  // Water every week; a bulk buy of 6 packs in week 5 covered weeks 6 and 7.
  { sku: 'sku_oasis_water_6x1500', weeks: except(6, 7), qty: 2, qtyByWeek: { 5: 6 } },
  // Brand loyalty: always Royal Mahal rice every 3 weeks, even as it rose 10.5% (38.00 to 42.00) and
  // Quik sells a cheaper basmati. Due again this week.
  { sku: 'sku_royal_basmati_5kg', weeks: [2, 5, 11, 14], prices: { 2: 38.0, 5: 38.0, 11: 40.0, 14: 42.0 } },
  // Dislike: tried the cheaper Golden Sella once (week 8) instead of Royal Mahal, never bought it again.
  { sku: 'sku_golden_sella_5kg', weeks: [8] },
  { sku: 'sku_noor_sunflower_1800', weeks: [2, 5, 8, 11, 14] }, // brand loyalty on oil too
  // Staples bought in bulk once a month at Marina Fresh Market, not at Quik.
  { sku: 'sku_chakki_atta_5kg', weeks: [3, 7, 11, 15], qty: 2, store: 'marina' },
  { sku: 'sku_desi_toor_dal_1kg', weeks: [3, 7, 11, 15], qty: 2, store: 'marina' },
  { sku: 'sku_wadi_sugar_2kg', weeks: [6, 11, 16] },
  // Switch: full-cream cow's milk every week until week 10 (price drift +10.5%), then oat milk from week 11.
  { sku: 'sku_marmoom_milk_2l', weeks: until(10), qty: 2, prices: { 1: 9.5, 2: 9.5, 3: 9.5, 4: 9.5, 5: 9.5, 6: 9.5, 7: 9.95, 8: 9.95, 9: 9.95 } },
  { sku: 'sku_greenoat_oat_milk_1l', weeks: from(11), qty: 2 },
  // Eggs every week; dislike: tried the 12-pack once (week 4) and went back to the tray of 30.
  { sku: 'sku_golden_eggs_30', weeks: except(4) },
  { sku: 'sku_eggs_12', weeks: [4] },
  { sku: 'sku_red_onions_1kg', weeks: every, wobble: 0.5 },
  { sku: 'sku_tomatoes_1kg', weeks: every, wobble: 0.5 },
  { sku: 'sku_khayma_bread_6', weeks: every, qty: 2 },
  // Household items on slow cycles. Dish soap every 4 weeks (delayed a week by the holiday), bought last week: not due.
  { sku: 'sku_sparkle_dish_750', weeks: [4, 8, 13, 16] },
  { sku: 'sku_brightwash_3l', weeks: [3, 9, 15] },
  { sku: 'sku_softcloud_12', weeks: [4, 10, 16] },
  // Likes: the same chips in almost every order, cola every week.
  { sku: 'sku_crunchos_150', weeks: except(9, 13) },
  { sku: 'sku_fizzup_cola_6', weeks: every },
  { sku: 'sku_chocojoy_4', weeks: [2, 5, 9, 11, 13, 14, 15, 16] },
  // Treats that crept into the weekly shop over the last month: this is where the budget went.
  { sku: 'sku_polar_icecream_1l', weeks: [13, 14, 15, 16] },
  { sku: 'sku_teatime_biscuits_400', weeks: [11, 13, 14, 15, 16] },
  { sku: 'sku_sunny_juice_1500', weeks: [13, 14, 15, 16] },
  // One-off purchases: natural noise, no cycle can be learned from a single order.
  { sku: 'sku_sea_salt_1kg', weeks: [1] },
  { sku: 'sku_bananas_1kg', weeks: [3] },
  { sku: 'sku_valley_chicken_1kg', weeks: [6] },
  { sku: 'sku_yogurt_500', weeks: [9] },
  { sku: 'sku_karak_tea_100', weeks: [10] },
];

// ---------- the three demo households ----------

export type Persona = {
  key: 'leonardo' | 'family' | 'single';
  story: string;
  user: { given: string; family: string; email: string; gender: 'MALE' | 'FEMALE' };
  home: { name: string; locationUuid: string; latitude: number; longitude: number; addressDetails: Record<string, string> };
  weeks: number; skippedWeeks: number[]; history: HistoryLine[];
};

const LEONARDO: Persona = {
  key: 'leonardo',
  story: 'Leonardo DiCappuccino (Careem\'s own sandbox user): Dubai Marina, 16 weeks, brand-loyal staples, cow milk to oat milk, monthly Marina top-ups, away in week 12.',
  user: { given: 'Leonardo', family: 'DiCappuccino', email: 'leo.dicappuccino@finally-won-an-oscar.coffee', gender: 'MALE' },
  home: {
    name: 'Home', locationUuid: 'LOC-50001', latitude: 25.0866, longitude: 55.1474,
    addressDetails: { buildingName: 'Marina Gate 1', area: 'Dubai Marina', city: 'Dubai', country: 'AE', formattedName: 'Marina Gate 1, Dubai Marina', savedName: 'Home' },
  },
  weeks: WEEKS, skippedWeeks: SKIPPED_WEEKS, history: HISTORY,
};

import { FAMILY, SINGLE } from './personas.ts';
export const PERSONAS: Record<Persona['key'], Persona> = { leonardo: LEONARDO, family: FAMILY, single: SINGLE };
