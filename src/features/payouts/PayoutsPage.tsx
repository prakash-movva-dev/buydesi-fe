import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
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
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import { usePayoutsList, useRunPayoutBatch } from './api';
import type {
  PayoutSchedule,
  PayoutStatus,
  PayoutsListQuery,
} from './types';

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

const PAGE_SIZE = 25;

export const PayoutsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as PayoutStatus | null) ?? '';
  const schedule = (searchParams.get('schedule') as PayoutSchedule | null) ?? '';
  const sellerId = searchParams.get('sellerId') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<PayoutsListQuery>(
    () => ({
      status: status || undefined,
      schedule: schedule || undefined,
      sellerId: sellerId || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, schedule, sellerId, page],
  );

  const { data, isLoading, isError, error } = usePayoutsList(query);
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
  const [batchOpen, setBatchOpen] = useState(false);
  const isSuper = user?.role === UserRole.SUPER_ADMIN;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Payouts"
        description="Seller payout batches. Daily and weekly batches run automatically (configured via env cron). Trigger an off-cycle batch when needed."
        action={
          isSuper ? (
            <Button onClick={() => setBatchOpen(true)}>
              <Play className="h-4 w-4" />
              Run batch
            </Button>
          ) : undefined
        }
      />

      <ScopedAdminBanner />

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
        <Box sx={{ width: 288 }}>
          <UserPicker
            role={UserRole.SELLER}
            value={sellerId || null}
            onChange={(id) => setParam({ sellerId: id ?? '' })}
            placeholder="Filter by seller…"
          />
        </Box>
      </Stack>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load payouts'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-px" />
                <TableHead>Seller</TableHead>
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
                      <TableCell>
                        <div className="font-medium">{p.sellerName ?? '—'}</div>
                        {(p.sellerMobile || p.sellerEmail) && (
                          <div className="text-xs text-muted-foreground">
                            {p.sellerMobile ?? p.sellerEmail}
                          </div>
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
                        <TableCell colSpan={10} className="bg-secondary/30">
                          <PayoutDetail payout={p} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                    No payouts match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 14,
              color: 'text.secondary',
            }}
          >
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
          </Box>
        </>
      )}

      <RunBatchDialog open={batchOpen} onClose={() => setBatchOpen(false)} />
    </Stack>
  );
};

const PayoutDetail = ({ payout }: { payout: import('./types').Payout }) => (
  <div className="space-y-4 px-4 py-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Line items</CardTitle>
        <CardDescription>
          {payout.lineItems.length} item(s) · platform fee {formatInr(payout.totalPlatformFeesInr)}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Rate %</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payout.lineItems.map((li, i) => (
              <TableRow key={`${li.orderId}-${li.orderItemId}-${i}`}>
                <TableCell className="font-medium">{li.productName}</TableCell>
                <TableCell className="text-xs">{li.orderNumber ?? '—'}</TableCell>
                <TableCell className="text-right">{formatInr(li.grossInr)}</TableCell>
                <TableCell className="text-right">{li.commissionRatePercent}%</TableCell>
                <TableCell>
                  <Badge variant="muted">{li.commissionSource}</Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  − {formatInr(li.commissionInr)}
                </TableCell>
                <TableCell className="text-right font-medium">{formatInr(li.netInr)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    {payout.notes && (
      <div className="rounded-md bg-secondary p-3 text-sm">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p>
        <p className="mt-1 whitespace-pre-wrap">{payout.notes}</p>
      </div>
    )}
  </div>
);

const RunBatchDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [schedule, setSchedule] = useState<'daily' | 'weekly'>('daily');
  const [asOf, setAsOf] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useRunPayoutBatch();

  const submit = async () => {
    setError(null);
    try {
      const result = await mut.mutateAsync({
        schedule,
        asOf: asOf ? new Date(asOf).toISOString() : undefined,
      });
      // Auto-close after success
      onClose();
      // Simple alert since we haven't wired toast yet
      window.alert(
        `Batch complete: ${result.payoutCount} payouts created, total ${formatInr(
          result.totalNetInr,
        )}`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Batch failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Run payout batch"
      description="Computes payouts for orders in escrow whose return window has passed. Idempotent — already-paid line items are skipped."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Running…' : 'Run batch'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="batch-schedule">Schedule</Label>
          <Select
            id="batch-schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as 'daily' | 'weekly')}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="batch-asof">As-of (optional)</Label>
          <Input
            id="batch-asof"
            type="datetime-local"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Defaults to "now". Setting a past timestamp re-runs that window — useful for catching
            up after downtime.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
