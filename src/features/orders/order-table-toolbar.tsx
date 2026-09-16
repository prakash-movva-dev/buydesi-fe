import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
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

// ----------------------------------------------------------------------

export interface OrderFilters {
  q: string;
  cluster: string;
}

type Props = {
  filters: OrderFilters;
  clusters: Array<{ id: string; name: string }>;
  showClusterFilter?: boolean;
  onFilters: (patch: Partial<OrderFilters>) => void;
};

export function OrderTableToolbar({
  filters,
  clusters,
  showClusterFilter,
  onFilters,
}: Props) {
  const [search, setSearch] = useState(filters.q);
  const debounced = useDebounce(search, 400);

  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (debounced !== filters.q) onFilters({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: 2.5 }}
    >
      {showClusterFilter && (
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 220 } }}>
          <InputLabel htmlFor="order-filter-cluster">Cluster</InputLabel>
          <Select
            value={filters.cluster}
            onChange={(e) => onFilters({ cluster: e.target.value })}
            input={<OutlinedInput label="Cluster" />}
            inputProps={{ id: 'order-filter-cluster' }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
          >
            <MenuItem value="">Every cluster</MenuItem>
            {clusters.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Box sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search an order number…"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Stack>
  );
}
