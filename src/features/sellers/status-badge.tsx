import { Badge } from '@/components/ui/Badge';
import type { SellerStatus } from './types';

const variantByStatus: Record<SellerStatus, 'warning' | 'success' | 'destructive' | 'info' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  INFO_REQUESTED: 'info',
  SUSPENDED: 'muted',
};

const labelByStatus: Record<SellerStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  INFO_REQUESTED: 'Info requested',
  SUSPENDED: 'Suspended',
};

export const SellerStatusBadge = ({ status }: { status: SellerStatus }) => (
  <Badge variant={variantByStatus[status]}>{labelByStatus[status]}</Badge>
);
