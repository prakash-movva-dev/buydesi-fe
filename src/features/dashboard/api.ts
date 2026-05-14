import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardOverview {
  sellers: { total: number; pendingApproval: number; approved: number };
  orders: { total: number; placedToday: number; cancelledToday: number };
  payouts: { pending: number; paid: number };
  support: { open: number; escalated: number };
  escrow: { held: number; releasedToday: number };
  scope: { clusterId: string | null };
}

export const dashboardKeys = {
  overview: (clusterId?: string) => ['dashboard', 'overview', clusterId ?? 'self'] as const,
};

export const useDashboardOverview = (clusterId?: string) =>
  useQuery({
    queryKey: dashboardKeys.overview(clusterId),
    queryFn: () => {
      const qs = clusterId ? `?clusterId=${clusterId}` : '';
      return api.get<DashboardOverview>(`/admin/dashboard${qs}`);
    },
    staleTime: 30_000,
  });
