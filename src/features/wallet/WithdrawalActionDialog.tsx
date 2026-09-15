import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LoadingButton from '@mui/lab/LoadingButton';

import { ApiError } from '@/types/api';
import { formatInr } from '@/lib/format';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { fDateTime } from '@/utils/format-time';
import { useCancelWithdrawal, useCompleteWithdrawal } from './api';
import type { WalletTransaction } from './types';

// ----------------------------------------------------------------------

export type WithdrawalAction = 'complete' | 'cancel';

/**
 * What each action actually does, in the admin's words rather than the API's.
 *
 * Completing is the only control in this panel that moves real money out of the
 * platform, and it cannot be undone from here — so it says so, and it asks for
 * a reason before it will run.
 */
const COPY: Record<
  WithdrawalAction,
  {
    title: string;
    lead: string;
    warning: string;
    severity: 'warning' | 'info';
    reasonLabel: string;
    reasonHint: string;
    confirm: string;
    color: 'success' | 'error';
    icon: string;
  }
> = {
  complete: {
    title: 'Send this money to the bank',
    lead: 'The seller’s bank details are decrypted and handed to the payout provider. If the transfer succeeds the amount leaves their wallet balance.',
    warning:
      'This moves real money and cannot be undone from this page. If the provider refuses, the request stays pending so you can try again.',
    severity: 'warning',
    reasonLabel: 'Why are you approving this?',
    reasonHint: 'e.g. verified against the seller’s KYC and the September payout run',
    confirm: 'Approve and pay out',
    color: 'success',
    icon: 'solar:card-transfer-bold',
  },
  cancel: {
    title: 'Turn down this request',
    lead: 'The held amount goes straight back to the seller’s available balance. Nothing is transferred and they can ask again.',
    warning:
      'The seller sees this request as declined. Your reason is stored on the record, so write something they would understand.',
    severity: 'info',
    reasonLabel: 'Why are you turning it down?',
    reasonHint: 'e.g. bank details do not match the registered account holder',
    confirm: 'Turn down request',
    color: 'error',
    icon: 'solar:close-circle-bold',
  },
};

const MIN_REASON = 4;

type Props = {
  open: boolean;
  action: WithdrawalAction;
  row: WalletTransaction | null;
  onClose: () => void;
  onDone?: (action: WithdrawalAction) => void;
};

export function WithdrawalActionDialog({ open, action, row, onClose, onDone }: Props) {
  const copy = COPY[action];
  const complete = useCompleteWithdrawal();
  const cancel = useCancelWithdrawal();
  const mut = action === 'complete' ? complete : cancel;

  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open, action, row?.id]);

  const submit = async () => {
    if (!row) return;
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON) {
      setError('Write a short reason — it is kept on the record for whoever reads this later.');
      return;
    }
    setError(null);
    try {
      await mut.mutateAsync({ id: row.id, reason: trimmed });
      onDone?.(action);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : (err as Error).message || 'That did not go through',
      );
    }
  };

  const sellerName = row?.seller?.farmName ?? row?.seller?.name ?? 'this seller';

  return (
    <Dialog open={open} onClose={mut.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify width={24} icon={copy.icon} sx={{ color: `${copy.color}.main` }} />
          {copy.title}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ typography: 'body2' }}>
        <Stack spacing={2.5}>
          <Box sx={{ color: 'text.secondary' }}>{copy.lead}</Box>

          {/* The row being acted on, restated — so nobody settles the wrong one. */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: 'background.neutral',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Box sx={{ typography: 'subtitle2' }}>{sellerName}</Box>
                {row?.seller?.sellerCode && (
                  <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
                    {row.seller.sellerCode}
                  </Box>
                )}
              </Box>
              <Box sx={{ typography: 'h5', color: `${copy.color}.main` }}>
                {formatInr(row?.amountInr ?? 0)}
              </Box>
            </Stack>

            <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Box sx={{ color: 'text.secondary' }}>Requested</Box>
                <Box>{row ? fDateTime(row.createdAt) : '—'}</Box>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ color: 'text.secondary' }}>Status</Box>
                <Label variant="soft" color="warning">
                  Pending
                </Label>
              </Stack>
              {row?.notes && (
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box sx={{ color: 'text.secondary', flexShrink: 0 }}>Seller’s note</Box>
                  <Box sx={{ textAlign: 'right', fontStyle: 'italic' }}>{row.notes}</Box>
                </Stack>
              )}
            </Stack>
          </Box>

          <Alert severity={copy.severity}>{copy.warning}</Alert>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            fullWidth
            multiline
            minRows={2}
            required
            autoFocus
            label={copy.reasonLabel}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={copy.reasonHint}
            InputLabelProps={{ shrink: true }}
            disabled={mut.isPending}
            // The API caps the note at 500; stop it here rather than letting
            // someone write a paragraph and have it bounce.
            inputProps={{ maxLength: 500 }}
            helperText={`${reason.trim().length}/500 · kept on the record`}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={mut.isPending}>
          Go back
        </Button>
        <LoadingButton
          variant="contained"
          color={copy.color}
          loading={mut.isPending}
          onClick={submit}
        >
          {copy.confirm}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
