import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { ApiError, UserRole } from '@/types/api';

import { Iconify } from '@/components/iconify';
import { DateField } from '@/components/ui/DateField';
import { UserPicker } from '@/components/pickers/UserPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';

import { useCreateCommissionRate, useUpdateCommissionRate } from './api';
import { SCOPE_COLOR, SCOPE_ICON } from './commission-table-row';
import type { CommissionRate, CommissionScope } from './types';

// ----------------------------------------------------------------------

const SCOPE_COPY: Record<CommissionScope, { label: string; help: string }> = {
  category: {
    label: 'A whole category',
    help: 'Charged on everything in the category, unless a product or seller rule overrides it.',
  },
  product: {
    label: 'One product',
    help: 'Charged on this product whoever sells it. A seller deal still beats it.',
  },
  seller: {
    label: 'One seller',
    help: 'Charged across everything this seller sells. Beats every other rule.',
  },
};

interface Props {
  open: boolean;
  editing: CommissionRate | null;
  onClose: () => void;
}

export const CommissionRateDialog = ({ open, editing, onClose }: Props) => {
  const isEdit = Boolean(editing);
  const createMut = useCreateCommissionRate();
  const updateMut = useUpdateCommissionRate();

  const [scope, setScope] = useState<CommissionScope>('category');
  const [categoryId, setCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [ratePercent, setRatePercent] = useState('');
  const [active, setActive] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setScope(editing.scope);
      setCategoryId(editing.categoryId ?? '');
      setProductId(editing.productId ?? '');
      setSellerId(editing.sellerId ?? '');
      setRatePercent(String(editing.ratePercent));
      setActive(editing.active);
      setEffectiveFrom(editing.effectiveFrom.slice(0, 10));
      setEffectiveTo(editing.effectiveTo ? editing.effectiveTo.slice(0, 10) : '');
      setNotes(editing.notes ?? '');
    } else {
      setScope('category');
      setCategoryId('');
      setProductId('');
      setSellerId('');
      setRatePercent('');
      setActive(true);
      setEffectiveFrom('');
      setEffectiveTo('');
      setNotes('');
    }
  }, [open, editing]);

  /** The target the chosen scope needs — nothing else counts as filled in. */
  const targetId =
    scope === 'category' ? categoryId : scope === 'product' ? productId : sellerId;

  const submit = async () => {
    setError(null);
    const rate = Number(ratePercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError('Rate must be a number between 0 and 100.');
      return;
    }
    if (!isEdit && !targetId) {
      setError(`Pick the ${scope} this rate applies to.`);
      return;
    }
    if (effectiveFrom && effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      setError('The end date has to come after the start date.');
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          patch: {
            ratePercent: rate,
            active,
            effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
            notes: notes.trim() || undefined,
          },
        });
      } else {
        await createMut.mutateAsync({
          scope,
          categoryId: scope === 'category' ? categoryId : undefined,
          productId: scope === 'product' ? productId : undefined,
          sellerId: scope === 'seller' ? sellerId : undefined,
          ratePercent: rate,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
          effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save that rate');
    }
  };

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify
            width={24}
            icon={SCOPE_ICON[scope]}
            sx={{ color: `${SCOPE_COLOR[scope]}.main` }}
          />
          {isEdit ? `Edit this ${editing!.scope} rate` : 'New commission rate'}
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
            {isEdit
              ? 'What it applies to is fixed once a rate exists. To point it somewhere else, switch this one off and write a new one — the old rate stays on the record.'
              : 'Creating a rate switches off any existing one with the same target, so there is only ever one live rate per seller, product or category.'}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {!isEdit && (
            <>
              <TextField
                select
                fullWidth
                required
                label="What does it apply to?"
                value={scope}
                onChange={(e) => setScope(e.target.value as CommissionScope)}
                InputLabelProps={{ shrink: true }}
                helperText={SCOPE_COPY[scope].help}
              >
                {(Object.keys(SCOPE_COPY) as CommissionScope[]).map((s) => (
                  <MenuItem key={s} value={s}>
                    {SCOPE_COPY[s].label}
                  </MenuItem>
                ))}
              </TextField>

              {scope === 'category' && (
                <CategoryPicker
                  label="Category"
                  required
                  value={categoryId || null}
                  onChange={(id) => setCategoryId(id ?? '')}
                  placeholder="Pick a category…"
                />
              )}
              {scope === 'product' && (
                <ProductPicker
                  label="Product"
                  required
                  value={productId || null}
                  onChange={(id) => setProductId(id ?? '')}
                  placeholder="Pick a product…"
                />
              )}
              {scope === 'seller' && (
                <UserPicker
                  role={UserRole.SELLER}
                  label="Seller"
                  required
                  value={sellerId || null}
                  onChange={(id) => setSellerId(id ?? '')}
                  placeholder="Pick a seller…"
                />
              )}
            </>
          )}

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <TextField
              fullWidth
              required
              type="number"
              label="Rate"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              inputProps={{ min: 0, max: 100, step: '0.1' }}
              helperText="Taken off each sale"
            />

            {isEdit && (
              <TextField
                select
                fullWidth
                label="Status"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="true">On</MenuItem>
                <MenuItem value="false">Switched off</MenuItem>
              </TextField>
            )}
          </Box>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {!isEdit && (
              <DateField
                label="Starts"
                value={effectiveFrom}
                onChange={setEffectiveFrom}
                fullWidth
                helperText="Blank means right away"
              />
            )}
            <DateField
              label="Ends"
              value={effectiveTo}
              onChange={setEffectiveTo}
              fullWidth
              helperText="Blank means it runs until switched off"
            />
          </Box>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Why"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. launch deal agreed with the seller for the first quarter"
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 500 }}
            helperText="Whoever reads this in six months will want to know"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={submitting} onClick={submit}>
          {isEdit ? 'Save changes' : 'Create rate'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
