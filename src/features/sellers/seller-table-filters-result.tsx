import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { SellerFilters } from './seller-table-toolbar';

// ----------------------------------------------------------------------

const VERIFIED_LABEL: Record<string, string> = {
  yes: 'Verified',
  no: 'Not verified',
};

type Props = {
  filters: SellerFilters;
  clusterName?: string;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<SellerFilters>) => void;
  onReset: () => void;
};

/** The active filters as removable chips, with the server's result count. */
export function SellerTableFiltersResult({
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
          label={clusterName ?? 'Selected cluster'}
          onDelete={() => onFilters({ cluster: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Badge:" isShow={!!filters.verified}>
        <Chip
          {...chipProps}
          label={VERIFIED_LABEL[filters.verified] ?? filters.verified}
          onDelete={() => onFilters({ verified: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
