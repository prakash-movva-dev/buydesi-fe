import { useEffect, useState } from 'react';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';
import { useCreatePromoter, useUpdatePromoter } from './api';
import type { Promoter } from './types';

interface Props {
  open: boolean;
  editing: Promoter | null;
  onClose: () => void;
  onCreated?: (couponCode: string) => void;
}

export const PromoterFormDialog = ({ open, editing, onClose, onCreated }: Props) => {
  const isEdit = Boolean(editing);
  const { user } = useAuth();
  // Cluster admins are pinned to their own cluster; super-tier admins must pick one.
  const isRegional = user?.role === UserRole.CLUSTER_ADMIN;
  const createMut = useCreatePromoter();
  const updateMut = useUpdatePromoter();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState('5');
  const [maxDiscountInr, setMax] = useState('');
  const [minSubtotalInr, setMin] = useState('0');
  const [expiresAt, setExpiresAt] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setMobile(editing.mobile ?? '');
      setEmail(editing.email ?? '');
      setActive(editing.active);
    } else {
      setName('');
      setMobile('');
      setEmail('');
      setUserId('');
      // Cluster admins can only create in their own cluster — default + lock to it.
      setClusterId(isRegional ? user?.clusterId ?? '' : '');
      setDiscountType('percent');
      setDiscountValue('5');
      setMax('');
      setMin('0');
      setExpiresAt('');
      setActive(true);
    }
  }, [open, editing, isRegional, user?.clusterId]);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Name must be at least 2 chars');
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id ?? editing._id!,
          patch: { name: name.trim(), active },
        });
      } else {
        if (!clusterId.trim()) {
          setError('Cluster is required');
          return;
        }
        const dv = Number(discountValue);
        if (!Number.isFinite(dv) || dv <= 0) {
          setError('Discount value must be positive');
          return;
        }
        if (discountType === 'percent' && dv > 100) {
          setError('Percent discount must be ≤ 100');
          return;
        }
        if (mobile.trim() && !/^[6-9]\d{9}$/.test(mobile.trim())) {
          setError('Mobile must be a valid 10-digit number');
          return;
        }
        if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
          setError('Enter a valid email address');
          return;
        }
        const result = await createMut.mutateAsync({
          name: name.trim(),
          mobile: mobile.trim() || undefined,
          email: email.trim() || undefined,
          userId: userId.trim() || undefined,
          clusterId: clusterId.trim() || undefined,
          discountType,
          discountValue: dv,
          maxDiscountInr: maxDiscountInr ? Number(maxDiscountInr) : undefined,
          minSubtotalInr: minSubtotalInr ? Number(minSubtotalInr) : 0,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        });
        if (result.couponCode && onCreated) onCreated(result.couponCode);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  const submitting = createMut.isPending || updateMut.isPending;
  // Cluster is required when creating (backend needs it for super-tier admins;
  // regional admins are auto-locked to their own cluster).
  const clusterMissing = !isEdit && !clusterId.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit promoter — ${editing!.name}` : 'New promoter'}
      description={
        isEdit
          ? 'Edits the visible name and active status. Discount terms are locked after creation.'
          : 'A unique DESI-XXX coupon code is generated automatically and bound to this promoter.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || clusterMissing}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create promoter'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="prom-name">Display name *</Label>
          <Input
            id="prom-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Mumbai Influencers"
          />
        </div>

        {isEdit ? (
          <div className="space-y-1.5">
            <Label htmlFor="prom-active">Status</Label>
            <Select
              id="prom-active"
              value={active ? 'true' : 'false'}
              onChange={(e) => setActive(e.target.value === 'true')}
            >
              <option value="true">Active</option>
              <option value="false">Inactive (coupon disabled)</option>
            </Select>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prom-mobile">Mobile</Label>
                <Input
                  id="prom-mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={10}
                  placeholder="10-digit number"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prom-email">Email</Label>
                <Input
                  id="prom-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Linked user (optional)</Label>
                <UserPicker
                  role={UserRole.PROMOTER}
                  value={userId || null}
                  onChange={(id) => setUserId(id ?? '')}
                  placeholder="Pick a PROMOTER user…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cluster {isRegional ? '' : '*'}</Label>
                <ClusterPicker
                  value={clusterId || null}
                  onChange={(id) => setClusterId(id ?? '')}
                  disabled={isRegional}
                  placeholder={isRegional ? 'Your cluster' : 'Select a cluster…'}
                />
                {isRegional ? (
                  <p className="text-xs text-muted-foreground">
                    Promoters are created in your own cluster.
                  </p>
                ) : (
                  !clusterId.trim() && (
                    <p className="text-xs text-destructive">Cluster is required.</p>
                  )
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prom-type">Discount type</Label>
                <Select
                  id="prom-type"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
                >
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat (₹)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prom-value">Discount value *</Label>
                <Input
                  id="prom-value"
                  type="number"
                  min={1}
                  step={discountType === 'percent' ? '0.1' : '1'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prom-max">Max discount ₹ (cap, optional)</Label>
                <Input
                  id="prom-max"
                  type="number"
                  min={0}
                  value={maxDiscountInr}
                  onChange={(e) => setMax(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prom-min">Min subtotal ₹</Label>
                <Input
                  id="prom-min"
                  type="number"
                  min={0}
                  value={minSubtotalInr}
                  onChange={(e) => setMin(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prom-expiry">Expires at (optional)</Label>
              <Input
                id="prom-expiry"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
