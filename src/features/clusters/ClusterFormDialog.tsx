import { useEffect, useState } from 'react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { INDIA_STATES, districtsForState } from '@/utils/india-geo';
import { ApiError, UserRole } from '@/types/api';
import { useCreateCluster, useUpdateCluster } from './api';
import type {
  ClusterStatus,
  SafeCluster,
  TradeTransportMode,
} from './types';

interface Props {
  open: boolean;
  editing: SafeCluster | null;
  onClose: () => void;
}

const splitWords = (s: string): string[] =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

export const ClusterFormDialog = ({ open, editing, onClose }: Props) => {
  const isEdit = Boolean(editing);
  const createMut = useCreateCluster();
  const updateMut = useUpdateCluster();

  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [pinCodesText, setPinCodesText] = useState('');
  const [adminId, setAdminId] = useState('');
  const [zone, setZone] = useState('');
  const [statusVal, setStatusVal] = useState<ClusterStatus>('active');
  const [defaultTradeTransport, setTransport] = useState<TradeTransportMode>('LOCAL');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setState(editing.state);
      setDistrict(editing.district);
      setPinCodesText(editing.pinCodes.join(', '));
      setAdminId(editing.adminId ?? '');
      setZone(editing.zone ?? '');
      setStatusVal(editing.status);
      setTransport(editing.defaultTradeTransport);
      setActiveCategories(editing.activeCategories ?? []);
    } else {
      setName('');
      setState('');
      setDistrict('');
      setPinCodesText('');
      setAdminId('');
      setZone('');
      setStatusVal('active');
      setTransport('LOCAL');
      setActiveCategories([]);
    }
  }, [open, editing]);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2 || state.trim().length < 2 || district.trim().length < 2) {
      setError('Name, state and district are required.');
      return;
    }
    const pinCodes = splitWords(pinCodesText);
    for (const p of pinCodes) {
      if (!/^\d{6}$/.test(p)) {
        setError(`Pin code "${p}" must be 6 digits.`);
        return;
      }
    }
    try {
      const payload = {
        name: name.trim(),
        state: state.trim(),
        district: district.trim(),
        pinCodes,
        adminId: adminId.trim() || null,
        zone: zone.trim() || undefined,
        status: statusVal,
        defaultTradeTransport,
        activeCategories,
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
      title={isEdit ? `Edit cluster — ${editing!.name}` : 'New cluster'}
      description="Clusters define geographic operating boundaries. Pin codes determine which buyers a cluster's sellers can serve."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create cluster'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cl-name">Name *</Label>
            <Input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-state">State *</Label>
            <Select
              id="cl-state"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                // Clear the district when the state changes so it can't be stale.
                setDistrict('');
              }}
            >
              <option value="">Select a state…</option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-district">District *</Label>
            <Input
              id="cl-district"
              list="cl-district-options"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder={state ? 'Pick or type a district…' : 'Select a state first'}
              disabled={!state}
            />
            <datalist id="cl-district-options">
              {districtsForState(state).map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cl-pins">Pin codes</Label>
          <Textarea
            id="cl-pins"
            value={pinCodesText}
            onChange={(e) => setPinCodesText(e.target.value)}
            rows={3}
            placeholder="comma or space separated 6-digit codes"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cluster admin</Label>
            <UserPicker
              role={UserRole.CLUSTER_ADMIN}
              value={adminId || null}
              onChange={(id) => setAdminId(id ?? '')}
              placeholder="Pick a regional admin…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-zone">Zone (optional)</Label>
            <Input id="cl-zone" value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Active categories (optional)</Label>
          <CategoryPicker
            multi
            values={activeCategories}
            onChange={setActiveCategories}
            placeholder="Pick which categories this cluster serves…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cl-status">Status</Label>
            <Select
              id="cl-status"
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value as ClusterStatus)}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-transport">Default trade transport</Label>
            <Select
              id="cl-transport"
              value={defaultTradeTransport}
              onChange={(e) => setTransport(e.target.value as TradeTransportMode)}
            >
              <option value="LOCAL">Local (within cluster)</option>
              <option value="DELHIVERY">Delhivery (inter-cluster)</option>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
