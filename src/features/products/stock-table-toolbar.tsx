import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { UserRole } from '@/types/api';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { UserPicker } from '@/components/pickers/UserPicker';

// ----------------------------------------------------------------------

export interface StockFilters {
  category: string;
  cluster: string;
  sellerId: string;
}

type Props = {
  filters: StockFilters;
  /** Cluster admins are already pinned to theirs, so the picker is hidden. */
  canScopeCluster: boolean;
  onFilters: (patch: Partial<StockFilters>) => void;
};

/**
 * Who and what to look at: a seller, a category, a cluster. All three narrow
 * the query server-side, and the tabs above narrow it again by stock level.
 */
export function StockTableToolbar({ filters, canScopeCluster, onFilters }: Props) {
  return (
    <Stack
      spacing={2}
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{ p: 2.5 }}
    >
      <Box sx={{ width: { xs: 1, md: 260 } }}>
        <UserPicker
          role={UserRole.SELLER}
          label="Seller"
          value={filters.sellerId || null}
          onChange={(id) => onFilters({ sellerId: id ?? '' })}
          placeholder="Any seller"
        />
      </Box>

      <Box sx={{ width: { xs: 1, md: 240 } }}>
        <CategoryPicker
          label="Category"
          value={filters.category || null}
          onChange={(id) => onFilters({ category: id ?? '' })}
          placeholder="Any category"
        />
      </Box>

      {canScopeCluster && (
        <Box sx={{ width: { xs: 1, md: 240 } }}>
          <ClusterPicker
            label="Cluster"
            value={filters.cluster || null}
            onChange={(id) => onFilters({ cluster: id ?? '' })}
            placeholder="Any cluster"
          />
        </Box>
      )}
    </Stack>
  );
}
