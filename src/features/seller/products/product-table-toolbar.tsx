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
import {
  KIND_LABELS,
  PRODUCT_KINDS,
  type ProductKind,
  type StockState,
} from '@/features/products/types';

// ----------------------------------------------------------------------

export interface ProductFilters {
  q: string;
  category: string;
  /** Standard / organic / premium — three different goods, browsed separately. */
  kind: '' | ProductKind;
  stockState: '' | StockState;
}

type Props = {
  filters: ProductFilters;
  categories: SafeCategory[];
  onFilters: (patch: Partial<ProductFilters>) => void;
};

/**
 * Search + category + stock filters for the catalogue. Everything here narrows
 * the server query, so the search box is debounced — one request per pause in
 * typing rather than one per keystroke.
 */
export function ProductTableToolbar({ filters, categories, onFilters }: Props) {
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
      sx={{ p: 2.5, pr: { xs: 2.5, md: 2.5 } }}
    >
      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
        <InputLabel htmlFor="product-filter-category-select">Category</InputLabel>
        <Select
          value={filters.category}
          onChange={(event) => onFilters({ category: event.target.value })}
          input={<OutlinedInput label="Category" />}
          inputProps={{ id: 'product-filter-category-select' }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 160 } }}>
        <InputLabel htmlFor="product-filter-kind-select">Kind</InputLabel>
        <Select
          value={filters.kind}
          onChange={(event) => onFilters({ kind: event.target.value as ProductFilters['kind'] })}
          input={<OutlinedInput label="Kind" />}
          inputProps={{ id: 'product-filter-kind-select' }}
        >
          <MenuItem value="">Any kind</MenuItem>
          {PRODUCT_KINDS.map((k) => (
            <MenuItem key={k} value={k}>
              {KIND_LABELS[k]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 180 } }}>
        <InputLabel htmlFor="product-filter-stock-select">Stock</InputLabel>
        <Select
          value={filters.stockState}
          onChange={(event) =>
            onFilters({ stockState: event.target.value as ProductFilters['stockState'] })
          }
          input={<OutlinedInput label="Stock" />}
          inputProps={{ id: 'product-filter-stock-select' }}
        >
          <MenuItem value="">Any stock</MenuItem>
          <MenuItem value="low">Low stock</MenuItem>
          <MenuItem value="out">Out of stock</MenuItem>
        </Select>
      </FormControl>

      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products..."
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
