import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { formatDate, formatInr } from '@/lib/format';
import { useOrdersList } from './api';
import { OrderStatusBadge, PaymentStatusBadge } from './status-badge';
import type { OrderStatus, OrdersListQuery, PaymentMode } from './types';

const STATUS_OPTIONS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

const PAGE_SIZE = 20;

const HEAD = [
  { id: 'order', label: 'Order' },
  { id: 'status', label: 'Status' },
  { id: 'payment', label: 'Payment' },
  { id: 'total', label: 'Total' },
  { id: 'items', label: 'Items' },
  { id: 'placed', label: 'Placed' },
  { id: 'actions', label: '' },
];

export const OrdersListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('status') as OrderStatus | null) ?? '';
  const problem = searchParams.get('problem') === '1';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<OrdersListQuery>(
    () => ({
      status: problem ? undefined : status || undefined,
      problem: problem || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, problem, page],
  );

  const { data, isLoading, isError, error } = useOrdersList(query);
  const total = data?.meta.total ?? 0;

  // Page-local scrubber — backend doesn't support order-number search yet.
  const [scrub, setScrub] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'' | PaymentMode>('');
  const [kindFilter, setKindFilter] = useState<'' | 'regular' | 'bulk'>('');

  const visible = useMemo(() => {
    if (!data) return [];
    const s = scrub.trim().toLowerCase();
    return data.items.filter((o) => {
      if (s && !(o.orderNumber.toLowerCase().includes(s) || o.id.includes(s) || o.buyerId.includes(s)))
        return false;
      if (paymentFilter && o.payment.mode !== paymentFilter) return false;
      if (kindFilter && o.kind !== kindFilter) return false;
      return true;
    });
  }, [data, scrub, paymentFilter, kindFilter]);

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Orders"
        description="Every order on the platform. Cluster admins see their cluster's sellers' orders only."
      />

      <ScopedAdminBanner />

      <Card>
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          alignItems="center"
          sx={{ p: 2.5 }}
        >
          <Button
            variant={problem ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setParam({ problem: problem ? null : '1', status: null })}
            title="Cancelled / returned orders, or orders with an open support ticket"
          >
            {problem ? 'Problem orders ✓' : 'Problem orders'}
          </Button>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setParam({ status: e.target.value })}
            disabled={problem}
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
            label="Payment"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as '' | PaymentMode)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          >
            <MenuItem value="">Any payment</MenuItem>
            <MenuItem value="PREPAID">Prepaid</MenuItem>
            <MenuItem value="COD">Cash on delivery</MenuItem>
          </TextField>
          <TextField
            select
            label="Kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as '' | 'regular' | 'bulk')}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          >
            <MenuItem value="">Any kind</MenuItem>
            <MenuItem value="regular">Regular</MenuItem>
            <MenuItem value="bulk">Bulk</MenuItem>
          </TextField>
          <TextField
            value={scrub}
            onChange={(e) => setScrub(e.target.value)}
            placeholder="Order number / id / buyer"
            InputProps={{
              startAdornment: (
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              ),
            }}
            sx={{ width: 320 }}
          />
        </Stack>

        {isError && (
          <Box sx={{ px: 2.5, pb: 2, color: 'error.main', typography: 'body2' }}>
            {error instanceof Error ? error.message : 'Failed to load orders'}
          </Box>
        )}

        {isLoading && (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Stack spacing={1}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </Stack>
          </Box>
        )}

        {!isLoading && !isError && (
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {visible.map((o) => (
                  <TableRow
                    key={o.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Box>{o.orderNumber}</Box>
                      <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                        buyer {o.buyerId.slice(-6)} · {o.kind}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={1} alignItems="flex-start">
                        <Badge variant="muted">{o.payment.mode}</Badge>
                        <PaymentStatusBadge status={o.payment.status} />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{formatInr(o.totalInr)}</TableCell>
                    <TableCell>{o.items.length}</TableCell>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/orders/${o.id}`);
                        }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!isLoading && visible.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        )}

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
          onRowsPerPageChange={() => {}}
        />
      </Card>
    </Stack>
  );
};
