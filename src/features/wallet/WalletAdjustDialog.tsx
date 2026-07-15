import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
      <div className="space-y-3">
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-dir">Direction</Label>
            <Select
              id="adjust-dir"
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'credit' | 'debit')}
            >
              <option value="credit">Credit (give money)</option>
              <option value="debit">Debit (take money)</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-amount">Amount (₹)</Label>
            <Input
              id="adjust-amount"
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </Box>
        <div className="space-y-1.5">
          <Label htmlFor="adjust-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="adjust-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. compensation for incorrect commission charge on order #ABC"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
