// The demo story: one Dubai Marina household, three stores, ten weekly orders.
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
];

export const WEEKS = 10; // week 1 is the oldest order, week 10 was placed 7 days ago

const every = Array.from({ length: WEEKS }, (_, i) => i + 1);
const except = (...skip: number[]) => every.filter((w) => !skip.includes(w));

/**
 * What the household bought at Quik and when. `weeks` are 1-based week numbers.
 * `prices` overrides the unit price by week (price drift); otherwise today's Quik price applies.
 * `wobble` lets the generator vary the price a little in older weeks (fresh produce).
 */
export const HISTORY: { sku: string; weeks: number[]; qty?: number; prices?: Record<number, number>; wobble?: number }[] = [
  { sku: 'sku_oasis_water_6x1500', weeks: every, qty: 2 },
  { sku: 'sku_royal_basmati_5kg', weeks: [2, 5, 8], prices: { 2: 38.0, 5: 40.0, 8: 42.0 } }, // +10.5% drift, due again this week
  { sku: 'sku_chakki_atta_5kg', weeks: [1, 3, 5, 7, 9] },
  { sku: 'sku_noor_sunflower_1800', weeks: [2, 5, 8] },
  { sku: 'sku_desi_toor_dal_1kg', weeks: [1, 3, 5, 7, 9] },
  { sku: 'sku_wadi_sugar_2kg', weeks: [5, 10] },
  { sku: 'sku_marmoom_milk_2l', weeks: every, qty: 2, prices: { 1: 9.5, 2: 9.5, 3: 9.5, 4: 9.95, 5: 9.95, 6: 9.95 } }, // drift on a weekly item
  { sku: 'sku_golden_eggs_30', weeks: every },
  { sku: 'sku_red_onions_1kg', weeks: every, wobble: 0.5 },
  { sku: 'sku_tomatoes_1kg', weeks: every, wobble: 0.5 },
  { sku: 'sku_khayma_bread_6', weeks: every, qty: 2 },
  { sku: 'sku_sparkle_dish_750', weeks: [2, 6, 10] }, // every 4 weeks, bought last week: not due
  { sku: 'sku_brightwash_3l', weeks: [3, 9] },
  { sku: 'sku_softcloud_12', weeks: [4, 10] },
  { sku: 'sku_crunchos_150', weeks: except(3, 7) }, // 8 of 10 weeks
  { sku: 'sku_fizzup_cola_6', weeks: every },
  { sku: 'sku_chocojoy_4', weeks: [3, 5, 7, 8, 9, 10] }, // 6 of 10 weeks
  // Treats that crept into the weekly shop over the last month: this is where the budget went.
  { sku: 'sku_polar_icecream_1l', weeks: [6, 7, 8, 9, 10] },
  { sku: 'sku_teatime_biscuits_400', weeks: [5, 7, 8, 9, 10] },
  { sku: 'sku_sunny_juice_1500', weeks: [6, 7, 8, 9, 10] },
  // One-off purchases: natural noise, no cycle can be learned from a single order.
  { sku: 'sku_sea_salt_1kg', weeks: [1] },
  { sku: 'sku_bananas_1kg', weeks: [3] },
  { sku: 'sku_valley_chicken_1kg', weeks: [4] },
  { sku: 'sku_yogurt_500', weeks: [6] },
  { sku: 'sku_karak_tea_100', weeks: [7] },
];
