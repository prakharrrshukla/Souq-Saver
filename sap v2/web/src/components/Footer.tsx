import type { Config, Health } from '../../../server/src/contract.ts';

const dot = (ok: boolean | undefined) => <span className={ok ? 'dot ok' : 'dot off'} aria-hidden="true" />;

export function Footer({ config, health }: { config: Config; health: Health | null }) {
  return (
    <footer className="footer">
      <span>{dot(health?.bedrock)} Model: <strong>{config.modelId}</strong> on {config.modelProvider}</span>
      <span>{dot(health?.mcp)} Careem MCP: <strong>{config.mcpMode}</strong></span>
      <span>Nothing is ever charged from this app</span>
    </footer>
  );
}
