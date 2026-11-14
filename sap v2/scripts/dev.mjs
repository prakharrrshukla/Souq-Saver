// Starts the named processes together and stops them all when one exits or on Ctrl+C.
// Usage: node scripts/dev.mjs sandbox server web
import { spawn } from 'node:child_process';

const commands = {
  sandbox: ['node', ['sandbox/careem-mcp-ts/src/cli.ts', 'run']],
  server: ['node', ['--watch-path=server/src', 'server/src/index.ts']],
  web: ['npm', ['--workspace', 'web', 'run', 'dev']],
};

const children = process.argv.slice(2).map((name) => {
  const [cmd, args] = commands[name];
  const child = spawn(cmd, args, { stdio: 'inherit' });
  child.on('exit', (code) => { console.log(`[dev] ${name} exited (${code})`); stopAll(); });
  return child;
});

function stopAll() {
  for (const c of children) c.kill('SIGTERM');
  process.exitCode = 0;
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
