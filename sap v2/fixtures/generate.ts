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
import { readFileSync } from 'node:fs';
import { PERSONAS, PRODUCTS, SEED, STORES, type HistoryLine, type Persona, type Product, type StoreKey } from './household.config.ts';

/** The household being generated. build() and main() set it; the default is Leonardo. */
let P: Persona = PERSONAS.leonardo;

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

const storeOf = (h: HistoryLine): StoreKey => h.store ?? 'quik';
const qtyOf = (h: HistoryLine, week: number) => h.qtyByWeek?.[week] ?? h.qty ?? 1;

/** One order record in Careem's get_activities shape (Quik orders are `groceries`, Shops orders `shops`). */
function orderRecord(store: StoreKey, week: number, hoursAgo: number, items: { item_id: number; name: string; quantity: number; amount: number }[], time: Time) {
  const s = STORES[store];
  const quik = s.kind === 'quik';
  const total = r2(items.reduce((sum, i) => sum + i.amount, 0) + s.deliveryFee + s.serviceFee);
  const num = ({ quik: 9300, marina: 9500, jlt: 9700 } as const)[store] + week;
  const ref = `order_${num}`;
  return {
    id: `${quik ? 'act_groc' : 'act_shops'}_${num}`, provider_id: 3, provider: 'careem-grocery', type: quik ? 'groceries' : 'shops', reference_id: ref,
    user_id: 900000001, status: 'completed', country: 'AE',
    activity_time: time.iso(hoursAgo), created_at: time.iso(hoursAgo), updated_at: time.iso(hoursAgo - 1),
    data: {
      status: 'DELIVERED', basket_id: ({ quik: 6000300, marina: 6000500, jlt: 6000700 } as const)[store] + week, brand_id: s.brandId, merchant_id: s.merchantId, merchant_name: s.name,
      merchant_type: quik ? 'ufd' : 'retail', care_deep_link: `careem://care.careem.com/issueTypes?reference_id=${ref}&provider_id=3&partner=shops`,
      payment_type: 'CARD', completed_at: time.ms(hoursAgo - 1), items,
      order_delivery: { type: 'CAREEM', eta: quik ? 18 : 35 }, dropoff_location: P.home,
    },
    pricing: { currency: 'AED', total_price: money(total) },
    presentation_data: {
      title: quik ? 'Careem Quik' : s.name,
      subtitle: quik ? items.slice(0, 3).map((i) => i.name).join(', ') : items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
      main_icon_url: `${MEDIA}/icons/${quik ? 'quik' : 'shops'}.png`, trailing: `AED ${money(total)}`, thirdline: 'Delivered to Home',
    },
  };
}

function orders(time: Time) {
  const rand = mulberry32(SEED);
  const groceries = [];
  const shops: { hoursAgo: number; record: ReturnType<typeof orderRecord> }[] = [];
  for (let week = 1; week <= P.weeks; week++) {
    // Quik on Saturdays, with a few hours of noise; the week 6 order slipped to Sunday.
    const hoursAgo = (P.weeks - week + 1) * 168 + Math.round(rand() * 6 - 3) - (week === 6 ? 24 : 0);
    if (P.skippedWeeks.includes(week)) continue; // away: no order that week
    for (const store of ['quik', 'marina', 'jlt'] as StoreKey[]) {
      const lines = P.history.filter((h) => storeOf(h) === store && h.weeks.includes(week));
      if (!lines.length) continue;
      const items = lines.map((h) => {
        const product = bySku(h.sku);
        let unit = h.prices?.[week] ?? product.price[store]!;
        const noise = rand(); // always drawn, so adding a wobble to one item does not shift the others
        if (h.wobble && week < P.weeks) unit = r2(unit + Math.round((noise * 2 - 1) * h.wobble * 4) / 4);
        const quantity = qtyOf(h, week);
        return { item_id: itemId(store, h.sku), name: product.name, quantity, amount: r2(unit * quantity) };
      });
      // Shops orders go out midweek before that week's Saturday Quik shop (Marina Wednesday, JLT Thursday).
      if (store === 'quik') groceries.push(orderRecord(store, week, hoursAgo, items, time));
      else { const h = hoursAgo + (store === 'marina' ? 72 : 48); shops.push({ hoursAgo: h, record: orderRecord(store, week, h, items, time) }); }
    }
  }
  return { groceries: groceries.reverse(), shops: shops.sort((a, b) => a.hoursAgo - b.hoursAgo).map((s) => s.record) }; // newest first, like the activity feed
}

/** Every generated response, as plain objects. Offline engine tests call this with a fixed clock. */
export function build(time: Time, persona: Persona['key'] = 'leonardo') {
  P = PERSONAS[persona];
  const past = orders(time);
  const details: { store: StoreKey; ids: number[]; response: unknown }[] = [];
  for (const store of ['quik', 'marina', 'jlt'] as StoreKey[]) {
    const ids = [...new Set(P.history.filter((h) => storeOf(h) === store).map((h) => itemId(store, h.sku)))].sort((x, y) => x - y);
    const productOfId = new Map(PRODUCTS.filter((p) => p.price[store] !== undefined).map((p) => [itemId(store, p.sku), p]));
    for (let i = 0; i < ids.length; i += 20) { // the tool takes at most 20 ids per call
      const batch = ids.slice(i, i + 20);
      details.push({ store, ids: batch, response: { page: 'groceries_get_items_details', items: batch.map((id) => detailsItem(store, productOfId.get(id)!)) } });
    }
  }
  return {
    seed: SEED,
    activities: {
      pastGroceries: { page: 'get_activities', past_activities: past.groceries, paging: {} },
      pastShops: { page: 'get_activities', past_activities: past.shops, paging: {} },
    },
    details,
    search: { quik: searchResponse('quik'), marina: searchResponse('marina'), jlt: searchResponse('jlt') },
    globalSearch: globalSearchResponse(),
    basketPrice: { marina: basketPriceResponse('marina'), jlt: basketPriceResponse('jlt') },
    lastWeekTotal: Number(past.groceries[0].pricing.total_price),
    userInfo: userInfoResponses(),
    orderCount: past.groceries.length + past.shops.length,
  };
}

// ---------- user_info: Careem's own response, with this household's person and Home ----------

const USER_INFO_SPEC = join(dirname(fileURLToPath(import.meta.url)), '..', 'sandbox', 'careem-mcp-sandbox', 'spec', 'tools', 'user', 'user_info.md');

function careemScenario(name: string): any {
  const text = readFileSync(USER_INFO_SPEC, 'utf8');
  const section = text.split('## Scenario: ')[text.split('## Scenario: ').findIndex((part) => part.startsWith(`${name}\n`))];
  const raw = /```json response\n([\s\S]*?)\n```/.exec(section)![1];
  return JSON.parse(raw.replace(/\{\{[^}]+\}\}/g, '"__placeholder__"'));
}

function userInfoResponses() {
  const swap = (response: any) => {
    const r = structuredClone(response);
    Object.assign(r.user_info, { name: `${P.user.given} ${P.user.family}`, given_name: P.user.given, family_name: P.user.family, preferred_username: P.user.email, gender: P.user.gender });
    const home = (r.saved_bookmarks ?? []).find((b: any) => b.location_tag === 'home');
    if (home) Object.assign(home, { id: P.home.locationUuid, subTitle: `${P.home.addressDetails.formattedName}, Dubai`, latitude: P.home.latitude, longitude: P.home.longitude, bookmark_id: P.home.locationUuid.replace('LOC-', '') });
    return r;
  };
  return { withLocation: swap(careemScenario('with-location')) };
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
  const flag = process.argv.indexOf('--persona');
  const key = (flag > 0 ? process.argv[flag + 1] : process.env.PERSONA) ?? 'leonardo';
  if (!(key in PERSONAS)) { console.error(`unknown persona "${key}": use ${Object.keys(PERSONAS).join(', ')}`); process.exit(1); }
  const data = build(placeholderTime, key as Persona['key']);
  const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
  rmSync(outDir, { recursive: true, force: true });
  const { quik, marina, jlt } = STORES;

  const files: Record<string, string> = {
    'tools/user/get_activities.md': toolFile('get_activities', 'user', [
      { name: 'upstream-unavailable', note: 'Kept ahead of the household scenarios so the magic trigger still works.', match: { next_cursor: '~trigger_upstream_down' }, response: { page: 'get_activities', error: 'upstream service error: upstream temporarily unavailable' } },
      { name: 'household-past-groceries', note: `\`past\` + \`groceries\`: ${data.activities.pastGroceries.past_activities.length} weekly Quik orders over ${P.weeks} weeks${P.skippedWeeks.length ? ` (none in week ${P.skippedWeeks.join(', ')})` : ''}, newest first, one page.`, match: { activity_status: 'past', activity_type: 'groceries' }, response: data.activities.pastGroceries },
      { name: 'household-past-shops', note: `\`past\` + \`shops\`: ${data.activities.pastShops.past_activities.length} Careem Shops orders, newest first, one page.`, match: { activity_status: 'past', activity_type: 'shops' }, response: data.activities.pastShops },
    ]),
    'tools/user/user_info.md': toolFile('user_info', 'user', [
      { name: 'household-with-location', note: `Coordinates passed: Careem's with-location response for ${P.user.given} ${P.user.family}.`, match: { latitude: '*', longitude: '*' }, response: data.userInfo.withLocation },
    ]),
    'tools/groceries/groceries_get_items_details.md': toolFile('groceries_get_items_details', 'groceries',
      data.details.map((batch, i) => ({
        name: `household-items-${i + 1}`, note: `${STORES[batch.store].name} items ${batch.ids[0]} to ${batch.ids[batch.ids.length - 1]} (batch ${i + 1} of the household's history, ids ascending).`,
        match: { merchant_id: STORES[batch.store].merchantId, item_ids: [batch.ids[0]] }, response: batch.response,
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
    household: `Sample household: ${P.user.given} ${P.user.family}, ${P.home.addressDetails.formattedName}. Invented data in Careem MCP response format.`,
    persona: P.key, story: P.story, user: `${P.user.given} ${P.user.family}`, home: { latitude: P.home.latitude, longitude: P.home.longitude, address: P.home.addressDetails.formattedName },
    orders: data.orderCount, weeks: P.weeks, lastWeekTotal: data.lastWeekTotal, products: PRODUCTS.length,
    stores: Object.values(STORES).map((s) => ({ merchantId: s.merchantId, name: s.name, items: PRODUCTS.filter((p) => p.price[(Object.keys(STORES) as StoreKey[]).find((k) => STORES[k] === s)!] !== undefined).length })),
    files: Object.keys(files),
  };
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';

  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), content);
  }
  console.log(`fixtures: ${P.user.given} ${P.user.family} (${P.key}), ${data.orderCount} orders over ${P.weeks} weeks, last week AED ${money(data.lastWeekTotal)}, ${Object.keys(files).length} files in fixtures/out`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
