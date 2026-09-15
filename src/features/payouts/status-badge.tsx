import type { CommissionSource, PayoutSchedule, PayoutStatus } from './types';

// ----------------------------------------------------------------------

export const PAYOUT_STATUS_COLOR: Record<
  PayoutStatus,
  'warning' | 'info' | 'success' | 'error' | 'default'
> = {
  PENDING: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
};

export const SCHEDULE_LABEL: Record<PayoutSchedule, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  on_demand: 'On demand',
};

/** Which rule set the commission rate — the first question on any dispute. */
export const SOURCE_LABEL: Record<CommissionSource, string> = {
  seller: 'This seller',
  product: 'This product',
  category: 'Category override',
  category_default: 'Category default',
};
