// Mirrors backend admin reports.

export interface ReportTotals {
  range: { from: string; to: string };
  orders: { count: number; gmvInr: number; cancelledCount: number };
  payouts: { count: number; paidNetInr: number };
  support: { ticketsOpened: number; ticketsResolved: number };
  scope: { clusterId: string | null };
}
