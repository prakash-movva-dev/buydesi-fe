import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { OrderFilters } from './order-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: OrderFilters;
  clusterName?: string;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<OrderFilters>) => void;
  onReset: () => void;
};

export function OrderTableFiltersResult({
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

      <FiltersBlock label="Order:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
