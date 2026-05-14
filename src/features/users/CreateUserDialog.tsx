import { useEffect, useState } from 'react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';
import { useAdminCreateUser } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string }> = [
  { value: UserRole.SUB_SUPER_ADMIN, label: 'Sub-Super Admin', description: 'Near-super powers, no destructive actions.' },
  { value: UserRole.REGIONAL_ADMIN, label: 'Regional Admin', description: 'Operations for one cluster.' },
  { value: UserRole.CATEGORY_ADMIN, label: 'Category Admin', description: 'Catalog quality for one category branch.' },
  { value: UserRole.SUPPORT_ADMIN, label: 'Support Admin', description: 'Tickets, returns, refunds.' },
  { value: UserRole.SELLER, label: 'Seller', description: 'Onboarded farmer / vendor.' },
  { value: UserRole.PROMOTER, label: 'Promoter', description: 'Referral runner with a DESI coupon.' },
  { value: UserRole.BUYER, label: 'Buyer', description: 'End consumer (rare for admin-create).' },
];

const ADMIN_ROLES_FOR_SUPER: ReadonlyArray<UserRole> = [
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CATEGORY_ADMIN,
  UserRole.SUPPORT_ADMIN,
  UserRole.SELLER,
  UserRole.PROMOTER,
  UserRole.BUYER,
];

const ROLES_FOR_CLUSTER_ADMIN: ReadonlyArray<UserRole> = [
  UserRole.SELLER,
  UserRole.PROMOTER,
  UserRole.BUYER,
];

export const CreateUserDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const isSuperTier =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const allowedRoles = isSuperTier ? ADMIN_ROLES_FOR_SUPER : ROLES_FOR_CLUSTER_ADMIN;
  const roleChoices = ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value));

  const create = useAdminCreateUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(allowedRoles[0]);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [zone, setZone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setRole(allowedRoles[0]);
    setClusterId(null);
    setCategoryId(null);
    setZone('');
  }, [open, allowedRoles]);

  // Cluster admins can only create users in their own cluster — pre-fill it.
  useEffect(() => {
    if (!open) return;
    if (!isSuperTier && user?.clusterId) setClusterId(user.clusterId);
  }, [open, isSuperTier, user?.clusterId]);

  const needsCluster =
    role === UserRole.REGIONAL_ADMIN ||
    role === UserRole.SUPPORT_ADMIN ||
    role === UserRole.SELLER ||
    role === UserRole.PROMOTER;
  const needsCategory = role === UserRole.CATEGORY_ADMIN;

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Name is required (min 2 chars).');
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      setError('Provide an email or mobile.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (needsCategory && !categoryId) {
      setError('Pick the category this admin will own.');
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        password,
        role,
        clusterId: clusterId ?? undefined,
        category: categoryId ?? undefined,
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
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create user'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Name *</Label>
            <Input id="cu-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role *</Label>
            <Select
              id="cu-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {roleChoices.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            {selectedRoleDesc && (
              <p className="text-xs text-muted-foreground">{selectedRoleDesc}</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-mobile">Mobile</Label>
            <Input
              id="cu-mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+91…"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cu-password">Temporary password *</Label>
          <Input
            id="cu-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 chars — share with the user securely"
          />
          <p className="text-xs text-muted-foreground">
            We don't email this. Copy it from here and send via your team's secure channel.
            The user can change it from their profile after login.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {needsCluster && (
            <div className="space-y-1.5">
              <Label>
                Cluster {role === UserRole.REGIONAL_ADMIN || role === UserRole.SELLER ? '*' : ''}
              </Label>
              <ClusterPicker
                value={clusterId}
                onChange={setClusterId}
                disabled={!isSuperTier}
                placeholder="Pick a cluster…"
              />
              {!isSuperTier && (
                <p className="text-xs text-muted-foreground">Pinned to your own cluster.</p>
              )}
            </div>
          )}
          {needsCategory && (
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <CategoryPicker value={categoryId} onChange={setCategoryId} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cu-zone">Zone (optional)</Label>
            <Input id="cu-zone" value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
