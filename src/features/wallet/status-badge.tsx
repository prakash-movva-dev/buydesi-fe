import { Badge } from '@/components/ui/Badge';
import type {
  CashEntryStatus,
  WalletTxSource,
  WalletTxStatus,
  WalletTxType,
} from './types';

const txStatusVariant: Record<WalletTxStatus, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  POSTED: 'success',
  CANCELLED: 'muted',
  FAILED: 'destructive',
};

export const TxStatusBadge = ({ status }: { status: WalletTxStatus }) => (
  <Badge variant={txStatusVariant[status]}>{status}</Badge>
);

export const TxTypeBadge = ({ type }: { type: WalletTxType }) => (
  <Badge variant={type === 'CREDIT' ? 'success' : 'destructive'}>{type}</Badge>
);

const sourceLabel: Record<WalletTxSource, string> = {
  consumer_payout: 'Consumer payout',
  trade_sale: 'Trade sale',
  trade_purchase: 'Trade purchase',
  trade_refund: 'Trade refund',
  withdrawal: 'Withdrawal',
  cash_received: 'Cash received',
  cash_paid: 'Cash paid',
  platform_fee: 'Platform fee',
  admin_adjustment: 'Admin adjustment',
};

export const TxSourceBadge = ({ source }: { source: WalletTxSource }) => (
  <Badge variant="muted">{sourceLabel[source] ?? source}</Badge>
);

const cashStatusVariant: Record<CashEntryStatus, 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

export const CashStatusBadge = ({ status }: { status: CashEntryStatus }) => (
  <Badge variant={cashStatusVariant[status]}>{status}</Badge>
);
