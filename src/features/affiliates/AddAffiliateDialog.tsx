import { useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from '@/components/snackbar';
import { UserPicker } from '@/components/pickers/UserPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';

import { UserRole, ApiError } from '@/types/api';

import { useCreateAffiliate } from './api';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  /** A cluster admin recruits into their own cluster and nowhere else. */
  lockedClusterId?: string | null;
};

/**
 * Turns an existing affiliate-role account into an affiliate.
 *
 * The account comes first because an affiliate needs to sign in and watch their
 * own numbers — there is no point in a record nobody can look at.
 */
export function AddAffiliateDialog({ open, onClose, lockedClusterId }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(lockedClusterId ?? null);
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useCreateAffiliate();

  useEffect(() => {
    if (open) {
      setUserId(null);
      setClusterId(lockedClusterId ?? null);
      setRate('');
      setError(null);
    }
  }, [open, lockedClusterId]);

  const submit = async () => {
    if (!userId) {
      setError('Pick the account this affiliate signs in with');
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        userId,
        clusterId: clusterId ?? undefined,
        commissionRatePercent: rate ? Number(rate) : undefined,
      });
      toast.success('Affiliate added — they can create links now');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the affiliate');
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={create.isPending ? undefined : onClose}>
      <DialogTitle sx={{ pb: 2 }}>Add an affiliate</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Pick an account with the affiliate role. They create their own share codes; you can
            grant coupons afterwards.
          </Typography>

          <UserPicker
            label="Account"
            required
            role={UserRole.PROMOTER}
            value={userId}
            onChange={setUserId}
            placeholder="Search affiliate accounts…"
          />

          {!lockedClusterId && (
            <ClusterPicker
              label="Cluster"
              value={clusterId}
              onChange={setClusterId}
              placeholder="Which cluster they work"
            />
          )}

          <TextField
            fullWidth
            type="number"
            label="Commission rate"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Leave empty for the platform default"
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            inputProps={{ min: 0, max: 100, step: 0.5 }}
            helperText="Their share of each order subtotal they bring in"
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={create.isPending}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={create.isPending} onClick={submit}>
          Add affiliate
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
