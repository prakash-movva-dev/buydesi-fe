import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Rating from '@mui/material/Rating';
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
import type { Review, ReviewFlagReason, ReviewStatus } from './types';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<ReviewStatus, 'warning' | 'success' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  hidden: 'default',
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending',
  approved: 'Visible',
  hidden: 'Hidden',
};

const FLAG_LABEL: Record<ReviewFlagReason, string> = {
  low_rating: 'Low rating',
  restricted_term: 'Flagged word',
  reported: 'Reported',
};

const FLAG_ICON: Record<ReviewFlagReason, string> = {
  low_rating: 'solar:star-fall-bold',
  restricted_term: 'solar:text-bold',
  reported: 'solar:danger-triangle-bold',
};

type Props = {
  row: Review;
  selected: boolean;
  busy?: boolean;
  onSelectRow: () => void;
  onApprove: () => void;
  onHide: () => void;
  onDelete: () => void;
  onToggleHandled: () => void;
  onViewTarget: () => void;
};

export function ReviewTableRow({
  row,
  selected,
  busy,
  onSelectRow,
  onApprove,
  onHide,
  onDelete,
  onToggleHandled,
  onViewTarget,
}: Props) {
  const popover = usePopover();
  // The API sends `_id`; `id` is only sometimes present.
  const rowId = row.id ?? row._id;
  const flagged = Boolean(row.flaggedAt);
  const handled = Boolean(row.handledAt);

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={rowId} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell sx={{ minWidth: 150 }}>
          <Stack spacing={0.5}>
            <Rating value={row.rating} readOnly size="small" />
            <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
              {row.targetType === 'product' ? 'On a product' : 'On a seller'}
            </Box>
          </Stack>
        </TableCell>

        {/* The text is the thing being moderated, so it gets the room. */}
        <TableCell sx={{ maxWidth: 420 }}>
          {row.text ? (
            <Box sx={{ typography: 'body2', whiteSpace: 'pre-line' }}>{row.text}</Box>
          ) : (
            <Box component="span" sx={{ color: 'text.disabled', typography: 'body2' }}>
              Rating only, no text
            </Box>
          )}

          {row.reports.length > 0 && (
            <Box sx={{ mt: 1, typography: 'caption', color: 'error.main' }}>
              {row.reports.length} report{row.reports.length === 1 ? '' : 's'}:{' '}
              {row.reports[0].reason}
            </Box>
          )}
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {flagged && row.flagReasons.length === 0 && (
              <Label variant="soft" color="warning">
                Flagged
              </Label>
            )}
            {row.flagReasons.map((reason) => (
              <Tooltip key={reason} title={FLAG_LABEL[reason]} placement="top" arrow>
                <Label
                  variant="soft"
                  color={reason === 'reported' ? 'error' : 'warning'}
                  startIcon={<Iconify icon={FLAG_ICON[reason]} />}
                >
                  {FLAG_LABEL[reason]}
                </Label>
              </Tooltip>
            ))}
            {!flagged && row.flagReasons.length === 0 && (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                —
              </Box>
            )}
          </Stack>
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.createdAt)}
            secondary={fTime(row.createdAt)}
            primaryTypographyProps={{ typography: 'body2', noWrap: true }}
            secondaryTypographyProps={{ mt: 0.5, component: 'span', typography: 'caption' }}
          />
        </TableCell>

        <TableCell>
          <Stack spacing={0.5} alignItems="flex-start">
            <Label variant="soft" color={STATUS_COLOR[row.status]}>
              {STATUS_LABEL[row.status]}
            </Label>
            {handled && (
              <Label variant="soft" color="info">
                Dealt with
              </Label>
            )}
          </Stack>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          {row.status !== 'approved' && (
            <Tooltip title="Show to buyers" placement="top" arrow>
              <span>
                <IconButton color="success" disabled={busy} onClick={onApprove}>
                  <Iconify icon="solar:eye-bold" />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {row.status !== 'hidden' && (
            <Tooltip title="Hide from buyers" placement="top" arrow>
              <span>
                <IconButton color="warning" disabled={busy} onClick={onHide}>
                  <Iconify icon="solar:eye-closed-bold" />
                </IconButton>
              </span>
            </Tooltip>
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
              onToggleHandled();
              popover.onClose();
            }}
          >
            <Iconify icon={handled ? 'solar:undo-left-bold' : 'solar:check-circle-bold'} />
            {handled ? 'Reopen' : 'Mark dealt with'}
          </MenuItem>

          <MenuItem
            onClick={() => {
              onViewTarget();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:box-bold" />
            {row.targetType === 'product' ? 'Open product' : 'Open seller'}
          </MenuItem>

          <MenuItem
            onClick={() => {
              onDelete();
              popover.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete permanently
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
