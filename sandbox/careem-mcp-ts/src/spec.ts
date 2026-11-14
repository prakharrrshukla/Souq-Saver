// Tool-file parsing, scenario selection and template rendering, as specified in
// careem-mcp-sandbox/spec/BUILD.md sections 2 and 3. No MCP or HTTP in this file.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export type Scenario = { name: string; match?: unknown; template: string; isError: boolean };
export type ToolFile = { name: string; path: string; definition?: any; scenarios: Scenario[] };

const BLOCK = /^```json[ \t]+(match|response|error)[ \t]*\n(.*?)^```[ \t]*$/gms;

/** Parses one tool file. Overlay files (extra scenarios only) pass requireDefinition=false. */
export function parseToolFile(text: string, path: string, requireDefinition = true): ToolFile {
  const fm = /^---\n(.*?)\n---\n/s.exec(text);
  if (!fm) throw new Error(`${path}: missing frontmatter`);
  const meta: Record<string, string> = {};
  for (const line of fm[1].split('\n')) {
    const m = /^([\w-]+):\s*(.*)$/.exec(line);
    if (m) meta[m[1]] = m[2].replace(/\s+#.*$/, '').trim().replace(/^["'](.*)["']$/, '$1');
  }
  if (!meta.tool) throw new Error(`${path}: frontmatter has no "tool"`);

  // Split into sections at "## " headings that are outside fenced code blocks.
  const sections: { title: string; body: string }[] = [];
  let inFence = false;
  for (const line of text.slice(fm[0].length).split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (!inFence && line.startsWith('## ')) sections.push({ title: line.slice(3).trim(), body: '' });
    else if (sections.length) sections[sections.length - 1].body += line + '\n';
  }

  const file: ToolFile = { name: meta.tool, path, scenarios: [] };
  for (const { title, body } of sections) {
    if (title === 'Definition') {
      const m = /^```json tool[ \t]*\n(.*?)^```[ \t]*$/ms.exec(body);
      if (!m) throw new Error(`${path}: Definition has no "json tool" block`);
      file.definition = JSON.parse(m[1]);
      if (file.definition.name !== meta.tool) throw new Error(`${path}: definition name does not match frontmatter tool`);
    } else if (title.startsWith('Scenario:')) {
      const name = title.slice('Scenario:'.length).trim();
      const scenario: Partial<Scenario> & { name: string } = { name };
      let answers = 0;
      for (const [, kind, content] of body.matchAll(BLOCK)) {
        if (kind === 'match') {
          try { scenario.match = JSON.parse(content); } catch (e) { throw new Error(`${path}: scenario ${name}: invalid match JSON: ${(e as Error).message}`); }
        } else {
          answers++;
          scenario.template = content;
          scenario.isError = kind === 'error';
        }
      }
      if (answers !== 1) throw new Error(`${path}: scenario ${name}: expected exactly one response or error block, found ${answers}`);
      try { render(scenario.template!, {}); } catch (e) { throw new Error(`${path}: scenario ${name}: ${(e as Error).message}`); }
      file.scenarios.push(scenario as Scenario);
    }
  }
  if (requireDefinition) {
    if (!file.definition) throw new Error(`${path}: no Definition section`);
    if (!file.scenarios.some((s) => s.match === undefined)) throw new Error(`${path}: no default scenario`);
  }
  return file;
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') && e.name !== 'README.md' ? [join(dir, e.name)] : [],
  );
}

/** tool name -> file path, for every tool file under <specDir>/tools. */
export function indexTools(specDir: string): Map<string, string> {
  const index = new Map<string, string>();
  for (const path of walk(join(specDir, 'tools'))) {
    const { name } = parseToolFile(readFileSync(path, 'utf8'), path);
    if (index.has(name)) throw new Error(`duplicate tool name ${name}: ${path} and ${index.get(name)}`);
    index.set(name, path);
  }
  return index;
}

/**
 * Our addition to Careem's build spec: an optional overlay directory with files in the same
 * tool-file format that hold extra scenarios only. They are tried before the tool's own
 * scenarios. This is how the generated household data is served without editing Careem's files.
 */
export function indexOverlay(overlayDir: string | undefined): Map<string, string> {
  const index = new Map<string, string>();
  if (!overlayDir) return index;
  for (const path of walk(overlayDir)) index.set(parseToolFile(readFileSync(path, 'utf8'), path, false).name, path);
  return index;
}

/** Re-reads a tool file (and its overlay) from disk; called on every tools/call. */
export function loadTool(path: string, overlayPath?: string): ToolFile {
  const file = parseToolFile(readFileSync(path, 'utf8'), path);
  if (overlayPath && existsSync(overlayPath)) {
    file.scenarios.unshift(...parseToolFile(readFileSync(overlayPath, 'utf8'), overlayPath, false).scenarios);
  }
  return file;
}

// ---------- scenario selection ----------

const text = (got: unknown) => (typeof got === 'string' ? got : JSON.stringify(got));

export function matches(want: unknown, got: unknown): boolean {
  if (Array.isArray(want)) return Array.isArray(got) && want.every((w) => got.some((g) => matches(w, g)));
  if (want && typeof want === 'object') {
    if (!got || typeof got !== 'object' || Array.isArray(got)) return false;
    return Object.entries(want).every(([k, w]) => k in (got as object) && matches(w, (got as Record<string, unknown>)[k]));
  }
  if (typeof want === 'string') {
    if (got === null || got === undefined) return false;
    const g = text(got).toLowerCase();
    if (want === '*') return true;
    if (want.startsWith('~')) return g.includes(want.slice(1).toLowerCase());
    if (want.startsWith('=')) return g === want.slice(1).toLowerCase();
    return g === want.toLowerCase();
  }
  return want === got; // number, boolean, null: JSON-equal
}

export function select(file: ToolFile, args: unknown, forced?: string): Scenario {
  if (forced) {
    const hit = file.scenarios.find((s) => s.name.toLowerCase() === forced.toLowerCase());
    if (hit) return hit;
  }
  return (
    file.scenarios.find((s) => s.match !== undefined && matches(s.match, args)) ??
    file.scenarios.find((s) => s.match === undefined)!
  );
}

// ---------- placeholders ----------

const UNIT_MS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };

function duration(s: string): number {
  let total = 0;
  let rest = s;
  while (rest) {
    const m = /^(\d+(?:\.\d+)?)(ms|s|m|h)/.exec(rest);
    if (!m) throw new Error(`bad duration "${s}"`);
    total += Number(m[1]) * UNIT_MS[m[2]];
    rest = rest.slice(m[0].length);
  }
  return total;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'));
const pad = (n: number) => String(n).padStart(2, '0');

function evalExpr(expr: string, args: unknown, now: Date): unknown {
  if (expr.startsWith('args.')) {
    let v: any = args;
    for (const key of expr.slice(5).split('.')) v = v == null ? undefined : v[key];
    return v ?? null;
  }
  if (expr === 'uuid') return randomUUID();
  const rand = /^rand:(\d+)-(\d+)$/.exec(expr);
  if (rand) return Number(rand[1]) + Math.floor(Math.random() * (Number(rand[2]) - Number(rand[1]) + 1));

  const m = /^(now|unixms|unix)(?:([+-])([0-9a-z.]+))?(?:@([0-9a-z.]+))?(?:\|(date|weekday|hhmm|daylabel))?$/.exec(expr);
  if (!m) throw new Error(`unknown placeholder "${expr}"`);
  const [, base, sign, dur, round, format] = m;
  let ms = now.getTime() + (dur ? (sign === '-' ? -1 : 1) * duration(dur) : 0);
  if (round) ms -= ms % duration(round);
  if (base === 'unix') return Math.floor(ms / 1000);
  if (base === 'unixms') return ms;
  if (!format) return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z');
  const d = new Date(ms + 4 * 3_600_000); // Asia/Dubai is UTC+4 all year
  if (format === 'date') return d.toISOString().slice(0, 10);
  if (format === 'weekday') return DAYS[d.getUTCDay()];
  if (format === 'hhmm') return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return `${DAYS[d.getUTCDay()].slice(0, 3)}, ${ordinal(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}`;
}

/** Renders a JSON template: placeholders inside strings are inserted as escaped text, bare ones as JSON. */
export function render(template: string, args: unknown, now = new Date()): unknown {
  let out = '';
  let inString = false;
  for (let i = 0; i < template.length; i++) {
    const c = template[i];
    if (c === '{' && template[i + 1] === '{') {
      const end = template.indexOf('}}', i);
      if (end < 0) throw new Error('unterminated placeholder');
      const v = evalExpr(template.slice(i + 2, end).trim(), args, now);
      out += inString ? JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v)).slice(1, -1) : JSON.stringify(v);
      i = end + 1;
    } else if (inString && c === '\\') {
      out += c + template[++i];
    } else {
      if (c === '"') inString = !inString;
      out += c;
    }
  }
  return JSON.parse(out);
}

// ---------- sample arguments (acceptance test 11, spec/FORMAT.md "Keeping scenarios honest") ----------

export function sampleFromSchema(schema: any): unknown {
  if (!schema) return 'sample';
  if (schema.enum) return schema.enum[0];
  const type = Array.isArray(schema.type) ? schema.type.find((t: string) => t !== 'null') : schema.type;
  if (type === 'string') return 'sample';
  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return false;
  if (type === 'array') return [sampleFromSchema(schema.items)];
  if (type === 'object' || schema.properties) {
    return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([k, v]) => [k, sampleFromSchema(v)]));
  }
  return 'sample';
}

export function overlayMatch(sample: unknown, match: unknown): unknown {
  if (typeof match === 'string') {
    if (match === '*') return sample ?? 'sample';
    return match.startsWith('~') || match.startsWith('=') ? match.slice(1) : match;
  }
  if (Array.isArray(match)) {
    const item = Array.isArray(sample) ? sample[0] : undefined;
    return match.map((m) => (m && typeof m === 'object' && !Array.isArray(m) ? overlayMatch(item ?? {}, m) : overlayMatch(undefined, m)));
  }
  if (match && typeof match === 'object') {
    const base: Record<string, unknown> = sample && typeof sample === 'object' && !Array.isArray(sample) ? { ...(sample as object) } : {};
    for (const [k, v] of Object.entries(match)) base[k] = overlayMatch(base[k], v);
    return base;
  }
  return match;
}
