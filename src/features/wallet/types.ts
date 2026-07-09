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
  type: CashEntryType;
  amountInr: number;
  reason: string;
  status: CashEntryStatus;
  /** Seller's business/farm name, falling back to their account name. */
  sellerName: string | null;
  sellerMobile: string | null;
  sellerEmail: string | null;
  clusterName: string | null;
  /** Short human label like "#a1b2" for a linked trade order, else null. */
  tradeOrderLabel: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A seller's own cash entry (from `/wallet/cash-entries`). Unlike the
 * admin-facing {@link CashEntry}, this is the raw document — the seller
 * already knows who they are, so no enrichment is applied server-side.
 */
export interface MyCashEntry {
  id: string;
  type: CashEntryType;
  amountInr: number;
  reason: string;
  status: CashEntryStatus;
  tradeOrderId: string | null;
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
