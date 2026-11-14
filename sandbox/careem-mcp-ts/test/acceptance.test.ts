// The 12 acceptance tests from careem-mcp-sandbox/spec/BUILD.md section 7.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startHttp } from '../src/server.ts';
import { loadTool, overlayMatch, render, sampleFromSchema } from '../src/spec.ts';

const HOME = { latitude: 25.0866, longitude: 55.1474 };
const overridesPath = join(mkdtempSync(join(tmpdir(), 'careem-mcp-')), 'overrides.json');
let server: Awaited<ReturnType<typeof startHttp>>;
let client: Client;

const call = async (name: string, args: Record<string, unknown>) =>
  (await client.callTool({ name, arguments: args })) as { isError?: boolean; structuredContent?: any; content: { text: string }[] };

beforeAll(async () => {
  writeFileSync(overridesPath, '{}');
  server = await startHttp({ port: 0, overridesPath, quiet: true });
  client = new Client({ name: 'acceptance', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(server.url)));
});
afterAll(async () => {
  await client.close();
  await server.close();
});

describe('Careem MCP local server acceptance (BUILD.md section 7)', () => {
  test('1. initialize identity', () => {
    expect(client.getServerVersion()).toEqual({ name: 'careem-mcp-service', version: 'v1.0.0' });
    expect(client.getInstructions()).toBeUndefined();
  });

  test('2. tools/list is verbatim and resources/list has the widget', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBe(server.core.toolPaths.size);
    expect(tools.length).toBe(42);
    for (const tool of tools) expect(tool).toEqual(loadTool(server.core.toolPaths.get(tool.name)!).definition);
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toEqual(['ui://careem-mcp-app']);
    const read = await client.readResource({ uri: 'ui://careem-mcp-app' });
    expect(JSON.stringify(read.contents[0])).toContain('https://careem-mcp-app.pages.dev/assets/index.js');
  });

  test('3. menu for 30104', async () => {
    const r = await call('food_get_restaurant_menu', { restaurant_id: 30104, ...HOME });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent.restaurant.id).toBe(30104);
    expect(r.structuredContent.restaurant.name.value).toBe('Morning Syrniki Café');
  });

  test('4. menu chosen by restaurant_id', async () => {
    const r = await call('food_get_restaurant_menu', { restaurant_id: 30101, ...HOME });
    expect(r.structuredContent.restaurant.name.value).toBe('Shawarma Station');
  });

  test('5. unknown restaurant is a business error, not isError', async () => {
    const r = await call('food_get_restaurant_menu', { restaurant_id: 1, ...HOME });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent.error).toBe('failed to get restaurant menu: unexpected response status 404');
  });

  test('6. invalid arguments', async () => {
    const bad = await call('food_get_restaurant_menu', { restaurant_id: 'x', ...HOME });
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text.startsWith('validating "arguments"')).toBe(true);
    expect((await call('food_get_restaurant_menu', {})).isError).toBe(true);
  });

  test('7. merchant search', async () => {
    expect((await call('food_merchant_search', { query: 'sushi', ...HOME })).structuredContent.restaurants[0].id).toBe(30102);
    expect((await call('food_merchant_search', { query: 'NOPE', ...HOME })).structuredContent.restaurants).toEqual([]);
    expect((await call('food_merchant_search', { query: 'sushi', longitude: 55.1474 })).isError).toBe(true);
  });

  test('8. reverse geocode', async () => {
    expect((await call('reverse_geocode', HOME)).structuredContent.location.locationUuid).toBe('LOC-50001');
    expect((await call('reverse_geocode', { latitude: 91, longitude: 55 })).structuredContent.error).toBeTruthy();
  });

  test('9. forced scenario through the overrides file, no restart', async () => {
    writeFileSync(overridesPath, JSON.stringify({ food_get_restaurant_menu: 'upstream-unavailable' }));
    expect((await call('food_get_restaurant_menu', { restaurant_id: 30104, ...HOME })).structuredContent.error).toBeTruthy();
    writeFileSync(overridesPath, '{}');
    expect((await call('food_get_restaurant_menu', { restaurant_id: 30104, ...HOME })).structuredContent.restaurant.id).toBe(30104);
  });

  test('10. unknown tool is JSON-RPC -32602', async () => {
    await expect(client.callTool({ name: 'does_not_exist', arguments: {} })).rejects.toMatchObject({ code: -32602 });
  });

  // Tests 11 and 12 also cover our generated overlay scenarios (fixtures/out/tools), when present.
  const everyScenario = () =>
    [...server.core.toolPaths].flatMap(([name, path]) => {
      const file = loadTool(path, server.core.overlayPaths.get(name));
      return file.scenarios.map((scenario) => ({ name, file, scenario }));
    });

  test('11. every non-error scenario validates against the output schema', () => {
    const ajv = new Ajv2020({ strict: false });
    const problems: string[] = [];
    for (const { name, file, scenario } of everyScenario()) {
      if (scenario.isError) continue;
      const args = overlayMatch(sampleFromSchema(file.definition.inputSchema), scenario.match ?? {});
      const value = render(scenario.template, args);
      const validate = ajv.compile(file.definition.outputSchema);
      if (!validate(value)) problems.push(`${name}/${scenario.name}: ${ajv.errorsText(validate.errors)}`);
    }
    expect(problems).toEqual([]);
  });

  test('12. nothing a client can observe says it is a local copy', async () => {
    const banned = /mock|sandbox|sbx|fake|dummy|example\.com/i;
    const observable = [
      JSON.stringify(client.getServerVersion()),
      JSON.stringify(await client.listTools()),
      JSON.stringify(await client.listResources()),
      ...everyScenario().map(({ file, scenario }) =>
        JSON.stringify(render(scenario.template, overlayMatch(sampleFromSchema(file.definition.inputSchema), scenario.match ?? {}))),
      ),
    ];
    for (const text of observable) expect(text).not.toMatch(banned);
  });
});
