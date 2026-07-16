import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MuiTable from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import MuiTableRow from '@mui/material/TableRow';
import MuiTableBody from '@mui/material/TableBody';
import MuiTableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
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
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
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

const HEAD = [
  { id: 'expand', label: '' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'status', label: 'Status' },
  { id: 'gross', label: 'Gross', align: 'right' as const },
  { id: 'commission', label: 'Commission', align: 'right' as const },
  { id: 'net', label: 'Net', align: 'right' as const },
  { id: 'orders', label: 'Orders', align: 'right' as const },
  { id: 'created', label: 'Created' },
  { id: 'paid', label: 'Paid' },
];

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

      <MuiCard>
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
            sx={{ width: 176 }}
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
            sx={{ width: 176 }}
          >
            {SCHEDULE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isLoading && (
          <Box sx={{ p: 2.5 }}>
            <Skeleton className="h-40 w-full" />
          </Box>
        )}

        {!isLoading && (
          <>
            <Scrollbar>
              <MuiTable sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={HEAD} />
                <MuiTableBody>
                  {(data?.items ?? []).map((p) => {
                    const isExp = expanded[p.id];
                    return (
                      <Fragment key={p.id}>
                        <MuiTableRow
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                        >
                          <MuiTableCell>
                            {isExp ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </MuiTableCell>
                          <MuiTableCell sx={{ textTransform: 'capitalize' }}>
                            {p.schedule.replace('_', ' ')}
                          </MuiTableCell>
                          <MuiTableCell>
                            <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                          </MuiTableCell>
                          <MuiTableCell align="right">{formatInr(p.totalGrossInr)}</MuiTableCell>
                          <MuiTableCell align="right" sx={{ color: 'text.secondary' }}>
                            − {formatInr(p.totalCommissionInr)}
                          </MuiTableCell>
                          <MuiTableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatInr(p.netInr)}
                          </MuiTableCell>
                          <MuiTableCell align="right">{p.orderCount}</MuiTableCell>
                          <MuiTableCell sx={{ typography: 'caption' }}>
                            {formatDateTime(p.createdAt)}
                          </MuiTableCell>
                          <MuiTableCell sx={{ typography: 'caption' }}>
                            {p.paidAt ? formatDateTime(p.paidAt) : '—'}
                          </MuiTableCell>
                        </MuiTableRow>
                        {isExp && (
                          <MuiTableRow>
                            <MuiTableCell colSpan={9} sx={{ bgcolor: 'background.neutral' }}>
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
                            </MuiTableCell>
                          </MuiTableRow>
                        )}
                      </Fragment>
                    );
                  })}
                  <TableNoData notFound={!isLoading && (data?.items.length ?? 0) === 0} />
                </MuiTableBody>
              </MuiTable>
            </Scrollbar>

            <TablePaginationCustom
              count={total}
              page={page - 1}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[10, 25, 50]}
              onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
              onRowsPerPageChange={() => {}}
            />
          </>
        )}
      </MuiCard>
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
        <TextField
          select
          label="Preference"
          value={me?.payoutPreference ?? 'daily'}
          onChange={(e) =>
            setPref.mutate(e.target.value as 'daily' | 'weekly' | 'on_demand')
          }
          disabled={setPref.isPending}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 176 }}
        >
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="on_demand">On demand</MenuItem>
        </TextField>
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
