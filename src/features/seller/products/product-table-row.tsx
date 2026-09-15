import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { useBoolean } from '@/hooks/use-boolean';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { ConfirmDialog } from '@/components/custom-dialog';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { fDate, fTime } from '@/utils/format-time';
import { availableStock, displayPrice } from '@/features/products/price';
import { KIND_LABELS, type ProductStatus, type SafeProduct } from '@/features/products/types';

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

const priceLabel = displayPrice;

const stockOf = availableStock;

// ----------------------------------------------------------------------

type Props = {
  row: SafeProduct;
  categoryName?: string;
  selected: boolean;
  deleting?: boolean;
  onSelectRow: () => void;
  onViewRow: () => void;
  onEditRow: () => void;
  onDeleteRow: () => void;
  /** Opens the restock dialog for this row. */
  onAdjustStock: () => void;
};

export function ProductTableRow({
  row,
  categoryName,
  selected,
  deleting,
  onSelectRow,
  onViewRow,
  onEditRow,
  onDeleteRow,
  onAdjustStock,
}: Props) {
  const confirm = useBoolean();

  const popover = usePopover();

  const quantity = stockOf(row);
  const isLow = quantity <= row.stock.threshold;

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack spacing={2} direction="row" alignItems="center">
            <Avatar
              alt={row.name}
              src={row.images[0]}
              variant="rounded"
              sx={{ width: 48, height: 48 }}
            >
              <Iconify icon="solar:gallery-wide-bold" width={20} />
            </Avatar>

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Link color="inherit" onClick={onViewRow} sx={{ cursor: 'pointer' }} noWrap>
                  {row.name}
                </Link>
                {/* Kind is what the listing IS, so it rides with the name. */}
                {row.kind !== 'standard' && (
                  <Label variant="soft" color={row.kind === 'organic' ? 'success' : 'warning'}>
                    {KIND_LABELS[row.kind]}
                  </Label>
                )}
              </Stack>
              <Box component="span" sx={{ color: 'text.disabled' }}>
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

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{categoryName ?? '—'}</TableCell>

        <TableCell align="right">
          <Stack spacing={0.25} alignItems="flex-end">
            <Box component="span">{quantity}</Box>
            {isLow && (
              <Box component="span" sx={{ typography: 'caption', color: 'warning.dark' }}>
                {quantity <= 0 ? 'out of stock' : 'low stock'}
              </Box>
            )}
          </Stack>
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {priceLabel(row)}
        </TableCell>

        <TableCell>
          <Label variant="soft" color={STATUS_COLOR[row.status]}>
            {STATUS_LABEL[row.status]}
          </Label>
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
          <Stack direction="row" alignItems="center">
            <Tooltip title="Edit" placement="top" arrow>
              <IconButton color="default" onClick={onEditRow}>
                <Iconify icon="solar:pen-bold" />
              </IconButton>
            </Tooltip>

            <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Stack>
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

          <MenuItem
            onClick={() => {
              onEditRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          <MenuItem
            onClick={() => {
              onAdjustStock();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:box-bold" />
            Add stock
          </MenuItem>

          <MenuItem
            onClick={() => {
              confirm.onTrue();
              popover.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Delete <strong>{row.name}</strong>? This cannot be undone.
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={() => {
              onDeleteRow();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
