import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError } from '@/types/api';

export type ReviewAction = 'approve' | 'reject' | 'request-info';

interface ReviewDialogProps {
  open: boolean;
  action: ReviewAction | null;
  onClose: () => void;
  onSubmit: (notes: string | undefined) => Promise<unknown>;
}

const config: Record<ReviewAction, {
  title: string;
  description: string;
  submitLabel: string;
  variant: 'primary' | 'destructive';
  notesRequired: boolean;
}> = {
  approve: {
    title: 'Approve seller',
    description: 'They will go live and can start listing products.',
    submitLabel: 'Approve',
    variant: 'primary',
    notesRequired: false,
  },
  reject: {
    title: 'Reject seller',
    description: 'The seller will be notified with your reason. Be specific.',
    submitLabel: 'Reject',
    variant: 'destructive',
    notesRequired: true,
  },
  'request-info': {
    title: 'Request more information',
    description:
      'Use this when KYC docs are unclear or details are missing. The seller can resubmit.',
    submitLabel: 'Send request',
    variant: 'primary',
    notesRequired: true,
  },
};

export const ReviewDialog = ({ open, action, onClose, onSubmit }: ReviewDialogProps) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open so consecutive uses don't leak the last reason.
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
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          fullWidth
          multiline
          minRows={4}
          required={cfg.notesRequired}
          label={cfg.notesRequired ? 'Notes' : 'Notes (optional)'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Visible to the seller. Be clear and actionable."
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};
