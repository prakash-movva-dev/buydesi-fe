import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { formatDate, formatInr } from '@/lib/format';
import { useMyTradeOrders } from './api';
import type { TradeOrderStatus } from './types';

const ROLE_OPTIONS: Array<{ value: 'either' | 'buyer' | 'seller'; label: string }> = [
  { value: 'either', label: 'All my trades' },
  { value: 'buyer', label: 'As buyer' },
  { value: 'seller', label: 'As seller' },
];

const statusVariant: Record<TradeOrderStatus, 'info' | 'warning' | 'success' | 'destructive' | 'muted'> = {
  PLACED: 'info',
  SELLER_CONFIRMED: 'info',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

export const MyTradeOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = (searchParams.get('role') as 'buyer' | 'seller' | 'either' | null) ?? 'either';

  const { data, isLoading } = useMyTradeOrders({ role, page: 1, limit: 50 });

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    setSearchParams(params);
  };

  const items = data?.items ?? [];

  const head = [
    { id: 'order', label: 'Order' },
    { id: 'role', label: 'My role' },
    { id: 'status', label: 'Status' },
    { id: 'payment', label: 'Payment' },
    { id: 'units', label: 'Units', align: 'right' as const },
    { id: 'total', label: 'Total', align: 'right' as const },
    { id: 'placed', label: 'Placed' },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My trade orders"
        description="B2B inter-cluster orders. Buyer and seller views are combined here — filter to one role for a focused list."
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
            label="Role"
            value={role}
            onChange={(e) => setParam({ role: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 224 }}
          >
            {ROLE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isLoading && <Skeleton className="mx-4 mb-4 h-40" />}

        {!isLoading && (
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={head} />
              <TableBody>
                {items.map((o) => {
                  const id = o.id ?? o._id;
                  const myRole = o.sellerId === user?.id ? 'seller' : 'buyer';
                  return (
                    <TableRow
                      key={id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/seller/trade/orders/${id}`)}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {o.productName}
                        <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                          id {id.slice(-8)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{myRole}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{o.paymentMode}</Badge>
                      </TableCell>
                      <TableCell align="right">{o.units}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatInr(o.totalInr)}
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>{formatDate(o.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableNoData notFound={!isLoading && items.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        )}
      </Card>
    </Stack>
  );
};
