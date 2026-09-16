import { Label } from '@/components/label';

import type {
  AffiliateAttributionVia,
  AffiliateConversionStatus,
  AffiliateLinkTargetType,
  AffiliateStatus,
} from './types';

// ----------------------------------------------------------------------

export const AFFILIATE_STATUS_COLOR: Record<
  AffiliateStatus,
  'warning' | 'success' | 'error'
> = {
  pending: 'warning',
  active: 'success',
  suspended: 'error',
};

export const AFFILIATE_STATUS_LABEL: Record<AffiliateStatus, string> = {
  pending: 'Awaiting approval',
  active: 'Active',
  suspended: 'Suspended',
};

export const AffiliateStatusBadge = ({ status }: { status: AffiliateStatus }) => (
  <Label variant="soft" color={AFFILIATE_STATUS_COLOR[status] ?? 'default'}>
    {AFFILIATE_STATUS_LABEL[status] ?? status}
  </Label>
);

// ----------------------------------------------------------------------

export const CONVERSION_COLOR: Record<
  AffiliateConversionStatus,
  'warning' | 'info' | 'success' | 'default'
> = {
  PENDING: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  REVERSED: 'default',
};

/** Said as what it means to the affiliate, not as a state machine label. */
export const CONVERSION_LABEL: Record<AffiliateConversionStatus, string> = {
  PENDING: 'Not owed yet',
  APPROVED: 'Owed',
  PAID: 'Paid',
  REVERSED: 'Taken back',
};

export const ConversionStatusBadge = ({
  status,
}: {
  status: AffiliateConversionStatus;
}) => (
  <Label variant="soft" color={CONVERSION_COLOR[status] ?? 'default'}>
    {CONVERSION_LABEL[status] ?? status}
  </Label>
);

// ----------------------------------------------------------------------

export const VIA_LABEL: Record<AffiliateAttributionVia, string> = {
  link: 'Link click',
  coupon: 'Coupon typed',
};

export const VIA_ICON: Record<AffiliateAttributionVia, string> = {
  link: 'solar:link-round-bold',
  coupon: 'solar:ticket-bold',
};

export const TARGET_LABEL: Record<AffiliateLinkTargetType, string> = {
  store: 'Whole shop',
  product: 'One product',
  category: 'A category',
  seller: 'One seller',
};

export const TARGET_ICON: Record<AffiliateLinkTargetType, string> = {
  store: 'solar:shop-bold',
  product: 'solar:box-bold',
  category: 'solar:widget-bold',
  seller: 'solar:user-rounded-bold',
};
