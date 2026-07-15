import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Wallet as WalletIcon } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { UserRole } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
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

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <Select
          value={type}
          onChange={(e) => setParam({ type: e.target.value })}
          className="w-36"
        >
          {TX_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-40"
        >
          {TX_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={source}
          onChange={(e) => setParam({ source: e.target.value })}
          className="w-48"
        >
          {TX_SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
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
          {error instanceof Error ? error.message : 'Failed to load transactions'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <TxTypeBadge type={tx.type} />
                  </TableCell>
                  <TableCell>
                    <TxSourceBadge source={tx.source} />
                  </TableCell>
                  <TableCell>
                    <TxStatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {tx.type === 'DEBIT' ? '−' : '+'}
                    {formatInr(tx.amountInr)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{tx.userId.slice(-8)}</TableCell>
                  <TableCell className="text-xs">
                    {tx.referenceType ? (
                      <>
                        <Badge variant="muted">{tx.referenceType}</Badge>
                        {tx.referenceId && (
                          <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {tx.referenceId.slice(-8)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={tx.notes ?? ''}>
                    {tx.notes ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(tx.createdAt)}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
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
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    No transactions match the current filter.
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
