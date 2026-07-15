import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError, UserRole } from '@/types/api';
import { useCreateCommissionRate, useUpdateCommissionRate } from './api';
import type { CommissionRate, CommissionScope } from './types';

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

  const submit = async () => {
    setError(null);
    const rate = Number(ratePercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError('Rate must be between 0 and 100');
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
          categoryId: scope === 'category' ? categoryId.trim() || undefined : undefined,
          productId: scope === 'product' ? productId.trim() || undefined : undefined,
          sellerId: scope === 'seller' ? sellerId.trim() || undefined : undefined,
          ratePercent: rate,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
          effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${editing!.scope} rate` : 'New commission rate'}
      description={
        isEdit
          ? 'Scope and target cannot be changed after creation. To re-target, deactivate this rate and create a new one.'
          : 'More-specific scopes win: seller > product > category. Without any match, the category default applies.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create rate'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {!isEdit && (
          <>
            <TextField
              id="rate-scope"
              select
              fullWidth
              label="Scope"
              required
              value={scope}
              onChange={(e) => setScope(e.target.value as CommissionScope)}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="product">Product</MenuItem>
              <MenuItem value="seller">Seller</MenuItem>
            </TextField>
            {scope === 'category' && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Category *</Typography>
                <CategoryPicker value={categoryId || null} onChange={(id) => setCategoryId(id ?? '')} />
              </Stack>
            )}
            {scope === 'product' && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Product *</Typography>
                <ProductPicker
                  status="LIVE"
                  value={productId || null}
                  onChange={(id) => setProductId(id ?? '')}
                />
              </Stack>
            )}
            {scope === 'seller' && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Seller *</Typography>
                <UserPicker
                  role={UserRole.SELLER}
                  value={sellerId || null}
                  onChange={(id) => setSellerId(id ?? '')}
                />
              </Stack>
            )}
          </>
        )}

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <TextField
            id="rate-pct"
            fullWidth
            type="number"
            label="Rate %"
            required
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: 0, max: 100, step: '0.1' }}
          />
          {isEdit && (
            <TextField
              id="rate-active"
              select
              fullWidth
              label="Status"
              value={active ? 'true' : 'false'}
              onChange={(e) => setActive(e.target.value === 'true')}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>
          )}
        </Box>

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {!isEdit && (
            <TextField
              id="rate-from"
              fullWidth
              type="date"
              label="Effective from"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}
          <TextField
            id="rate-to"
            fullWidth
            type="date"
            label="Effective to (optional)"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <TextField
          id="rate-notes"
          fullWidth
          multiline
          minRows={2}
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Dialog>
  );
};
