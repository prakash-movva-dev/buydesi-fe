import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
      <div className="space-y-2">
        <Label htmlFor="claim-notes">Initial note (optional)</Label>
        <Textarea
          id="claim-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Acknowledgement message visible to the raiser."
          rows={3}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
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
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="resolve-action">Action</Label>
          <Select
            id="resolve-action"
            value={action}
            onChange={(e) => setAction(e.target.value as SupportResolutionAction)}
          >
            <option value="refund">Refund issued</option>
            <option value="replacement">Replacement sent</option>
            <option value="rejected">Claim rejected</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resolve-notes">Notes (optional)</Label>
          <Textarea
            id="resolve-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
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
      <div className="space-y-2">
        <Label htmlFor="escalate-notes">
          Why escalate? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="escalate-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
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
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="force-amount">Amount (₹) — blank for full</Label>
          <Input
            id="force-amount"
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={maxAmount ? `up to ${maxAmount}` : ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="force-notes">Notes (optional)</Label>
          <Textarea
            id="force-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
