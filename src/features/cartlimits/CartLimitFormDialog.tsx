import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { ApiError } from '@/types/api';
import { useUpsertCartLimit } from './api';
import type { CartLimit, CartLimitKind } from './types';

interface Props {
  open: boolean;
  editing: CartLimit | null;
  onClose: () => void;
}

export const CartLimitFormDialog = ({ open, editing, onClose }: Props) => {
  const upsert = useUpsertCartLimit();
  const [kind, setKind] = useState<CartLimitKind>('regular');
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [maxQtyPerProduct, setMaxQty] = useState('20');
  const [maxDistinctItems, setMaxDistinct] = useState('50');
  const [maxCartValueInr, setMaxCart] = useState('25000');
  const [maxTotalWeightGrams, setMaxWeight] = useState('50000');
  const [maxCodValueInr, setMaxCod] = useState('5000');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setKind(editing.kind);
      setClusterId(editing.clusterId);
      setCategoryId(editing.categoryId);
      setMaxQty(String(editing.maxQtyPerProduct));
      setMaxDistinct(String(editing.maxDistinctItems));
      setMaxCart(String(editing.maxCartValueInr));
      setMaxWeight(String(editing.maxTotalWeightGrams));
      setMaxCod(String(editing.maxCodValueInr));
    } else {
      setKind('regular');
      setClusterId(null);
      setCategoryId(null);
      setMaxQty('20');
      setMaxDistinct('50');
      setMaxCart('25000');
      setMaxWeight('50000');
      setMaxCod('5000');
    }
  }, [open, editing]);

  const submit = async () => {
    setError(null);
    try {
      await upsert.mutateAsync({
        kind,
        clusterId,
        categoryId,
        maxQtyPerProduct: Number(maxQtyPerProduct),
        maxDistinctItems: Number(maxDistinctItems),
        maxCartValueInr: Number(maxCartValueInr),
        maxTotalWeightGrams: Number(maxTotalWeightGrams),
        maxCodValueInr: Number(maxCodValueInr),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Edit cart limit' : 'New cart limit'}
      description="Leave cluster and category blank for the platform default. Setting one creates a cluster- or category-scoped override; setting both creates a cluster_category override (the most specific wins at validate time)."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={upsert.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <div className="space-y-3">
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cl-kind">Kind</Label>
            <Select
              id="cl-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as CartLimitKind)}
              disabled={Boolean(editing)}
            >
              <option value="regular">Regular</option>
              <option value="bulk">Bulk</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cluster scope</Label>
            <ClusterPicker
              value={clusterId}
              onChange={setClusterId}
              placeholder="Blank = any cluster"
              disabled={Boolean(editing)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category scope</Label>
            <CategoryPicker
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Blank = any category"
              disabled={Boolean(editing)}
            />
          </div>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Field
            id="cl-mqpp"
            label="Max qty per product"
            value={maxQtyPerProduct}
            onChange={setMaxQty}
          />
          <Field
            id="cl-mdi"
            label="Max distinct items"
            value={maxDistinctItems}
            onChange={setMaxDistinct}
          />
          <Field
            id="cl-mcv"
            label="Max cart value (₹)"
            value={maxCartValueInr}
            onChange={setMaxCart}
          />
          <Field
            id="cl-mtw"
            label="Max total weight (g)"
            value={maxTotalWeightGrams}
            onChange={setMaxWeight}
          />
          {kind === 'regular' && (
            <Field
              id="cl-mcod"
              label="Max COD value (₹)"
              value={maxCodValueInr}
              onChange={setMaxCod}
              hint="Bulk orders are always PREPAID — this is ignored for kind=bulk."
            />
          )}
        </Box>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};

const Field = ({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);
