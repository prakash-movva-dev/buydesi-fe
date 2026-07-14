import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Headset, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { useAdminCreateUser } from '@/features/users/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import {
  useCluster,
  useClusterAdmins,
  useClusterPerformance,
  useClusterStats,
  useRemoveClusterAdmin,
  useUpdateCluster,
} from './api';
import type { ClusterStatus, SafeCluster } from './types';

const statusVariant: Record<ClusterStatus, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'muted',
};

// Default to the last 30 days for the single-cluster performance card.
const last30 = (): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: `${from.toISOString().slice(0, 10)}T00:00:00.000Z`,
    to: `${to.toISOString().slice(0, 10)}T23:59:59.999Z`,
  };
};

export const ClusterDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const cluster = useCluster(id);
  const stats = useClusterStats(id);

  const range = useMemo(last30, []);
  const performance = useClusterPerformance(
    { from: range.from, to: range.to, clusterId: id ?? '' },
    Boolean(id),
  );

  const perfRow = performance.data?.rows.find((r) => r.clusterId === id) ?? performance.data?.rows[0];

  const c = cluster.data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/clusters"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clusters
      </Link>

      {cluster.isLoading && <Skeleton className="h-24 w-full" />}
      {cluster.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {cluster.error instanceof Error ? cluster.error.message : 'Failed to load cluster'}
        </div>
      )}

      {c && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
                <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
              </div>
              <p className="text-muted-foreground">
                {c.state} · {c.district}
                {c.zone ? ` · ${c.zone}` : ''} · default transport{' '}
                <span className="font-medium">{c.defaultTradeTransport}</span>
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cluster stats</CardTitle>
              <CardDescription>Current sellers, pin codes and active categories.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.isLoading && <Skeleton className="h-20 w-full" />}
              {stats.isError && (
                <p className="text-sm text-destructive">
                  {stats.error instanceof Error ? stats.error.message : 'Failed to load stats'}
                </p>
              )}
              {stats.data && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Sellers" value={String(stats.data.sellerCount)} />
                  <Stat label="Pin codes served" value={String(stats.data.pinCodeCount)} />
                  <Stat label="Active categories" value={String(stats.data.activeCategoryCount)} />
                </div>
              )}
            </CardContent>
          </Card>

          <ClusterDetailsCard cluster={c} />

          <ClusterAdminsCard cluster={c} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance (last 30 days)</CardTitle>
              <CardDescription>
                {range.from.slice(0, 10)} → {range.to.slice(0, 10)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performance.isLoading && <Skeleton className="h-20 w-full" />}
              {performance.isError && (
                <p className="text-sm text-destructive">
                  {performance.error instanceof Error
                    ? performance.error.message
                    : 'Failed to load performance'}
                </p>
              )}
              {performance.data && !perfRow && (
                <p className="text-sm text-muted-foreground">
                  No performance data for this cluster in the selected range.
                </p>
              )}
              {perfRow && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Stat label="Orders" value={String(perfRow.orders)} />
                  <Stat label="Revenue (₹)" value={formatInr(perfRow.revenueInr)} />
                  <Stat label="Live listings" value={String(perfRow.liveListings)} />
                  <Stat label="Open tickets" value={String(perfRow.openTickets)} />
                  <Stat
                    label="Avg delivery"
                    value={
                      perfRow.avgDeliveryHours
                        ? `${perfRow.avgDeliveryHours.toFixed(1)} h`
                        : '—'
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-muted/30 p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
  </div>
);

const ClusterDetailsCard = ({ cluster }: { cluster: SafeCluster }) => {
  const rows: Array<[string, string]> = [
    ['Cluster code', cluster.code || '—'],
    ['Launch date', cluster.launchDate ? formatDate(cluster.launchDate) : '—'],
    ['Contact phone', cluster.contactPhone || '—'],
    ['Contact email', cluster.contactEmail || '—'],
    ['Pickup hub PIN', cluster.hubPincode || '—'],
    ['Cash on Delivery', cluster.codAllowed ? 'Allowed' : 'Disabled'],
    ['Min order value', cluster.minOrderValueInr != null ? formatInr(cluster.minOrderValueInr) : '—'],
    ['PIN codes served', String(cluster.pinCodes.length)],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Details</CardTitle>
        <CardDescription>Cluster profile & operations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {cluster.hubAddress && (
          <div>
            <div className="text-xs text-muted-foreground">Pickup hub address</div>
            <div className="text-sm">{cluster.hubAddress}</div>
          </div>
        )}
        {cluster.description && (
          <div>
            <div className="text-xs text-muted-foreground">Description</div>
            <p className="whitespace-pre-wrap text-sm">{cluster.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Cluster delegated admins (Category + Support) — SOW 4.2 ─────────────────

type NewAdminRole = 'CATEGORY_ADMIN' | 'SUPPORT_ADMIN';

const ClusterAdminsCard = ({ cluster }: { cluster: SafeCluster }) => {
  const clusterId = cluster.id;
  const { user } = useAuth();
  const admins = useClusterAdmins(clusterId || undefined);
  const removeMut = useRemoveClusterAdmin(clusterId);
  const updateCluster = useUpdateCluster();
  const [adding, setAdding] = useState<NewAdminRole | null>(null);

  // Only super-tier can (re)assign the lead Cluster Admin (cluster mutations).
  const canSetLead =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const rows = admins.data ?? [];
  const category = rows.filter((u) => u.role === UserRole.CATEGORY_ADMIN);
  const support = rows.filter((u) => u.role === UserRole.SUPPORT_ADMIN);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Cluster admins</CardTitle>
          <CardDescription>
            The lead Cluster Admin, plus the Category & Support admins who report to them.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAdding('CATEGORY_ADMIN')}>
            <Plus className="h-4 w-4" />
            Category admin
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAdding('SUPPORT_ADMIN')}>
            <Plus className="h-4 w-4" />
            Support admin
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lead Cluster Admin */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            Lead Cluster Admin
          </div>
          {canSetLead ? (
            <UserPicker
              role={UserRole.CLUSTER_ADMIN}
              value={cluster.adminId}
              onChange={(uid) =>
                updateCluster.mutate({ id: clusterId, patch: { adminId: uid ?? null } })
              }
              placeholder="Assign the lead Cluster Admin…"
            />
          ) : cluster.adminId ? (
            <p className="text-sm">Assigned.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not assigned yet.</p>
          )}
          {updateCluster.isError && (
            <p className="mt-1 text-xs text-destructive">
              {(updateCluster.error as Error)?.message ?? 'Failed to update'}
            </p>
          )}
        </div>

        {admins.isLoading && <Skeleton className="h-16 w-full" />}
        {admins.isError && (
          <p className="text-sm text-destructive">
            {admins.error instanceof Error ? admins.error.message : 'Failed to load admins'}
          </p>
        )}
        {admins.data && (
          <>
            <AdminGroup
              icon={<ShieldCheck className="h-4 w-4 text-blue-600" />}
              title="Category admins"
              rows={category}
              onRemove={(id) => removeMut.mutate(id)}
              removing={removeMut.isPending}
            />
            <AdminGroup
              icon={<Headset className="h-4 w-4 text-emerald-600" />}
              title="Support admins"
              rows={support}
              onRemove={(id) => removeMut.mutate(id)}
              removing={removeMut.isPending}
            />
          </>
        )}
      </CardContent>

      <AddClusterAdminDialog
        clusterId={clusterId}
        role={adding}
        onClose={() => setAdding(null)}
      />
    </Card>
  );
};

const AdminGroup = ({
  icon,
  title,
  rows,
  onRemove,
  removing,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<{ id: string; name: string; email?: string; mobile?: string }>;
  onRemove: (id: string) => void;
  removing: boolean;
}) => (
  <div>
    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {title} ({rows.length})
    </div>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">None assigned yet.</p>
    ) : (
      <ul className="divide-y divide-border rounded-md border border-border">
        {rows.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">{u.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {u.email ?? u.mobile ?? '—'}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={removing}
              onClick={() => onRemove(u.id)}
              title="Remove from cluster"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const AddClusterAdminDialog = ({
  clusterId,
  role,
  onClose,
}: {
  clusterId: string;
  role: NewAdminRole | null;
  onClose: () => void;
}) => {
  const create = useAdminCreateUser();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCategory = role === 'CATEGORY_ADMIN';
  const reset = () => {
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setCategoryId(null);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Name is required.');
    if (!email.trim() && !mobile.trim()) return setError('Email or mobile is required.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (isCategory && !categoryId) return setError('Pick the category for this admin.');
    try {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        password,
        role: role as unknown as UserRole,
        clusterId,
        category: isCategory ? categoryId ?? undefined : undefined,
      });
      qc.invalidateQueries({ queryKey: ['clusters', 'admins', clusterId] });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create admin.');
    }
  };

  return (
    <Dialog
      open={role !== null}
      onClose={() => {
        reset();
        onClose();
      }}
      title={isCategory ? 'Add Category Admin' : 'Add Support Admin'}
      description={
        isCategory
          ? 'Appoints a Category Admin bound to this cluster and their assigned category.'
          : 'Appoints a Support Admin who handles this cluster’s tickets and returns.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create admin'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ca-name">Name *</Label>
          <Input id="ca-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ca-email">Email</Label>
            <Input id="ca-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ca-mobile">Mobile</Label>
            <Input id="ca-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91…" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ca-pass">Temporary password *</Label>
          <Input id="ca-pass" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {isCategory && (
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <CategoryPicker value={categoryId} onChange={setCategoryId} />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
