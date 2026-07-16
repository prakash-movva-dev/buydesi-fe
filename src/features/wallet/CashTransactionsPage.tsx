import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import Alert from '@mui/material/Alert';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
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

const HEAD = [
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Status' },
  { id: 'amount', label: 'Amount', align: 'right' as const },
  { id: 'reason', label: 'Reason' },
  { id: 'seller', label: 'Seller' },
  { id: 'cluster', label: 'Cluster' },
  { id: 'tradeOrder', label: 'Trade order' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'actions', label: '' },
];

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
              sx={{ width: 220 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Type"
              value={type}
              onChange={(e) => setParam({ type: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 320 }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {(data?.items ?? []).map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {c.type.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <CashStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatInr(c.amountInr)}
                    </TableCell>
                    <TableCell
                      title={c.reason}
                      sx={{
                        maxWidth: 320,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        typography: 'caption',
                      }}
                    >
                      {c.reason}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ fontWeight: 600 }}>{c.sellerName ?? '—'}</Box>
                      {(c.sellerMobile || c.sellerEmail) && (
                        <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                          {c.sellerMobile ?? c.sellerEmail}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ typography: 'caption' }}>{c.clusterName ?? '—'}</TableCell>
                    <TableCell sx={{ typography: 'caption' }}>{c.tradeOrderLabel ?? '—'}</TableCell>
                    <TableCell sx={{ typography: 'caption' }}>{formatDate(c.createdAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {c.status === 'PENDING' && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => setReviewing({ id: c.id, action: 'approve' })}
                            aria-label="Approve cash entry"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setReviewing({ id: c.id, action: 'reject' })}
                            aria-label="Reject cash entry"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </IconButton>
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
        </Card>
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
      <Stack spacing={2}>
        <TextField
          fullWidth
          label={action === 'reject' ? 'Notes' : 'Notes (optional)'}
          required={action === 'reject'}
          multiline
          minRows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Dialog>
  );
};
