import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError } from '@/types/api';
import {
  useClaimTicket,
  useEscalateTicket,
  useForceRefundTicket,
  useResolveTicket,
} from './api';
import type { SupportResolutionAction } from './types';

interface BaseProps {
  open: boolean;
  ticketId: string | null;
  onClose: () => void;
}

export const ClaimDialog = ({ open, ticketId, onClose }: BaseProps) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useClaimTicket();
  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
    }
  }, [open]);
  const submit = async () => {
    if (!ticketId) return;
    setError(null);
    try {
      await mut.mutateAsync({ id: ticketId, notes: notes.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Claim failed');
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Claim ticket"
      description="The ticket is assigned to you and moves to IN_PROGRESS. The first-response SLA clock stops."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Claiming…' : 'Claim'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Initial note (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Acknowledgement message visible to the raiser."
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};

export const ResolveDialog = ({ open, ticketId, onClose }: BaseProps) => {
  const [action, setAction] = useState<SupportResolutionAction>('refund');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useResolveTicket();
  useEffect(() => {
    if (open) {
      setAction('refund');
      setNotes('');
      setError(null);
    }
  }, [open]);
  const submit = async () => {
    if (!ticketId) return;
    setError(null);
    try {
      await mut.mutateAsync({
        id: ticketId,
        action,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Resolve failed');
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Resolve ticket"
      description="Pick the disposition; this records on the ticket and stops the resolution SLA clock."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Working…' : 'Resolve'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          select
          fullWidth
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value as SupportResolutionAction)}
          InputLabelProps={{ shrink: true }}
        >
          <MenuItem value="refund">Refund issued</MenuItem>
          <MenuItem value="replacement">Replacement sent</MenuItem>
          <MenuItem value="rejected">Claim rejected</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>
        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};

export const EscalateDialog = ({ open, ticketId, onClose }: BaseProps) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useEscalateTicket();
  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
    }
  }, [open]);
  const submit = async () => {
    if (!ticketId) return;
    if (!notes.trim()) {
      setError('A note is required when escalating.');
      return;
    }
    setError(null);
    try {
      await mut.mutateAsync({ id: ticketId, notes: notes.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Escalate failed');
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Escalate to next tier"
      description="Hands the ticket to the next escalation tier. Used when this tier can't resolve it."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Escalating…' : 'Escalate'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Why escalate? *"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};

interface ForceRefundProps extends BaseProps {
  maxAmount?: number;
}

export const ForceRefundDialog = ({ open, ticketId, onClose, maxAmount }: ForceRefundProps) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mut = useForceRefundTicket();
  useEffect(() => {
    if (open) {
      setAmount('');
      setNotes('');
      setError(null);
    }
  }, [open]);
  const submit = async () => {
    if (!ticketId) return;
    setError(null);
    let amountInr: number | undefined;
    if (amount.trim()) {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) {
        setError('Amount must be positive');
        return;
      }
      if (maxAmount !== undefined && n > maxAmount) {
        setError(`Cannot exceed ${maxAmount}`);
        return;
      }
      amountInr = n;
    }
    try {
      await mut.mutateAsync({ id: ticketId, amountInr, notes: notes.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refund failed');
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Force refund"
      description="Bypasses seller approval and pushes a Razorpay refund directly. Recorded on the ticket and the activity log."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Working…' : 'Issue refund'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          fullWidth
          type="number"
          label="Amount (₹) — blank for full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={maxAmount ? `up to ${maxAmount}` : ''}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: 1, step: '0.01' }}
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};
