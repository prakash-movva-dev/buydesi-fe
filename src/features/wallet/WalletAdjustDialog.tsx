import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError } from '@/types/api';
import { useAdjustWallet } from './api';

interface Props {
  open: boolean;
  sellerId: string | null;
  onClose: () => void;
}

export const WalletAdjustDialog = ({ open, sellerId, onClose }: Props) => {
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useAdjustWallet();

  useEffect(() => {
    if (open) {
      setDirection('credit');
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!sellerId) return;
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    if (reason.trim().length < 2) {
      setError('Reason is required (audit trail).');
      return;
    }
    try {
      await mut.mutateAsync({ sellerId, direction, amountInr: n, reason: reason.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Adjustment failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Manual wallet adjustment"
      description="SOW 4.17 — every adjustment is logged with a mandatory reason. Use only for genuine corrections, not for replacing missing payouts (those should go through the payouts queue)."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button
            variant={direction === 'debit' ? 'destructive' : 'primary'}
            onClick={submit}
            disabled={mut.isPending}
          >
            {mut.isPending ? 'Working…' : direction === 'credit' ? 'Credit wallet' : 'Debit wallet'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <TextField
            select
            fullWidth
            label="Direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'credit' | 'debit')}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="credit">Credit (give money)</MenuItem>
            <MenuItem value="debit">Debit (take money)</MenuItem>
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
          required
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. compensation for incorrect commission charge on order #ABC"
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};
