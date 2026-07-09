// Mirrors backend admin reports.

export interface ReportTopProduct {
  productId: string;
  name: string;
  units: number;
  revenueInr: number;
}

export interface ReportTotals {
  range: { from: string; to: string };
  orders: { count: number; gmvInr: number; cancelledCount: number };
  payouts: { count: number; paidNetInr: number };
  support: { ticketsOpened: number; ticketsResolved: number };
  sellers: number;
  listings: number;
  avgDeliveryHours: number | null;
  topProducts: ReportTopProduct[];
  scope: { clusterId: string | null; clusterName: string | null };
}
