import type { GatewayClient } from './client.js';
import type { SessionEntry, SessionPatch } from '@mission-control/shared';

// Typed wrappers around gateway RPC calls

export function createGatewayMethods(client: GatewayClient) {
  return {
    // Sessions
    async sessionsList(): Promise<SessionEntry[]> {
      return client.call('sessions.list', {});
    },

    async sessionsPatch(patch: SessionPatch): Promise<void> {
      return client.call('sessions.patch', patch);
    },

    async sessionsReset(sessionKey: string): Promise<void> {
      return client.call('sessions.reset', { sessionKey });
    },

    // Chat
    async chatSend(sessionKey: string, message: string, idempotencyKey: string): Promise<{ runId: string; status: string }> {
      return client.call('chat.send', { sessionKey, message, idempotencyKey });
    },

    async chatAbort(sessionKey: string): Promise<void> {
      return client.call('chat.abort', { sessionKey });
    },

    async chatHistory(sessionKey: string): Promise<unknown[]> {
      return client.call('chat.history', { sessionKey });
    },

    async chatInject(sessionKey: string, message: string): Promise<void> {
      return client.call('chat.inject', { sessionKey, message });
    },

    // Agents
    async agentsList(): Promise<unknown[]> {
      return client.call('agents.list', {});
    },

    async agentsFilesGet(agentId: string, name: string): Promise<unknown> {
      return client.call('agents.files.get', { agentId, name });
    },

    async agentsFilesSet(agentId: string, name: string, content: string): Promise<void> {
      return client.call('agents.files.set', { agentId, name, content });
    },

    // Config
    async configGet(): Promise<{ config: unknown; hash: string }> {
      return client.call('config.get', {});
    },

    async configPatch(patch: unknown, baseHash: string): Promise<void> {
      return client.call('config.patch', { patch, baseHash });
    },

    async configSchema(): Promise<unknown> {
      return client.call('config.schema', {});
    },

    // Cron
    async cronList(): Promise<unknown[]> {
      return client.call('cron.list', {});
    },

    async cronAdd(params: { schedule: string; sessionKey: string; message: string }): Promise<void> {
      return client.call('cron.add', params);
    },

    async cronRun(id: string): Promise<void> {
      return client.call('cron.run', { id });
    },

    async cronRemove(id: string): Promise<void> {
      return client.call('cron.remove', { id });
    },

    async cronEnable(id: string): Promise<void> {
      return client.call('cron.enable', { id });
    },

    async cronDisable(id: string): Promise<void> {
      return client.call('cron.disable', { id });
    },

    // Nodes
    async nodeList(): Promise<unknown[]> {
      return client.call('node.list', {});
    },

    async nodeInvoke(nodeId: string, capability: string, params?: unknown): Promise<unknown> {
      return client.call('node.invoke', { nodeId, capability, params });
    },

    // System
    async health(): Promise<unknown> {
      return client.call('health', {});
    },

    async modelsList(): Promise<unknown[]> {
      return client.call('models.list', {});
    },

    // Approvals
    async resolveApproval(approvalId: string, approved: boolean): Promise<void> {
      return client.call('exec.approval.resolve', { approvalId, approved });
    },
  };
}

export type GatewayMethods = ReturnType<typeof createGatewayMethods>;
