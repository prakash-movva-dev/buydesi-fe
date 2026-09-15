import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';
import { formatInr } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { WalletBalanceCard } from '@/features/wallet/WalletBalanceCard';
import { WalletOverviewCard } from '@/features/wallet/WalletOverviewCard';
import { WalletTransactionsCard } from '@/features/wallet/WalletTransactionsCard';

import { QuickWithdrawCard } from './QuickWithdrawCard';
import { useMyTransactions, useMyWallet, useMyWalletSummary, useRequestWithdrawal } from './api';
import type { WalletTxSource, WalletTxStatus, WalletTxType } from '@/features/wallet/types';

// ----------------------------------------------------------------------

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
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'platform_fee', label: 'Platform fee' },
  { value: 'admin_adjustment', label: 'Admin adjustment' },
];

const PAGE_SIZE = 25;

// ----------------------------------------------------------------------

export const MyWalletPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const type = (searchParams.get('type') as WalletTxType | null) ?? '';
  const status = (searchParams.get('status') as WalletTxStatus | null) ?? '';
  const source = (searchParams.get('source') as WalletTxSource | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const snapshot = useMyWallet();
  const summary = useMyWalletSummary();
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

  const filters = (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ px: 2.5, pb: 2.5, pt: 1 }}
    >
      <TextField
        select
        label="Type"
        value={type}
        onChange={(e) => setParam({ type: e.target.value })}
        InputLabelProps={{ shrink: true }}
        sx={{ width: { xs: 1, md: 144 } }}
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
        sx={{ width: { xs: 1, md: 160 } }}
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
        sx={{ width: { xs: 1, md: 200 } }}
      >
        {SOURCE_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  return (
    <>
      <PageHeader
        title="My wallet"
        description="Your balance, what is still settling, and every movement in and out."
      />

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid xs={12} md={7} lg={8}>
          <WalletOverviewCard
            snapshot={snapshot.data}
            summary={summary.data}
            onWithdraw={() => setWithdrawOpen(true)}
            withdrawDisabled={!snapshot.data || snapshot.data.availableInr <= 0}
          />
        </Grid>

        <Grid xs={12} md={5} lg={4}>
          <Stack spacing={3}>
            <WalletBalanceCard snapshot={snapshot.data} holder={user?.name} />
            <QuickWithdrawCard available={snapshot.data?.availableInr ?? 0} />
          </Stack>
        </Grid>

        <Grid xs={12}>
          <WalletTransactionsCard
            title="Transactions"
            subheader={total ? `${total} movement${total === 1 ? '' : 's'}` : undefined}
            rows={txs.data?.items ?? []}
            loading={txs.isLoading}
            filters={filters}
            page={page}
            rowsPerPage={PAGE_SIZE}
            total={total}
            onPageChange={(next) => setParam({ page: String(next) })}
          />
        </Grid>
      </Grid>

      <WithdrawDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        maxAmount={snapshot.data?.availableInr ?? 0}
      />
    </>
  );
};

// ----------------------------------------------------------------------

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
      setError(`Cannot exceed the ${formatInr(maxAmount)} available.`);
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Request withdrawal</DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 3, typography: 'body2' }}>
          {formatInr(maxAmount)} available. Funds settle in your bank account within 1–2 business
          days.
        </DialogContentText>

        <Stack spacing={2.5}>
          <TextField
            fullWidth
            autoFocus
            type="number"
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: 1, max: maxAmount, step: '1' }}
          />

          {/* One tap for the common case — take everything that has settled. */}
          <Box>
            <Button size="small" variant="outlined" onClick={() => setAmount(String(maxAmount))}>
              Withdraw all
            </Button>
          </Box>

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
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={mut.isPending}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={mut.isPending} onClick={submit}>
          Request
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
