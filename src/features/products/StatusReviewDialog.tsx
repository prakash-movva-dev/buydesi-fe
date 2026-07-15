import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError } from '@/types/api';

export type StatusAction = 'approve' | 'reject' | 'suspend';

interface StatusReviewDialogProps {
  open: boolean;
  action: StatusAction | null;
  count: number;
  onClose: () => void;
  onSubmit: (notes: string | undefined) => Promise<unknown>;
}

const config: Record<StatusAction, {
  title: (n: number) => string;
  description: string;
  submitLabel: string;
  variant: 'primary' | 'destructive' | 'outline';
  notesRequired: boolean;
}> = {
  approve: {
    title: (n) => (n === 1 ? 'Approve product' : `Approve ${n} products`),
    description: 'Product becomes LIVE and visible to buyers immediately.',
    submitLabel: 'Approve',
    variant: 'primary',
    notesRequired: false,
  },
  reject: {
    title: (n) => (n === 1 ? 'Reject product' : `Reject ${n} products`),
    description: 'The seller will see your reason. Be specific so they can resubmit cleanly.',
    submitLabel: 'Reject',
    variant: 'destructive',
    notesRequired: true,
  },
  suspend: {
    title: (n) => (n === 1 ? 'Suspend product' : `Suspend ${n} products`),
    description: 'Hides the product from buyers without rejecting it. Use for temporary issues.',
    submitLabel: 'Suspend',
    variant: 'outline',
    notesRequired: false,
  },
};

export const StatusReviewDialog = ({
  open,
  action,
  count,
  onClose,
  onSubmit,
}: StatusReviewDialogProps) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!action) return null;
  const cfg = config[action];

  const handleSubmit = async () => {
    setError(null);
    if (cfg.notesRequired && !notes.trim()) {
      setError('Please provide a reason.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(notes.trim() || undefined);
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
      title={cfg.title(count)}
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
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          fullWidth
          multiline
          minRows={4}
          label={`Notes ${cfg.notesRequired ? '*' : '(optional)'}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Visible to the seller."
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};
