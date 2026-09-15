// Mirrors backend `src/modules/delivery/delivery.types.ts`.

export type DeliveryPaymentMode = 'PREPAID' | 'COD';

/** Surface is the cheap ground network; express is air. */
export type DeliveryServiceMode = 'surface' | 'express';

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
  serviceMode: DeliveryServiceMode;
}

export interface DeliveryQuote {
  provider: string;
  amountInr: number;
  currency: 'INR';
  breakdown?: Record<string, number>;
  /** Delhivery's zone for the lane (C2, B, E…) — what actually sets the price. */
  zone?: string;
  /** Billed weight, which is volumetric-adjusted and can exceed the actual. */
  chargedWeightGrams?: number;
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
  /** False when the parcel was not booked through this platform. */
  known?: boolean;
}

/** What the carrier will and will not do at a pincode. */
export interface PincodeServiceability {
  pincode: string;
  serviceable: boolean;
  cod: boolean;
  prepaid: boolean;
  pickup: boolean;
  replacement: boolean;
  district: string | null;
  stateCode: string | null;
  /** Out of delivery area — reachable, but slower and sometimes surcharged. */
  outOfDeliveryArea: boolean;
}

/**
 * What the delivery integration is actually doing. Without it the screens
 * cannot tell a real carrier reply from the mock's stand-in.
 */
export interface DeliveryProviderStatus {
  provider: 'delhivery' | 'mock';
  live: boolean;
  rateEngine: 'delhivery' | 'flat';
  flatRate: { baseInr: number; perKgInr: number };
  /** Credentials still needed before live mode can be switched on. */
  missing: string[];
  blocked: { quotes: boolean; tracking: boolean; shipments: boolean; webhooks: boolean };
}

export interface CreatedShipment {
  shipmentId: string;
  trackingUrl: string | null;
  status: string;
}
