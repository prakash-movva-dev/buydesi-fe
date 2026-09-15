import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';
import { KIND_LABELS } from '@/features/products/types';

import type { ProductFilters } from './product-table-toolbar';

// ----------------------------------------------------------------------

const STOCK_LABEL: Record<string, string> = {
  low: 'Low stock',
  out: 'Out of stock',
};

type Props = {
  filters: ProductFilters;
  categoryName?: string;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<ProductFilters>) => void;
  onReset: () => void;
};

/** The active filters as removable chips, with the server's result count. */
export function ProductTableFiltersResult({
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

      <FiltersBlock label="Stock:" isShow={!!filters.stockState}>
        <Chip
          {...chipProps}
          label={STOCK_LABEL[filters.stockState] ?? filters.stockState}
          onDelete={() => onFilters({ stockState: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
