import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { formatInr } from '@/lib/format';
import type { PerformanceBand, SellerPerformanceRow } from './types';

// ----------------------------------------------------------------------

export const BAND_LABEL: Record<PerformanceBand, string> = {
  attention: 'Needs attention',
  strong: 'Strong',
  steady: 'Steady',
  quiet: 'No orders',
};

export const BAND_COLOR: Record<PerformanceBand, 'error' | 'success' | 'info' | 'default'> = {
  attention: 'error',
  strong: 'success',
  steady: 'info',
  quiet: 'default',
};

/** A rate reads as a bar; "—" when there were no orders to divide by. */
const RateCell = ({
  value,
  invert,
}: {
  value: number | null;
  /** True when a *higher* number is the bad one, like returns. */
  invert?: boolean;
}) => {
  if (value === null) {
    return (
      <Box component="span" sx={{ color: 'text.disabled' }}>
        —
      </Box>
    );
  }

  const good = invert ? value <= 10 : value >= 80;
  const bad = invert ? value > 20 : value < 60;
  const color = bad ? 'error' : good ? 'success' : 'warning';

  return (
    <Stack spacing={0.75} sx={{ minWidth: 110 }}>
      <Box component="span" sx={{ typography: 'subtitle2', color: `${color}.main` }}>
        {value}%
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, value)}
        color={color}
        sx={{ height: 6, borderRadius: 1 }}
      />
    </Stack>
  );
};

type Props = {
  row: SellerPerformanceRow;
  clusterName?: string;
  onViewSeller: () => void;
  onViewOrders: () => void;
};

export function PerformanceTableRow({ row, clusterName, onViewSeller, onViewOrders }: Props) {
  return (
    <TableRow hover>
      <TableCell>
        <Stack spacing={2} direction="row" alignItems="center">
          <Avatar alt={row.farmName} variant="rounded" sx={{ width: 44, height: 44 }}>
            {row.farmName.charAt(0).toUpperCase()}
          </Avatar>

          <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
            <Link color="inherit" onClick={onViewSeller} sx={{ cursor: 'pointer' }} noWrap>
              {row.farmName}
            </Link>
            <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
              {row.sellerCode ?? clusterName ?? '—'}
            </Box>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell align="right">
        <ListItemText
          primary={row.orders}
          secondary={
            row.avgOrderValueInr !== null ? `${formatInr(row.avgOrderValueInr)} avg` : undefined
          }
          primaryTypographyProps={{ typography: 'body2' }}
          secondaryTypographyProps={{ typography: 'caption' }}
        />
      </TableCell>

      <TableCell>
        <Tooltip title={`${row.fulfilled} of ${row.orders} delivered`} placement="top" arrow>
          <span>
            <RateCell value={row.fulfilmentRate} />
          </span>
        </Tooltip>
      </TableCell>

      <TableCell>
        <Tooltip title={`${row.returned} returned`} placement="top" arrow>
          <span>
            <RateCell value={row.returnRate} invert />
          </span>
        </Tooltip>
      </TableCell>

      <TableCell>
        {row.avgRating !== null ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Rating value={row.avgRating} precision={0.1} readOnly size="small" />
            <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
              {row.avgRating.toFixed(1)}
            </Box>
          </Stack>
        ) : (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            No reviews
          </Box>
        )}
      </TableCell>

      <TableCell align="right">
        {row.complaints > 0 ? (
          <Label variant="soft" color="error">
            {row.complaints}
          </Label>
        ) : (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            —
          </Box>
        )}
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <ListItemText
          primary={formatInr(row.revenueInr)}
          secondary={row.revenueSharePercent > 0 ? `${row.revenueSharePercent}% of total` : undefined}
          primaryTypographyProps={{ typography: 'subtitle2' }}
          secondaryTypographyProps={{ typography: 'caption' }}
        />
      </TableCell>

      <TableCell>
        <Label variant="soft" color={BAND_COLOR[row.band]}>
          {BAND_LABEL[row.band]}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <Tooltip title="Seller profile" placement="top" arrow>
          <IconButton onClick={onViewSeller}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Their orders" placement="top" arrow>
          <IconButton onClick={onViewOrders}>
            <Iconify icon="solar:clipboard-list-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
