import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { AffiliateFilters } from './affiliate-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: AffiliateFilters;
  clusterName?: string;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<AffiliateFilters>) => void;
  onReset: () => void;
};

export function AffiliateTableFiltersResult({
  filters,
  clusterName,
  totalResults,
  onFilters,
  onReset,
  sx,
}: Props) {
  return (
    <FiltersResult totalResults={totalResults} onReset={onReset} sx={sx}>
      <FiltersBlock label="Cluster:" isShow={!!filters.cluster}>
        <Chip
          {...chipProps}
          label={clusterName ?? 'Selected'}
          onDelete={() => onFilters({ cluster: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
