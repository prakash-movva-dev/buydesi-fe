import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { fNumber } from '@/utils/format-number';

import type { SafeCluster } from './types';

// ----------------------------------------------------------------------

export const CLUSTER_STATUS_COLOR: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'default',
};

type Props = {
  row: SafeCluster;
  regionName?: string;
  /** The cluster admin who runs it, resolved from the users list. */
  adminName?: string;
  /** The support admin serving it, if one is assigned. */
  supportName?: string;
  onViewRow: () => void;
};

/**
 * One cluster. The two staffing slots are shown as filled or empty rather than
 * hidden, because an unstaffed cluster is the thing worth spotting from a list.
 */
export function ClusterTableRow({
  row,
  regionName,
  adminName,
  supportName,
  onViewRow,
}: Props) {
  return (
    <TableRow hover tabIndex={-1}>
      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{ width: 44, height: 44, bgcolor: 'background.neutral', color: 'text.secondary' }}
          >
            <Iconify icon="solar:map-point-wave-bold" width={22} />
          </Avatar>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Link
              color="inherit"
              onClick={onViewRow}
              sx={{ cursor: 'pointer', typography: 'subtitle2' }}
              noWrap
            >
              {row.name}
            </Link>
            <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
              {row.district}, {row.state}
              {row.code ? ` · ${row.code}` : ''}
            </Box>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {regionName ?? (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            No region
          </Box>
        )}
      </TableCell>

      <TableCell>
        <SlotCell name={adminName} role="Cluster admin" icon="solar:user-check-rounded-bold" />
      </TableCell>

      <TableCell>
        <SlotCell name={supportName} role="Support admin" icon="solar:headphones-round-bold" />
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {fNumber(row.pinCodes.length)}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Label variant="soft" color={row.codAllowed ? 'success' : 'default'}>
          {row.codAllowed ? 'COD on' : 'COD off'}
        </Label>
      </TableCell>

      <TableCell>
        <Label variant="soft" color={CLUSTER_STATUS_COLOR[row.status] ?? 'default'}>
          {row.status}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ px: 1 }}>
        <Tooltip title="Open" placement="top" arrow>
          <IconButton onClick={onViewRow}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

// ----------------------------------------------------------------------

/** A staffing slot: who holds it, or that nobody does. */
function SlotCell({ name, role, icon }: { name?: string; role: string; icon: string }) {
  if (name) {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
        <Iconify icon={icon} width={16} sx={{ color: 'text.disabled' }} />
        <Box component="span" sx={{ typography: 'body2' }}>
          {name}
        </Box>
      </Stack>
    );
  }
  return (
    <Tooltip title={`No ${role.toLowerCase()} assigned`}>
      <Box component="span">
        <Label variant="soft" color="warning">
          Vacant
        </Label>
      </Box>
    </Tooltip>
  );
}
