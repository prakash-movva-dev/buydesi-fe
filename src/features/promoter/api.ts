import { useQuery } from '@tanstack/react-query';
import { api, fetchEnvelope } from '@/lib/api';
import type { PromoterDashboard } from '@/features/promoters/types';

export const promoterMeKeys = {
  dashboard: ['promoter', 'me-dashboard'] as const,
  usage: (page: number, limit: number) => ['promoter', 'me-usage', page, limit] as const,
};

export const useMyPromoterDashboard = () =>
  useQuery({
    queryKey: promoterMeKeys.dashboard,
    queryFn: () => api.get<PromoterDashboard>('/promoter/dashboard'),
    staleTime: 30_000,
  });

export interface PromoterUsageRow {
  id: string;
  buyerId: string;
  orderId: string | null;
  orderNumber: string | null;
  orderTotalInr: number | null;
  discountInr: number | null;
  usedAt: string;
}

export const useMyPromoterUsage = (page = 1, limit = 20) =>
  useQuery({
    queryKey: promoterMeKeys.usage(page, limit),
    queryFn: async () => {
      const { data, meta } = await fetchEnvelope<PromoterUsageRow[]>(
        `/promoter/usage?page=${page}&limit=${limit}`,
      );
      return {
        items: data,
        meta:
          (meta as { total: number; page: number; limit: number } | undefined) ?? {
            total: data.length,
            page,
            limit,
          },
      };
    },
  });
