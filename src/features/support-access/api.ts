import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

// ----------------------------------------------------------------------

export type SupportAccessEndReason =
  | 'seller_revoked'
  | 'support_ended'
  | 'expired'
  | 'ticket_closed'
  | 'ticket_reassigned'
  | 'password_changed';

export interface SupportAccessGrant {
  _id: string;
  ticketId: { _id: string; ticketNumber: string } | string;
  grantedToId: { _id: string; name: string } | string;
  redeemedAt: string | null;
  sessionExpiresAt: string | null;
  endedAt: string | null;
  endReason: SupportAccessEndReason | null;
  createdAt: string;
}

export interface RedeemedSession {
  accessToken: string;
  expiresAt: string;
  seller: { id: string; name: string };
}

const grantKeys = { all: ['support-access', 'grants'] as const };

// ─── Seller ───────────────────────────────────────────────────────────────

export const useMyGrants = (enabled = true) =>
  useQuery({
    queryKey: grantKeys.all,
    queryFn: () => api.get<SupportAccessGrant[]>('/support-access/grants'),
    enabled,
    // Short, because the card shows whether somebody is in the account right
    // now and a stale "nobody is here" is the wrong thing to be relaxed about.
    refetchInterval: 20_000,
  });

export const useCreateSupportPin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) =>
      api.post<{ pin: string; expiresAt: string; grantId: string }>('/support-access/pin', {
        ticketId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: grantKeys.all }),
  });
};

export const useRevokeSupportAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ ended: number }>('/support-access/session'),
    onSuccess: () => qc.invalidateQueries({ queryKey: grantKeys.all }),
  });
};

// ─── Support admin ────────────────────────────────────────────────────────

export const useRedeemSupportPin = () =>
  useMutation({
    mutationFn: (input: { sellerEmail: string; pin: string }) =>
      api.post<RedeemedSession>('/support-access/redeem', input),
  });

export const useEndMySupportSession = () =>
  useMutation({
    mutationFn: () => api.delete<{ ended: number }>('/support-access/my-session'),
  });
