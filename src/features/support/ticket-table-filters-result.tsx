import type { Theme, SxProps } from '@mui/material/styles';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import { CATEGORY_LABEL, LEVEL_LABEL } from './status-badge';
import type { TicketFilters } from './ticket-table-toolbar';

// ----------------------------------------------------------------------

type Props = {
  filters: TicketFilters;
  assigneeName?: string;
  totalResults: number;
  sx?: SxProps<Theme>;
  onFilters: (patch: Partial<TicketFilters>) => void;
  onReset: () => void;
};

/** The active filters as removable chips, with the server's result count. */
export function TicketTableFiltersResult({
  filters,
  assigneeName,
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
          label={filters.category ? CATEGORY_LABEL[filters.category] : ''}
          onDelete={() => onFilters({ category: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Escalation:" isShow={!!filters.level}>
        <Chip
          {...chipProps}
          label={filters.level ? LEVEL_LABEL[filters.level] : ''}
          onDelete={() => onFilters({ level: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Assigned to:" isShow={!!filters.assignedTo}>
        <Chip
          {...chipProps}
          label={filters.assignedTo === 'none' ? 'Unassigned' : (assigneeName ?? 'Selected')}
          onDelete={() => onFilters({ assignedTo: '' })}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.q}>
        <Chip {...chipProps} label={filters.q} onDelete={() => onFilters({ q: '' })} />
      </FiltersBlock>
    </FiltersResult>
  );
}
