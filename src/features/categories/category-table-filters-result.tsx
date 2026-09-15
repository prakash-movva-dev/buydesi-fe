import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { CategoryFilters } from './category-table-toolbar';

// ----------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

type Props = {
  filters: CategoryFilters;
  onFilters: (patch: Partial<CategoryFilters>) => void;
  onReset: () => void;
  totalResults: number;
  sx?: SxProps<Theme>;
};

export function CategoryTableFiltersResult({
  filters,
  onFilters,
  onReset,
  totalResults,
  sx,
}: Props) {
  return (
    <FiltersResult totalResults={totalResults} onReset={onReset} sx={sx}>
      <FiltersBlock label="Status:" isShow={!!filters.status}>
        <Chip
          {...chipProps}
          label={STATUS_LABEL[filters.status] ?? filters.status}
          onDelete={() => onFilters({ status: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
