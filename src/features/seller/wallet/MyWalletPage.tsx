import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet as WalletIcon } from 'lucide-react';
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
import { StatCard } from '@/components/ui/StatCard';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
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

const HEAD = [
  { id: 'type', label: 'Type' },
  { id: 'source', label: 'Source' },
  { id: 'status', label: 'Status' },
  { id: 'amount', label: 'Amount', align: 'right' as const },
  { id: 'notes', label: 'Notes' },
  { id: 'created', label: 'Created' },
];

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
    <Stack spacing={3}>
      <PageHeader
        title="My wallet"
        description="Balance, pending credits, and every transaction. Withdraw to your bank when ready."
        action={
          <Button
            onClick={() => setWithdrawOpen(true)}
            disabled={!snapshot.data || snapshot.data.availableInr <= 0}
          >
            <WalletIcon className="h-4 w-4" />
            Withdraw
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(4,1fr)' },
        }}
      >
        <StatCard label="Balance" value={snapshot.data ? formatInr(snapshot.data.balanceInr) : null} />
        <StatCard
          label="Available to withdraw"
          value={snapshot.data ? formatInr(snapshot.data.availableInr) : null}
          tone="success"
        />
        <StatCard
          label="Pending credit"
          value={snapshot.data ? formatInr(snapshot.data.pendingCreditInr) : null}
        />
        <StatCard
          label="Pending debit"
          value={snapshot.data ? formatInr(snapshot.data.pendingDebitInr) : null}
        />
      </Box>

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
            label="Type"
            value={type}
            onChange={(e) => setParam({ type: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 144 }}
          >
            {TYPE_OPTIONS.map((opt) => (
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
            sx={{ width: 160 }}
          >
            {STATUS_OPTIONS.map((opt) => (
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
            sx={{ width: 192 }}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {txs.isLoading && (
          <Box sx={{ p: 2.5 }}>
            <Skeleton className="h-40 w-full" />
          </Box>
        )}

        {!txs.isLoading && (
          <>
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={HEAD} />
                <TableBody>
                  {(txs.data?.items ?? []).map((tx) => (
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
                      <TableCell
                        sx={{ maxWidth: 320, color: 'text.secondary', typography: 'caption' }}
                        title={tx.notes ?? ''}
                      >
                        <Box
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tx.notes ?? '—'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>{formatDate(tx.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  <TableNoData notFound={!txs.isLoading && (txs.data?.items.length ?? 0) === 0} />
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

      <WithdrawDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        maxAmount={snapshot.data?.availableInr ?? 0}
      />
    </Stack>
  );
};

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
        <TextField
          fullWidth
          required
          type="number"
          label="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: 1, max: maxAmount, step: '1' }}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </div>
    </Dialog>
  );
};
