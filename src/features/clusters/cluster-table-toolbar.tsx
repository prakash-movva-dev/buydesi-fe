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

export interface ClusterFilters {
  q: string;
  state: string;
}

type Props = {
  filters: ClusterFilters;
  states: string[];
  onFilters: (patch: Partial<ClusterFilters>) => void;
};

export function ClusterTableToolbar({ filters, states, onFilters }: Props) {
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
      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
        <InputLabel htmlFor="cluster-filter-state">State</InputLabel>
        <Select
          value={filters.state}
          onChange={(e) => onFilters({ state: e.target.value })}
          input={<OutlinedInput label="State" />}
          inputProps={{ id: 'cluster-filter-state' }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
        >
          <MenuItem value="">Every state</MenuItem>
          {states.map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a cluster, district or state…"
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
