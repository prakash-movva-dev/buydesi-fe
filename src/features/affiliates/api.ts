import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, fetchEnvelope } from '@/lib/api';

import type {
  Affiliate,
  AffiliateConversion,
  AffiliateCoupon,
  AffiliateDashboard,
  AffiliateLink,
  AffiliatesListQuery,
  CommissionBatchResult,
  ConversionsListQuery,
  CreateAffiliateInput,
  GrantCouponInput,
  ListMeta,
  UpdateAffiliateInput,
} from './types';

export const affiliateKeys = {
  all: ['affiliates'] as const,
  list: (q: AffiliatesListQuery) => ['affiliates', 'list', q] as const,
  detail: (id: string) => ['affiliates', 'detail', id] as const,
  links: (id: string) => ['affiliates', 'links', id] as const,
  coupons: (id: string) => ['affiliates', 'coupons', id] as const,
  conversions: (q: ConversionsListQuery) => ['affiliates', 'conversions', q] as const,
  myDashboard: ['affiliate', 'dashboard'] as const,
  myLinks: ['affiliate', 'links'] as const,
  myCoupons: ['affiliate', 'coupons'] as const,
  myEarnings: (q: Omit<ConversionsListQuery, 'affiliateId'>) =>
    ['affiliate', 'earnings', q] as const,
};

// ─── Admin ────────────────────────────────────────────────────────────────

const fetchList = async (q: AffiliatesListQuery) => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.clusterId) params.set('clusterId', q.clusterId);
  if (q.q) params.set('q', q.q);
  if (q.sort) params.set('sort', q.sort);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<Affiliate[]>(
    `/admin/affiliates?${params.toString()}`,
  );
  return {
    items: data,
    meta: (meta as ListMeta | undefined) ?? { total: data.length, page: q.page, limit: q.limit },
  };
};

export const useAffiliatesList = (q: AffiliatesListQuery) =>
  useQuery({ queryKey: affiliateKeys.list(q), queryFn: () => fetchList(q) });

export const useAffiliate = (id: string | undefined) =>
  useQuery({
    queryKey: affiliateKeys.detail(id ?? ''),
    queryFn: () => api.get<Affiliate>(`/admin/affiliates/${id}`),
    enabled: Boolean(id),
  });

export const useAffiliateLinks = (id: string | undefined) =>
  useQuery({
    queryKey: affiliateKeys.links(id ?? ''),
    queryFn: () => api.get<AffiliateLink[]>(`/admin/affiliates/${id}/links`),
    enabled: Boolean(id),
  });

export const useAffiliateCoupons = (id: string | undefined) =>
  useQuery({
    queryKey: affiliateKeys.coupons(id ?? ''),
    queryFn: () => api.get<AffiliateCoupon[]>(`/admin/affiliates/${id}/coupons`),
    enabled: Boolean(id),
  });

export const useCreateAffiliate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAffiliateInput) =>
      api.post<{ _id: string }>('/admin/affiliates', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: affiliateKeys.all }),
  });
};

export const useUpdateAffiliate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateAffiliateInput) =>
      api.patch<{ _id: string }>(`/admin/affiliates/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: affiliateKeys.all }),
  });
};

export const useGrantCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & GrantCouponInput) =>
      api.post<AffiliateCoupon>(`/admin/affiliates/${id}/coupons`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: affiliateKeys.all }),
  });
};

export const useSetCouponActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ couponId, active }: { couponId: string; active: boolean }) =>
      api.put<AffiliateCoupon>(`/admin/affiliates/coupons/${couponId}/active`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: affiliateKeys.all }),
  });
};

const fetchConversions = async (q: ConversionsListQuery) => {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.affiliateId) params.set('affiliateId', q.affiliateId);
  params.set('page', String(q.page));
  params.set('limit', String(q.limit));
  const { data, meta } = await fetchEnvelope<AffiliateConversion[]>(
    `/admin/affiliates/conversions?${params.toString()}`,
  );
  return {
    items: data,
    meta: (meta as ListMeta | undefined) ?? { total: data.length, page: q.page, limit: q.limit },
  };
};

export const useConversionsList = (q: ConversionsListQuery) =>
  useQuery({ queryKey: affiliateKeys.conversions(q), queryFn: () => fetchConversions(q) });

export const useReverseConversion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversionId, reason }: { conversionId: string; reason: string }) =>
      api.put<{ reversed: true }>(
        `/admin/affiliates/conversions/${conversionId}/reverse`,
        { reason },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: affiliateKeys.all }),
  });
};

export const useRunCommissionBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { asOf?: string } = {}) =>
      api.post<CommissionBatchResult>('/admin/affiliates/run-commission-batch', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: affiliateKeys.all }),
  });
};

// ─── The affiliate's own ──────────────────────────────────────────────────

export const useMyAffiliateDashboard = () =>
  useQuery({
    queryKey: affiliateKeys.myDashboard,
    queryFn: () => api.get<AffiliateDashboard>('/affiliate/dashboard'),
  });

export const useMyLinks = () =>
  useQuery({
    queryKey: affiliateKeys.myLinks,
    queryFn: () => api.get<AffiliateLink[]>('/affiliate/links'),
  });

export const useMyCoupons = () =>
  useQuery({
    queryKey: affiliateKeys.myCoupons,
    queryFn: () => api.get<AffiliateCoupon[]>('/affiliate/coupons'),
  });

export const useMyEarnings = (q: Omit<ConversionsListQuery, 'affiliateId'>) =>
  useQuery({
    queryKey: affiliateKeys.myEarnings(q),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.status) params.set('status', q.status);
      params.set('page', String(q.page));
      params.set('limit', String(q.limit));
      const { data, meta } = await fetchEnvelope<AffiliateConversion[]>(
        `/affiliate/earnings?${params.toString()}`,
      );
      return {
        items: data,
        meta:
          (meta as ListMeta | undefined) ?? { total: data.length, page: q.page, limit: q.limit },
      };
    },
  });

export const useCreateLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      code: string;
      targetType?: string;
      targetId?: string;
      label?: string;
    }) => api.post<AffiliateLink>('/affiliate/links', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate'] }),
  });
};

export const useUpdateLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId, ...body }: { linkId: string; label?: string; active?: boolean }) =>
      api.patch<AffiliateLink>(`/affiliate/links/${linkId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliate'] }),
  });
};

/** Asks before the affiliate hits save, so a taken code is caught while typing. */
export const checkCodeAvailable = (code: string) =>
  api.get<{ code: string; available: boolean }>(
    `/affiliate/code-available?code=${encodeURIComponent(code)}`,
  );
