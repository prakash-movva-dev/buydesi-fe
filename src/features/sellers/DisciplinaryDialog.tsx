import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError } from '@/types/api';

export type DisciplinaryAction = 'warn' | 'suspend' | 'reactivate';

interface DisciplinaryDialogProps {
  open: boolean;
  action: DisciplinaryAction | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
}

const config: Record<
  DisciplinaryAction,
  { title: string; description: string; submitLabel: string; variant: 'primary' | 'destructive' }
> = {
  warn: {
    title: 'Issue warning',
    description: 'The seller is notified with your reason. Recorded in their disciplinary history.',
    submitLabel: 'Issue warning',
    variant: 'primary',
  },
  suspend: {
    title: 'Suspend seller',
    description:
      'The seller goes offline and cannot transact until reactivated. Be specific about why.',
    submitLabel: 'Suspend',
    variant: 'destructive',
  },
  reactivate: {
    title: 'Reactivate seller',
    description: 'Lifts the suspension and restores the seller. Note the reason for the record.',
    submitLabel: 'Reactivate',
    variant: 'primary',
  },
};

export const DisciplinaryDialog = ({
  open,
  action,
  onClose,
  onSubmit,
}: DisciplinaryDialogProps) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open so consecutive uses don't leak the last reason.
  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!action) return null;
  const cfg = config[action];

  const handleSubmit = async () => {
    setError(null);
    if (!reason.trim()) {
      setError('Please provide a reason.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={cfg.title}
      description={cfg.description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={cfg.variant} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Working…' : cfg.submitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="disciplinary-reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="disciplinary-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Recorded in the disciplinary history. Be clear and actionable."
          rows={4}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
