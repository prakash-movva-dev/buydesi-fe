import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { PayoutFilters } from './payout-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: PayoutFilters;
  /** Resolved from the seller picker so the chip never shows an id. */
  sellerName?: string;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<PayoutFilters>) => void;
  onReset: () => void;
};

export function PayoutTableFiltersResult({
  filters,
  sellerName,
  totalResults,
  onFilters,
  onReset,
  sx,
}: Props) {
  return (
    <FiltersResult totalResults={totalResults} onReset={onReset} sx={sx}>
      <FiltersBlock label="Status:" isShow={!!filters.status}>
        <Chip {...chipProps} label={filters.status} onDelete={() => onFilters({ status: '' })} />
      </FiltersBlock>

      <FiltersBlock label="Seller:" isShow={!!filters.sellerId}>
        <Chip
          {...chipProps}
          label={sellerName ?? 'Selected'}
          onDelete={() => onFilters({ sellerId: '' })}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
