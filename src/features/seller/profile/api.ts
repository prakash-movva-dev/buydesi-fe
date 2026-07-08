import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  KycDocType,
  KycDocument,
  PayoutPreference,
  SafeSellerProfile,
  SellerAddress,
} from '@/features/sellers/types';

export const sellerProfileKeys = {
  me: ['seller-profile', 'me'] as const,
};

export const useSellerMe = (enabled = true) =>
  useQuery({
    queryKey: sellerProfileKeys.me,
    queryFn: async () => {
      try {
        return await api.get<SafeSellerProfile>('/sellers/me');
      } catch (err) {
        // 404 just means "no profile yet" — onboarding hasn't been submitted.
        if (err instanceof Error && /not found/i.test(err.message)) return null;
        throw err;
      }
    },
    enabled,
    retry: false,
    staleTime: 30_000,
  });

// ─── KYC upload ────────────────────────────────────────────────────────────

export interface KycUploadUrlInput {
  type: KycDocType;
  contentType: string;
  ext?: string;
}

export interface PresignedUploadUrl {
  url: string;
  /** Headers the URL was signed with — sent verbatim on the upload PUT. */
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  /** Backend returns `s3Key`; `key` kept for backward compatibility. */
  s3Key?: string;
  key?: string;
  expiresAt?: string;
}

export const useKycUploadUrl = () =>
  useMutation({
    mutationFn: (input: KycUploadUrlInput) =>
      api.post<PresignedUploadUrl>('/sellers/kyc-upload-url', input),
  });

export const useStorefrontAssetUploadUrl = () =>
  useMutation({
    mutationFn: (input: { kind: 'banner' | 'profile'; contentType: string; ext?: string }) =>
      api.post<PresignedUploadUrl>('/sellers/storefront-asset-upload-url', input),
  });

// ─── Register / resubmit ───────────────────────────────────────────────────

export type BusinessType =
  | 'individual'
  | 'proprietorship'
  | 'partnership'
  | 'pvt_ltd'
  | 'llp'
  | 'fpo_cooperative'
  | 'other';

export interface SellerBusinessProfile {
  ownsBrand?: boolean;
  expectedMonthlyListings?: '1-10' | '11-50' | '51-200' | '200+';
  averagePriceInr?: number;
  fulfillmentPreference?: 'delhivery_pickup' | 'self_drop';
}

export interface SellerBankDetails {
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
  bankName: string;
  accountType?: 'current' | 'savings';
}

export interface SellerAgreement {
  acceptedPolicies: true;
  authorizedToBind: true;
  dataConsent: true;
  backgroundCheck: true;
  feeTerms: true;
  legalName: string;
  signedAt: string;
}

export interface SellerRegisterInput {
  farmName: string;
  address: SellerAddress;
  pincode: string;
  categoryIds: string[];
  // Only type + s3Key are sent on register; the server stamps status/uploadedAt.
  kycDocuments: Pick<KycDocument, 'type' | 's3Key'>[];
  // ─── 7-step wizard fields ───
  businessType?: BusinessType;
  gstNumber?: string;
  businessProfile?: SellerBusinessProfile;
  bankDetails?: SellerBankDetails;
  displayName?: string;
  storeLanguage?: string;
  supportEmail?: string;
  logo?: string;
  description?: string;
  returnsAddress?: { pincode: string; line: string };
  agreement: SellerAgreement;
}

export const useSellerRegister = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SellerRegisterInput) =>
      api.post<SafeSellerProfile>('/sellers/register', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sellerProfileKeys.me }),
  });
};

// ─── Storefront ────────────────────────────────────────────────────────────

export interface StorefrontUpdateInput {
  farmName?: string;
  banner?: string;
  profilePhoto?: string;
  description?: string;
  practices?: string[];
  certifications?: string[];
  bankDetails?: {
    accountNumber: string;
    ifsc: string;
    accountHolderName: string;
    bankName: string;
  };
}

export const useUpdateStorefront = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: StorefrontUpdateInput }) =>
      api.put<SafeSellerProfile>(`/sellers/${id}/storefront`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: sellerProfileKeys.me }),
  });
};

// ─── Payout preference ─────────────────────────────────────────────────────

export const useSetPayoutPreference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payoutPreference: PayoutPreference) =>
      api.put<SafeSellerProfile>('/sellers/me/payout-preference', { payoutPreference }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sellerProfileKeys.me }),
  });
};

// ─── Analytics ─────────────────────────────────────────────────────────────

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface SellerAnalytics {
  sellerId: string;
  range: { from: string; to: string; granularity: Granularity };
  sales: {
    totalOrders: number;
    totalRevenueInr: number;
    averageOrderValueInr: number;
    timeseries: Array<{ bucket: string; orders: number; revenueInr: number }>;
  };
  productPerformance: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    revenueInr: number;
  }>;
  earnings: {
    grossInr: number;
    commissionInr: number;
    platformFeesInr: number;
    netPaidInr: number;
    pendingInr: number;
  };
  inventory: {
    liveProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalUnitsInStock: number;
  };
  customers: {
    uniqueBuyers: number;
    repeatBuyers: number;
    averageRating: number;
    totalReviews: number;
  };
  orderStatus: {
    PLACED: number;
    PACKED: number;
    DISPATCHED: number;
    DELIVERED: number;
    RETURNED: number;
    CANCELLED: number;
  };
  wallet: {
    balanceInr: number;
    pendingCreditInr: number;
    pendingDebitInr: number;
    totalCreditedInr: number;
    totalDebitedInr: number;
  };
  trade: {
    tradesPlaced: number;
    tradesReceived: number;
    tradeRevenueInr: number;
    tradeSpendInr: number;
    cashCount: number;
    onlineCount: number;
  };
}

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  granularity?: Granularity;
}

export const useSellerAnalytics = (q: AnalyticsQuery) =>
  useQuery({
    queryKey: ['seller', 'analytics', q],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q.from) params.set('from', q.from);
      if (q.to) params.set('to', q.to);
      if (q.granularity) params.set('granularity', q.granularity);
      const qs = params.toString();
      return api.get<SellerAnalytics>(`/sellers/me/analytics${qs ? `?${qs}` : ''}`);
    },
  });
