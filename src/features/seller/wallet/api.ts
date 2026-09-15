import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type {
  WalletSnapshot,
  WalletSummary,
  WalletTransaction,
  WalletTxListMeta,
} from '@/features/wallet/types';

export const sellerWalletKeys = {
  me: ['seller-wallet', 'me'] as const,
  tx: (q: object) => ['seller-wallet', 'tx', q] as const,
};

export const useMyWallet = () =>
  useQuery({
    queryKey: sellerWalletKeys.me,
    queryFn: () => api.get<WalletSnapshot>('/wallet'),
  });

export interface MyTxQuery {
  type?: 'CREDIT' | 'DEBIT';
  source?: string;
  status?: 'PENDING' | 'POSTED' | 'CANCELLED' | 'FAILED';
  page: number;
  limit: number;
}

export const useMyTransactions = (q: MyTxQuery) =>
  useQuery({
    queryKey: sellerWalletKeys.tx(q),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.type) params.set('type', q.type);
      if (q.source) params.set('source', q.source);
      if (q.status) params.set('status', q.status);
      params.set('page', String(q.page));
      params.set('limit', String(q.limit));
      const { data, meta } = await fetchEnvelope<WalletTransaction[]>(
        `/wallet/transactions?${params.toString()}`,
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
    },
  });

export const useRequestWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { amountInr: number; notes?: string }) =>
      api.post<WalletTransaction>('/wallet/withdraw', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-wallet'] }),
  });
};

/** Monthly money-in / money-out, for the wallet charts. */
export const useMyWalletSummary = () =>
  useQuery({
    queryKey: ['seller-wallet', 'summary'],
    queryFn: () => api.get<WalletSummary>('/wallet/summary'),
  });
