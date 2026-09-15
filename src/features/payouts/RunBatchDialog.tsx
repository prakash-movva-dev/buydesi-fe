import { useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { Iconify } from '@/components/iconify';
import { toast } from '@/components/snackbar';
import { DateTimeField } from '@/components/ui/DateTimeField';

import { fCurrency } from '@/utils/format-number';
import { ApiError } from '@/types/api';

import { useRunPayoutBatch } from './api';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Settles off-cycle.
 *
 * The nightly and weekly batches already do this on their own, so this is for
 * catching up: an as-of in the past re-runs that window after downtime. Safe to
 * repeat — every settled item carries its payout id, so nothing is paid twice.
 */
export function RunBatchDialog({ open, onClose }: Props) {
  const [schedule, setSchedule] = useState<'daily' | 'weekly'>('daily');
  const [asOf, setAsOf] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = useRunPayoutBatch();

  useEffect(() => {
    if (open) {
      setSchedule('daily');
      setAsOf('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    try {
      const result = await run.mutateAsync({
        schedule,
        asOf: asOf ? new Date(asOf).toISOString() : undefined,
      });
      if (result.payoutsCreated === 0) {
        toast.info('Nothing was due — no seller had items past their return window.');
      } else {
        toast.success(
          `${result.payoutsCreated} payout${result.payoutsCreated === 1 ? '' : 's'} created, ` +
            `${fCurrency(result.totalNetInr)} credited` +
            (result.skippedSellers > 0 ? ` · ${result.skippedSellers} seller(s) skipped` : ''),
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The batch could not be run');
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={open}
      onClose={run.isPending ? undefined : onClose}
    >
      <DialogTitle sx={{ pb: 2 }}>Run a payout batch</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Settles every delivered order whose return window has closed, for sellers on the
            chosen schedule. Already-settled items are skipped.
          </Typography>

          <TextField
            select
            fullWidth
            label="Schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as 'daily' | 'weekly')}
            helperText={
              schedule === 'daily'
                ? 'Only sellers who chose daily settlement'
                : 'Only sellers who chose weekly settlement, for the week just ended'
            }
          >
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
          </TextField>

          <DateTimeField
            label="As of (optional)"
            value={asOf}
            onChange={setAsOf}
            helperText="Defaults to now. A past time re-runs that window — for catching up after downtime."
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={run.isPending}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={run.isPending}
          onClick={submit}
          startIcon={<Iconify icon="solar:play-bold" />}
        >
          Run batch
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
