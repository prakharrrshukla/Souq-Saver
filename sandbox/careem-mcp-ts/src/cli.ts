// CLI for the local Careem MCP server (the spec calls it ./careem-mcp.sh).
//   run | --stdio | start | stop | status | logs | scenarios [tool] | scenario <tool> [name] | reset
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCore, resolveOptions, startHttp, startStdio } from './server.ts';
import { loadTool } from './spec.ts';

const opt = resolveOptions();
const runDir = dirname(opt.overridesPath);
const pidFile = join(runDir, 'careem-mcp.pid');
const logFile = join(runDir, 'careem-mcp.log');
const [cmd = 'run', a, b] = process.argv.slice(2);

const readOverrides = (): Record<string, string> => {
  try { return JSON.parse(readFileSync(opt.overridesPath, 'utf8')); } catch { return {}; }
};
const writeOverrides = (o: Record<string, string>) => {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(opt.overridesPath, JSON.stringify(o, null, 2));
};
const scenariosOf = (core: ReturnType<typeof createCore>, tool: string) => {
  const path = core.toolPaths.get(tool);
  if (!path) throw new Error(`unknown tool "${tool}"`);
  return loadTool(path, core.overlayPaths.get(tool)).scenarios;
};

try {
  if (cmd === '--stdio') {
    await startStdio({ quiet: false });
  } else if (cmd === 'run') {
    const s = await startHttp();
    console.error(`[careem-mcp] ${s.core.toolList.length} tools at ${s.url} (health: http://${opt.host}:${s.port}/health)`);
  } else if (cmd === 'start') {
    mkdirSync(runDir, { recursive: true });
    const out = openSync(logFile, 'a');
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'run'], { detached: true, stdio: ['ignore', out, out] });
    writeFileSync(pidFile, String(child.pid));
    child.unref();
    console.log(`started (pid ${child.pid}) at http://${opt.host}:${opt.port}/mcp, logs: ${logFile}`);
  } else if (cmd === 'stop') {
    if (!existsSync(pidFile)) throw new Error('not running (no pid file)');
    try { process.kill(Number(readFileSync(pidFile, 'utf8'))); } catch { /* already gone */ }
    rmSync(pidFile);
    console.log('stopped');
  } else if (cmd === 'status') {
    const res = await fetch(`http://${opt.host}:${opt.port}/health`).catch(() => null);
    console.log(res?.ok ? `running: ${JSON.stringify(await res.json())}` : 'not running');
  } else if (cmd === 'logs') {
    console.log(existsSync(logFile) ? readFileSync(logFile, 'utf8') : 'no logs yet');
  } else if (cmd === 'scenarios') {
    const core = createCore({ quiet: true });
    const forced = readOverrides();
    for (const tool of a ? [a] : [...core.toolPaths.keys()].sort()) {
      console.log(tool);
      for (const s of scenariosOf(core, tool)) {
        console.log(`  ${forced[tool]?.toLowerCase() === s.name.toLowerCase() ? '*' : ' '} ${s.name}${s.match === undefined ? ' (default)' : ''}`);
      }
    }
  } else if (cmd === 'scenario') {
    if (!a) throw new Error('usage: scenario <tool> [scenario]');
    const names = scenariosOf(createCore({ quiet: true }), a).map((s) => s.name);
    const o = readOverrides();
    if (!b) delete o[a];
    else if (!names.some((n) => n.toLowerCase() === b.toLowerCase())) throw new Error(`"${b}" is not a scenario of ${a}. Available: ${names.join(', ')}`);
    else o[a] = b;
    writeOverrides(o);
    console.log(b ? `${a} forced to ${b}` : `${a} cleared`);
  } else if (cmd === 'reset') {
    writeOverrides({});
    console.log('all forced scenarios cleared');
  } else {
    throw new Error(`unknown command "${cmd}". Use: run, --stdio, start, stop, status, logs, scenarios [tool], scenario <tool> [name], reset`);
  }
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
