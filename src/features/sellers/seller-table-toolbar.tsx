import { useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '@/components/iconify';
import { useDebounce } from '@/hooks/use-debounce';
import type { SafeCluster } from '@/features/clusters/types';

// ----------------------------------------------------------------------

export interface SellerFilters {
  q: string;
  cluster: string;
  /** '' = any, 'yes' / 'no' = the verified badge. */
  verified: '' | 'yes' | 'no';
}

type Props = {
  filters: SellerFilters;
  clusters: SafeCluster[];
  /** Hidden for cluster-scoped admins, who only ever see their own. */
  showClusterFilter?: boolean;
  onFilters: (patch: Partial<SellerFilters>) => void;
};

/**
 * Search plus cluster and badge filters. Everything here narrows the server
 * query, so the search box is debounced — one request per pause in typing
 * rather than one per keystroke.
 */
export function SellerTableToolbar({
  filters,
  clusters,
  showClusterFilter = true,
  onFilters,
}: Props) {
  const [search, setSearch] = useState(filters.q);

  const debounced = useDebounce(search, 400);

  // Keep the box in step when the query changes elsewhere (a cleared chip, the
  // back button) without fighting the user mid-word.
  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (debounced !== filters.q) onFilters({ q: debounced });
    // Only the debounced value should trigger a query change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
    >
      {showClusterFilter && (
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
          <InputLabel htmlFor="seller-filter-cluster-select">Cluster</InputLabel>
          <Select
            value={filters.cluster}
            onChange={(event) => onFilters({ cluster: event.target.value })}
            input={<OutlinedInput label="Cluster" />}
            inputProps={{ id: 'seller-filter-cluster-select' }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
          >
            <MenuItem value="">All clusters</MenuItem>
            {clusters.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 170 } }}>
        <InputLabel htmlFor="seller-filter-verified-select">Badge</InputLabel>
        <Select
          value={filters.verified}
          onChange={(event) =>
            onFilters({ verified: event.target.value as SellerFilters['verified'] })
          }
          input={<OutlinedInput label="Badge" />}
          inputProps={{ id: 'seller-filter-verified-select' }}
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="yes">Verified</MenuItem>
          <MenuItem value="no">Not verified</MenuItem>
        </Select>
      </FormControl>

      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, code or pincode…"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>
    </Stack>
  );
}
