import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
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
import { formatDate, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useApproveCash, useCashList, useRejectCash } from './api';
import { CashStatusBadge } from './status-badge';
import type {
  CashEntryStatus,
  CashEntryType,
  CashListQuery,
} from './types';

const STATUS_OPTIONS: Array<{ value: '' | CashEntryStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const TYPE_OPTIONS: Array<{ value: '' | CashEntryType; label: string }> = [
  { value: '', label: 'Any type' },
  { value: 'cash_received', label: 'Cash received (seller got money)' },
  { value: 'cash_paid', label: 'Cash paid (seller spent money)' },
];

const PAGE_SIZE = 25;

export const CashTransactionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as CashEntryStatus | null) ?? '';
  const type = (searchParams.get('type') as CashEntryType | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<CashListQuery>(
    () => ({
      status: status || undefined,
      type: type || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, type, page],
  );

  const { data, isLoading, isError, error } = useCashList(query);
  const approveMut = useApproveCash();
  const rejectMut = useRejectCash();
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

  const [reviewing, setReviewing] = useState<{ id: string; action: 'approve' | 'reject' } | null>(
    null,
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Cash transactions"
        description="Offline trade settlements logged by sellers. Approving posts the wallet entry; rejecting cancels it."
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
          className="w-72"
        >
          {TYPE_OPTIONS.map((opt) => (
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
          {error instanceof Error ? error.message : 'Failed to load cash entries'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Trade order</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="capitalize">{c.type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <CashStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatInr(c.amountInr)}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={c.reason}>
                    {c.reason}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{c.sellerName ?? '—'}</div>
                    {(c.sellerMobile || c.sellerEmail) && (
                      <div className="text-xs text-muted-foreground">
                        {c.sellerMobile ?? c.sellerEmail}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{c.clusterName ?? '—'}</TableCell>
                  <TableCell className="text-xs">{c.tradeOrderLabel ?? '—'}</TableCell>
                  <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    {c.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReviewing({ id: c.id, action: 'approve' })}
                          aria-label="Approve cash entry"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReviewing({ id: c.id, action: 'reject' })}
                          aria-label="Reject cash entry"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    No cash entries match the current filter.
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

      <CashReviewDialog
        open={reviewing !== null}
        action={reviewing?.action ?? null}
        onClose={() => setReviewing(null)}
        onSubmit={async (notes) => {
          if (!reviewing) return;
          if (reviewing.action === 'approve') {
            await approveMut.mutateAsync({ id: reviewing.id, notes });
          } else {
            await rejectMut.mutateAsync({ id: reviewing.id, notes });
          }
        }}
      />
    </Stack>
  );
};

interface ReviewDialogProps {
  open: boolean;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
  onSubmit: (notes: string | undefined) => Promise<unknown>;
}

const CashReviewDialog = ({ open, action, onClose, onSubmit }: ReviewDialogProps) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setNotes('');
      setSubmitting(false);
      setError(null);
    }
  }, [open]);
  if (!action) return null;

  const submit = async () => {
    if (action === 'reject' && !notes.trim()) {
      setError('Reason is required when rejecting.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(notes.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={action === 'approve' ? 'Approve cash entry' : 'Reject cash entry'}
      description={
        action === 'approve'
          ? 'Posts the wallet transaction immediately.'
          : 'Cancels the entry. The seller is notified.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'primary'}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Working…' : action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="cash-notes">
          Notes {action === 'reject' ? <span className="text-destructive">*</span> : '(optional)'}
        </Label>
        <Textarea id="cash-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
