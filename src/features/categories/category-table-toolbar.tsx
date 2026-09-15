import { useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '@/components/iconify';
import { useDebounce } from '@/hooks/use-debounce';

import type { CategoryStatus } from './types';

// ----------------------------------------------------------------------

export interface CategoryFilters {
  q: string;
  status: '' | CategoryStatus;
}

type Props = {
  filters: CategoryFilters;
  onFilters: (patch: Partial<CategoryFilters>) => void;
};

/** Search for the taxonomy — status is picked from the tabs above. */
export function CategoryTableToolbar({ filters, onFilters }: Props) {
  const [search, setSearch] = useState(filters.q);
  const debounced = useDebounce(search, 400);

  // Typing shouldn't fire a request per keystroke; the URL follows the pause.
  useEffect(() => {
    if (debounced !== filters.q) onFilters({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // A reset elsewhere (the chips, the Clear button) has to reach the input.
  useEffect(() => {
    if (filters.q !== search) setSearch(filters.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
    >
      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or slug..."
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
