import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED' | 'NONE';

export type EscrowTrigger =
  | 'payment_captured'
  | 'payment_failed'
  | 'shipment_delivered'
  | 'shipment_returned'
  | 'order_cancelled'
  | 'admin_manual'
  | 'cod_collected'
  | 'system';

export type EscrowActor = 'system' | 'admin' | 'webhook' | 'buyer' | 'seller';

export interface EscrowAuditEntry {
  _id: string;
  id?: string;
  orderId: string;
  fromStatus: EscrowStatus;
  toStatus: EscrowStatus;
  trigger: EscrowTrigger;
  actor: EscrowActor;
  actorId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const escrowKeys = {
  audit: (orderId: string) => ['escrow', 'audit', orderId] as const,
};

export const useEscrowAudit = (orderId: string | undefined) =>
  useQuery({
    queryKey: orderId ? escrowKeys.audit(orderId) : ['escrow', 'audit', 'none'],
    queryFn: () => api.get<EscrowAuditEntry[]>(`/admin/escrow/orders/${orderId}/audit`),
    enabled: Boolean(orderId),
  });
