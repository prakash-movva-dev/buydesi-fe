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
  activeCategories: string[];
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
  activeCategories?: string[];
  status?: ClusterStatus;
  zone?: string;
  defaultTradeTransport?: TradeTransportMode;
}

export type UpdateClusterInput = Partial<CreateClusterInput>;
