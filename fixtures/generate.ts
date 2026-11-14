// Seeded generator for the sample household. Same seed, same output, every run.
//
// It writes scenario files in Careem's tool-file format (spec/FORMAT.md) to fixtures/out/tools.
// The local Careem MCP server reads that folder as an overlay, so every number the app shows
// is a real MCP response. Response shapes are copied from Careem's tool files; the content
// (household, products, prices, orders) is invented. See household.config.ts for the story.
//
// Run: npm run generate:data
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HISTORY, PRODUCTS, SEED, STORES, WEEKS, type Product, type StoreKey } from './household.config.ts';

/** How timestamps are written: placeholders for the MCP server, real dates for offline tests. */
export type Time = { iso(hoursAgo: number): string; ms(hoursAgo: number): number | string };

export const placeholderTime: Time = { iso: (h) => `{{now-${h}h}}`, ms: (h) => `@@unixms-${h}h@@` };
export const fixedTime = (now: Date): Time => ({
  iso: (h) => new Date(now.getTime() - h * 3_600_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  ms: (h) => now.getTime() - h * 3_600_000,
});

const r2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => n.toFixed(2);
const MEDIA = 'https://careem-catalog-media.media.careem.com';
const HOME = {
  name: 'Home', locationUuid: 'LOC-50001', latitude: 25.0866, longitude: 55.1474,
  addressDetails: { buildingName: 'Marina Gate 1', area: 'Dubai Marina', city: 'Dubai', country: 'AE', formattedName: 'Marina Gate 1, Dubai Marina', savedName: 'Home' },
};

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- catalogue ----------

const storeKeys = Object.keys(STORES) as StoreKey[];
const categories = [...new Set(PRODUCTS.map((p) => p.category))];
const parents = [...new Set(PRODUCTS.map((p) => p.parent))];

/** item id per store, in the same style as Careem's ids (4000xxx Quik, 4010xxx and 4020xxx Shops). */
const itemIds = new Map<string, number>();
for (const key of storeKeys) {
  let next = STORES[key].firstItemId;
  for (const product of PRODUCTS) {
    if (product.price[key] === undefined) continue;
    itemIds.set(`${key}:${product.sku}`, product.ids?.[key] ?? next++);
  }
}
export const itemId = (store: StoreKey, sku: string) => itemIds.get(`${store}:${sku}`)!;
const bySku = (sku: string) => PRODUCTS.find((p) => p.sku === sku)!;
const sold = (store: StoreKey) => PRODUCTS.filter((p) => p.price[store] !== undefined);

function priceBlock(price: number) {
  return { original: price, original_formatted: money(price), discount: 0.0, discount_percentage: 0, total: price, total_formatted: money(price), tax_percentage: 5 };
}

function searchItem(store: StoreKey, product: Product) {
  const s = STORES[store];
  const id = itemId(store, product.sku);
  const image = `${MEDIA}/${s.kind}/${product.sku}.png`;
  const description = `${product.name} (${product.size})`;
  return {
    id, item: product.name, item_localized: product.name, upc: `629000${id}`,
    image_url: image, images_urls: [image], description, description_localized: description,
    price: { ...priceBlock(product.price[store]!), discount_type: null },
    active: true, link: `${MEDIA}/${s.kind}/items/${id}`, attributes: [], tags: [], catalog_id: s.merchantId,
    view_only_promotion: null, currency: { code: 'AED', decimals: 2, label: 'AED' }, item_location: null,
    master_product_id: product.sku, is_near_expiry: false, is_ad: false, ad_details: null, is_available: true,
    timing: null, groups: [], item_promotion: null, item_badge_localized: null, item_type: 'REGULAR', bundle_details: null,
    superapp_link: `careem://shops/merchant/${s.merchantId}/item/${id}`,
  };
}

function searchResponse(store: StoreKey) {
  const s = STORES[store];
  const groups = categories
    .map((category) => ({ name: category.toLowerCase(), items: sold(store).filter((p) => p.category === category).map((p) => searchItem(store, p)) }))
    .filter((g) => g.items.length);
  return {
    page: 'grocery_items', merchant_id: s.merchantId, domain: s.kind,
    ...(s.kind === 'quik' && { merchant_name: s.name, merchant_eta_minutes: 15 }),
    groups,
  };
}

function detailsItem(store: StoreKey, product: Product) {
  const s = STORES[store];
  const id = itemId(store, product.sku);
  const image = `${MEDIA}/${s.kind}/${product.sku}.png`;
  const description = `${product.name} (${product.size})`;
  const parentId = s.categoryBase + parents.indexOf(product.parent) * 100 + 100;
  return {
    item_id: id,
    data: {
      id, item: product.name, item_localized: product.name, upc: `629000${id}`, images_urls: [image],
      description, description_localized: description, price: priceBlock(product.price[store]!),
      active: true, link: `${MEDIA}/${s.kind}/items/${id}`, catalog_id: s.merchantId, currency: { label_localized: 'AED' },
      unit_of_measure: { value: product.size, value_localized: product.size },
      core_category: {
        id: parentId + categories.indexOf(product.category) + 1, name: product.category, name_localized: product.category,
        parent_category_id: parentId, parent_category_name: product.parent, parent_category_name_localized: product.parent,
      },
      image_url: image, master_product_id: product.sku, is_near_expiry: false, is_ad: false, is_available: true, item_type: 'product', tags: [],
    },
  };
}

function merchantCard(store: StoreKey) {
  const s = STORES[store];
  return {
    id: s.merchantId, title: s.name, image_url: `${MEDIA}/shops/${s.slug}_store.png`, logo_url: `${MEDIA}/shops/${s.slug}_logo.png`,
    is_cplus: false, link: `${MEDIA}/shops/merchant/${s.merchantId}`, rating: s.rating, rating_volume: s.ratingVolume,
    delivery_time: s.deliveryTime, distance: '0 km', cuisine: s.cuisine, secondary_info: `AED ${money(s.deliveryFee)}`,
    value_proposition: null, promotional_badges: [], is_closed: false,
  };
}

function globalSearchResponse() {
  const shops = storeKeys.filter((k) => STORES[k].kind === 'shops');
  return {
    page: 'global_search', merchants: shops.map(merchantCard), products: [],
    pagination: { total: shops.length, current_page: 1, total_pages: 1, per_page: 20 },
  };
}

/** Fees and best promo for a Shops merchant. The basket itself is fixed (the server keeps no state). */
function basketPriceResponse(store: StoreKey) {
  const s = STORES[store];
  const product = sold(store)[0];
  const subtotal = product.price[store]!;
  const saving = s.promo ? s.deliveryFee : 0;
  const total = r2(subtotal + s.deliveryFee + s.serviceFee - saving);
  const line = (title: string, price: number, style = 'regular') => ({ label: { title, font_style: style }, value: [{ price, type: style, font_style: style }] });
  return {
    page: 'cart_get_basket_price',
    merchant: { id: s.merchantId, name: s.name, name_localized: s.name, eta_in_minutes: 35 },
    basket: {
      id: store === 'marina' ? 6000003 : 6000004, merchant_id: s.merchantId, domain: 'shops', business_type: 'supermarkets', delivery_type: 'careem',
      state: 'active', total_count: 1, count: 1, version: 1,
      items: [{
        item_uuid: '{{uuid}}', catalog_item_id: String(itemId(store, product.sku)), comment: null, count: 1, options: null,
        price: { discount: 0, original: subtotal, total: subtotal }, careem_user_id: 900000001,
        title_localized: product.name, image_url: `${MEDIA}/items/${itemId(store, product.sku)}.png`,
      }],
      missing_items: null, price: { net_total: subtotal, original: subtotal },
      currency: { code: 'AED', label: 'AED', decimals: 2, cents_100: true },
    },
    price: {
      breakdown: [
        line('Subtotal', subtotal),
        line('Delivery fee', s.deliveryFee),
        { ...line('Service fee', s.serviceFee), description: 'Helps us keep the lights on at Careem.' },
        ...(s.promo ? [{
          label: { title: `Promo (${s.promo.code})`, badge_type: 'success', font_style: 'regular' },
          value: [{ price: -saving, type: 'success', font_style: 'success' }],
          helper_msg: { msg: s.promo.label, badge_type: 'success' },
        }] : []),
        line('Total', total, 'bold'),
      ],
      fee_info: {
        title: 'Fees',
        info: {
          title: 'What are these fees?', description: 'Fees help cover delivery and running the platform.',
          fees: [
            { title: 'Delivery fee', description: 'Paid to the captain who delivers your order.' },
            { title: 'Service fee', description: 'Supports customer care and app operations.' },
          ],
        },
      },
      price: { title: 'Total', total, description: 'Incl. VAT' },
      total_saving: saving,
      fees: [{ type: 'delivery_fee', value: s.deliveryFee }, { type: 'service_fee', value: s.serviceFee }],
      ...(s.promo && { promo_code: { code: s.promo.code, applied: { id: s.promo.id } } }),
    },
    payment_method: { type: 'card', id: 4242 },
  };
}

// ---------- order history ----------

function orders(time: Time) {
  const rand = mulberry32(SEED);
  const quik = STORES.quik;
  const list = [];
  for (let week = 1; week <= WEEKS; week++) {
    // Saturdays, with a few hours of noise; the week 6 order slipped to Sunday.
    const hoursAgo = (WEEKS - week + 1) * 168 + Math.round(rand() * 6 - 3) - (week === 6 ? 24 : 0);
    const items = HISTORY.filter((h) => h.weeks.includes(week)).map((h) => {
      const product = bySku(h.sku);
      let unit = h.prices?.[week] ?? product.price.quik!;
      const noise = rand(); // always drawn, so adding a wobble to one item does not shift the others
      if (h.wobble && week < WEEKS) unit = r2(unit + Math.round((noise * 2 - 1) * h.wobble * 4) / 4);
      const quantity = h.qty ?? 1;
      return { item_id: itemId('quik', h.sku), name: product.name, quantity, amount: r2(unit * quantity) };
    });
    const total = r2(items.reduce((sum, i) => sum + i.amount, 0) + quik.deliveryFee + quik.serviceFee);
    const ref = `order_${9300 + week}`;
    list.push({
      id: `act_groc_${9300 + week}`, provider_id: 3, provider: 'careem-grocery', type: 'groceries', reference_id: ref,
      user_id: 900000001, status: 'completed', country: 'AE',
      activity_time: time.iso(hoursAgo), created_at: time.iso(hoursAgo), updated_at: time.iso(hoursAgo - 1),
      data: {
        status: 'DELIVERED', basket_id: 6000300 + week, brand_id: quik.brandId, merchant_id: quik.merchantId, merchant_name: quik.name,
        merchant_type: 'ufd', care_deep_link: `careem://care.careem.com/issueTypes?reference_id=${ref}&provider_id=3&partner=shops`,
        payment_type: 'CARD', completed_at: time.ms(hoursAgo - 1), items,
        order_delivery: { type: 'CAREEM', eta: 18 }, dropoff_location: HOME,
      },
      pricing: { currency: 'AED', total_price: money(total) },
      presentation_data: {
        title: 'Careem Quik', subtitle: items.slice(0, 3).map((i) => i.name).join(', '),
        main_icon_url: `${MEDIA}/icons/quik.png`, trailing: `AED ${money(total)}`, thirdline: 'Delivered to Home',
      },
    });
  }
  return list.reverse(); // newest first, like the activity feed
}

/** Every generated response, as plain objects. Offline engine tests call this with a fixed clock. */
export function build(time: Time) {
  const past = orders(time);
  const historyIds = [...new Set(HISTORY.map((h) => itemId('quik', h.sku)))].sort((a, b) => a - b);
  const skuOfQuikId = new Map(PRODUCTS.filter((p) => p.price.quik !== undefined).map((p) => [itemId('quik', p.sku), p]));
  const details = [];
  for (let i = 0; i < historyIds.length; i += 20) { // the tool takes at most 20 ids per call
    const ids = historyIds.slice(i, i + 20);
    details.push({ ids, response: { page: 'groceries_get_items_details', items: ids.map((id) => detailsItem('quik', skuOfQuikId.get(id)!)) } });
  }
  return {
    seed: SEED,
    activities: {
      pastGroceries: { page: 'get_activities', past_activities: past, paging: {} },
      pastShops: { page: 'get_activities', paging: {} },
    },
    details,
    search: { quik: searchResponse('quik'), marina: searchResponse('marina'), jlt: searchResponse('jlt') },
    globalSearch: globalSearchResponse(),
    basketPrice: { marina: basketPriceResponse('marina'), jlt: basketPriceResponse('jlt') },
    lastWeekTotal: Number(past[0].pricing.total_price),
  };
}

// ---------- write tool files ----------

type Scenario = { name: string; note: string; match: unknown; response: unknown };

const json = (value: unknown) => JSON.stringify(value, null, 2).replace(/"@@(unixms-\d+h)@@"/g, '{{$1}}');

function toolFile(tool: string, domain: string, scenarios: Scenario[]) {
  const parts = [
    `---\ntool: ${tool}\ndomain: ${domain}\n---\n`,
    `# ${tool} (generated household scenarios)\n`,
    `Generated by fixtures/generate.ts with seed ${SEED}. Do not edit by hand: change\nfixtures/household.config.ts and run \`npm run generate:data\`. These scenarios are tried before\nCareem's own scenarios for this tool.\n`,
  ];
  for (const s of scenarios) {
    parts.push(`## Scenario: ${s.name}\n\n${s.note}\n\n\`\`\`json match\n${json(s.match)}\n\`\`\`\n\n\`\`\`json response\n${json(s.response)}\n\`\`\`\n`);
  }
  return parts.join('\n');
}

function main() {
  const data = build(placeholderTime);
  const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
  rmSync(outDir, { recursive: true, force: true });
  const { quik, marina, jlt } = STORES;

  const files: Record<string, string> = {
    'tools/user/get_activities.md': toolFile('get_activities', 'user', [
      { name: 'upstream-unavailable', note: 'Kept ahead of the household scenarios so the magic trigger still works.', match: { next_cursor: '~trigger_upstream_down' }, response: { page: 'get_activities', error: 'upstream service error: upstream temporarily unavailable' } },
      { name: 'household-past-groceries', note: `\`past\` + \`groceries\`: ${WEEKS} weekly Quik orders, newest first, one page.`, match: { activity_status: 'past', activity_type: 'groceries' }, response: data.activities.pastGroceries },
      { name: 'household-past-shops', note: '`past` + `shops`: this household has not ordered from a Careem Shops merchant yet.', match: { activity_status: 'past', activity_type: 'shops' }, response: data.activities.pastShops },
    ]),
    'tools/groceries/groceries_get_items_details.md': toolFile('groceries_get_items_details', 'groceries',
      data.details.map((batch, i) => ({
        name: `household-items-${i + 1}`, note: `Quik items ${batch.ids[0]} to ${batch.ids[batch.ids.length - 1]} (batch ${i + 1} of the household's history, ids ascending).`,
        match: { merchant_id: quik.merchantId, item_ids: [batch.ids[0]] }, response: batch.response,
      }))),
    'tools/groceries/search_groceries_items.md': toolFile('search_groceries_items', 'groceries', [
      { name: 'household-marina-fresh', note: `\`merchant_id: ${marina.merchantId}\`: the full Marina Fresh Market range, one group per category.`, match: { merchant_id: marina.merchantId }, response: data.search.marina },
      { name: 'household-jlt-organic', note: `\`merchant_id: ${jlt.merchantId}\`: JLT Organic Pantry. It does not sell drinking water, atta or soft drinks.`, match: { merchant_id: jlt.merchantId }, response: data.search.jlt },
      { name: 'household-quik', note: 'A term containing `water` without a Shops merchant: the Quik range, one group per category.', match: { search_terms: ['~water'] }, response: data.search.quik },
    ]),
    'tools/groceries/global_search.md': toolFile('global_search', 'groceries', [
      { name: 'household-supermarkets', note: '`query` containing `supermarket`: both Careem Shops merchants near Home.', match: { query: '~supermarket' }, response: data.globalSearch },
    ]),
    'tools/cart/cart_get_basket_price.md': toolFile('cart_get_basket_price', 'cart', [
      { name: 'household-marina-price', note: `\`merchant_id: ${marina.merchantId}\`: delivery ${money(marina.deliveryFee)}, service ${money(marina.serviceFee)}, ${marina.promo!.code} applied.`, match: { merchant_id: marina.merchantId }, response: data.basketPrice.marina },
      { name: 'household-jlt-price', note: `\`merchant_id: ${jlt.merchantId}\`: delivery ${money(jlt.deliveryFee)}, service ${money(jlt.serviceFee)}, no promo.`, match: { merchant_id: jlt.merchantId }, response: data.basketPrice.jlt },
    ]),
  };
  const manifest = {
    seed: SEED, generatedBy: 'fixtures/generate.ts', sampleData: true,
    household: 'Sample household at Home (LOC-50001), Dubai Marina. Invented data in Careem MCP response format.',
    orders: WEEKS, lastWeekTotal: data.lastWeekTotal, products: PRODUCTS.length,
    stores: Object.values(STORES).map((s) => ({ merchantId: s.merchantId, name: s.name, items: PRODUCTS.filter((p) => p.price[(Object.keys(STORES) as StoreKey[]).find((k) => STORES[k] === s)!] !== undefined).length })),
    files: Object.keys(files),
  };
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';

  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), content);
  }
  console.log(`fixtures: seed ${SEED}, ${WEEKS} orders, last week AED ${money(data.lastWeekTotal)}, ${Object.keys(files).length} files in fixtures/out`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
