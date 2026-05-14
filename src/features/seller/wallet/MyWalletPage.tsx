import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wallet as WalletIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
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
import { Textarea } from '@/components/ui/Textarea';
import { TxSourceBadge, TxStatusBadge, TxTypeBadge } from '@/features/wallet/status-badge';
import { formatDate, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useMyTransactions, useMyWallet, useRequestWithdrawal } from './api';
import type { WalletTxSource, WalletTxStatus, WalletTxType } from '@/features/wallet/types';

const TYPE_OPTIONS: Array<{ value: '' | WalletTxType; label: string }> = [
  { value: '', label: 'Any type' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'DEBIT', label: 'Debit' },
];

const STATUS_OPTIONS: Array<{ value: '' | WalletTxStatus; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

const SOURCE_OPTIONS: Array<{ value: '' | WalletTxSource; label: string }> = [
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

export const MyWalletPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = (searchParams.get('type') as WalletTxType | null) ?? '';
  const status = (searchParams.get('status') as WalletTxStatus | null) ?? '';
  const source = (searchParams.get('source') as WalletTxSource | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const snapshot = useMyWallet();
  const txs = useMyTransactions({
    type: type || undefined,
    source: source || undefined,
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const total = txs.data?.meta.total ?? 0;
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

  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My wallet</h1>
          <p className="text-muted-foreground">
            Balance, pending credits, and every transaction. Withdraw to your bank when
            ready.
          </p>
        </div>
        <Button
          onClick={() => setWithdrawOpen(true)}
          disabled={!snapshot.data || snapshot.data.availableInr <= 0}
        >
          <WalletIcon className="h-4 w-4" />
          Withdraw
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Balance" value={snapshot.data ? formatInr(snapshot.data.balanceInr) : null} />
        <Metric
          label="Available to withdraw"
          value={snapshot.data ? formatInr(snapshot.data.availableInr) : null}
          highlight
        />
        <Metric
          label="Pending credit"
          value={snapshot.data ? formatInr(snapshot.data.pendingCreditInr) : null}
          muted
        />
        <Metric
          label="Pending debit"
          value={snapshot.data ? formatInr(snapshot.data.pendingDebitInr) : null}
          muted
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={type}
          onChange={(e) => setParam({ type: e.target.value })}
          className="w-36"
        >
          {TYPE_OPTIONS.map((opt) => (
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
          {STATUS_OPTIONS.map((opt) => (
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
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {txs.isLoading && <Skeleton className="h-40 w-full" />}

      {!txs.isLoading && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(txs.data?.items ?? []).map((tx) => (
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
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={tx.notes ?? ''}>
                    {tx.notes ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(tx.createdAt)}</TableCell>
                </TableRow>
              ))}
              {(txs.data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {txs.data?.items.length ?? 0} of {total} · page {page} / {pageCount}
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

      <WithdrawDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        maxAmount={snapshot.data?.availableInr ?? 0}
      />
    </div>
  );
};

const Metric = ({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string | null;
  highlight?: boolean;
  muted?: boolean;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
      {value === null ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <CardTitle
          className={`text-3xl ${highlight ? 'text-emerald-700' : muted ? 'text-muted-foreground' : ''}`}
        >
          {value}
        </CardTitle>
      )}
    </CardHeader>
  </Card>
);

const WithdrawDialog = ({
  open,
  onClose,
  maxAmount,
}: {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
}) => {
  const mut = useRequestWithdrawal();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setNotes('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (n > maxAmount) {
      setError(`Cannot exceed available ₹${maxAmount}.`);
      return;
    }
    try {
      await mut.mutateAsync({ amountInr: n, notes: notes.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Withdrawal failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Request withdrawal"
      description={`Available to withdraw: ${formatInr(maxAmount)}. Funds settle in your bank account within 1–2 business days.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Requesting…' : 'Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="wd-amount">Amount (₹) *</Label>
          <Input
            id="wd-amount"
            type="number"
            min={1}
            max={maxAmount}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wd-notes">Notes (optional)</Label>
          <Textarea
            id="wd-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
