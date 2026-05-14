import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Wallet as WalletIcon } from 'lucide-react';
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
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">
            Every wallet transaction across sellers. Paste a seller id to pin the view to a
            single wallet and unlock per-seller actions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-80">
              <UserPicker
                role={UserRole.SELLER}
                value={sellerIdFilter || null}
                onChange={(id) => setParam({ sellerId: id ?? '' })}
                placeholder="Pick a seller…"
              />
            </div>
            <Button
              disabled={!sellerIdFilter}
              onClick={() => setAdjustOpen(true)}
              variant={sellerIdFilter ? 'primary' : 'outline'}
            >
              Adjust wallet
            </Button>
          </div>

          {sellerIdFilter && snapshot.isLoading && (
            <Skeleton className="mt-4 h-20 w-full" />
          )}
          {sellerIdFilter && snapshot.data && (
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <Metric label="Balance" value={formatInr(snapshot.data.balanceInr)} />
              <Metric label="Available" value={formatInr(snapshot.data.availableInr)} />
              <Metric
                label="Pending credit"
                value={formatInr(snapshot.data.pendingCreditInr)}
                muted
              />
              <Metric label="Pending debit" value={formatInr(snapshot.data.pendingDebitInr)} muted />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
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
      </div>

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

      <WalletAdjustDialog
        open={adjustOpen}
        sellerId={sellerIdFilter || null}
        onClose={() => setAdjustOpen(false)}
      />

      <p className="text-xs text-muted-foreground">
        Last refreshed {formatDateTime(new Date())}
      </p>
    </div>
  );
};

const Metric = ({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) => (
  <div className="rounded-md border border-border bg-secondary/30 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-xl font-semibold ${muted ? 'text-muted-foreground' : ''}`}>{value}</p>
  </div>
);
