import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="u-status">Status</Label>
          <Select
            id="u-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
          >
            <option value="active">Active</option>
            <option value="pending">Pending (OTP not yet verified)</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-reason">
            Reason {status === 'suspended' ? <span className="text-destructive">*</span> : '(optional)'}
          </Label>
          <Textarea
            id="u-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
