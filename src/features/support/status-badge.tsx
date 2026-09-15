import { Label } from '@/components/label';
import type { SupportCategory, SupportEscalationLevel, SupportStatus } from './types';

// ----------------------------------------------------------------------

export const STATUS_COLOR: Record<
  SupportStatus,
  'info' | 'warning' | 'success' | 'error' | 'default'
> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ESCALATED: 'error',
  CLOSED: 'default',
};

export const STATUS_LABEL: Record<SupportStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  ESCALATED: 'Escalated',
  CLOSED: 'Closed',
};

export const TicketStatusBadge = ({ status }: { status: SupportStatus }) => (
  <Label variant="soft" color={STATUS_COLOR[status]}>
    {STATUS_LABEL[status]}
  </Label>
);

// ----------------------------------------------------------------------

export const LEVEL_COLOR: Record<SupportEscalationLevel, 'default' | 'warning' | 'error'> = {
  support: 'default',
  cluster: 'warning',
  super: 'error',
};

export const LEVEL_LABEL: Record<SupportEscalationLevel, string> = {
  support: 'Support',
  cluster: 'Cluster',
  super: 'Super',
};

export const TicketLevelBadge = ({ level }: { level: SupportEscalationLevel }) => (
  <Label variant="soft" color={LEVEL_COLOR[level]}>
    {LEVEL_LABEL[level]}
  </Label>
);

// ----------------------------------------------------------------------

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  return: 'Return',
  refund: 'Refund',
  grievance: 'Grievance',
  product_quality: 'Product quality',
  delivery: 'Delivery',
  other: 'Other',
};

/** Each category gets its own glyph, so a column of rows scans by shape. */
export const CATEGORY_ICON: Record<SupportCategory, string> = {
  return: 'solar:restart-bold',
  refund: 'solar:wallet-money-bold',
  grievance: 'solar:danger-triangle-bold',
  product_quality: 'solar:box-bold',
  delivery: 'solar:delivery-bold',
  other: 'solar:chat-round-dots-bold',
};

export const TicketCategoryBadge = ({ category }: { category: SupportCategory }) => (
  <Label variant="soft">{CATEGORY_LABEL[category] ?? category}</Label>
);
