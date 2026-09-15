import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';

import { UserPicker } from '@/components/pickers/UserPicker';

import { UserRole } from '@/types/api';

import type { PayoutStatus } from './types';

// ----------------------------------------------------------------------

export interface PayoutFilters {
  status: '' | PayoutStatus;
  sellerId: string;
}

type Props = {
  filters: PayoutFilters;
  /**
   * Statuses that actually occur in the data, with their counts. Batches settle
   * immediately, so offering the whole enum would mean four filters that can
   * only ever return nothing.
   */
  statusCounts?: Record<string, number>;
  onFilters: (patch: Partial<PayoutFilters>) => void;
};

export function PayoutTableToolbar({ filters, statusCounts, onFilters }: Props) {
  // Whatever the data has, plus the current selection so it never vanishes.
  const statuses = Array.from(
    new Set([
      ...Object.keys(statusCounts ?? {}).filter((key) => (statusCounts?.[key] ?? 0) > 0),
      ...(filters.status ? [filters.status] : []),
    ]),
  ) as PayoutStatus[];

  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: 2.5 }}
    >
      {statuses.length > 1 && (
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
          <InputLabel htmlFor="payout-filter-status">Status</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) => onFilters({ status: e.target.value as PayoutFilters['status'] })}
            input={<OutlinedInput label="Status" />}
            inputProps={{ id: 'payout-filter-status' }}
          >
            <MenuItem value="">Any status</MenuItem>
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
                {statusCounts?.[status] !== undefined ? ` (${statusCounts[status]})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Box sx={{ width: { xs: 1, md: 320 } }}>
        <UserPicker
          label="Seller"
          role={UserRole.SELLER}
          value={filters.sellerId || null}
          onChange={(id) => onFilters({ sellerId: id ?? '' })}
          placeholder="Everyone"
        />
      </Box>
    </Stack>
  );
}
