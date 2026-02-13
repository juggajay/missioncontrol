import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { GATEWAY_DEFAULT_URL, SERVER_DEFAULT_PORT } from '@mission-control/shared';

export interface AppConfig {
  gatewayUrl: string;
  gatewayToken: string;
  port: number;
}

export function loadConfig(): AppConfig {
  let gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || '';
  let gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';

  // Try reading from ~/.openclaw/openclaw.json
  // Check Windows homedir first, then WSL path via \\wsl$
  if (!gatewayToken) {
    const candidates = [
      process.env.OPENCLAW_CONFIG_PATH,
      join(homedir(), '.openclaw', 'openclaw.json'),
      // WSL Ubuntu path accessible from Windows
      '\\\\wsl$\\Ubuntu\\home\\jayso\\.openclaw\\openclaw.json',
      '\\\\wsl.localhost\\Ubuntu\\home\\jayso\\.openclaw\\openclaw.json',
    ].filter(Boolean) as string[];

    for (const configPath of candidates) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        // Strip comments for JSON5 compatibility (simple approach)
        const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1');
        const config = JSON.parse(cleaned);
        if (config?.gateway?.auth?.token) {
          gatewayToken = config.gateway.auth.token;
          if (!gatewayUrl && config?.gateway?.port) {
            gatewayUrl = `ws://127.0.0.1:${config.gateway.port}`;
          }
          break;
        }
      } catch {
        // Config file doesn't exist or is unreadable — try next
      }
    }
  }

  return {
    gatewayUrl: gatewayUrl || GATEWAY_DEFAULT_URL,
    gatewayToken,
    port: parseInt(process.env.PORT || String(SERVER_DEFAULT_PORT), 10),
  };
}
