import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Input, { inputClasses } from '@mui/material/Input';
import LoadingButton from '@mui/lab/LoadingButton';

import { useBoolean } from '@/hooks/use-boolean';

import { ApiError } from '@/types/api';
import { formatInr } from '@/lib/format';
import { useRequestWithdrawal } from './api';

// ----------------------------------------------------------------------

const STEP = 100;

type Props = {
  /** The most that can be withdrawn right now. */
  available: number;
};

/**
 * Minimal's quick-transfer panel, turned into a withdrawal: type or drag an
 * amount, see it against the balance, confirm. The slider is capped at what
 * has actually settled, so the amount can never be one the wallet can't pay.
 */
export function QuickWithdrawCard({ available }: Props) {
  const confirm = useBoolean();
  const mut = useRequestWithdrawal();

  const [amount, setAmount] = useState(0);
  const [autoWidth, setAutoWidth] = useState(24);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const max = Math.max(0, Math.floor(available));

  // The input grows with the number so the figure stays centred.
  useEffect(() => {
    setAutoWidth(Math.max(24, String(amount).length * 24));
  }, [amount]);

  const handleBlur = useCallback(() => {
    if (amount < 0) setAmount(0);
    else if (amount > max) setAmount(max);
  }, [amount, max]);

  const submit = async () => {
    setError(null);
    try {
      await mut.mutateAsync({ amountInr: amount, notes: notes.trim() || undefined });
      confirm.onFalse();
      setAmount(0);
      setNotes('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Withdrawal failed');
    }
  };

  return (
    <>
      <Box sx={{ borderRadius: 2, bgcolor: 'background.neutral' }}>
        <CardHeader
          title="Quick withdraw"
          subheader="Money settles in your bank in 1–2 business days"
        />

        <Box sx={{ p: 3 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            insert amount
          </Typography>

          <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
            <Box component="span" sx={{ typography: 'h5' }}>
              ₹
            </Box>
            <Input
              disableUnderline
              size="small"
              value={amount}
              onBlur={handleBlur}
              onChange={(e) => setAmount(Number(e.target.value))}
              inputProps={{ step: STEP, min: 0, max, type: 'number' }}
              sx={{
                [`& .${inputClasses.input}`]: {
                  p: 0,
                  typography: 'h3',
                  textAlign: 'center',
                  width: autoWidth,
                },
              }}
            />
          </Box>

          <Slider
            value={amount}
            valueLabelDisplay="auto"
            step={STEP}
            marks
            min={0}
            max={max || STEP}
            disabled={max <= 0}
            onChange={(_e, value) => setAmount(value as number)}
          />

          <Box sx={{ my: 4, display: 'flex', alignItems: 'center', typography: 'subtitle1' }}>
            <Box component="span" sx={{ flexGrow: 1 }}>
              Available to withdraw
            </Box>
            {formatInr(available)}
          </Box>

          <Button
            fullWidth
            size="large"
            color="inherit"
            variant="contained"
            disabled={amount <= 0 || amount > max}
            onClick={confirm.onTrue}
          >
            Withdraw now
          </Button>

          {max <= 0 && (
            <Typography
              variant="caption"
              sx={{ mt: 2, display: 'block', textAlign: 'center', color: 'text.disabled' }}
            >
              Nothing has settled yet — amounts still clearing cannot be withdrawn.
            </Typography>
          )}
        </Box>
      </Box>

      <Dialog open={confirm.value} onClose={confirm.onFalse} fullWidth maxWidth="xs">
        <DialogTitle>Withdraw {formatInr(amount)}?</DialogTitle>

        <DialogContent>
          <Stack spacing={2.5}>
            <Stack spacing={1} sx={{ typography: 'body2' }}>
              <Stack direction="row" justifyContent="space-between">
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  Available now
                </Box>
                <Box component="span">{formatInr(available)}</Box>
              </Stack>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack direction="row" justifyContent="space-between">
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  Left after this
                </Box>
                <Box component="span" sx={{ fontWeight: 'fontWeightBold' }}>
                  {formatInr(available - amount)}
                </Box>
              </Stack>
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={confirm.onFalse} disabled={mut.isPending}>
            Cancel
          </Button>
          <LoadingButton variant="contained" loading={mut.isPending} onClick={submit}>
            Confirm withdrawal
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
