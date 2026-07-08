// Mirrors backend `src/modules/sellers/sellers.types.ts` — SafeSellerProfile.

export type SellerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED';
export type KycDocType =
  | 'pan'
  | 'aadhaar'
  | 'passport'
  | 'fssai'
  | 'gst'
  | 'bank_proof'
  | 'other';
export type KycDocStatus = 'pending' | 'approved' | 'rejected';
export type PayoutPreference = 'daily' | 'weekly' | 'on_demand';
export type DisciplinaryActionType = 'warning' | 'suspension' | 'reactivation';

export interface SafeDisciplinaryAction {
  type: DisciplinaryActionType;
  reason: string;
  byUserId: string;
  at: string;
}

export interface SellerAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface KycDocument {
  type: KycDocType;
  s3Key: string;
  status: KycDocStatus;
  uploadedAt: string;
  notes?: string;
}

export interface Storefront {
  banner?: string;
  profilePhoto?: string;
  description?: string;
  practices: string[];
  certifications: string[];
}

export interface SafeSellerProfile {
  id: string;
  userId: string;
  farmName: string;
  address: SellerAddress;
  pincode: string;
  clusterId: string | null;
  categoryIds: string[];
  kycDocuments: KycDocument[];
  bankAccountLast4: string | null;
  hasBankDetails: boolean;
  storefront: Storefront;
  status: SellerStatus;
  reviewedAt: string | null;
  reviewNotes: string | null;
  liveAt: string | null;
  isLive: boolean;
  payoutPreference: PayoutPreference;
  verifiedBadge: boolean;
  /** Admin-only surface — present only when serialised for an admin viewer. */
  disciplinaryActions?: SafeDisciplinaryAction[];
  createdAt: string;
  updatedAt: string;
}

export interface SellersListResponse {
  items: SafeSellerProfile[];
}

export interface SellersListMeta {
  total: number;
  page: number;
  limit: number;
  clusterId?: string | null;
}

export interface SellersListQuery {
  status?: SellerStatus;
  clusterId?: string;
  page: number;
  limit: number;
}

// ─── CA-1: Seller performance ───────────────────────────────────────────────

export type SellerPerformanceSort = 'revenue' | 'orders' | 'rating';

export interface SellerPerformanceRow {
  sellerId: string;
  farmName: string;
  clusterId: string | null;
  orders: number;
  fulfilled: number;
  returned: number;
  avgRating: number | null;
  complaints: number;
  revenueInr: number;
}

export interface SellerPerformanceReport {
  range: { from: string; to: string };
  scope: { clusterId: string | null };
  sort: SellerPerformanceSort;
  rows: SellerPerformanceRow[];
}

export interface SellerPerformanceQuery {
  from: string;
  to: string;
  clusterId?: string;
  sort: SellerPerformanceSort;
}
