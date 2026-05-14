export interface TradeConfig {
  _id?: string;
  id?: string;
  interClusterCommissionPercent: number;
  platformFeeInr: number;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SetTradeConfigInput {
  interClusterCommissionPercent: number;
  platformFeeInr: number;
}

export type TradeListingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'CLOSED';

export interface TradeListing {
  _id: string;
  id?: string;
  sellerId: string;
  sellerClusterId: string | null;
  productId: string | null;
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  weightGramsPerUnit: number;
  unitPriceInr: number;
  minOrderUnits: number;
  maxOrderUnits: number | null;
  availableUnits: number;
  totalUnits: number;
  acceptedPaymentModes: string[];
  acceptedTransportModes: string[];
  status: TradeListingStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradeListingsListQuery {
  status?: TradeListingStatus;
  categoryId?: string;
  clusterId?: string;
  page: number;
  limit: number;
}

export interface TradeListingsListMeta {
  total: number;
  page: number;
  limit: number;
}
