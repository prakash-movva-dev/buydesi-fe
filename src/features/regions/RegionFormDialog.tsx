import { useEffect, useState } from 'react';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { INDIA_STATES } from '@/utils/india-geo';
import { ApiError } from '@/types/api';
import { useCreateRegion, useUpdateRegion } from './api';
import type { SafeRegion } from './types';

interface Props {
  open: boolean;
  editing: SafeRegion | null;
  onClose: () => void;
}

export const RegionFormDialog = ({ open, editing, onClose }: Props) => {
  const isEdit = Boolean(editing);
  const createMut = useCreateRegion();
  const updateMut = useUpdateRegion();

  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [clusterIds, setClusterIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setState(editing.state ?? '');
      setClusterIds(editing.clusterIds ?? []);
    } else {
      setName('');
      setState('');
      setClusterIds([]);
    }
  }, [open, editing]);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Region name is required (at least 2 characters).');
      return;
    }
    try {
      const payload = {
        name: name.trim(),
        state: state.trim() || undefined,
        clusterIds,
      };
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, patch: payload });
      } else {
        await createMut.mutateAsync(payload);
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
      title={isEdit ? `Edit region — ${editing!.name}` : 'New region'}
      description="A region groups multiple clusters for aggregated oversight and performance reporting. It does not change each cluster's operational scoping."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create region'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rg-name">Name *</Label>
            <Input id="rg-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rg-state">State (optional)</Label>
            <Select id="rg-state" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">No specific state…</option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Clusters in this region</Label>
          <ClusterPicker
            multi
            values={clusterIds}
            onChange={setClusterIds}
            placeholder="Pick one or more clusters…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
