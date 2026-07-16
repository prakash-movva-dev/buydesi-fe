import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
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

const HEAD = [
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Status' },
  { id: 'amount', label: 'Amount', align: 'right' as const },
  { id: 'reason', label: 'Reason' },
  { id: 'trade', label: 'Trade order' },
  { id: 'created', label: 'Created' },
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
            sx={{ width: 192 }}
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
            sx={{ width: 256 }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isLoading && (
          <Box sx={{ p: 2.5 }}>
            <Skeleton className="h-40 w-full" />
          </Box>
        )}

        {!isLoading && (
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {visible.map((c) => (
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
                    <TableCell sx={{ maxWidth: 360, typography: 'caption' }} title={c.reason}>
                      <Box
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.reason}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                      {c.tradeOrderId ? c.tradeOrderId.slice(-8) : '—'}
                    </TableCell>
                    <TableCell sx={{ typography: 'caption' }}>{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!isLoading && visible.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        )}
      </Card>

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
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: 'repeat(2,1fr)' } }}>
          <TextField
            select
            fullWidth
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as CashEntryType)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="cash_received">Cash received</MenuItem>
            <MenuItem value="cash_paid">Cash paid</MenuItem>
          </TextField>
          <TextField
            fullWidth
            type="number"
            label="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: 1, step: '0.01' }}
          />
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Reason / description *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Linked trade order id (optional)"
          value={tradeOrderId}
          onChange={(e) => setTradeOrderId(e.target.value)}
          placeholder="If this settles a specific trade order"
          InputLabelProps={{ shrink: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Dialog>
  );
};
