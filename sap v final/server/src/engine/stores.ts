// Store catalogues and the store comparison. Pure functions over Careem MCP responses.
import type { StoreQuote, Tier } from '../contract.ts';
import { r2 } from './analysis.ts';

export type CatalogueItem = { itemId: string; name: string; category: string; sku: string; price: number; size: string; available: boolean };
export type StoreCatalogue = { merchantId: string; name: string; type: 'quik' | 'shops'; deliveryFee: number; serviceFee: number; items: CatalogueItem[] };

/** What we want to buy, independent of the store. */
export type Want = { key: string; name: string; category: string; size: string; sku: string; qty: number; tier: Tier };
export type QuoteLine = { key: string; item: CatalogueItem; qty: number; lineTotal: number };
export type Quote = StoreQuote & { lines: QuoteLine[] };

const UNITS: Record<string, [string, number]> = { kg: ['g', 1000], g: ['g', 1], l: ['ml', 1000], ml: ['ml', 1], pcs: ['pcs', 1], pc: ['pcs', 1], pk: ['pcs', 1], rolls: ['pcs', 1] };

/** "5 kg" -> 5000 g, "6 x 1.5 L" -> 9000 ml, "30 pcs" -> 30 pcs. Null when the text is not a size. */
export function parseSize(text: string): { amount: number; unit: string } | null {
  const m = /(?:(\d+(?:\.\d+)?)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pcs|pc|pk|rolls)\b/i.exec(text);
  if (!m) return null;
  const [unit, factor] = UNITS[m[3].toLowerCase()];
  return { amount: Number(m[1] ?? 1) * Number(m[2]) * factor, unit };
}

/** Same unit and within 25% of each other. Unparseable sizes only match identical text. */
export function similarSize(a: string, b: string): boolean {
  const x = parseSize(a);
  const y = parseSize(b);
  if (!x || !y) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return x.unit === y.unit && Math.abs(x.amount - y.amount) / x.amount <= 0.25;
}

/**
 * Flattens a search_groceries_items response. The group name is the category that was searched.
 * The same item listed in two groups is kept once (first group wins); an item without a usable
 * price is never sellable.
 */
export function parseSearch(response: any): { merchantId: string; domain: 'quik' | 'shops'; merchantName?: string; items: CatalogueItem[] } {
  const items: CatalogueItem[] = [];
  const seen = new Set<string>();
  for (const group of response?.groups ?? []) {
    for (const item of group.items ?? []) {
      if (item.active === false || seen.has(String(item.id))) continue;
      seen.add(String(item.id));
      const size = /\(([^)]+)\)\s*$/.exec(item.description ?? '')?.[1] ?? '';
      const price = Number(item.price?.total);
      const priced = Number.isFinite(price) && price > 0;
      items.push({ itemId: String(item.id), name: item.item, category: String(group.name).toLowerCase(), sku: item.master_product_id ?? '', price: priced ? price : 0, size, available: priced && item.is_available !== false });
    }
  }
  return { merchantId: String(response.merchant_id), domain: response.domain === 'quik' ? 'quik' : 'shops', merchantName: response.merchant_name, items };
}

/** Delivery and service fee from a cart_get_basket_price response. */
export function parseFees(response: any): { deliveryFee: number; serviceFee: number } {
  const fee = (type: string) => Number((response?.price?.fees ?? []).find((f: any) => f.type === type)?.value ?? 0);
  return { deliveryFee: fee('delivery_fee'), serviceFee: fee('service_fee') };
}

const sameCategory = (item: CatalogueItem, want: { category: string }) => item.category === want.category.toLowerCase();

/** Items a store could sell for this want: same category, in stock, size within 25%. Cheapest first. */
export function acceptable(want: { category: string; size: string }, catalogue: StoreCatalogue): CatalogueItem[] {
  return catalogue.items
    .filter((item) => item.available && sameCategory(item, want) && similarSize(want.size, item.size))
    .sort((a, b) => a.price - b.price);
}

/** The same product if the store has it, otherwise the cheapest acceptable variant, otherwise null. */
export function resolveItem(want: { category: string; size: string; sku: string }, catalogue: StoreCatalogue): CatalogueItem | null {
  return catalogue.items.find((item) => item.available && want.sku && item.sku === want.sku) ?? acceptable(want, catalogue)[0] ?? null;
}

/** A cheaper equivalent of `current` at the same store, or null. */
export function cheaperSwap(current: CatalogueItem, catalogue: StoreCatalogue): CatalogueItem | null {
  const best = acceptable(current, catalogue)[0];
  return best && best.price < current.price ? best : null;
}

/**
 * Prices the whole basket at every store: items + delivery fee + service fee.
 * A store missing any T1 or T2 item is not valid. The valid store with the lowest total is chosen.
 * One store per order: we never split a basket.
 */
export function compareStores(wants: Want[], catalogues: StoreCatalogue[]): Quote[] {
  const quotes: Quote[] = catalogues.map((catalogue) => {
    const lines: QuoteLine[] = [];
    const missing: string[] = [];
    let missingEssential = false;
    for (const want of wants) {
      const item = resolveItem(want, catalogue);
      if (item) lines.push({ key: want.key, item, qty: want.qty, lineTotal: r2(item.price * want.qty) });
      else {
        missing.push(want.category);
        if (want.tier === 'T1' || want.tier === 'T2') missingEssential = true;
      }
    }
    const itemsTotal = r2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
    return {
      merchantId: catalogue.merchantId, name: catalogue.name, type: catalogue.type, itemsTotal,
      deliveryFee: catalogue.deliveryFee, serviceFee: catalogue.serviceFee, estTotal: r2(itemsTotal + catalogue.deliveryFee + catalogue.serviceFee),
      missing, valid: !missingEssential, chosen: false, lines,
    };
  });
  // A store that lacks optional items looks cheaper than it is, so fewer gaps wins before price.
  const best = quotes.filter((q) => q.valid).sort((a, b) => a.missing.length - b.missing.length || a.estTotal - b.estTotal)[0];
  if (best) best.chosen = true;
  return quotes;
}
