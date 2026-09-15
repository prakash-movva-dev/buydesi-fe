import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { fDate } from '@/utils/format-time';
import type { CommissionRate, CommissionScope } from './types';

// ----------------------------------------------------------------------

export const SCOPE_LABEL: Record<CommissionScope, string> = {
  seller: 'Seller',
  product: 'Product',
  category: 'Category',
};

/** Colour carries the priority: the more specific the rule, the hotter it reads. */
export const SCOPE_COLOR: Record<CommissionScope, 'error' | 'warning' | 'info'> = {
  seller: 'error',
  product: 'warning',
  category: 'info',
};

export const SCOPE_ICON: Record<CommissionScope, string> = {
  seller: 'solar:shop-bold',
  product: 'solar:box-bold',
  category: 'solar:widget-4-bold',
};

/**
 * Whether a rule is actually being applied right now.
 *
 * `active` alone is not the answer: a rule can be flagged active and still sit
 * outside its effective window, in which case the payout pipeline walks past it.
 * Showing "Active" for a rule that charges nobody would be a lie.
 */
export type RateState = 'live' | 'scheduled' | 'expired' | 'off';

export const rateState = (r: CommissionRate, now = Date.now()): RateState => {
  if (!r.active) return 'off';
  if (new Date(r.effectiveFrom).getTime() > now) return 'scheduled';
  if (r.effectiveTo && new Date(r.effectiveTo).getTime() <= now) return 'expired';
  return 'live';
};

const STATE_LABEL: Record<RateState, string> = {
  live: 'In effect',
  scheduled: 'Starts later',
  expired: 'Ended',
  off: 'Switched off',
};

const STATE_COLOR: Record<RateState, 'success' | 'info' | 'default' | 'warning'> = {
  live: 'success',
  scheduled: 'info',
  expired: 'default',
  off: 'default',
};

const STATE_HINT: Record<RateState, string> = {
  live: 'The payout pipeline is charging this rate now.',
  scheduled: 'Nothing is charged at this rate until its start date.',
  expired: 'Its end date has passed, so it no longer applies.',
  off: 'Switched off by hand — it is kept for the record.',
};

type Props = {
  row: CommissionRate;
  canEdit: boolean;
  busy?: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
};

export function CommissionTableRow({ row, canEdit, busy, onEdit, onToggleActive }: Props) {
  const popover = usePopover();
  const state = rateState(row);
  const dimmed = state !== 'live';

  return (
    <>
      <TableRow hover sx={dimmed ? { opacity: 0.72 } : undefined}>
        <TableCell>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                width: 40,
                height: 40,
                color: `${SCOPE_COLOR[row.scope]}.main`,
                bgcolor: 'background.neutral',
              }}
            >
              <Iconify width={20} icon={SCOPE_ICON[row.scope]} />
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ typography: 'subtitle2' }}>{row.targetName}</Box>
              <Label variant="soft" color={SCOPE_COLOR[row.scope]} sx={{ mt: 0.25 }}>
                {SCOPE_LABEL[row.scope]}
              </Label>
            </Box>
          </Stack>
        </TableCell>

        <TableCell align="right">
          <Box
            sx={{
              typography: 'h6',
              color: dimmed ? 'text.disabled' : 'text.primary',
              whiteSpace: 'nowrap',
            }}
          >
            {row.ratePercent}%
          </Box>
        </TableCell>

        <TableCell>
          <Tooltip title={STATE_HINT[state]} placement="top" arrow>
            <Label variant="soft" color={STATE_COLOR[state]}>
              {STATE_LABEL[state]}
            </Label>
          </Tooltip>
        </TableCell>

        <TableCell>
          <Stack sx={{ typography: 'body2' }}>
            <Box>{fDate(row.effectiveFrom)}</Box>
            <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
              {row.effectiveTo ? `until ${fDate(row.effectiveTo)}` : 'no end date'}
            </Box>
          </Stack>
        </TableCell>

        <TableCell
          sx={{
            maxWidth: 260,
            typography: 'body2',
            color: 'text.secondary',
          }}
        >
          {row.notes ? (
            <Tooltip title={row.notes} placement="top-start" arrow>
              <Box
                sx={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.notes}
              </Box>
            </Tooltip>
          ) : (
            <Box component="span" sx={{ color: 'text.disabled' }}>
              —
            </Box>
          )}
        </TableCell>

        <TableCell align="right" sx={{ px: 1 }}>
          {canEdit && (
            <IconButton
              color={popover.open ? 'inherit' : 'default'}
              disabled={busy}
              onClick={popover.onOpen}
            >
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          )}
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
              onEdit();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit rate
          </MenuItem>

          <MenuItem
            onClick={() => {
              onToggleActive();
              popover.onClose();
            }}
            sx={row.active ? { color: 'error.main' } : undefined}
          >
            <Iconify icon={row.active ? 'solar:pause-bold' : 'solar:play-bold'} />
            {row.active ? 'Switch off' : 'Switch back on'}
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
