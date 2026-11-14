// Which store gets the basket, decided by code from the shelf life of what is ordered:
// fresh produce in the order -> the whole basket goes to Careem Quik (fast delivery keeps it fresh);
// only long-shelf-life items -> the cheapest Careem Shops supermarket that sells every essential.
// Shelf life comes from Careem's own category data, never from the model.
import type { StoreCatalogue } from '../engine/stores.ts';
import type { CheckContext, Need } from './check.ts';
import { chooseStore } from './fallback.ts';

export type ShelfLife = 'fresh' | 'long';
export type RoutingRule = 'fresh_to_quik' | 'long_shelf_to_shops' | 'no_quik' | 'no_shops';
export type Routing = { merchantId: string; storeName: string; rule: RoutingRule; fresh: string[]; reason: string };

const FRESH_PARENT = /fruits?\s*&\s*vegetables|dairy|eggs|bakery|meat|poultry|fish|seafood/i;
const FRESH_WORD = /\b(fruits?|vegetables?|bananas?|apples?|tomato(es)?|onions?|potato(es)?|spinach|greens|lettuce|avocados?|milk|yogh?urt|laban|cheese|butter|eggs?|bread|chicken|meat|fish)\b/i;
const NOT_FRESH = /juice|drink|soda|cola|water|powder|uht|long life|formula/i;

/** Fresh produce: fruit and vegetables, dairy and eggs, bakery, meat, fish (frozen food and ice cream are not). Decided by the Careem parent category when known. */
export function shelfLife(need: Pick<Need, 'category' | 'name'> & { parentCategory?: string }): ShelfLife {
  if (NOT_FRESH.test(need.category)) return 'long'; // long-life milk sits under Dairy & Eggs but keeps for months
  if (need.parentCategory) return FRESH_PARENT.test(need.parentCategory) ? 'fresh' : 'long';
  const text = `${need.category} ${need.name}`;
  return FRESH_WORD.test(text) && !NOT_FRESH.test(text) ? 'fresh' : 'long';
}

export type HouseholdFocus = { freshShare: number; label: 'fresh' | 'long_shelf' | 'mixed' };

/** Share of the household's Careem spend that went on fresh produce. Fresh-focused from 45%, long-shelf-life focused up to 20%. */
export function householdFocus(lines: { category: string; parentCategory: string; name: string; lineTotal: number }[]): HouseholdFocus {
  const total = lines.reduce((s, l) => s + l.lineTotal, 0);
  const fresh = lines.filter((l) => shelfLife(l) === 'fresh').reduce((s, l) => s + l.lineTotal, 0);
  const freshShare = total ? Math.round((fresh / total) * 100) / 100 : 0;
  return { freshShare, label: freshShare >= 0.45 ? 'fresh' : freshShare <= 0.2 ? 'long_shelf' : 'mixed' };
}

export function routeBasket(needs: Need[], catalogues: StoreCatalogue[], context: CheckContext): Routing | null {
  const fresh = needs.filter((n) => shelfLife(n) === 'fresh').map((n) => n.name);
  const quik = catalogues.find((c) => c.type === 'quik');
  const shops = catalogues.filter((c) => c.type === 'shops');
  const pick = (pool: StoreCatalogue[]) => (pool.length ? chooseStore(needs, pool, context).chosen?.catalogue ?? null : null);
  const route = (c: StoreCatalogue, rule: RoutingRule, reason: string): Routing => ({ merchantId: c.merchantId, storeName: c.name, rule, fresh, reason });

  if (fresh.length && quik) return route(quik, 'fresh_to_quik', `Fresh produce in the order (${fresh.slice(0, 3).join(', ')}${fresh.length > 3 ? '…' : ''}), so the whole basket goes to Careem Quik`);
  if (fresh.length) {
    const best = pick(catalogues);
    return best && route(best, 'no_quik', 'Fresh produce in the order, but Careem Quik is not available here, so the cheapest store with every essential');
  }
  const shop = pick(shops);
  if (shop) return route(shop, 'long_shelf_to_shops', 'Only long-shelf-life items, so the cheapest Careem Shops supermarket with every essential');
  const any = pick(catalogues);
  return any && route(any, 'no_shops', 'Only long-shelf-life items, but no supermarket has every essential, so the cheapest store that does');
}
