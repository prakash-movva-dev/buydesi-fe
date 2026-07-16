import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useRegionsList } from '@/features/regions/api';
import { useAuth } from '@/lib/auth';
import { validateEmail, validateMobile, validateName } from '@/lib/validation';
import { ApiError, UserRole } from '@/types/api';
import { useAdminCreateUser } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FieldError = ({ show, message }: { show: boolean; message: string | null }) =>
  show && message ? <p className="text-xs text-destructive">{message}</p> : null;

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string }> = [
  { value: UserRole.SUB_SUPER_ADMIN, label: 'Sub-Super Admin', description: 'Near-super powers, no destructive actions.' },
  { value: UserRole.REGIONAL_ADMIN, label: 'Regional Admin', description: 'Supply & operations across a region (multiple clusters).' },
  { value: UserRole.CLUSTER_ADMIN, label: 'Cluster Admin', description: 'Operations for one cluster.' },
  { value: UserRole.CATEGORY_ADMIN, label: 'Category Admin', description: 'Catalog quality for one category branch.' },
  { value: UserRole.SUPPORT_ADMIN, label: 'Support Admin', description: 'Tickets, returns, refunds.' },
  { value: UserRole.SELLER, label: 'Seller', description: 'Onboarded farmer / vendor.' },
  { value: UserRole.PROMOTER, label: 'Promoter', description: 'Referral runner with a DESI coupon.' },
  { value: UserRole.BUYER, label: 'Buyer', description: 'End consumer (rare for admin-create).' },
];

const ADMIN_ROLES_FOR_SUPER: ReadonlyArray<UserRole> = [
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.CATEGORY_ADMIN,
  UserRole.SUPPORT_ADMIN,
  UserRole.SELLER,
  UserRole.PROMOTER,
  UserRole.BUYER,
];

// A Regional Admin runs their whole region: appoint Cluster / Category / Support
// admins (to clusters in their region) plus sellers/promoters/buyers.
const ROLES_FOR_REGIONAL_ADMIN: ReadonlyArray<UserRole> = [
  UserRole.CLUSTER_ADMIN,
  UserRole.CATEGORY_ADMIN,
  UserRole.SUPPORT_ADMIN,
  UserRole.SELLER,
  UserRole.PROMOTER,
  UserRole.BUYER,
];

// A Cluster Admin appoints Category / Support admins for their cluster.
const ROLES_FOR_CLUSTER_ADMIN: ReadonlyArray<UserRole> = [
  UserRole.CATEGORY_ADMIN,
  UserRole.SUPPORT_ADMIN,
  UserRole.SELLER,
  UserRole.PROMOTER,
  UserRole.BUYER,
];

export const CreateUserDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const isSuperTier =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const allowedRoles = isSuperTier
    ? ADMIN_ROLES_FOR_SUPER
    : user?.role === UserRole.REGIONAL_ADMIN
      ? ROLES_FOR_REGIONAL_ADMIN
      : ROLES_FOR_CLUSTER_ADMIN;
  const roleChoices = ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value));

  const create = useAdminCreateUser();
  const { data: regions } = useRegionsList();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(allowedRoles[0]);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [zone, setZone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setShowErrors(false);
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setRole(allowedRoles[0]);
    setClusterId(null);
    setRegionId(null);
    setCategoryId(null);
    setZone('');
  }, [open, allowedRoles]);

  // Cluster admins can only create users in their own cluster — pre-fill it.
  useEffect(() => {
    if (!open) return;
    if (!isSuperTier && user?.clusterId) setClusterId(user.clusterId);
  }, [open, isSuperTier, user?.clusterId]);

  const needsCluster =
    role === UserRole.CLUSTER_ADMIN ||
    role === UserRole.SUPPORT_ADMIN ||
    role === UserRole.SELLER ||
    role === UserRole.PROMOTER;
  const needsRegion = role === UserRole.REGIONAL_ADMIN;
  const needsCategory = role === UserRole.CATEGORY_ADMIN;

  // Mirrors the backend's required-scope rules:
  //   CLUSTER_ADMIN → clusterId, REGIONAL_ADMIN → regionId,
  //   CATEGORY_ADMIN → category, SUPPORT_ADMIN → clusterId.
  const clusterRequired =
    role === UserRole.CLUSTER_ADMIN ||
    role === UserRole.SUPPORT_ADMIN ||
    role === UserRole.SELLER;

  // ── Field-level validation (issue US-CA.1 / US-CA.23) ────────────────────
  const nameError = validateName(name);
  const mobileError = validateMobile(mobile);
  const emailError = validateEmail(email);
  const contactError =
    !email.trim() && !mobile.trim() ? 'Provide an email or mobile.' : null;
  const passwordError = password.length < 8 ? 'Password must be at least 8 characters.' : null;
  const categoryError = needsCategory && !categoryId ? 'Pick the category this admin will own.' : null;
  const clusterError = clusterRequired && !clusterId ? 'Pick the cluster this user belongs to.' : null;
  const regionError = needsRegion && !regionId ? 'Pick the region this admin will oversee.' : null;

  const isValid =
    !nameError &&
    !contactError &&
    !mobileError &&
    !emailError &&
    !passwordError &&
    !categoryError &&
    !clusterError &&
    !regionError;

  const submit = async () => {
    setError(null);
    if (!isValid) {
      setShowErrors(true);
      setError('Please fix the highlighted fields before submitting.');
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        password,
        role,
        clusterId: needsCluster ? (clusterId ?? undefined) : undefined,
        regionId: needsRegion ? (regionId ?? undefined) : undefined,
        category: needsCategory ? (categoryId ?? undefined) : undefined,
        zone: zone.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    }
  };

  const selectedRoleDesc = ROLE_OPTIONS.find((r) => r.value === role)?.description;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create user"
      description="Provisions an account out-of-band (no OTP). Use this for admins, sellers we onboard manually, or promoters. Buyers normally self-register."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              create.isPending ||
              (showErrors && !isValid) ||
              Boolean(clusterError) ||
              Boolean(regionError) ||
              Boolean(categoryError)
            }
          >
            {create.isPending ? 'Creating…' : 'Create user'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          <TextField
            fullWidth
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={showErrors && Boolean(nameError)}
            helperText={showErrors ? nameError ?? undefined : undefined}
          />
          <TextField
            select
            fullWidth
            label="Role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            InputLabelProps={{ shrink: true }}
            helperText={selectedRoleDesc || undefined}
          >
            {roleChoices.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          <TextField
            fullWidth
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={showErrors && Boolean(emailError)}
            helperText={showErrors ? emailError ?? undefined : undefined}
          />
          <PhoneInput
            fullWidth
            label="Mobile"
            value={mobile}
            onChange={setMobile}
            country="IN"
            error={showErrors && Boolean(mobileError ?? contactError)}
            helperText={showErrors ? (mobileError ?? contactError) ?? undefined : undefined}
          />
        </Box>

        <TextField
          fullWidth
          type="text"
          label="Temporary password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 chars — share with the user securely"
          InputLabelProps={{ shrink: true }}
          error={showErrors && Boolean(passwordError)}
          helperText={
            showErrors && passwordError
              ? passwordError
              : "We don't email this. Copy it from here and send via your team's secure channel. The user can change it from their profile after login."
          }
        />

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          {needsCluster && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Cluster {clusterRequired ? '*' : ''}</Typography>
              <ClusterPicker
                value={clusterId}
                onChange={setClusterId}
                disabled={user?.role === UserRole.CLUSTER_ADMIN}
                placeholder={
                  user?.role === UserRole.REGIONAL_ADMIN
                    ? 'Pick a cluster in your region…'
                    : 'Pick a cluster…'
                }
              />
              {user?.role === UserRole.CLUSTER_ADMIN && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Pinned to your own cluster.
                </Typography>
              )}
              {user?.role === UserRole.REGIONAL_ADMIN && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Must be a cluster within your region.
                </Typography>
              )}
              <FieldError show={showErrors} message={clusterError} />
            </Stack>
          )}
          {needsRegion && (
            <TextField
              select
              fullWidth
              label="Region"
              required
              value={regionId ?? ''}
              onChange={(e) => setRegionId(e.target.value || null)}
              InputLabelProps={{ shrink: true }}
              error={showErrors && Boolean(regionError)}
              helperText={showErrors ? regionError ?? undefined : undefined}
            >
              <MenuItem value="">Pick a region…</MenuItem>
              {(regions ?? []).map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                  {r.state ? ` — ${r.state}` : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          {needsCategory && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Category *</Typography>
              <CategoryPicker value={categoryId} onChange={setCategoryId} />
              <FieldError show={showErrors} message={categoryError} />
            </Stack>
          )}
          <TextField
            fullWidth
            label="Zone (optional)"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Stack>
    </Dialog>
  );
};
