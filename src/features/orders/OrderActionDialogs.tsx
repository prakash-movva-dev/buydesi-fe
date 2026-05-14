import { useEffect, useState } from 'react';
import {
  readNumber,
  useExposedSettingMap,
} from '@/features/platform-settings/exposed';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';
import { useCancelOrder, useRefundOrder } from './api';

interface CancelDialogProps {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
}

export const CancelOrderDialog = ({ open, orderId, onClose }: CancelDialogProps) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cancelMut = useCancelOrder();

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!orderId) return;
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    setError(null);
    try {
      await cancelMut.mutateAsync({ id: orderId, reason: reason.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cancel failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancel order"
      description="The order moves to CANCELLED and the buyer is notified. Refund (if any) is separate — initiate from this page after."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={cancelMut.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={cancelMut.isPending}>
            {cancelMut.isPending ? 'Cancelling…' : 'Cancel order'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="cancel-reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Visible internally and to the buyer."
          rows={4}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};

interface RefundDialogProps {
  open: boolean;
  orderId: string | null;
  maxAmount: number;
  onClose: () => void;
}

export const RefundOrderDialog = ({ open, orderId, maxAmount, onClose }: RefundDialogProps) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const refundMut = useRefundOrder();
  const { user } = useAuth();
  const { map: settings } = useExposedSettingMap();
  const isSupport = user?.role === UserRole.SUPPORT_ADMIN;
  const perCapInr = readNumber(settings, 'support.refundCapPaise', 200_000) / 100;
  const dailyCapInr = readNumber(settings, 'support.refundDailyCapPaise', 1_000_000) / 100;

  useEffect(() => {
    if (open) {
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!orderId) return;
    setError(null);
    let amountInr: number | undefined = undefined;
    if (amount.trim()) {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) {
        setError('Amount must be a positive number');
        return;
      }
      if (n > maxAmount) {
        setError(`Amount cannot exceed the order total (${maxAmount})`);
        return;
      }
      if (isSupport && n > perCapInr) {
        setError(
          `Per-refund cap is ₹${perCapInr.toLocaleString('en-IN')}. Above this, escalate to a super admin.`,
        );
        return;
      }
      amountInr = n;
    } else if (isSupport && maxAmount > perCapInr) {
      // Full-refund path implicitly exceeds the cap.
      setError(
        `A full refund of ₹${maxAmount.toLocaleString('en-IN')} exceeds your per-refund cap of ₹${perCapInr.toLocaleString('en-IN')}. Enter a smaller amount or escalate.`,
      );
      return;
    }
    try {
      await refundMut.mutateAsync({
        orderId,
        amountInr,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refund failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Initiate refund"
      description="Triggers a Razorpay refund against the captured payment. Leave amount blank for a full refund of the remaining balance."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={refundMut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={refundMut.isPending}>
            {refundMut.isPending ? 'Working…' : 'Initiate refund'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {isSupport && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Your refund authority: <span className="font-semibold">₹{perCapInr.toLocaleString('en-IN')}</span> per refund ·{' '}
            <span className="font-semibold">₹{dailyCapInr.toLocaleString('en-IN')}</span> rolling 24h. Above
            these, escalate to a super admin.
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="refund-amount">Amount (₹) — leave blank for full</Label>
          <Input
            id="refund-amount"
            type="number"
            min={1}
            max={maxAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`up to ${maxAmount}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="refund-reason">Reason (optional)</Label>
          <Textarea
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Recorded on the payment events log."
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
