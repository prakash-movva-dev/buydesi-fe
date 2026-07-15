import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
      <div className="space-y-3">
        {!isEdit && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="rate-scope">Scope *</Label>
              <Select
                id="rate-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as CommissionScope)}
              >
                <option value="category">Category</option>
                <option value="product">Product</option>
                <option value="seller">Seller</option>
              </Select>
            </div>
            {scope === 'category' && (
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <CategoryPicker value={categoryId || null} onChange={(id) => setCategoryId(id ?? '')} />
              </div>
            )}
            {scope === 'product' && (
              <div className="space-y-1.5">
                <Label>Product *</Label>
                <ProductPicker
                  status="LIVE"
                  value={productId || null}
                  onChange={(id) => setProductId(id ?? '')}
                />
              </div>
            )}
            {scope === 'seller' && (
              <div className="space-y-1.5">
                <Label>Seller *</Label>
                <UserPicker
                  role={UserRole.SELLER}
                  value={sellerId || null}
                  onChange={(id) => setSellerId(id ?? '')}
                />
              </div>
            )}
          </>
        )}

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="space-y-1.5">
            <Label htmlFor="rate-pct">Rate % *</Label>
            <Input
              id="rate-pct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
            />
          </div>
          {isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="rate-active">Status</Label>
              <Select
                id="rate-active"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          )}
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="rate-from">Effective from</Label>
              <Input
                id="rate-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rate-to">Effective to (optional)</Label>
            <Input
              id="rate-to"
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </div>
        </Box>

        <div className="space-y-1.5">
          <Label htmlFor="rate-notes">Notes</Label>
          <Textarea
            id="rate-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
