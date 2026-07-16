import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Wallet as WalletIcon } from 'lucide-react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { UserRole } from '@/types/api';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import {
  useCancelWithdrawal,
  useCompleteWithdrawal,
  useSellerWallet,
  useWalletTxList,
} from './api';
import { TxSourceBadge, TxStatusBadge, TxTypeBadge } from './status-badge';
import { WalletAdjustDialog } from './WalletAdjustDialog';
import type { WalletTxListQuery, WalletTxSource, WalletTxStatus, WalletTxType } from './types';

const TX_TYPE_OPTIONS: Array<{ value: '' | WalletTxType; label: string }> = [
  { value: '', label: 'Any type' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'DEBIT', label: 'Debit' },
];

const TX_STATUS_OPTIONS: Array<{ value: '' | WalletTxStatus; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

const TX_SOURCE_OPTIONS: Array<{ value: '' | WalletTxSource; label: string }> = [
  { value: '', label: 'Any source' },
  { value: 'consumer_payout', label: 'Consumer payout' },
  { value: 'trade_sale', label: 'Trade sale' },
  { value: 'trade_purchase', label: 'Trade purchase' },
  { value: 'trade_refund', label: 'Trade refund' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'cash_received', label: 'Cash received' },
  { value: 'cash_paid', label: 'Cash paid' },
  { value: 'platform_fee', label: 'Platform fee' },
  { value: 'admin_adjustment', label: 'Admin adjustment' },
];

const PAGE_SIZE = 25;

const HEAD = [
  { id: 'type', label: 'Type' },
  { id: 'source', label: 'Source' },
  { id: 'status', label: 'Status' },
  { id: 'amount', label: 'Amount', align: 'right' as const },
  { id: 'seller', label: 'Seller' },
  { id: 'reference', label: 'Reference' },
  { id: 'notes', label: 'Notes' },
  { id: 'created', label: 'Created' },
  { id: 'actions', label: '' },
];

export const WalletPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sellerIdFilter = searchParams.get('sellerId') ?? '';
  const type = (searchParams.get('type') as WalletTxType | null) ?? '';
  const status = (searchParams.get('status') as WalletTxStatus | null) ?? '';
  const source = (searchParams.get('source') as WalletTxSource | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<WalletTxListQuery>(
    () => ({
      userId: sellerIdFilter || undefined,
      type: type || undefined,
      status: status || undefined,
      source: source || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [sellerIdFilter, type, status, source, page],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useWalletTxList(query);
  const snapshot = useSellerWallet(sellerIdFilter || undefined);
  const completeMut = useCompleteWithdrawal();
  const cancelMut = useCancelWithdrawal();
  const [adjustOpen, setAdjustOpen] = useState(false);

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

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Wallet"
        description="Every wallet transaction across sellers. Paste a seller id to pin the view to a single wallet and unlock per-seller actions."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletIcon className="h-4 w-4" />
            Seller wallet snapshot
          </CardTitle>
          <CardDescription>
            Pick a seller below to see their balance and queue an adjustment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="flex-end">
            <Box sx={{ width: 320 }}>
              <UserPicker
                role={UserRole.SELLER}
                value={sellerIdFilter || null}
                onChange={(id) => setParam({ sellerId: id ?? '' })}
                placeholder="Pick a seller…"
              />
            </Box>
            <Button
              disabled={!sellerIdFilter}
              onClick={() => setAdjustOpen(true)}
              variant={sellerIdFilter ? 'primary' : 'outline'}
            >
              Adjust wallet
            </Button>
          </Stack>

          {sellerIdFilter && snapshot.isLoading && (
            <Skeleton className="mt-4 h-20 w-full" />
          )}
          {sellerIdFilter && snapshot.data && (
            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
              }}
            >
              <StatCard label="Balance" value={formatInr(snapshot.data.balanceInr)} />
              <StatCard label="Available" value={formatInr(snapshot.data.availableInr)} />
              <StatCard label="Pending credit" value={formatInr(snapshot.data.pendingCreditInr)} />
              <StatCard label="Pending debit" value={formatInr(snapshot.data.pendingDebitInr)} />
            </Box>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load transactions'}
        </div>
      )}

      {!isLoading && !isError && (
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
              label="Type"
              value={type}
              onChange={(e) => setParam({ type: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            >
              {TX_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setParam({ status: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            >
              {TX_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Source"
              value={source}
              onChange={(e) => setParam({ source: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 220 }}
            >
              {TX_SOURCE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Scrollbar>
            <Table sx={{ minWidth: 960 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {(data?.items ?? []).map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>
                      <TxTypeBadge type={tx.type} />
                    </TableCell>
                    <TableCell>
                      <TxSourceBadge source={tx.source} />
                    </TableCell>
                    <TableCell>
                      <TxStatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {tx.type === 'DEBIT' ? '−' : '+'}
                      {formatInr(tx.amountInr)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                      {tx.userId.slice(-8)}
                    </TableCell>
                    <TableCell sx={{ typography: 'caption' }}>
                      {tx.referenceType ? (
                        <>
                          <Badge variant="muted">{tx.referenceType}</Badge>
                          {tx.referenceId && (
                            <Box
                              sx={{
                                mt: 0.25,
                                fontFamily: 'monospace',
                                typography: 'caption',
                                color: 'text.secondary',
                              }}
                            >
                              {tx.referenceId.slice(-8)}
                            </Box>
                          )}
                        </>
                      ) : (
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          —
                        </Box>
                      )}
                    </TableCell>
                    <TableCell
                      title={tx.notes ?? ''}
                      sx={{
                        maxWidth: 320,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'text.secondary',
                        typography: 'caption',
                      }}
                    >
                      {tx.notes ?? '—'}
                    </TableCell>
                    <TableCell sx={{ typography: 'caption' }}>{formatDate(tx.createdAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {tx.source === 'withdrawal' && tx.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => completeMut.mutate({ id: tx.id })}
                            disabled={completeMut.isPending}
                            title="Mark withdrawal completed"
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelMut.mutate({ id: tx.id })}
                            disabled={cancelMut.isPending}
                            title="Cancel withdrawal"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
        </MuiCard>
      )}

      <WalletAdjustDialog
        open={adjustOpen}
        sellerId={sellerIdFilter || null}
        onClose={() => setAdjustOpen(false)}
      />

      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Last refreshed {formatDateTime(new Date())}
      </Typography>
    </Stack>
  );
};
