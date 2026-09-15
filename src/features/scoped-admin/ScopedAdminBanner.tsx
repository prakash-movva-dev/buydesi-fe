import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { useCategoriesList } from '@/features/categories/api';
import type { SafeCluster } from '@/features/clusters/types';

// ----------------------------------------------------------------------

type BannerProps = {
  icon: string;
  scopeLabel: string;
  name: string;
  chips?: string[];
  note: string;
};

const Banner = ({ icon, scopeLabel, name, chips, note }: BannerProps) => (
  <Alert
    severity="info"
    variant="outlined"
    icon={<Iconify icon={icon} width={22} />}
    sx={{ alignItems: 'center' }}
  >
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{ width: 1 }}
    >
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {scopeLabel}
      </Box>
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {name}
      </Box>

      {chips?.map((chip) => (
        <Label key={chip} variant="soft">
          {chip}
        </Label>
      ))}

      <Box
        component="span"
        sx={{ typography: 'caption', color: 'text.disabled', ml: { sm: 'auto' } }}
      >
        {note}
      </Box>
    </Stack>
  </Alert>
);

/**
 * Tells a cluster- or category-scoped admin exactly which scope their pages
 * are filtered to, so a short list never looks like missing data. Renders
 * nothing for super-tier admins, who see everything.
 */
export const ScopedAdminBanner = () => {
  const { user } = useAuth();
  const isRegional = user?.role === UserRole.CLUSTER_ADMIN;
  const isCategory = user?.role === UserRole.CATEGORY_ADMIN;

  const clusterQ = useQuery({
    queryKey: ['cluster', user?.clusterId ?? 'none'],
    queryFn: () => api.get<SafeCluster>(`/clusters/${user!.clusterId}`),
    enabled: isRegional && Boolean(user?.clusterId),
  });

  const categoriesQ = useCategoriesList();
  const category = useMemo(
    () => (categoriesQ.data ?? []).find((c) => c.id === user?.category),
    [categoriesQ.data, user?.category],
  );

  if (isRegional) {
    return (
      <Banner
        icon="solar:map-point-bold"
        scopeLabel="Cluster:"
        name={clusterQ.data?.name ?? (user?.clusterId ? '…' : 'Unassigned')}
        chips={clusterQ.data ? [clusterQ.data.state, clusterQ.data.district] : undefined}
        note="Lists on this page are filtered to your cluster."
      />
    );
  }

  if (isCategory) {
    return (
      <Banner
        icon="solar:folder-with-files-bold"
        scopeLabel="Category:"
        name={category?.name ?? (user?.category ? '…' : 'Unassigned')}
        chips={category ? [category.slug] : undefined}
        note="Lists on this page are filtered to your category branch."
      />
    );
  }

  return null;
};
