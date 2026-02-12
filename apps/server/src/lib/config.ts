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
  if (!gatewayToken) {
    try {
      const configPath = process.env.OPENCLAW_CONFIG_PATH
        || join(homedir(), '.openclaw', 'openclaw.json');
      const raw = readFileSync(configPath, 'utf-8');
      // Strip comments for JSON5 compatibility (simple approach)
      const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1');
      const config = JSON.parse(cleaned);
      gatewayToken = config?.gateway?.auth?.token || '';
      if (!gatewayUrl && config?.gateway?.port) {
        gatewayUrl = `ws://127.0.0.1:${config.gateway.port}`;
      }
    } catch {
      // Config file doesn't exist or is unreadable — that's fine
    }
  }

  return {
    gatewayUrl: gatewayUrl || GATEWAY_DEFAULT_URL,
    gatewayToken,
    port: parseInt(process.env.PORT || String(SERVER_DEFAULT_PORT), 10),
  };
}
