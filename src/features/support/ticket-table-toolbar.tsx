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

import { CATEGORY_LABEL, LEVEL_LABEL } from './status-badge';
import type { SupportCategory, SupportEscalationLevel } from './types';

// ----------------------------------------------------------------------

export interface TicketFilters {
  q: string;
  category: '' | SupportCategory;
  level: '' | SupportEscalationLevel;
  /** '' = anyone, 'none' = unassigned. */
  assignedTo: string;
}

const CATEGORIES = Object.keys(CATEGORY_LABEL) as SupportCategory[];
const LEVELS = Object.keys(LEVEL_LABEL) as SupportEscalationLevel[];

type Props = {
  filters: TicketFilters;
  /** Staff who can own a ticket. */
  assignees: Array<{ id: string; name: string }>;
  onFilters: (patch: Partial<TicketFilters>) => void;
};

/**
 * Search plus category, escalation and assignee filters. Everything narrows
 * the server query, so the search box is debounced — one request per pause in
 * typing rather than one per keystroke.
 */
export function TicketTableToolbar({ filters, assignees, onFilters }: Props) {
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
        <InputLabel htmlFor="ticket-filter-category">Category</InputLabel>
        <Select
          value={filters.category}
          onChange={(e) => onFilters({ category: e.target.value as TicketFilters['category'] })}
          input={<OutlinedInput label="Category" />}
          inputProps={{ id: 'ticket-filter-category' }}
        >
          <MenuItem value="">All categories</MenuItem>
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 160 } }}>
        <InputLabel htmlFor="ticket-filter-level">Escalation</InputLabel>
        <Select
          value={filters.level}
          onChange={(e) => onFilters({ level: e.target.value as TicketFilters['level'] })}
          input={<OutlinedInput label="Escalation" />}
          inputProps={{ id: 'ticket-filter-level' }}
        >
          <MenuItem value="">Any level</MenuItem>
          {LEVELS.map((l) => (
            <MenuItem key={l} value={l}>
              {LEVEL_LABEL[l]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
        <InputLabel htmlFor="ticket-filter-assignee">Assigned to</InputLabel>
        <Select
          value={filters.assignedTo}
          onChange={(e) => onFilters({ assignedTo: e.target.value })}
          input={<OutlinedInput label="Assigned to" />}
          inputProps={{ id: 'ticket-filter-assignee' }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
        >
          <MenuItem value="">Anyone</MenuItem>
          <MenuItem value="none">Unassigned</MenuItem>
          {assignees.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search number or subject…"
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
