import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { ApiError } from '@/types/api';
import { useVariants } from './variants.api';
import { useAdjustStock } from './api';
import type { SafeProduct } from '@/features/products/types';

// ----------------------------------------------------------------------

/** One tap adds this much — the amounts sellers reach for most. */
const QUICK_ADD = [1, 5, 10, 25, 50, 100];

type Props = {
  open: boolean;
  onClose: () => void;
  product: SafeProduct | null;
};

/**
 * Restocking without opening the edit wizard.
 *
 * "Add stock" sends a delta, which is what a seller actually means after a
 * harvest and is safe if a sale lands mid-edit; "Set exact" writes an absolute
 * count for a stock-take. A product sold in options gets a picker, because
 * each option holds its own quantity.
 */
export function StockAdjustDialog({ open, onClose, product }: Props) {
  const hasOptions = Boolean(product?.variantSummary?.hasVariants);

  const { data: variants } = useVariants(hasOptions && open ? product?.id : undefined);
  const adjust = useAdjustStock();

  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [variantId, setVariantId] = useState<string>('');
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Each opening starts clean, on the first option.
  useEffect(() => {
    if (!open) return;
    setMode('add');
    setAmount('10');
    setReason('');
    setError(null);
    setVariantId('');
  }, [open, product?.id]);

  const activeVariants = useMemo(() => (variants ?? []).filter((v) => v.active), [variants]);

  useEffect(() => {
    if (hasOptions && !variantId && activeVariants.length) setVariantId(activeVariants[0].id);
  }, [activeVariants, hasOptions, variantId]);

  const selected = activeVariants.find((v) => v.id === variantId);
  const current = hasOptions ? (selected?.stock.quantity ?? 0) : (product?.stock.quantity ?? 0);
  const unit = product?.unit ?? 'unit';

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && (mode === 'add' ? parsed !== 0 : parsed >= 0);
  const next = mode === 'add' ? current + parsed : parsed;
  const wouldGoNegative = valid && next < 0;

  const submit = async () => {
    if (!product || !valid || wouldGoNegative) return;
    setError(null);
    try {
      await adjust.mutateAsync({
        productId: product.id,
        ...(hasOptions && variantId ? { variantId } : {}),
        ...(mode === 'add' ? { delta: parsed } : { quantity: parsed }),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update stock');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 2 }}>
        Stock
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {product?.name}
        </Typography>
      </DialogTitle>

      <Tabs
        value={mode}
        onChange={(_e, v) => setMode(v as 'add' | 'set')}
        sx={{ px: 3, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.palette.divider}` }}
      >
        <Tab value="add" label="Add stock" />
        <Tab value="set" label="Set exact" />
      </Tabs>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          {hasOptions && (
            <TextField
              select
              fullWidth
              label="Option"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              helperText="Each option keeps its own quantity."
              InputLabelProps={{ shrink: true }}
            >
              {activeVariants.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.optionType}: {v.optionValue} — {v.stock.quantity} left
                </MenuItem>
              ))}
            </TextField>
          )}

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              In stock now
            </Typography>
            <Label variant="soft" color={current > 0 ? 'success' : 'error'}>
              {current} {unit}
            </Label>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" spacing={1} alignItems="center">
            {mode === 'add' && (
              <IconButton
                onClick={() => setAmount(String((Number(amount) || 0) - 1))}
                sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}
              >
                <Iconify icon="eva:minus-fill" width={18} />
              </IconButton>
            )}

            <TextField
              fullWidth
              type="number"
              label={mode === 'add' ? 'Add / remove' : 'New quantity'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ ...(mode === 'set' ? { min: 0 } : {}), style: { textAlign: 'center' } }}
            />

            {mode === 'add' && (
              <IconButton
                onClick={() => setAmount(String((Number(amount) || 0) + 1))}
                sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}
              >
                <Iconify icon="eva:plus-fill" width={18} />
              </IconButton>
            )}
          </Stack>

          {mode === 'add' && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {QUICK_ADD.map((n) => (
                <Button key={n} size="small" variant="outlined" onClick={() => setAmount(String(n))}>
                  +{n}
                </Button>
              ))}
            </Stack>
          )}

          <TextField
            fullWidth
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="New harvest, stock count, damage…"
            helperText="Optional — kept on the stock history."
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 200 }}
          />

          {wouldGoNegative ? (
            <Alert severity="error">
              That would take stock below zero — only {current} {unit} left.
            </Alert>
          ) : (
            valid && (
              <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
                After saving:{' '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 'fontWeightBold' }}>
                  {next} {unit}
                </Box>
              </Box>
            )
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={adjust.isPending}
          disabled={!valid || wouldGoNegative || (hasOptions && !variantId)}
          onClick={submit}
        >
          {mode === 'add' ? 'Update stock' : 'Set quantity'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
