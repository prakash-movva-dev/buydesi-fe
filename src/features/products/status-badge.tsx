import { Badge } from '@/components/ui/Badge';
import type { ProductStatus } from './types';

const variantByStatus: Record<ProductStatus, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  LIVE: 'success',
  REJECTED: 'destructive',
  SUSPENDED: 'muted',
};

const labelByStatus: Record<ProductStatus, string> = {
  PENDING: 'Pending',
  LIVE: 'Live',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => (
  <Badge variant={variantByStatus[status]}>{labelByStatus[status]}</Badge>
);
