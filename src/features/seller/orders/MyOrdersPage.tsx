import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
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
import { useOrdersList } from '@/features/orders/api';
import { OrderStatusBadge, PaymentStatusBadge } from '@/features/orders/status-badge';
import { formatDate, formatInr } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import type { OrderStatus, OrdersListQuery } from '@/features/orders/types';

const STATUS_OPTIONS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PLACED', label: 'Placed (needs packing)' },
  { value: 'PACKED', label: 'Packed (needs dispatch)' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 25;

const HEAD = [
  { id: 'order', label: 'Order' },
  { id: 'customer', label: 'Customer' },
  { id: 'status', label: 'Status' },
  { id: 'payment', label: 'Payment' },
  { id: 'items', label: 'My items', align: 'right' as const },
  { id: 'total', label: 'My total', align: 'right' as const },
  { id: 'placed', label: 'Placed' },
  { id: 'action', label: '' },
];

export const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as OrderStatus | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<OrdersListQuery>(
    () => ({ status: status || undefined, page, limit: PAGE_SIZE }),
    [status, page],
  );

  const { data, isLoading } = useOrdersList(query);
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

  // Local scrub for order number.
  const [scrub, setScrub] = useState('');
  const visible = useMemo(() => {
    const s = scrub.trim().toLowerCase();
    if (!s || !data) return data?.items ?? [];
    return data.items.filter((o) => o.orderNumber.toLowerCase().includes(s));
  }, [data, scrub]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Incoming orders"
        description="Buyer orders that contain your products. Move them along the pipeline: Placed → Packed → Dispatched → Delivered."
      />

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
            sx={{ width: 224 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="search"
            label="Quick filter"
            value={scrub}
            onChange={(e) => setScrub(e.target.value)}
            placeholder="Order number"
            InputLabelProps={{ shrink: true }}
            sx={{ width: 288 }}
          />
        </Stack>

        {isLoading && <Skeleton className="h-40 w-full" />}

        {!isLoading && (
          <>
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={HEAD} />
                <TableBody>
                  {visible.map((o) => {
                    const myItems = o.items.filter((it) => it.sellerId === user?.id);
                    const myTotal = myItems.reduce((sum, it) => sum + it.subtotalInr, 0);
                    return (
                      <TableRow key={o.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          <Link
                            component={RouterLink}
                            to={`/seller/orders/${o.id}`}
                            color="inherit"
                          >
                            {o.orderNumber}
                          </Link>
                          <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                            {o.items.length} item{o.items.length === 1 ? '' : 's'} in order
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ fontWeight: 600 }}>{o.shippingAddress.name}</Box>
                          <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                            {o.shippingAddress.phone} · {o.shippingAddress.city}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <Badge variant="muted">{o.payment.mode}</Badge>
                            <PaymentStatusBadge status={o.payment.status} />
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{myItems.length}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatInr(myTotal)}
                        </TableCell>
                        <TableCell>{formatDate(o.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/seller/orders/${o.id}`)}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableNoData notFound={!isLoading && visible.length === 0} />
                </TableBody>
              </Table>
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
      </Card>
    </Stack>
  );
};
