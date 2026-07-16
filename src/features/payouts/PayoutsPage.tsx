import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import {
  Card as UiCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
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

const HEAD = [
  { id: 'expand', label: '' },
  { id: 'seller', label: 'Seller' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'status', label: 'Status' },
  { id: 'gross', label: 'Gross', align: 'right' as const },
  { id: 'commission', label: 'Commission', align: 'right' as const },
  { id: 'net', label: 'Net', align: 'right' as const },
  { id: 'orders', label: 'Orders', align: 'right' as const },
  { id: 'created', label: 'Created' },
  { id: 'paid', label: 'Paid' },
];

const LINE_ITEM_HEAD = [
  { id: 'product', label: 'Product' },
  { id: 'order', label: 'Order' },
  { id: 'gross', label: 'Gross', align: 'right' as const },
  { id: 'rate', label: 'Rate %', align: 'right' as const },
  { id: 'source', label: 'Source' },
  { id: 'commission', label: 'Commission', align: 'right' as const },
  { id: 'net', label: 'Net', align: 'right' as const },
];

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
        <Card>
          <Stack
            direction="row"
            spacing={2}
            flexWrap="wrap"
            alignItems="center"
            sx={{ p: 2.5 }}
          >
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setParam({ status: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Schedule"
              value={schedule}
              onChange={(e) => setParam({ schedule: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            >
              {SCHEDULE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ width: 288 }}>
              <UserPicker
                role={UserRole.SELLER}
                value={sellerId || null}
                onChange={(id) => setParam({ sellerId: id ?? '' })}
                placeholder="Filter by seller…"
              />
            </Box>
          </Stack>

          <Scrollbar>
            <Table sx={{ minWidth: 960 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {(data?.items ?? []).map((p) => {
                  const isExp = expanded[p.id];
                  return (
                    <Fragment key={p.id}>
                      <TableRow
                        hover
                        sx={{ cursor: 'pointer' }}
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
                          <Box sx={{ fontWeight: 600 }}>{p.sellerName ?? '—'}</Box>
                          {(p.sellerMobile || p.sellerEmail) && (
                            <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                              {p.sellerMobile ?? p.sellerEmail}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          {p.schedule.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                        </TableCell>
                        <TableCell align="right">{formatInr(p.totalGrossInr)}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>
                          − {formatInr(p.totalCommissionInr)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatInr(p.netInr)}
                        </TableCell>
                        <TableCell align="right">{p.orderCount}</TableCell>
                        <TableCell sx={{ typography: 'caption' }}>
                          {formatDateTime(p.createdAt)}
                        </TableCell>
                        <TableCell sx={{ typography: 'caption' }}>
                          {p.paidAt ? formatDateTime(p.paidAt) : '—'}
                        </TableCell>
                      </TableRow>
                      {isExp && (
                        <TableRow>
                          <TableCell colSpan={10} sx={{ bgcolor: 'background.neutral' }}>
                            <PayoutDetail payout={p} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                <TableNoData notFound={!isLoading && (data?.items.length ?? 0) === 0} />
              </TableBody>
            </Table>
          </Scrollbar>

          <TablePaginationCustom
            count={total}
            page={page - 1}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
            onRowsPerPageChange={(e) => setParam({ limit: e.target.value, page: '1' })}
          />
        </Card>
      )}

      <RunBatchDialog open={batchOpen} onClose={() => setBatchOpen(false)} />
    </Stack>
  );
};

const PayoutDetail = ({ payout }: { payout: import('./types').Payout }) => (
  <div className="space-y-4 px-4 py-3">
    <UiCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Line items</CardTitle>
        <CardDescription>
          {payout.lineItems.length} item(s) · platform fee {formatInr(payout.totalPlatformFeesInr)}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHeadCustom headLabel={LINE_ITEM_HEAD} />
            <TableBody>
              {payout.lineItems.map((li, i) => (
                <TableRow key={`${li.orderId}-${li.orderItemId}-${i}`} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{li.productName}</TableCell>
                  <TableCell sx={{ typography: 'caption' }}>{li.orderNumber ?? '—'}</TableCell>
                  <TableCell align="right">{formatInr(li.grossInr)}</TableCell>
                  <TableCell align="right">{li.commissionRatePercent}%</TableCell>
                  <TableCell>
                    <Badge variant="muted">{li.commissionSource}</Badge>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    − {formatInr(li.commissionInr)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatInr(li.netInr)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      </CardContent>
    </UiCard>
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
      <Stack spacing={2}>
        <TextField
          select
          fullWidth
          label="Schedule"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value as 'daily' | 'weekly')}
          InputLabelProps={{ shrink: true }}
        >
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
        </TextField>
        <DateTimeField
          label="As-of (optional)"
          value={asOf}
          onChange={setAsOf}
          helperText='Defaults to "now". Setting a past timestamp re-runs that window — useful for catching up after downtime.'
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Dialog>
  );
};
