import Badge, { badgeClasses } from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import type { WalletTxSource, WalletTxStatus, WalletTxType } from './types';

// ----------------------------------------------------------------------

const txStatusColor: Record<WalletTxStatus, 'warning' | 'success' | 'default' | 'error'> = {
  PENDING: 'warning',
  POSTED: 'success',
  CANCELLED: 'default',
  FAILED: 'error',
};

const txStatusLabel: Record<WalletTxStatus, string> = {
  PENDING: 'Pending',
  POSTED: 'Posted',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

export const TxStatusBadge = ({ status }: { status: WalletTxStatus }) => (
  <Label variant="soft" color={txStatusColor[status]}>
    {txStatusLabel[status] ?? status}
  </Label>
);

export const TxTypeBadge = ({ type }: { type: WalletTxType }) => (
  <Label variant="soft" color={type === 'CREDIT' ? 'success' : 'error'}>
    {type === 'CREDIT' ? 'Credit' : 'Debit'}
  </Label>
);

export const SOURCE_LABEL: Record<WalletTxSource, string> = {
  consumer_payout: 'Consumer payout',
  withdrawal: 'Withdrawal',
  platform_fee: 'Platform fee',
  admin_adjustment: 'Admin adjustment',
};

/** Money leaving or arriving reads best as an icon, not a word. */
export const SOURCE_ICON: Record<WalletTxSource, string> = {
  consumer_payout: 'solar:cart-large-4-bold',
  withdrawal: 'solar:card-transfer-bold',
  platform_fee: 'solar:tag-price-bold',
  admin_adjustment: 'solar:pen-new-square-bold',
};

export const TxSourceBadge = ({ source }: { source: WalletTxSource }) => (
  <Label variant="soft">{SOURCE_LABEL[source] ?? source}</Label>
);

/**
 * Avatar for one transaction — the source icon, badged with the direction the
 * money moved so a column of rows reads at a glance.
 */
export const TxAvatar = ({ type, source }: { type: WalletTxType; source: WalletTxSource }) => (
  <Badge
    overlap="circular"
    color={type === 'CREDIT' ? 'success' : 'error'}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    badgeContent={
      <Iconify
        width={16}
        icon={
          type === 'CREDIT'
            ? 'eva:diagonal-arrow-left-down-fill'
            : 'eva:diagonal-arrow-right-up-fill'
        }
      />
    }
    sx={{ [`& .${badgeClasses.badge}`]: { p: 0, width: 20 } }}
  >
    <Avatar sx={{ width: 48, height: 48, color: 'text.secondary', bgcolor: 'background.neutral' }}>
      <Iconify width={24} icon={SOURCE_ICON[source] ?? 'solar:wallet-money-bold'} />
    </Avatar>
  </Badge>
);
