import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { tokenStore } from '@/lib/token-store';
import type { ReportTotals } from './types';

interface ReportRange {
  from: string;
  to: string;
  clusterId?: string;
}

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://buydesi-alb-1497579380.ap-south-1.elb.amazonaws.com/api/v1').replace(
  /\/+$/,
  '',
);

const buildParams = (r: ReportRange & { format?: 'json' | 'csv' }): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('from', r.from);
  params.set('to', r.to);
  if (r.clusterId) params.set('clusterId', r.clusterId);
  if (r.format) params.set('format', r.format);
  return params;
};

export const useRunReport = () =>
  useMutation({
    mutationFn: (range: ReportRange) =>
      api.get<ReportTotals>(`/admin/reports?${buildParams({ ...range, format: 'json' }).toString()}`),
  });

/**
 * Downloads the CSV via a direct fetch (the api client unwraps JSON envelopes,
 * which would corrupt a CSV body). Sends the bearer token manually.
 */
export const downloadReportCsv = async (range: ReportRange): Promise<void> => {
  const res = await fetch(
    `${BASE}/admin/reports?${buildParams({ ...range, format: 'csv' }).toString()}`,
    {
      headers: {
        Authorization: `Bearer ${tokenStore.access ?? ''}`,
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Report download failed (${res.status}): ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buy-desi-report-${range.from.slice(0, 10)}_${range.to.slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
