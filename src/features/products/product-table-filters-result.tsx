import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import { KIND_LABELS } from './types';
import type { AdminProductFilters } from './product-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: AdminProductFilters;
  categoryName?: string;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<AdminProductFilters>) => void;
  onReset: () => void;
};

/** The active filters as removable chips, with the server's result count. */
export function AdminProductTableFiltersResult({
  filters,
  categoryName,
  totalResults,
  onFilters,
  onReset,
  sx,
}: Props) {
  return (
    <FiltersResult totalResults={totalResults} onReset={onReset} sx={sx}>
      <FiltersBlock label="Category:" isShow={!!filters.category}>
        <Chip
          {...chipProps}
          label={categoryName ?? 'Selected category'}
          onDelete={() => onFilters({ category: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Kind:" isShow={!!filters.kind}>
        <Chip
          {...chipProps}
          label={filters.kind ? KIND_LABELS[filters.kind] : ''}
          onDelete={() => onFilters({ kind: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
