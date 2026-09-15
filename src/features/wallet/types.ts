// Mirrors backend `src/modules/wallet/wallet.types.ts`.

export type WalletTxType = 'CREDIT' | 'DEBIT';
export type WalletTxStatus = 'PENDING' | 'POSTED' | 'CANCELLED' | 'FAILED';
export type WalletTxSource =
  | 'consumer_payout'
  | 'withdrawal'
  | 'platform_fee'
  | 'admin_adjustment';

export interface WalletTransaction {
  id: string;
  userId: string;
  walletId: string;
  type: WalletTxType;
  source: WalletTxSource;
  amountInr: number;
  status: WalletTxStatus;
  referenceType: 'payout' | 'withdrawal' | 'admin' | null;
  referenceId: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSnapshot {
  walletId: string;
  userId: string;
  balanceInr: number;
  pendingCreditInr: number;
  pendingDebitInr: number;
  availableInr: number;
}

export interface WalletTxListQuery {
  type?: WalletTxType;
  source?: WalletTxSource;
  status?: WalletTxStatus;
  userId?: string;
  clusterId?: string;
  page: number;
  limit: number;
}

export interface WalletTxListMeta {
  total: number;
  page: number;
  limit: number;
  clusterId?: string | null;
}

// ─── Summary series (wallet charts) ───────────────────────────────────────

export interface WalletMonthlyPoint {
  /** 'YYYY-MM'. */
  month: string;
  creditInr: number;
  debitInr: number;
}

export interface WalletSummary {
  months: WalletMonthlyPoint[];
  totalCreditInr: number;
  totalDebitInr: number;
  creditChangePercent: number;
  debitChangePercent: number;
}
