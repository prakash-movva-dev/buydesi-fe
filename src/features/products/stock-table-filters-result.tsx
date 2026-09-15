import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { StockFilters } from './stock-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: StockFilters;
  /** Resolved name, so the chip doesn't show a raw id. */
  categoryName?: string;
  onFilters: (patch: Partial<StockFilters>) => void;
  onReset: () => void;
  totalResults: number;
  sx?: SxProps<Theme>;
};

export function StockTableFiltersResult({
  filters,
  categoryName,
  onFilters,
  onReset,
  totalResults,
  sx,
}: Props) {
  return (
    <FiltersResult totalResults={totalResults} onReset={onReset} sx={sx}>
      <FiltersBlock label="Seller:" isShow={!!filters.sellerId}>
        <Chip
          {...chipProps}
          label="Selected seller"
          onDelete={() => onFilters({ sellerId: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Category:" isShow={!!filters.category}>
        <Chip
          {...chipProps}
          label={categoryName ?? 'Selected category'}
          onDelete={() => onFilters({ category: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Cluster:" isShow={!!filters.cluster}>
        <Chip
          {...chipProps}
          label="Selected cluster"
          onDelete={() => onFilters({ cluster: '' })}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
