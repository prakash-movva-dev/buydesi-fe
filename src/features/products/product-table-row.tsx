import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { fDate, fTime } from '@/utils/format-time';
import { availableStock, displayPrice } from './price';
import { KIND_LABELS, type ProductStatus, type SafeProduct } from './types';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<ProductStatus, 'success' | 'warning' | 'error' | 'default'> = {
  LIVE: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
  SUSPENDED: 'default',
};

const STATUS_LABEL: Record<ProductStatus, string> = {
  LIVE: 'Live',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

type Props = {
  row: SafeProduct;
  categoryName?: string;
  selected: boolean;
  onSelectRow: () => void;
  onViewRow: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
};

export function ProductTableRow({
  row,
  categoryName,
  selected,
  onSelectRow,
  onViewRow,
  onApprove,
  onReject,
  onSuspend,
}: Props) {
  const popover = usePopover();

  const stock = availableStock(row);
  const isLow = stock > 0 && stock <= row.stock.threshold;

  return (
    <>
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
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Link color="inherit" onClick={onViewRow} sx={{ cursor: 'pointer' }} noWrap>
                  {row.name}
                </Link>
                {row.kind !== 'standard' && (
                  <Label variant="soft" color={row.kind === 'organic' ? 'success' : 'warning'}>
                    {KIND_LABELS[row.kind]}
                  </Label>
                )}
              </Stack>
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {row.sellerName ?? row.unit}
              </Box>
            </Stack>
          </Stack>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{categoryName ?? '—'}</TableCell>

        <TableCell align="right">
          <Stack spacing={0.25} alignItems="flex-end">
            <Box component="span">{stock}</Box>
            {isLow && (
              <Box component="span" sx={{ typography: 'caption', color: 'warning.dark' }}>
                low
              </Box>
            )}
            {stock <= 0 && (
              <Box component="span" sx={{ typography: 'caption', color: 'error.main' }}>
                out
              </Box>
            )}
          </Stack>
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {displayPrice(row)}
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.updatedAt)}
            secondary={fTime(row.updatedAt)}
            primaryTypographyProps={{ typography: 'body2', noWrap: true }}
            secondaryTypographyProps={{ mt: 0.5, component: 'span', typography: 'caption' }}
          />
        </TableCell>

        <TableCell>
          <Label variant="soft" color={STATUS_COLOR[row.status]}>
            {STATUS_LABEL[row.status]}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <Tooltip title="Open" placement="top" arrow>
            <IconButton color="default" onClick={onViewRow}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              onViewRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>

          {row.status !== 'LIVE' && (
            <MenuItem
              onClick={() => {
                onApprove();
                popover.onClose();
              }}
              sx={{ color: 'success.main' }}
            >
              <Iconify icon="solar:check-circle-bold" />
              Approve
            </MenuItem>
          )}

          {row.status === 'LIVE' && (
            <MenuItem
              onClick={() => {
                onSuspend();
                popover.onClose();
              }}
              sx={{ color: 'warning.main' }}
            >
              <Iconify icon="solar:pause-circle-bold" />
              Suspend
            </MenuItem>
          )}

          {row.status !== 'REJECTED' && (
            <MenuItem
              onClick={() => {
                onReject();
                popover.onClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <Iconify icon="solar:close-circle-bold" />
              Reject
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>
    </>
  );
}
