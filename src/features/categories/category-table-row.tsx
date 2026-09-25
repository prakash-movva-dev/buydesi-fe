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

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { fDate } from '@/utils/format-time';
import type { SafeCategory } from './types';

// ----------------------------------------------------------------------

type Props = {
  row: SafeCategory;
  selected: boolean;
  /** Reordering only makes sense in display order — hidden otherwise. */
  canReorder: boolean;
  /** False at the very top / bottom of the whole taxonomy. */
  canMoveUp: boolean;
  canMoveDown: boolean;
  reordering?: boolean;
  onSelectRow: () => void;
  onEditRow: () => void;
  onViewProducts: () => void;
  onMove: (direction: -1 | 1) => void;
};

export function CategoryTableRow({
  row,
  selected,
  canReorder,
  canMoveUp,
  canMoveDown,
  reordering,
  onSelectRow,
  onEditRow,
  onViewProducts,
  onMove,
}: Props) {
  const popover = usePopover();

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack spacing={2} direction="row" alignItems="center">
            <Avatar alt={row.name} src={row.imageUrl ?? undefined} variant="rounded">
              <Iconify icon="solar:folder-with-files-bold" width={20} />
            </Avatar>

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Link color="inherit" onClick={onEditRow} sx={{ cursor: 'pointer' }} noWrap>
                {row.name}
              </Link>
              <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
                {row.slug}
              </Box>
            </Stack>
          </Stack>
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {row.defaultCommissionRate}%
        </TableCell>

        <TableCell>
          {row.adminId ? (
            // Naming them is the point: "Assigned" looks identical before and
            // after a reassignment, which is what made the change look lost.
            <Label variant="soft" color="info">
              {row.adminName ?? 'Assigned'}
            </Label>
          ) : (
            <Box component="span" sx={{ color: 'text.disabled' }}>
              —
            </Box>
          )}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
          {fDate(row.createdAt)}
        </TableCell>

        <TableCell>
          <Label variant="soft" color={row.status === 'active' ? 'success' : 'default'}>
            {row.status === 'active' ? 'Active' : 'Inactive'}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          {canReorder && (
            <>
              <Tooltip title="Move up" placement="top" arrow>
                {/* A disabled button swallows the tooltip, so it wraps a span. */}
                <span>
                  <IconButton
                    size="small"
                    disabled={!canMoveUp || reordering}
                    onClick={() => onMove(-1)}
                  >
                    <Iconify icon="eva:arrow-ios-upward-fill" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Move down" placement="top" arrow>
                <span>
                  <IconButton
                    size="small"
                    disabled={!canMoveDown || reordering}
                    onClick={() => onMove(1)}
                  >
                    <Iconify icon="eva:arrow-ios-downward-fill" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}

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
              onEditRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          <MenuItem
            onClick={() => {
              onViewProducts();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:box-bold" />
            View products
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
