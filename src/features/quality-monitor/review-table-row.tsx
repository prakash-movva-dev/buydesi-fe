import { Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { fDate, fTime } from '@/utils/format-time';
import type { Review } from '@/features/reviews/types';

// ----------------------------------------------------------------------

type Props = {
  row: Review;
  /** Disables both actions while a mutation for this row is in flight. */
  busy?: boolean;
  onRaiseTicket: () => void;
  onToggleHandled: () => void;
};

/**
 * One flagged review. The triage cell is the point of the row: it says whether
 * anyone has dealt with the complaint, and links to the ticket raised for it.
 */
export function ReviewTableRow({ row, busy, onRaiseTicket, onToggleHandled }: Props) {
  const handled = Boolean(row.handledAt);

  return (
    <TableRow hover tabIndex={-1} sx={handled ? { opacity: 0.72 } : undefined}>
      <TableCell>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box component="span" sx={{ typography: 'subtitle2' }}>
              {row.targetName ?? '—'}
            </Box>
            <Label variant="soft" color={row.targetType === 'product' ? 'default' : 'info'}>
              {row.targetType === 'product' ? 'Product' : 'Seller'}
            </Label>
          </Stack>
          <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
            by {row.raterName ?? 'Anonymous'}
          </Box>
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Rating value={row.rating} readOnly size="small" />
      </TableCell>

      <TableCell sx={{ maxWidth: 320 }}>
        {row.text ? (
          <Tooltip title={row.text}>
            <Box
              sx={{
                typography: 'body2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.text}
            </Box>
          </Tooltip>
        ) : (
          <Box component="span" sx={{ color: 'text.disabled', typography: 'body2' }}>
            Rating only
          </Box>
        )}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.orderNumber ? (
          <Box component="span" sx={{ typography: 'caption', fontFamily: 'monospace' }}>
            {row.orderNumber}
          </Box>
        ) : (
          <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>
        )}
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
        {handled ? (
          <Stack spacing={0.5} alignItems="flex-start">
            <Tooltip title={row.handledNotes ?? `Dealt with ${fDate(row.handledAt)}`}>
              <Box component="span">
                <Label variant="soft" color="success">
                  Handled
                </Label>
              </Box>
            </Tooltip>
            {row.handledTicketId && (
              <Link
                component={RouterLink}
                to={`/admin/support/${row.handledTicketId}`}
                variant="caption"
                sx={{ whiteSpace: 'nowrap' }}
              >
                View ticket
              </Link>
            )}
          </Stack>
        ) : (
          <Label variant="soft" color="warning">
            Open
          </Label>
        )}
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <Tooltip title="Raise a quality ticket" placement="top" arrow>
          <span>
            <IconButton color="default" onClick={onRaiseTicket} disabled={busy}>
              <Iconify icon="solar:ticket-bold" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip
          title={handled ? 'Move back to the queue' : 'Mark as dealt with'}
          placement="top"
          arrow
        >
          <span>
            <IconButton
              color={handled ? 'default' : 'success'}
              onClick={onToggleHandled}
              disabled={busy}
            >
              <Iconify icon={handled ? 'solar:undo-left-bold' : 'solar:check-circle-bold'} />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
