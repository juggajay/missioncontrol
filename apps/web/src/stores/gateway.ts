import { create } from 'zustand';
import type { HelloOkPayload, ExecApprovalRequest } from '@mission-control/shared';

interface GatewayState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  gatewayUrl: string;
  features: { methods: string[]; events: string[] };
  snapshot: HelloOkPayload['snapshot'] | null;
  approvals: ExecApprovalRequest[];

  setConnection: (status: GatewayState['connectionStatus'], gateway?: string) => void;
  setHello: (payload: HelloOkPayload) => void;
  addApproval: (approval: ExecApprovalRequest) => void;
  removeApproval: (approvalId: string) => void;
}

export const useGatewayStore = create<GatewayState>((set) => ({
  connectionStatus: 'disconnected',
  gatewayUrl: '',
  features: { methods: [], events: [] },
  snapshot: null,
  approvals: [],

  setConnection: (status, gateway) =>
    set((state) => ({
      connectionStatus: status,
      ...(gateway ? { gatewayUrl: gateway } : {}),
    })),

  setHello: (payload) =>
    set({
      features: payload.features,
      snapshot: payload.snapshot,
    }),

  addApproval: (approval) =>
    set((state) => ({
      approvals: [...state.approvals, approval],
    })),

  removeApproval: (approvalId) =>
    set((state) => ({
      approvals: state.approvals.filter((a) => a.approvalId !== approvalId),
    })),
}));
