import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Stack from '@mui/material/Stack';
import { Button } from '@/components/ui/Button';
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
import { Textarea } from '@/components/ui/Textarea';
import { CashStatusBadge } from '@/features/wallet/status-badge';
import { formatDate, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useCreateCashEntry, useMyCashEntries } from '../wallet/api';
import type { CashEntryStatus, CashEntryType, CashListQuery } from '@/features/wallet/types';

const STATUS_OPTIONS: Array<{ value: '' | CashEntryStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const TYPE_OPTIONS: Array<{ value: '' | CashEntryType; label: string }> = [
  { value: '', label: 'Any type' },
  { value: 'cash_received', label: 'Cash received (got money)' },
  { value: 'cash_paid', label: 'Cash paid (spent money)' },
];

export const MyCashEntriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as CashEntryStatus | null) ?? '';
  const type = (searchParams.get('type') as CashEntryType | null) ?? '';
  const query: CashListQuery = { page: 1, limit: 100 };
  const { data, isLoading } = useMyCashEntries(query);
  const [open, setOpen] = useState(false);

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    setSearchParams(params);
  };

  const visible = (data ?? []).filter((c) => {
    if (status && c.status !== status) return false;
    if (type && c.type !== type) return false;
    return true;
  });

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Cash entries"
        description="Log offline trade settlements — money you received from or paid to another seller outside the platform. Admins review and post to your wallet."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New cash entry
          </Button>
        }
      />

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-48"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={type}
          onChange={(e) => setParam({ type: e.target.value })}
          className="w-64"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Stack>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Trade order</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="capitalize">{c.type.replace('_', ' ')}</TableCell>
                <TableCell>
                  <CashStatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-right font-medium">{formatInr(c.amountInr)}</TableCell>
                <TableCell className="max-w-md truncate text-xs" title={c.reason}>
                  {c.reason}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {c.tradeOrderId ? c.tradeOrderId.slice(-8) : '—'}
                </TableCell>
                <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No cash entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <NewCashEntryDialog open={open} onClose={() => setOpen(false)} />
    </Stack>
  );
};

const NewCashEntryDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const mut = useCreateCashEntry();
  const [type, setType] = useState<CashEntryType>('cash_received');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [tradeOrderId, setTradeOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType('cash_received');
      setAmount('');
      setReason('');
      setTradeOrderId('');
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
    if (reason.trim().length < 2) {
      setError('Reason is required (min 2 chars).');
      return;
    }
    try {
      await mut.mutateAsync({
        type,
        amountInr: n,
        reason: reason.trim(),
        tradeOrderId: tradeOrderId.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New cash entry"
      description="Use this for offline B2B settlements only — buyer-side platform sales are already tracked."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Submitting…' : 'Submit for review'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ce-type">Type</Label>
            <Select
              id="ce-type"
              value={type}
              onChange={(e) => setType(e.target.value as CashEntryType)}
            >
              <option value="cash_received">Cash received</option>
              <option value="cash_paid">Cash paid</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ce-amount">Amount (₹)</Label>
            <Input
              id="ce-amount"
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ce-reason">Reason / description *</Label>
          <Textarea
            id="ce-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ce-trade">Linked trade order id (optional)</Label>
          <Input
            id="ce-trade"
            value={tradeOrderId}
            onChange={(e) => setTradeOrderId(e.target.value)}
            placeholder="If this settles a specific trade order"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
