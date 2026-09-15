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
import type { SafeCategory } from '@/features/categories/types';
import { KIND_LABELS, PRODUCT_KINDS, type ProductKind } from './types';

// ----------------------------------------------------------------------

export interface AdminProductFilters {
  q: string;
  category: string;
  kind: '' | ProductKind;
}

type Props = {
  filters: AdminProductFilters;
  categories: SafeCategory[];
  onFilters: (patch: Partial<AdminProductFilters>) => void;
};

/**
 * Search plus category and kind filters. Everything narrows the server query,
 * so the search box is debounced — one request per pause in typing rather
 * than one per keystroke.
 */
export function AdminProductTableToolbar({ filters, categories, onFilters }: Props) {
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
      sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
    >
      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
        <InputLabel htmlFor="admin-product-category-select">Category</InputLabel>
        <Select
          value={filters.category}
          onChange={(event) => onFilters({ category: event.target.value })}
          input={<OutlinedInput label="Category" />}
          inputProps={{ id: 'admin-product-category-select' }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 160 } }}>
        <InputLabel htmlFor="admin-product-kind-select">Kind</InputLabel>
        <Select
          value={filters.kind}
          onChange={(event) =>
            onFilters({ kind: event.target.value as AdminProductFilters['kind'] })
          }
          input={<OutlinedInput label="Kind" />}
          inputProps={{ id: 'admin-product-kind-select' }}
        >
          <MenuItem value="">Any kind</MenuItem>
          {PRODUCT_KINDS.map((k) => (
            <MenuItem key={k} value={k}>
              {KIND_LABELS[k]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products…"
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
