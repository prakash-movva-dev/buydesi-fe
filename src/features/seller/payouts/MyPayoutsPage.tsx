import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play } from 'lucide-react';
import Stack from '@mui/material/Stack';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useSellerMe, useSetPayoutPreference } from '@/features/seller/profile/api';
import { formatDateTime, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useMyPayouts, useRequestOnDemandPayout } from './api';
import type { PayoutSchedule, PayoutStatus, PayoutsListQuery } from '@/features/payouts/types';

const STATUS_OPTIONS: Array<{ value: '' | PayoutStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SCHEDULE_OPTIONS: Array<{ value: '' | PayoutSchedule; label: string }> = [
  { value: '', label: 'Any schedule' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'on_demand', label: 'On demand' },
];

const statusVariant: Record<PayoutStatus, 'warning' | 'info' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  FAILED: 'destructive',
  CANCELLED: 'muted',
};

const PAGE_SIZE = 20;

export const MyPayoutsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as PayoutStatus | null) ?? '';
  const schedule = (searchParams.get('schedule') as PayoutSchedule | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<PayoutsListQuery>(
    () => ({ status: status || undefined, schedule: schedule || undefined, page, limit: PAGE_SIZE }),
    [status, schedule, page],
  );

  const { data, isLoading } = useMyPayouts(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My payouts"
        description="Funds released to your wallet after each order's return window closes, batched per your preference."
      />

      <PayoutPreferenceCard />

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-44"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={schedule}
          onChange={(e) => setParam({ schedule: e.target.value })}
          className="w-44"
        >
          {SCHEDULE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Stack>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-px" />
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((p) => {
                const isExp = expanded[p.id];
                return (
                  <Fragment key={p.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                    >
                      <TableCell>
                        {isExp ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{p.schedule.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatInr(p.totalGrossInr)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        − {formatInr(p.totalCommissionInr)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatInr(p.netInr)}</TableCell>
                      <TableCell className="text-right">{p.orderCount}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(p.createdAt)}</TableCell>
                      <TableCell className="text-xs">
                        {p.paidAt ? formatDateTime(p.paidAt) : '—'}
                      </TableCell>
                    </TableRow>
                    {isExp && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-secondary/30">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">Line items</CardTitle>
                              <CardDescription>
                                {p.lineItems.length} order item(s)
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Rate %</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Net</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {p.lineItems.map((li, i) => (
                                    <TableRow key={`${li.orderId}-${i}`}>
                                      <TableCell className="font-medium">{li.productName}</TableCell>
                                      <TableCell className="text-right">{formatInr(li.grossInr)}</TableCell>
                                      <TableCell className="text-right">{li.commissionRatePercent}%</TableCell>
                                      <TableCell>
                                        <Badge variant="muted">{li.commissionSource}</Badge>
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatInr(li.netInr)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    No payouts yet — they'll appear after your first order's return window closes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data?.items.length ?? 0} of {total} · page {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.max(1, page - 1)) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.min(pageCount, page + 1)) })}
                disabled={page >= pageCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Stack>
  );
};

const PayoutPreferenceCard = () => {
  const { data: me } = useSellerMe();
  const setPref = useSetPayoutPreference();
  const request = useRequestOnDemandPayout();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onRequest = async () => {
    setError(null);
    setSuccess(null);
    try {
      await request.mutateAsync();
      setSuccess('On-demand payout queued. Tracking it under Pending below.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Payout preference</CardTitle>
        <CardDescription>
          Daily and weekly batches run automatically. On-demand puts the next eligible orders
          into a manual queue you trigger here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <Select
          value={me?.payoutPreference ?? 'daily'}
          onChange={(e) =>
            setPref.mutate(e.target.value as 'daily' | 'weekly' | 'on_demand')
          }
          disabled={setPref.isPending}
          className="w-44"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="on_demand">On demand</option>
        </Select>
        {me?.payoutPreference === 'on_demand' && (
          <Button onClick={onRequest} disabled={request.isPending}>
            <Play className="h-4 w-4" />
            {request.isPending ? 'Requesting…' : 'Request payout now'}
          </Button>
        )}
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        {success && <p className="w-full text-sm text-emerald-700">{success}</p>}
      </CardContent>
    </Card>
  );
};
