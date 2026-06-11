// Mirrors backend `src/modules/regions/regions.types.ts`.

import type { ClusterPerformanceRow } from '@/features/clusters/types';

export interface SafeRegion {
  id: string;
  name: string;
  state?: string;
  clusterIds: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegionInput {
  name: string;
  state?: string;
  clusterIds: string[];
}

export type UpdateRegionInput = Partial<CreateRegionInput>;

export interface RegionPerformanceTotals {
  sellers: number;
  liveListings: number;
  orders: number;
  revenueInr: number;
  openTickets: number;
}

export interface RegionPerformanceReport {
  region: SafeRegion;
  range: { from: string; to: string };
  rows: ClusterPerformanceRow[];
  totals: RegionPerformanceTotals;
}

export interface RegionPerformanceRange {
  from: string;
  to: string;
}
