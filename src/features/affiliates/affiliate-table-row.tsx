import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { fDate } from '@/utils/format-time';
import { fCurrency, fNumber } from '@/utils/format-number';

import { AffiliateStatusBadge } from './status-badge';
import type { Affiliate } from './types';

// ----------------------------------------------------------------------

type Props = {
  row: Affiliate;
  clusterName?: string;
  onViewRow: () => void;
};

export function AffiliateTableRow({ row, clusterName, onViewRow }: Props) {
  // Orders per hundred clicks — the one number that says whether their sharing
  // is working, rather than how busy they look.
  const conversion = row.clicks === 0 ? 0 : (row.orders / row.clicks) * 100;

  return (
    <TableRow hover tabIndex={-1}>
      <TableCell>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Link color="inherit" onClick={onViewRow} sx={{ cursor: 'pointer', typography: 'subtitle2' }} noWrap>
            {row.name}
          </Link>
          <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
            {row.mobile ?? row.email ?? '—'}
          </Box>
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {clusterName ?? (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            Unassigned
          </Box>
        )}
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip
          title={
            row.commissionRatePercent === null
              ? 'Using the platform default'
              : 'Set for this affiliate'
          }
        >
          <Box component="span">
            <Label variant={row.commissionRatePercent === null ? 'soft' : 'filled'} color="info">
              {row.effectiveCommissionPercent}%
            </Label>
          </Box>
        </Tooltip>
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {fNumber(row.linkCount)}
      </TableCell>

      <TableCell sx={{ minWidth: 150 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" sx={{ typography: 'caption' }}>
            <Box component="span">
              {fNumber(row.clicks)} click{row.clicks === 1 ? '' : 's'}
            </Box>
            <Box component="span" sx={{ color: 'text.disabled' }}>
              {conversion.toFixed(conversion >= 10 ? 0 : 1)}%
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, conversion)}
            color={conversion >= 5 ? 'success' : conversion > 0 ? 'warning' : 'inherit'}
            sx={{ height: 6, borderRadius: 1 }}
          />
          <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
            {fNumber(row.orders)} order{row.orders === 1 ? '' : 's'}
          </Box>
        </Stack>
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Box sx={{ typography: 'subtitle2' }}>{fCurrency(row.earnedInr)}</Box>
        {row.pendingInr > 0 && (
          <Box component="span" sx={{ color: 'warning.dark', typography: 'caption' }}>
            {fCurrency(row.pendingInr)} to come
          </Box>
        )}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap', typography: 'caption' }}>
        {fDate(row.createdAt)}
      </TableCell>

      <TableCell>
        {row.status === 'suspended' && row.suspendedReason ? (
          <Tooltip title={row.suspendedReason}>
            <Box component="span">
              <AffiliateStatusBadge status={row.status} />
            </Box>
          </Tooltip>
        ) : (
          <AffiliateStatusBadge status={row.status} />
        )}
      </TableCell>

      <TableCell align="right" sx={{ px: 1 }}>
        <Tooltip title="Open" placement="top" arrow>
          <IconButton onClick={onViewRow}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
