import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { TableHeadCustom } from '@/components/table';

import { fDate, fTime } from '@/utils/format-time';
import { fCurrency } from '@/utils/format-number';

import { PAYOUT_STATUS_COLOR, SCHEDULE_LABEL, SOURCE_LABEL } from './status-badge';
import type { Payout } from './types';

// ----------------------------------------------------------------------

const LINE_ITEM_HEAD = [
  { id: 'product', label: 'Product' },
  { id: 'order', label: 'Order', width: 180 },
  { id: 'gross', label: 'Gross', align: 'right' as const, width: 120 },
  { id: 'rate', label: 'Rate', align: 'right' as const, width: 90 },
  { id: 'source', label: 'Rate from', width: 140 },
  { id: 'commission', label: 'Commission', align: 'right' as const, width: 130 },
  { id: 'net', label: 'Net', align: 'right' as const, width: 120 },
];

type Props = {
  row: Payout;
};

/**
 * One settlement, with its working shown.
 *
 * The collapsed row is the summary a finance question usually needs; expanding
 * it gives the per-item arithmetic — including which commission rule set each
 * rate, which is the first thing a seller disputes.
 */
export function PayoutTableRow({ row }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover tabIndex={-1}>
        <TableCell sx={{ px: 1, width: 56 }}>
          <IconButton
            size="small"
            color={open ? 'inherit' : 'default'}
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? 'Hide line items' : 'Show line items'}
          >
            <Iconify icon={open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} />
          </IconButton>
        </TableCell>

        <TableCell>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Box component="span" sx={{ typography: 'subtitle2' }}>
              {row.sellerName ?? 'Unknown seller'}
            </Box>
            {(row.sellerMobile || row.sellerEmail) && (
              <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
                {row.sellerMobile ?? row.sellerEmail}
              </Box>
            )}
          </Stack>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Label variant="soft">{SCHEDULE_LABEL[row.schedule] ?? row.schedule}</Label>
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {fCurrency(row.totalGrossInr)}
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
          −{fCurrency(row.totalCommissionInr)}
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
          {row.totalPlatformFeesInr > 0 ? `−${fCurrency(row.totalPlatformFeesInr)}` : '—'}
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap', typography: 'subtitle2' }}>
          {fCurrency(row.netInr)}
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2">{row.orderCount}</Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {row.itemCount} item{row.itemCount === 1 ? '' : 's'}
          </Typography>
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.paidAt ?? row.createdAt)}
            secondary={fTime(row.paidAt ?? row.createdAt)}
            primaryTypographyProps={{ typography: 'body2', noWrap: true }}
            secondaryTypographyProps={{ mt: 0.5, component: 'span', typography: 'caption' }}
          />
        </TableCell>

        <TableCell>
          <Label variant="soft" color={PAYOUT_STATUS_COLOR[row.status] ?? 'default'}>
            {row.status}
          </Label>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell sx={{ p: 0, border: 'none' }} colSpan={10}>
          <Collapse in={open} unmountOnExit timeout="auto">
            <Paper
              variant="outlined"
              sx={{ m: 1.5, borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.neutral' }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
                flexWrap="wrap"
                useFlexGap
                sx={{ px: 2, py: 1.5 }}
              >
                <Typography variant="subtitle2">
                  What this settled
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {fCurrency(row.totalGrossInr)} gross − {fCurrency(row.totalCommissionInr)}{' '}
                  commission
                  {row.totalPlatformFeesInr > 0
                    ? ` − ${fCurrency(row.totalPlatformFeesInr)} platform fee`
                    : ''}{' '}
                  = {fCurrency(row.netInr)} credited to the wallet
                </Typography>
              </Stack>

              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={LINE_ITEM_HEAD} />
                <TableBody>
                  {row.lineItems.map((item, index) => (
                    <TableRow key={`${item.orderItemId}-${index}`}>
                      <TableCell sx={{ typography: 'body2' }}>{item.productName}</TableCell>
                      <TableCell sx={{ typography: 'caption', fontFamily: 'monospace' }}>
                        {item.orderNumber ?? '—'}
                      </TableCell>
                      <TableCell align="right">{fCurrency(item.grossInr)}</TableCell>
                      <TableCell align="right">{item.commissionRatePercent}%</TableCell>
                      <TableCell>
                        <Label variant="soft" color="default">
                          {SOURCE_LABEL[item.commissionSource] ?? item.commissionSource}
                        </Label>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>
                        −{fCurrency(item.commissionInr)}
                      </TableCell>
                      <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                        {fCurrency(item.netInr)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {row.notes && (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {row.notes}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
