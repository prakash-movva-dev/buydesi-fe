import { Badge } from '@/components/ui/Badge';
import type { SellerStatus } from './types';

const variantByStatus: Record<SellerStatus, 'warning' | 'success' | 'destructive' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  INFO_REQUESTED: 'info',
};

const labelByStatus: Record<SellerStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  INFO_REQUESTED: 'Info requested',
};

export const SellerStatusBadge = ({ status }: { status: SellerStatus }) => (
  <Badge variant={variantByStatus[status]}>{labelByStatus[status]}</Badge>
);
