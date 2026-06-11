import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DashboardPeriod = 'today' | 'week' | 'month' | 'all';

export interface DashboardOverview {
  period: DashboardPeriod;
  range: { from: string; to: string };
  sellers: { total: number; pendingApproval: number; approved: number };
  orders: { total: number; placed: number; cancelled: number; revenueInr: number };
  payouts: { pending: number; paid: number };
  support: { open: number; escalated: number };
  escrow: { held: number; released: number };
  scope: { clusterId: string | null };
}

export const dashboardKeys = {
  overview: (clusterId?: string, period?: DashboardPeriod) =>
    ['dashboard', 'overview', clusterId ?? 'self', period ?? 'today'] as const,
};

export const useDashboardOverview = (clusterId?: string, period?: DashboardPeriod) =>
  useQuery({
    queryKey: dashboardKeys.overview(clusterId, period),
    queryFn: () => {
      const params = new URLSearchParams();
      if (clusterId) params.set('clusterId', clusterId);
      if (period) params.set('period', period);
      const qs = params.toString();
      return api.get<DashboardOverview>(`/admin/dashboard${qs ? `?${qs}` : ''}`);
    },
    staleTime: 30_000,
  });
