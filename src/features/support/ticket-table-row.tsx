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
import {
  CATEGORY_ICON,
  CATEGORY_LABEL,
  LEVEL_COLOR,
  LEVEL_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from './status-badge';
import type { SupportTicket } from './types';

// ----------------------------------------------------------------------

type Props = {
  row: SupportTicket;
  /** Resolved from the users list; falls back to "Unassigned". */
  assigneeName?: string;
  onViewRow: () => void;
};

export function TicketTableRow({ row, assigneeName, onViewRow }: Props) {
  const open = row.status !== 'RESOLVED' && row.status !== 'CLOSED';

  // A ticket past its resolution deadline and still open is the one that needs
  // picking up first, so it is called out rather than left to the date column.
  const overdue = open && new Date(row.sla.resolutionDueAt).getTime() < Date.now();

  return (
    <TableRow hover tabIndex={-1}>
      <TableCell>
        <Stack spacing={2} direction="row" alignItems="center">
          <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'background.neutral' }}>
            <Iconify
              icon={CATEGORY_ICON[row.category] ?? 'solar:chat-round-dots-bold'}
              width={22}
              sx={{ color: 'text.secondary' }}
            />
          </Avatar>

          <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
            <Link color="inherit" onClick={onViewRow} sx={{ cursor: 'pointer' }} noWrap>
              {row.subject}
            </Link>
            <Box
              component="span"
              sx={{ color: 'text.disabled', typography: 'caption', fontFamily: 'monospace' }}
            >
              {row.ticketNumber}
            </Box>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {CATEGORY_LABEL[row.category] ?? row.category}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {assigneeName ?? (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            Unassigned
          </Box>
        )}
      </TableCell>

      <TableCell>
        <Label variant="soft" color={LEVEL_COLOR[row.escalationLevel]}>
          {LEVEL_LABEL[row.escalationLevel]}
        </Label>
      </TableCell>

      <TableCell>
        <ListItemText
          primary={fDate(row.sla.resolutionDueAt)}
          secondary={overdue ? 'Overdue' : fTime(row.sla.resolutionDueAt)}
          primaryTypographyProps={{ typography: 'body2', noWrap: true }}
          secondaryTypographyProps={{
            mt: 0.5,
            component: 'span',
            typography: 'caption',
            sx: overdue ? { color: 'error.main', fontWeight: 'fontWeightBold' } : undefined,
          }}
        />
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
        <Label variant="soft" color={STATUS_COLOR[row.status]}>
          {STATUS_LABEL[row.status]}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <Tooltip title="Open ticket" placement="top" arrow>
          <IconButton color="default" onClick={onViewRow}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
