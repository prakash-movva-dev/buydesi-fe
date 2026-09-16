import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
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
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { useDebounce } from '@/hooks/use-debounce';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';

import { ApiError } from '@/types/api';

import { checkCodeAvailable, useCreateLink } from '@/features/affiliates/api';
import { TARGET_LABEL } from '@/features/affiliates/status-badge';
import type { AffiliateLinkTargetType } from '@/features/affiliates/types';

import { shareUrl } from './helpers';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Makes a share link.
 *
 * The code is theirs to choose, so it is checked as they type — finding out a
 * code is taken after pressing save, having already told people what it is, is
 * the annoying version of this screen.
 */
export function LinkBuilderDialog({ open, onClose }: Props) {
  const [code, setCode] = useState('');
  const [targetType, setTargetType] = useState<AffiliateLinkTargetType>('store');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const create = useCreateLink();
  const debouncedCode = useDebounce(code, 400);

  useEffect(() => {
    if (open) {
      setCode('');
      setTargetType('store');
      setTargetId(null);
      setLabel('');
      setError(null);
      setAvailable(null);
    }
  }, [open]);

  useEffect(() => {
    const value = debouncedCode.trim();
    if (value.length < 3) {
      setAvailable(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    checkCodeAvailable(value)
      .then((res) => {
        if (!cancelled) setAvailable(res.available);
      })
      .catch(() => {
        if (!cancelled) setAvailable(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedCode]);

  const needsTarget = targetType !== 'store';

  const submit = async () => {
    const value = code.trim().toUpperCase();
    if (value.length < 3) {
      setError('A code needs at least three characters');
      return;
    }
    if (needsTarget && !targetId) {
      setError(`Pick the ${targetType} this link should open`);
      return;
    }
    setError(null);
    try {
      const link = await create.mutateAsync({
        code: value,
        targetType,
        targetId: targetId ?? undefined,
        label: label.trim() || undefined,
      });
      toast.success(`${link.code} is live — share it and every sale counts for you`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the link');
    }
  };

  const preview = code.trim() ? shareUrl(code.trim().toUpperCase()) : shareUrl('YOUR-CODE');

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={create.isPending ? undefined : onClose}>
      <DialogTitle sx={{ pb: 2 }}>Make a share link</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            required
            autoFocus
            label="Your code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            placeholder="RAVI-MANGOES"
            inputProps={{ maxLength: 24 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {checking ? (
                    <CircularProgress size={16} />
                  ) : available === true ? (
                    <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                  ) : available === false ? (
                    <Iconify icon="solar:close-circle-bold" sx={{ color: 'error.main' }} />
                  ) : null}
                </InputAdornment>
              ),
            }}
            error={available === false}
            helperText={
              available === false
                ? 'Someone already has that code — try another'
                : 'Letters, digits and dashes. Pick something people can read out loud.'
            }
          />

          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: 'background.neutral',
              wordBreak: 'break-all',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Your link will be
            </Typography>
            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
              {preview}
            </Typography>
          </Box>

          <TextField
            select
            fullWidth
            label="Where it opens"
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value as AffiliateLinkTargetType);
              setTargetId(null);
            }}
            helperText="A link to one product converts better than a link to the whole shop"
          >
            {(['store', 'product', 'category'] as const).map((t) => (
              <MenuItem key={t} value={t}>
                {TARGET_LABEL[t]}
              </MenuItem>
            ))}
          </TextField>

          {targetType === 'product' && (
            <ProductPicker
              label="Product"
              required
              value={targetId}
              onChange={setTargetId}
              placeholder="Which product…"
            />
          )}

          {targetType === 'category' && (
            <CategoryPicker
              label="Category"
              required
              value={targetId}
              onChange={setTargetId}
              placeholder="Which category…"
            />
          )}

          <TextField
            fullWidth
            label="A note for yourself"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="WhatsApp group, Sunday market…"
            helperText="Only you see this — it helps when you have several links"
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={create.isPending}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={create.isPending}
          disabled={available === false}
          onClick={submit}
        >
          Create link
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
