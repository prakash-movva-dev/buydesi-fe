import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import { TARGET_LABEL, TRIAGE_LABEL, type ReviewFilters } from './review-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: ReviewFilters;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<ReviewFilters>) => void;
  onReset: () => void;
};

/** The active filters as removable chips, with the server's result count. */
export function ReviewTableFiltersResult({
  filters,
  totalResults,
  onFilters,
  onReset,
  sx,
}: Props) {
  return (
    <FiltersResult totalResults={totalResults} onReset={onReset} sx={sx}>
      {/* 'open' is the default queue, so it is not shown as a filter to clear. */}
      <FiltersBlock label="Triage:" isShow={filters.triage !== 'open'}>
        <Chip
          {...chipProps}
          label={TRIAGE_LABEL[filters.triage]}
          onDelete={() => onFilters({ triage: 'open' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Reviews of:" isShow={!!filters.targetType}>
        <Chip
          {...chipProps}
          label={filters.targetType ? TARGET_LABEL[filters.targetType] : ''}
          onDelete={() => onFilters({ targetType: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
