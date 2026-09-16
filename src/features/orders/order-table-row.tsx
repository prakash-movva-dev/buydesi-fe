import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { fDate, fTime } from '@/utils/format-time';
import { fCurrency } from '@/utils/format-number';

import { ORDER_ICON, OrderStatusBadge, PaymentStatusBadge } from './status-badge';
import type { SafeOrder } from './types';

// ----------------------------------------------------------------------

type Props = {
  row: SafeOrder;
  onViewRow: () => void;
};

export function OrderTableRow({ row, onViewRow }: Props) {
  const itemCount = row.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <TableRow hover tabIndex={-1}>
      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{ width: 44, height: 44, bgcolor: 'background.neutral', color: 'text.secondary' }}
          >
            <Iconify icon={ORDER_ICON[row.status] ?? 'solar:bag-4-bold'} width={22} />
          </Avatar>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Link
              color="inherit"
              onClick={onViewRow}
              sx={{ cursor: 'pointer', typography: 'subtitle2', fontFamily: 'monospace' }}
              noWrap
            >
              {row.orderNumber}
            </Link>
            <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
              {row.buyerName ?? 'Buyer unknown'}
            </Box>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Stack spacing={0.5} alignItems="flex-start">
          <OrderStatusBadge status={row.status} />
          {row.delhiveryShipmentId && (
            <Tooltip title={`Waybill ${row.delhiveryShipmentId}`}>
              <Box
                component="span"
                sx={{ color: 'text.disabled', typography: 'caption', fontFamily: 'monospace' }}
              >
                {row.delhiveryShipmentId.slice(0, 14)}
              </Box>
            </Tooltip>
          )}
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Stack spacing={0.5} alignItems="flex-start">
          <PaymentStatusBadge status={row.payment.status} />
          <Label variant="soft" color="default">
            {row.payment.mode === 'COD' ? 'Cash' : 'Prepaid'}
          </Label>
        </Stack>
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Box sx={{ typography: 'subtitle2' }}>{fCurrency(row.totalInr)}</Box>
        {row.discountInr > 0 && (
          <Box component="span" sx={{ color: 'success.dark', typography: 'caption' }}>
            −{fCurrency(row.discountInr)} off
          </Box>
        )}
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Box sx={{ typography: 'body2' }}>{itemCount}</Box>
        <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
          {row.items.length} line{row.items.length === 1 ? '' : 's'}
        </Box>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.shippingAddress.city}
        <Box
          component="span"
          sx={{ display: 'block', color: 'text.disabled', typography: 'caption' }}
        >
          {row.shippingAddress.pincode}
        </Box>
      </TableCell>

      <TableCell>
        <ListItemText
          primary={fDate(row.createdAt)}
          secondary={fTime(row.createdAt)}
          primaryTypographyProps={{ typography: 'body2', noWrap: true }}
          secondaryTypographyProps={{ mt: 0.5, component: 'span', typography: 'caption' }}
        />
      </TableCell>

      <TableCell align="right" sx={{ px: 1 }}>
        <Tooltip title="Open order" placement="top" arrow>
          <IconButton onClick={onViewRow}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
