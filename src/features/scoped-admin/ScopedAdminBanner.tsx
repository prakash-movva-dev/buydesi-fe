import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderTree, Map } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { useCategoriesList } from '@/features/categories/api';
import type { SafeCluster } from '@/features/clusters/types';

/**
 * Top-of-page banner that tells a cluster-scoped or category-scoped admin
 * exactly which scope their pages are filtered to. Renders nothing for super
 * tier admins who see everything.
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
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
        <Map className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Cluster:</span>
        <span className="font-medium">
          {clusterQ.data?.name ?? (user?.clusterId ? '…' : 'Unassigned')}
        </span>
        {clusterQ.data && (
          <>
            <Badge variant="muted">{clusterQ.data.state}</Badge>
            <Badge variant="muted">{clusterQ.data.district}</Badge>
          </>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Lists on this page are auto-filtered to your cluster.
        </span>
      </div>
    );
  }

  if (isCategory) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
        <FolderTree className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Category:</span>
        <span className="font-medium">
          {category?.name ?? (user?.category ? '…' : 'Unassigned')}
        </span>
        {category && (
          <span className="text-xs text-muted-foreground">slug {category.slug}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Lists on this page are auto-filtered to your category branch.
        </span>
      </div>
    );
  }

  return null;
};
