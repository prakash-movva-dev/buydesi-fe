import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError } from '@/types/api';
import { useUpdateUserStatus } from './api';
import type { SafeUser, UserStatus } from './types';

interface Props {
  open: boolean;
  user: SafeUser | null;
  onClose: () => void;
}

export const UserStatusDialog = ({ open, user, onClose }: Props) => {
  const mut = useUpdateUserStatus();
  const [status, setStatus] = useState<UserStatus>('active');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setStatus(user.status);
      setReason('');
      setError(null);
    }
  }, [open, user]);

  const submit = async () => {
    if (!user) return;
    if (status === 'suspended' && !reason.trim()) {
      setError('Reason is required when suspending.');
      return;
    }
    setError(null);
    try {
      await mut.mutateAsync({ id: user.id, status, reason: reason.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={user ? `Update status — ${user.name}` : 'Update status'}
      description="Suspending a user blocks them from logging in. Reactivating restores access. Pending is for users who haven't completed OTP yet."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button
            variant={status === 'suspended' ? 'destructive' : 'primary'}
            onClick={submit}
            disabled={mut.isPending}
          >
            {mut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          select
          fullWidth
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus)}
          InputLabelProps={{ shrink: true }}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="pending">Pending (OTP not yet verified)</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
        </TextField>
        <TextField
          fullWidth
          multiline
          minRows={3}
          required={status === 'suspended'}
          label={status === 'suspended' ? 'Reason' : 'Reason (optional)'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};
