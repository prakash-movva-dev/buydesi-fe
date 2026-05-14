import { Badge } from '@/components/ui/Badge';
import type {
  SupportCategory,
  SupportEscalationLevel,
  SupportStatus,
} from './types';

const statusVariant: Record<SupportStatus, 'info' | 'warning' | 'success' | 'destructive' | 'muted'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ESCALATED: 'destructive',
  CLOSED: 'muted',
};

const statusLabel: Record<SupportStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  ESCALATED: 'Escalated',
  CLOSED: 'Closed',
};

export const TicketStatusBadge = ({ status }: { status: SupportStatus }) => (
  <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
);

const levelVariant: Record<SupportEscalationLevel, 'muted' | 'warning' | 'destructive'> = {
  support: 'muted',
  cluster: 'warning',
  super: 'destructive',
};

const levelLabel: Record<SupportEscalationLevel, string> = {
  support: 'Support',
  cluster: 'Cluster',
  super: 'Super',
};

export const TicketLevelBadge = ({ level }: { level: SupportEscalationLevel }) => (
  <Badge variant={levelVariant[level]}>{levelLabel[level]} tier</Badge>
);

const categoryLabel: Record<SupportCategory, string> = {
  return: 'Return',
  refund: 'Refund',
  grievance: 'Grievance',
  product_quality: 'Quality',
  delivery: 'Delivery',
  other: 'Other',
};

export const TicketCategoryBadge = ({ category }: { category: SupportCategory }) => (
  <Badge variant="muted">{categoryLabel[category]}</Badge>
);
