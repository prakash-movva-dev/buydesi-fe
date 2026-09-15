import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { formatInr } from '@/lib/format';
import { fDate } from '@/utils/format-time';
import { availableStock, lowestPrice } from './price';
import type { SafeProduct } from './types';

// ----------------------------------------------------------------------

/** How urgent this row is, which drives its colour everywhere in the row. */
export type StockLevel = 'out' | 'low' | 'ok';

export const levelOf = (row: SafeProduct): StockLevel => {
  const quantity = availableStock(row);
  if (quantity <= 0) return 'out';
  return quantity <= row.stock.threshold ? 'low' : 'ok';
};

const LEVEL_COLOR: Record<StockLevel, 'error' | 'warning' | 'success'> = {
  out: 'error',
  low: 'warning',
  ok: 'success',
};

const LEVEL_LABEL: Record<StockLevel, string> = {
  out: 'Out of stock',
  low: 'Low',
  ok: 'In stock',
};

type Props = {
  row: SafeProduct;
  selected: boolean;
  categoryName?: string;
  alerting?: boolean;
  onSelectRow: () => void;
  onViewRow: () => void;
  onAlert: () => void;
};

export function StockTableRow({
  row,
  selected,
  categoryName,
  alerting,
  onSelectRow,
  onViewRow,
  onAlert,
}: Props) {
  const level = levelOf(row);
  const quantity = availableStock(row);
  const threshold = row.stock.threshold;

  // How full the shelf is against the point it should be refilled. Capped so a
  // well-stocked product just reads as a full bar rather than overflowing.
  const fill = threshold > 0 ? Math.min(100, (quantity / (threshold * 2)) * 100) : 100;

  const price = lowestPrice(row);

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      <TableCell padding="checkbox">
        <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell>
        <Stack spacing={2} direction="row" alignItems="center">
          <Avatar alt={row.name} src={row.images[0]} variant="rounded" sx={{ width: 48, height: 48 }}>
            <Iconify icon="solar:gallery-wide-bold" width={20} />
          </Avatar>

          <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
            <Link color="inherit" onClick={onViewRow} sx={{ cursor: 'pointer' }} noWrap>
              {row.name}
            </Link>
            <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
              {row.unit}
              {row.variantSummary?.hasVariants
                ? ` · ${row.variantSummary.variantCount} option${
                    row.variantSummary.variantCount === 1 ? '' : 's'
                  }`
                : ''}
            </Box>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <ListItemText
          primary={row.sellerName ?? '—'}
          secondary={categoryName}
          primaryTypographyProps={{ typography: 'body2', noWrap: true }}
          secondaryTypographyProps={{ typography: 'caption' }}
        />
      </TableCell>

      <TableCell sx={{ minWidth: 160 }}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Box component="span" sx={{ typography: 'subtitle2', color: `${LEVEL_COLOR[level]}.main` }}>
              {quantity}
            </Box>
            <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
              / alert at {threshold}
            </Box>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={fill}
            color={LEVEL_COLOR[level]}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Stack>
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {price !== null ? formatInr(price) : '—'}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
        {fDate(row.updatedAt)}
      </TableCell>

      <TableCell>
        <Label variant="soft" color={LEVEL_COLOR[level]}>
          {LEVEL_LABEL[level]}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <Tooltip title="Ask the seller to restock" placement="top" arrow>
          {/* A disabled button swallows the tooltip, so it wraps a span. */}
          <span>
            <IconButton color="primary" disabled={alerting || level === 'ok'} onClick={onAlert}>
              <Iconify icon="solar:bell-bing-bold" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Open product" placement="top" arrow>
          <IconButton onClick={onViewRow}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
