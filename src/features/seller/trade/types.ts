export type TradePaymentMode = 'ONLINE' | 'CASH';
export type TradeTransportMode = 'DELHIVERY' | 'LOCAL';
export type TradeOrderStatus =
  | 'PLACED'
  | 'SELLER_CONFIRMED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';
export type TradeCashApproval = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TradeOrder {
  _id: string;
  id?: string;
  listingId: string;
  sellerId: string;
  sellerClusterId: string | null;
  buyerId: string;
  buyerClusterId: string | null;
  productName: string;
  unit: string;
  units: number;
  unitPriceInr: number;
  subtotalInr: number;
  commissionRatePercent: number;
  commissionInr: number;
  deliveryFeeInr: number;
  platformFeeInr: number;
  totalInr: number;
  weightGrams: number;
  paymentMode: TradePaymentMode;
  transportMode: TradeTransportMode;
  status: TradeOrderStatus;
  cashApprovalStatus: TradeCashApproval;
  shipmentId: string | null;
  trackingUrl: string | null;
  cancellation: { reason: string | null; at: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInput {
  name: string;
  description: string;
  categoryId: string;
  productId?: string;
  unit: string;
  weightGramsPerUnit: number;
  unitPriceInr: number;
  totalUnits: number;
  minOrderUnits: number;
  maxOrderUnits?: number;
  acceptedPaymentModes: TradePaymentMode[];
  acceptedTransportModes?: TradeTransportMode[];
}

export interface PlaceTradeOrderInput {
  listingId: string;
  units: number;
  paymentMode: TradePaymentMode;
  transportMode: TradeTransportMode;
}
