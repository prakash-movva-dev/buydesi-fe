import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PhoneInput } from '@/components/phone-input';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
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
        // PhoneInput emits E.164 (e.g. +91XXXXXXXXXX); accept the +91/0 prefixes too.
        if (mobile.trim() && !/^(?:\+?91|0)?[6-9]\d{9}$/.test(mobile.trim())) {
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
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          id="prom-name"
          fullWidth
          label="Display name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mumbai Influencers"
          InputLabelProps={{ shrink: true }}
          inputProps={{ maxLength: 40 }}
        />

        {isEdit ? (
          <TextField
            id="prom-active"
            select
            fullWidth
            label="Status"
            value={active ? 'true' : 'false'}
            onChange={(e) => setActive(e.target.value === 'true')}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive (coupon disabled)</MenuItem>
          </TextField>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <PhoneInput
                fullWidth
                label="Mobile"
                value={mobile}
                onChange={setMobile}
                country="IN"
              />
              <TextField
                id="prom-email"
                fullWidth
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2">Linked user (optional)</Typography>
                <UserPicker
                  role={UserRole.PROMOTER}
                  value={userId || null}
                  onChange={(id) => setUserId(id ?? '')}
                  placeholder="Pick a PROMOTER user…"
                />
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Cluster {isRegional ? '' : '*'}</Typography>
                <ClusterPicker
                  value={clusterId || null}
                  onChange={(id) => setClusterId(id ?? '')}
                  disabled={isRegional}
                  placeholder={isRegional ? 'Your cluster' : 'Select a cluster…'}
                />
                {isRegional ? (
                  <Typography variant="caption" color="text.secondary">
                    Promoters are created in your own cluster.
                  </Typography>
                ) : (
                  !clusterId.trim() && (
                    <Typography variant="caption" color="error">
                      Cluster is required.
                    </Typography>
                  )
                )}
              </Stack>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                id="prom-type"
                select
                fullWidth
                label="Discount type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="percent">Percent (%)</MenuItem>
                <MenuItem value="flat">Flat (₹)</MenuItem>
              </TextField>
              <TextField
                id="prom-value"
                fullWidth
                type="number"
                label="Discount value"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 1, step: discountType === 'percent' ? '0.1' : '1' }}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                id="prom-max"
                fullWidth
                type="number"
                label="Max discount ₹ (cap, optional)"
                value={maxDiscountInr}
                onChange={(e) => setMax(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0 }}
              />
              <TextField
                id="prom-min"
                fullWidth
                type="number"
                label="Min subtotal ₹"
                value={minSubtotalInr}
                onChange={(e) => setMin(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0 }}
              />
            </Box>

            <TextField
              id="prom-expiry"
              fullWidth
              type="datetime-local"
              label="Expires at (optional)"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </>
        )}
      </Stack>
    </Dialog>
  );
};
