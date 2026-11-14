// History analysis. Pure functions over Careem MCP responses: no I/O, no model, no clock
// (callers pass `today`). All money is rounded to 2 decimals with r2().

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const DAY = 86_400_000;
const day = (iso: string) => iso.slice(0, 10);

export type OrderLine = {
  orderId: string; date: string; merchantId: string; merchantName: string;
  itemId: string; name: string; category: string; parentCategory: string; size: string; sku: string;
  qty: number; unitPrice: number; lineTotal: number;
};
export type Order = { orderId: string; date: string; merchantId: string; merchantName: string; total: number; lines: OrderLine[] };

/**
 * Turns get_activities pages and groceries_get_items_details pages into flat order lines.
 * Only completed grocery and shops orders count. Category, size and sku come from the item details.
 */
export function normaliseOrders(activityPages: any[], detailPages: any[]): { orders: Order[]; lines: OrderLine[] } {
  const details = new Map<number, any>();
  for (const page of detailPages) for (const item of page?.items ?? []) if (item.data) details.set(item.item_id, item.data);

  const orders: Order[] = [];
  for (const page of activityPages) {
    for (const activity of page?.past_activities ?? []) {
      if (!['groceries', 'shops'].includes(activity.type) || !Array.isArray(activity.data?.items)) continue;
      const base = {
        orderId: String(activity.reference_id), date: String(activity.activity_time),
        merchantId: String(activity.data.merchant_id), merchantName: String(activity.data.merchant_name),
      };
      const lines: OrderLine[] = activity.data.items.map((item: any) => {
        const info = details.get(item.item_id);
        const qty = Number(item.quantity) || 1;
        return {
          ...base, itemId: String(item.item_id), name: String(item.name),
          category: info?.core_category?.name ?? 'Uncategorised', parentCategory: info?.core_category?.parent_category_name ?? 'Other',
          size: info?.unit_of_measure?.value ?? '', sku: info?.master_product_id ?? '',
          qty, unitPrice: r2(Number(item.amount) / qty), lineTotal: r2(Number(item.amount)),
        };
      });
      orders.push({ ...base, total: r2(Number(activity.pricing?.total_price ?? 0)), lines });
    }
  }
  orders.sort((a, b) => a.date.localeCompare(b.date)); // oldest first
  return { orders, lines: orders.flatMap((o) => o.lines) };
}

/** ISO 8601 week key, e.g. "2026-W45". */
export function isoWeek(iso: string): string {
  const d = new Date(`${day(iso)}T00:00:00Z`);
  const weekday = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - weekday); // the Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d.getTime() - yearStart) / DAY + 1) / 7)).padStart(2, '0')}`;
}

export type CategorySpend = {
  weeks: { week: string; total: number; byCategory: Record<string, number> }[];
  /** Average weekly spend per category over the latest 4 weeks that have orders. */
  categories: { category: string; weeklyAvg: number }[];
};

export function categorySpend(lines: OrderLine[]): CategorySpend {
  const byWeek = new Map<string, Record<string, number>>();
  for (const line of lines) {
    const week = byWeek.get(isoWeek(line.date)) ?? {};
    week[line.parentCategory] = r2((week[line.parentCategory] ?? 0) + line.lineTotal);
    byWeek.set(isoWeek(line.date), week);
  }
  const weeks = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([week, byCategory]) => ({ week, byCategory, total: r2(Object.values(byCategory).reduce((a, b) => a + b, 0)) }));
  const recent = weeks.slice(-4);
  const names = [...new Set(recent.flatMap((w) => Object.keys(w.byCategory)))];
  const categories = names
    .map((category) => ({ category, weeklyAvg: r2(recent.reduce((sum, w) => sum + (w.byCategory[category] ?? 0), 0) / recent.length) }))
    .sort((a, b) => b.weeklyAvg - a.weeklyAvg);
  return { weeks, categories };
}

export type Drift = { itemId: string; name: string; firstPrice: number; latestPrice: number; firstDate: string; latestDate: string; driftPct: number; flagged: boolean };

/** Per item: (latest - first) / first, for items bought at least twice. Flagged above 5%. */
export function priceDrift(lines: OrderLine[]): Drift[] {
  const byItem = new Map<string, OrderLine[]>();
  for (const line of lines) byItem.set(line.itemId, [...(byItem.get(line.itemId) ?? []), line]);
  return [...byItem.values()]
    .filter((list) => list.length >= 2)
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const driftPct = r2(((latest.unitPrice - first.unitPrice) / first.unitPrice) * 100);
      return { itemId: first.itemId, name: first.name, firstPrice: first.unitPrice, latestPrice: latest.unitPrice, firstDate: day(first.date), latestDate: day(latest.date), driftPct, flagged: driftPct > 5 };
    })
    .sort((a, b) => b.driftPct - a.driftPct);
}

export type Cycle = {
  itemId: string; name: string; orders: number; lastOrdered: string; lastQty: number;
  /** Median days between orders; null when the item was bought only once. */
  medianDays: number | null; nextDue: string | null; dueThisWeek: boolean;
  /** Share of all orders that contain the item, 0 to 1. */
  orderShare: number;
};

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Per item: median gap between orders, next due date, and whether that falls within 7 days of today. */
export function cycles(lines: OrderLine[], today: Date): Cycle[] {
  const totalOrders = new Set(lines.map((l) => l.orderId)).size || 1;
  const byItem = new Map<string, OrderLine[]>();
  for (const line of lines) byItem.set(line.itemId, [...(byItem.get(line.itemId) ?? []), line]);
  return [...byItem.values()].map((list) => {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const times = sorted.map((l) => new Date(l.date).getTime());
    const last = sorted[sorted.length - 1];
    const base = { itemId: last.itemId, name: last.name, orders: sorted.length, lastOrdered: day(last.date), lastQty: last.qty, orderShare: r2(new Set(sorted.map((l) => l.orderId)).size / totalOrders) };
    if (sorted.length < 2) return { ...base, medianDays: null, nextDue: null, dueThisWeek: false };
    const medianDays = median(times.slice(1).map((t, i) => Math.round((t - times[i]) / DAY)));
    const dueAt = times[times.length - 1] + medianDays * DAY;
    // Whole days, rounded, so an order placed a few hours earlier or later in the day does not flip the answer.
    const daysUntilDue = Math.round((dueAt - today.getTime()) / DAY);
    return { ...base, medianDays, nextDue: new Date(dueAt).toISOString().slice(0, 10), dueThisWeek: daysUntilDue <= 7 };
  });
}

/** The most recent order ("last week") and its total as charged, fees included. */
export function lastWeek(orders: Order[]): { orderId: string; date: string; total: number; items: number } | null {
  const last = orders[orders.length - 1];
  return last ? { orderId: last.orderId, date: day(last.date), total: last.total, items: last.lines.length } : null;
}

/** Average order total over the latest `n` orders (the household orders weekly). */
export function averageWeeklySpend(orders: Order[], n = 4): number {
  const recent = orders.slice(-n);
  return recent.length ? r2(recent.reduce((sum, o) => sum + o.total, 0) / recent.length) : 0;
}
