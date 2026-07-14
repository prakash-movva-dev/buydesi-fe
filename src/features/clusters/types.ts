// Mirrors backend `src/modules/clusters/clusters.types.ts`.

export type ClusterStatus = 'active' | 'inactive' | 'pending';
export type TradeTransportMode = 'DELHIVERY' | 'LOCAL';

export interface SafeCluster {
  id: string;
  name: string;
  state: string;
  district: string;
  pinCodes: string[];
  adminId: string | null;
  regionId: string | null;
  activeCategories: string[];
  code: string | null;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  hubAddress: string | null;
  hubPincode: string | null;
  codAllowed: boolean;
  minOrderValueInr: number | null;
  launchDate: string | null;
  status: ClusterStatus;
  zone?: string;
  defaultTradeTransport: TradeTransportMode;
  createdAt: string;
  updatedAt: string;
}

export interface ClusterStats {
  clusterId: string;
  sellerCount: number;
  pinCodeCount: number;
  activeCategoryCount: number;
}

export interface ClusterPerformanceRow {
  clusterId: string;
  clusterName: string;
  state: string;
  sellers: number;
  liveListings: number;
  orders: number;
  revenueInr: number;
  openTickets: number;
  avgDeliveryHours: number;
}

export interface ClusterPerformanceReport {
  range: { from: string; to: string };
  rows: ClusterPerformanceRow[];
}

export interface ClusterPerformanceQuery {
  from: string;
  to: string;
  clusterId?: string;
}

export interface ClustersListQuery {
  state?: string;
  status?: ClusterStatus;
  q?: string;
  page: number;
  limit: number;
}

export interface ClustersListMeta {
  total: number;
  page: number;
  limit: number;
}

export interface CreateClusterInput {
  name: string;
  state: string;
  district: string;
  pinCodes?: string[];
  adminId?: string | null;
  regionId?: string | null;
  activeCategories?: string[];
  code?: string | null;
  description?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  hubAddress?: string | null;
  hubPincode?: string | null;
  codAllowed?: boolean;
  minOrderValueInr?: number | null;
  launchDate?: string | null;
  status?: ClusterStatus;
  zone?: string;
  defaultTradeTransport?: TradeTransportMode;
}

export type UpdateClusterInput = Partial<CreateClusterInput>;
