import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { ClusterFilters } from './cluster-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: ClusterFilters;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<ClusterFilters>) => void;
  onReset: () => void;
};

export function ClusterTableFiltersResult({
  filters,
  totalResults,
  onFilters,
  onReset,
  sx,
}: Props) {
  return (
    <FiltersResult totalResults={totalResults} onReset={onReset} sx={sx}>
      <FiltersBlock label="State:" isShow={!!filters.state}>
        <Chip {...chipProps} label={filters.state} onDelete={() => onFilters({ state: '' })} />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
