// Mirrors backend `src/modules/delivery/delivery.types.ts`.

export type DeliveryPaymentMode = 'PREPAID' | 'COD';

export type ShipmentStatus =
  | 'CREATED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RETURNED'
  | 'FAILED';

export interface DeliveryQuoteInput {
  pickupPincode: string;
  dropPincode: string;
  weightGrams: number;
  paymentMode: DeliveryPaymentMode;
  declaredValueInr: number;
}

export interface DeliveryQuote {
  provider: string;
  amountInr: number;
  currency: 'INR';
  breakdown?: Record<string, number>;
}

export interface TrackingEvent {
  status: ShipmentStatus;
  at: string;
  remarks?: string;
}

export interface TrackingResult {
  shipmentId: string;
  awbNumber: string | null;
  status: ShipmentStatus;
  trackingUrl: string | null;
  events: TrackingEvent[];
  rawStatus?: string;
}
