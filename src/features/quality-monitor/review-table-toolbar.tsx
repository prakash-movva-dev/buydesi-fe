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

import type { ReviewTargetType } from '@/features/reviews/types';

// ----------------------------------------------------------------------

export interface ReviewFilters {
  q: string;
  /** '' = both products and sellers. */
  targetType: '' | ReviewTargetType;
  /**
   * 'open' is the default — the page exists to drain the queue, so anything
   * already dealt with is out of the way until asked for.
   */
  triage: 'any' | 'open' | 'handled';
}

export const TRIAGE_LABEL: Record<ReviewFilters['triage'], string> = {
  any: 'Open and handled',
  open: 'Still open',
  handled: 'Dealt with',
};

export const TARGET_LABEL: Record<ReviewTargetType, string> = {
  product: 'Products',
  seller: 'Sellers',
};

type Props = {
  filters: ReviewFilters;
  onFilters: (patch: Partial<ReviewFilters>) => void;
};

/**
 * Triage state, what the review is about, and a search over the review text.
 * Everything narrows the server query, so the search box is debounced — one
 * request per pause in typing rather than one per keystroke.
 */
export function ReviewTableToolbar({ filters, onFilters }: Props) {
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
      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 180 } }}>
        <InputLabel htmlFor="review-filter-triage">Triage</InputLabel>
        <Select
          value={filters.triage}
          onChange={(e) => onFilters({ triage: e.target.value as ReviewFilters['triage'] })}
          input={<OutlinedInput label="Triage" />}
          inputProps={{ id: 'review-filter-triage' }}
        >
          <MenuItem value="any">{TRIAGE_LABEL.any}</MenuItem>
          <MenuItem value="open">{TRIAGE_LABEL.open}</MenuItem>
          <MenuItem value="handled">{TRIAGE_LABEL.handled}</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 180 } }}>
        <InputLabel htmlFor="review-filter-target">Reviews of</InputLabel>
        <Select
          value={filters.targetType}
          onChange={(e) =>
            onFilters({ targetType: e.target.value as ReviewFilters['targetType'] })
          }
          input={<OutlinedInput label="Reviews of" />}
          inputProps={{ id: 'review-filter-target' }}
        >
          <MenuItem value="">Products and sellers</MenuItem>
          <MenuItem value="product">{TARGET_LABEL.product}</MenuItem>
          <MenuItem value="seller">{TARGET_LABEL.seller}</MenuItem>
        </Select>
      </FormControl>

      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search what the buyer wrote…"
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
