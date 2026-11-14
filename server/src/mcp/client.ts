// Careem MCP client wrapper. Every call goes through call(): it adds Home coordinates,
// blocks checkout, requires an approval grant for mutating tools, retries read-only calls
// once (never mutating ones) and records an X-ray step with the full arguments and raw response.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { BlockedError, step } from '../xray.ts';
import { useGrant, type Grant } from './approval.ts';

export const HOME = { latitude: 25.0866, longitude: 55.1474 };

/** Never called. Not in the demo, not in tests, not ever. */
export const BLOCKED_TOOLS = new Set(['cart_checkout', 'cart_grocery_checkout']);

/** Tools that change state. Anything not marked read-only by the server is treated as mutating too. */
export const MUTATING_TOOLS = new Set([
  'create_grocery_cart_with_quantities', 'cart_add_item', 'cart_add_items', 'cart_update_item', 'cart_delete_items',
  'cart_delete_basket', 'cart_reschedule_basket', 'cart_reorder', 'cart_checkout', 'cart_grocery_checkout',
  'save_new_address', 'box_create_order', 'create_ride', 'cancel_ride', 'apply_promotion_code',
]);

/** A tool answered with an error (business error in the output, or isError). */
export class McpToolError extends Error {
  tool: string;
  constructor(tool: string, message: string) {
    super(message);
    this.tool = tool;
  }
}

type ToolInfo = { name: string; readOnly: boolean; takesCoordinates: boolean };

const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
const SUMMARIES: Record<string, (r: any) => string> = {
  user_info: (r) => `${r.user_info?.name ?? 'user'}, ${count(r.saved_bookmarks)} saved places`,
  get_activities: (r) => `${count(r.past_activities)} past orders`,
  groceries_get_items_details: (r) => `${count(r.items)} items with category and price`,
  search_groceries_items: (r) => `${count(r.groups)} groups, ${(r.groups ?? []).reduce((n: number, g: any) => n + count(g.items), 0)} items at ${r.merchant_name ?? `merchant ${r.merchant_id}`}`,
  global_search: (r) => `${count(r.merchants)} merchants: ${(r.merchants ?? []).map((m: any) => m.title).join(', ')}`,
  create_grocery_cart_with_quantities: (r) => `basket ${r.data?.basket_id} at ${r.data?.merchant?.title}`,
  cart_get_basket_price: (r) => `fees ${(r.price?.fees ?? []).map((f: any) => `${f.type} ${f.value}`).join(', ')}${r.price?.promo_code ? `, promo ${r.price.promo_code.code}` : ''}`,
};

export class CareemMcp {
  readonly url: string;
  readonly mode: 'sandbox' | 'production';
  readonly source: string;
  private client?: Client;
  private tools = new Map<string, ToolInfo>();

  constructor(url = process.env.CAREEM_MCP_URL ?? 'http://127.0.0.1:8787/mcp') {
    this.url = url;
    const { hostname, host } = new URL(url);
    this.mode = hostname === '127.0.0.1' || hostname === 'localhost' ? 'sandbox' : 'production';
    this.source = `careem-mcp:${this.mode}@${host}`;
  }

  async connect(): Promise<number> {
    await this.client?.close().catch(() => {});
    const client = new Client({ name: 'souq-saver', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(this.url)));
    const { tools } = await client.listTools();
    this.tools = new Map(tools.map((t) => [t.name, {
      name: t.name,
      readOnly: t.annotations?.readOnlyHint === true,
      takesCoordinates: !!(t.inputSchema.properties as Record<string, unknown> | undefined)?.latitude,
    }]));
    this.client = client;
    return tools.length;
  }

  get toolNames() { return [...this.tools.keys()]; }

  isMutating(tool: string) {
    return MUTATING_TOOLS.has(tool) || BLOCKED_TOOLS.has(tool) || this.tools.get(tool)?.readOnly !== true;
  }

  async healthy(): Promise<boolean> {
    try {
      if (!this.client) await this.connect();
      await this.client!.ping();
      return true;
    } catch {
      this.client = undefined;
      return false;
    }
  }

  async close() { await this.client?.close().catch(() => {}); }

  /** The only way to reach Careem. `grant` comes from the approval gate and is needed for mutating tools. */
  async call<T = any>(tool: string, args: Record<string, unknown> = {}, options: { grant?: Grant } = {}): Promise<T> {
    if (!this.client) await this.connect();
    const input = this.tools.get(tool)?.takesCoordinates ? { ...HOME, ...args } : { ...args };

    if (BLOCKED_TOOLS.has(tool)) {
      return step('guard', tool, 'mcp:guard', input, () => { throw new BlockedError(`${tool} is blocked: Souq Saver never checks out`); });
    }
    const mutating = this.isMutating(tool);
    if (mutating && !useGrant(options.grant, tool)) {
      return step('guard', tool, 'mcp:guard', input, () => { throw new BlockedError(`${tool} changes the cart and needs the user's one-time approval`); });
    }

    const attempt = (retries: number) =>
      step('mcp', tool, this.source, input, () => this.raw<T>(tool, input), {
        dataOrigin: this.mode === 'sandbox' ? 'sample' : 'live',
        summary: (r) => SUMMARIES[tool]?.(r) ?? 'ok',
        meta: () => (retries ? { retries } : undefined),
      });
    try {
      return await attempt(0);
    } catch (e) {
      if (mutating) throw e; // never retry a mutating call: a timed-out cart call retried can act twice
      await step('guard', 'retry_read_only', 'mcp:guard', { tool, error: (e as Error).message }, async () => {
        if (!(e instanceof McpToolError)) await this.connect(); // transport problem: open a fresh session
        return { retrying: tool };
      }, { summary: () => `retrying ${tool} once (read-only)` });
      return attempt(1);
    }
  }

  private async raw<T>(tool: string, args: Record<string, unknown>): Promise<T> {
    const result = (await this.client!.callTool({ name: tool, arguments: args })) as { isError?: boolean; structuredContent?: any; content?: { type: string; text?: string }[] };
    const text = result.content?.find((c) => c.type === 'text')?.text ?? '';
    if (result.isError) throw new McpToolError(tool, text || 'tool error');
    const value = result.structuredContent ?? (text ? JSON.parse(text) : {});
    if (typeof value?.error === 'string' && value.error) throw new McpToolError(tool, value.error);
    return value as T;
  }
}
