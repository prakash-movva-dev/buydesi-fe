// Mirrors backend `src/modules/wallet/wallet.types.ts` and `cash.types.ts`.

export type WalletTxType = 'CREDIT' | 'DEBIT';
export type WalletTxStatus = 'PENDING' | 'POSTED' | 'CANCELLED' | 'FAILED';
export type WalletTxSource =
  | 'consumer_payout'
  | 'trade_sale'
  | 'trade_purchase'
  | 'trade_refund'
  | 'withdrawal'
  | 'cash_received'
  | 'cash_paid'
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
  referenceType: 'payout' | 'trade_order' | 'withdrawal' | 'cash_entry' | 'admin' | null;
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

// ─── Cash entries ─────────────────────────────────────────────────────────

export type CashEntryType = 'cash_received' | 'cash_paid';
export type CashEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CashEntry {
  id: string;
  sellerId: string;
  type: CashEntryType;
  amountInr: number;
  reason: string;
  tradeOrderId: string | null;
  status: CashEntryStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashListQuery {
  status?: CashEntryStatus;
  sellerId?: string;
  type?: CashEntryType;
  page: number;
  limit: number;
}
