import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  WalletSnapshot,
  WalletSummary,
  WalletTransaction,
  WalletTxListMeta,
  WalletTxListQuery,
} from './types';

// ─── Keys ─────────────────────────────────────────────────────────────────

export const walletKeys = {
  all: ['wallet'] as const,
  txList: (q: WalletTxListQuery) => ['wallet', 'tx', q] as const,
  snapshot: (sellerId: string) => ['wallet', 'snapshot', sellerId] as const,
};

// ─── Transactions list ────────────────────────────────────────────────────

interface TxListResult {
  items: WalletTransaction[];
  meta: WalletTxListMeta;
}

const fetchTxList = async (q: WalletTxListQuery): Promise<TxListResult> => {
  const params = new URLSearchParams();
  if (q.type) params.set('type', q.type);
  if (q.source) params.set('source', q.source);
  if (q.status) params.set('status', q.status);
  if (q.userId) params.set('userId', q.userId);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<WalletTransaction[]>(
    `/admin/wallet/transactions?${params.toString()}`,
  );
  return {
    items: data,
    meta:
      (meta as WalletTxListMeta | undefined) ?? {
        total: data.length,
        page: q.page,
        limit: q.limit,
      },
  };
};

export const useWalletTxList = (q: WalletTxListQuery) =>
  useQuery({ queryKey: walletKeys.txList(q), queryFn: () => fetchTxList(q) });

export const useSellerWallet = (sellerId: string | undefined) =>
  useQuery({
    queryKey: sellerId ? walletKeys.snapshot(sellerId) : ['wallet', 'snapshot', 'none'],
    queryFn: () => api.get<WalletSnapshot>(`/admin/wallet/${sellerId}`),
    enabled: Boolean(sellerId),
  });

// ─── Mutations ────────────────────────────────────────────────────────────

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: walletKeys.all });
};

export const useAdjustWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sellerId,
      direction,
      amountInr,
      reason,
    }: {
      sellerId: string;
      direction: 'credit' | 'debit';
      amountInr: number;
      reason: string;
    }) =>
      api.post<WalletTransaction>(`/admin/wallet/${sellerId}/adjust`, {
        direction,
        amountInr,
        reason,
      }),
    onSuccess: () => invalidate(qc),
  });
};

export const useCompleteWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.put<WalletTransaction>(`/admin/wallet/withdrawals/${id}/complete`, { reason }),
    onSuccess: () => invalidate(qc),
  });
};

export const useCancelWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.put<WalletTransaction>(`/admin/wallet/withdrawals/${id}/cancel`, { reason }),
    onSuccess: () => invalidate(qc),
  });
};

/** Same series as the seller sees, for whichever wallet the admin picked. */
export const useSellerWalletSummary = (sellerId?: string) =>
  useQuery({
    queryKey: ['wallet', 'summary', sellerId ?? 'none'],
    queryFn: () => api.get<WalletSummary>(`/admin/wallet/${sellerId}/summary`),
    enabled: Boolean(sellerId),
  });
