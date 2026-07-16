import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Headset, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
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
import { PhoneInput } from '@/components/phone-input';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { useAdminCreateUser, useUser, useUsersList } from '@/features/users/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import {
  useAttachClusterAdmin,
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

  const [tab, setTab] = useState<'overview' | 'admins' | 'performance'>('overview');

  return (
    <Stack spacing={3}>
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
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Typography variant="h4" component="h1">
                {c.name}
              </Typography>
              <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {c.state} · {c.district}
              {c.zone ? ` · ${c.zone}` : ''} · default transport{' '}
              <span className="font-medium">{c.defaultTradeTransport}</span>
            </Typography>
          </Stack>

          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="overview" label="Overview" />
            <Tab value="admins" label="Admins" />
            <Tab value="performance" label="Performance" />
          </Tabs>

          {tab === 'overview' && (
            <Stack spacing={3}>
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
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                      }}
                    >
                      <StatCard label="Sellers" value={String(stats.data.sellerCount)} />
                      <StatCard label="Pin codes served" value={String(stats.data.pinCodeCount)} />
                      <StatCard
                        label="Active categories"
                        value={String(stats.data.activeCategoryCount)}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>

              <ClusterDetailsCard cluster={c} />
            </Stack>
          )}

          {tab === 'admins' && (
            <Stack spacing={3}>
              <ClusterAdminsCard cluster={c} />
            </Stack>
          )}

          {tab === 'performance' && (
            <Stack spacing={3}>
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
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, 1fr)',
                          lg: 'repeat(3, 1fr)',
                        },
                      }}
                    >
                      <StatCard label="Orders" value={String(perfRow.orders)} />
                      <StatCard label="Revenue (₹)" value={formatInr(perfRow.revenueInr)} />
                      <StatCard label="Live listings" value={String(perfRow.liveListings)} />
                      <StatCard label="Open tickets" value={String(perfRow.openTickets)} />
                      <StatCard
                        label="Avg delivery"
                        value={
                          perfRow.avgDeliveryHours
                            ? `${perfRow.avgDeliveryHours.toFixed(1)} h`
                            : '—'
                        }
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography
      variant="caption"
      sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
      {value}
    </Typography>
  </Box>
);

const ClusterDetailsCard = ({ cluster }: { cluster: SafeCluster }) => {
  const rows: Array<[string, string]> = [
    ['Cluster code', cluster.code || '—'],
    ['Default transport', cluster.defaultTradeTransport || '—'],
    ['Launch date', cluster.launchDate ? formatDate(cluster.launchDate) : '—'],
    ['Cash on Delivery', cluster.codAllowed ? 'Allowed' : 'Disabled'],
    ['Contact phone', cluster.contactPhone || '—'],
    ['Contact email', cluster.contactEmail || '—'],
    ['Pickup hub PIN', cluster.hubPincode || '—'],
    ['Min order value', cluster.minOrderValueInr != null ? formatInr(cluster.minOrderValueInr) : '—'],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Details</CardTitle>
        <CardDescription>Cluster profile &amp; operations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Box
          sx={{
            display: 'grid',
            columnGap: 3,
            rowGap: 2.5,
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {rows.map(([label, value]) => (
            <DetailField key={label} label={label} value={value} />
          ))}
        </Box>
        {(cluster.hubAddress || cluster.description) && (
          <Stack spacing={2.5} sx={{ mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
            {cluster.hubAddress && (
              <DetailField label="Pickup hub address" value={cluster.hubAddress} />
            )}
            {cluster.description && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}
                >
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {cluster.description}
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Cluster admins (Lead + Category + Support) — SOW 4.2 ────────────────────

type AssignRole = 'CLUSTER_ADMIN' | 'CATEGORY_ADMIN' | 'SUPPORT_ADMIN';

const ROLE_META: Record<
  AssignRole,
  { title: string; pickRole: UserRole; needsCategory: boolean }
> = {
  CLUSTER_ADMIN: { title: 'Lead Cluster Admin', pickRole: UserRole.CLUSTER_ADMIN, needsCategory: false },
  CATEGORY_ADMIN: { title: 'Category Admin', pickRole: UserRole.CATEGORY_ADMIN, needsCategory: true },
  SUPPORT_ADMIN: { title: 'Support Admin', pickRole: UserRole.SUPPORT_ADMIN, needsCategory: false },
};

const ClusterAdminsCard = ({ cluster }: { cluster: SafeCluster }) => {
  const clusterId = cluster.id;
  const { user } = useAuth();
  const admins = useClusterAdmins(clusterId || undefined);
  const removeMut = useRemoveClusterAdmin(clusterId);
  const lead = useUser(cluster.adminId ?? undefined);
  const [assigning, setAssigning] = useState<AssignRole | null>(null);

  const isSuperTier =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;
  // Super-tier and the Regional Admin (who runs the region) can (re)assign the
  // lead Cluster Admin.
  const canSetLead = isSuperTier || user?.role === UserRole.REGIONAL_ADMIN;
  // Who may appoint the delegated Category/Support admins for this cluster.
  const canAppoint =
    isSuperTier ||
    user?.role === UserRole.REGIONAL_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;

  const rows = admins.data ?? [];
  const category = rows.filter((u) => u.role === UserRole.CATEGORY_ADMIN);
  const support = rows.filter((u) => u.role === UserRole.SUPPORT_ADMIN);

  return (
    <>
      {/* Lead Cluster Admin */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Lead Cluster Admin
            </CardTitle>
            <CardDescription>Runs this cluster end-to-end and manages its team.</CardDescription>
          </div>
          {canSetLead && (
            <Button size="sm" variant="outline" onClick={() => setAssigning('CLUSTER_ADMIN')}>
              <UserCog className="h-4 w-4" />
              {cluster.adminId ? 'Change lead' : 'Assign lead'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {cluster.adminId ? (
            lead.isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : lead.data ? (
              <AdminRow
                name={lead.data.name}
                subtitle={lead.data.email ?? lead.data.mobile ?? '—'}
              />
            ) : (
              <AdminRow name="Assigned admin" subtitle={cluster.adminId} />
            )
          ) : (
            <EmptyRow text="No lead admin assigned yet." />
          )}
        </CardContent>
      </Card>

      {/* Category admins */}
      <AdminSectionCard
        icon={<ShieldCheck className="h-4 w-4 text-blue-600" />}
        title="Category admins"
        description="Each is bound to this cluster and one category — they approve that category’s products & orders."
        count={category.length}
        canAppoint={canAppoint}
        addLabel="Add category admin"
        onAdd={() => setAssigning('CATEGORY_ADMIN')}
        loading={admins.isLoading}
        error={admins.isError ? 'Failed to load admins' : null}
        rows={category}
        onRemove={(id) => removeMut.mutate(id)}
        removing={removeMut.isPending}
      />

      {/* Support admins */}
      <AdminSectionCard
        icon={<Headset className="h-4 w-4 text-emerald-600" />}
        title="Support admins"
        description="Handle this cluster’s support tickets, returns and refunds."
        count={support.length}
        canAppoint={canAppoint}
        addLabel="Add support admin"
        onAdd={() => setAssigning('SUPPORT_ADMIN')}
        loading={admins.isLoading}
        error={admins.isError ? 'Failed to load admins' : null}
        rows={support}
        onRemove={(id) => removeMut.mutate(id)}
        removing={removeMut.isPending}
      />

      <AssignAdminDialog
        cluster={cluster}
        role={assigning}
        onClose={() => setAssigning(null)}
      />
    </>
  );
};

const AdminSectionCard = ({
  icon,
  title,
  description,
  count,
  canAppoint,
  addLabel,
  onAdd,
  loading,
  error,
  rows,
  onRemove,
  removing,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  canAppoint: boolean;
  addLabel: string;
  onAdd: () => void;
  loading: boolean;
  error: string | null;
  rows: Array<{ id: string; name: string; email?: string; mobile?: string }>;
  onRemove: (id: string) => void;
  removing: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
      <div>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="muted">{count}</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {canAppoint && (
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </CardHeader>
    <CardContent>
      {loading && <Skeleton className="h-16 w-full" />}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <EmptyRow text="None assigned yet." />
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
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
    </CardContent>
  </Card>
);

const AdminRow = ({ name, subtitle }: { name: string; subtitle: string }) => (
  <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
    <div className="min-w-0">
      <div className="text-sm font-medium">{name}</div>
      <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
    </div>
  </div>
);

const EmptyRow = ({ text }: { text: string }) => (
  <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
    {text}
  </p>
);

// Assign dialog — pick an EXISTING admin or CREATE a new one, for any of the
// three roles. Defaults to "create" when no existing admin of that role exists.
const AssignAdminDialog = ({
  cluster,
  role,
  onClose,
}: {
  cluster: SafeCluster;
  role: AssignRole | null;
  onClose: () => void;
}) => {
  const clusterId = cluster.id;
  const meta = role ? ROLE_META[role] : null;

  const create = useAdminCreateUser();
  const attach = useAttachClusterAdmin(clusterId);
  const updateCluster = useUpdateCluster();
  const qc = useQueryClient();

  const [mode, setMode] = useState<'existing' | 'create'>('existing');

  // Existing-select state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Create-new state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Are there existing admins of this role to choose from?
  const existing = useUsersList({
    role: meta?.pickRole,
    status: 'active',
    page: 1,
    limit: 100,
  });
  const hasExisting = (existing.data?.items.length ?? 0) > 0;

  const reset = () => {
    setSelectedUserId(null);
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setCategoryId(null);
    setError(null);
  };

  // Reset fields when the dialog opens for a role.
  useEffect(() => {
    if (role) {
      reset();
      setMode('existing');
    }
  }, [role]);

  // Fall back to "create" when there is nobody to select.
  useEffect(() => {
    if (role && !existing.isLoading && !hasExisting) setMode('create');
  }, [role, existing.isLoading, hasExisting]);

  const busy = create.isPending || attach.isPending || updateCluster.isPending;

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!role || !meta) return;
    setError(null);
    try {
      if (mode === 'existing') {
        if (!selectedUserId) return setError('Select an admin to assign.');
        if (meta.needsCategory && !categoryId) return setError('Pick the category for this admin.');
        if (role === 'CLUSTER_ADMIN') {
          await updateCluster.mutateAsync({ id: clusterId, patch: { adminId: selectedUserId } });
        } else {
          await attach.mutateAsync({
            userId: selectedUserId,
            category: meta.needsCategory ? categoryId ?? undefined : undefined,
          });
        }
      } else {
        if (name.trim().length < 2) return setError('Name is required.');
        if (!email.trim() && !mobile.trim()) return setError('Email or mobile is required.');
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        if (meta.needsCategory && !categoryId) return setError('Pick the category for this admin.');
        const created = await create.mutateAsync({
          name: name.trim(),
          email: email.trim() || undefined,
          mobile: mobile.trim() || undefined,
          password,
          role: role as unknown as UserRole,
          clusterId,
          category: meta.needsCategory ? categoryId ?? undefined : undefined,
        });
        if (role === 'CLUSTER_ADMIN') {
          await updateCluster.mutateAsync({ id: clusterId, patch: { adminId: created.id } });
        }
      }
      qc.invalidateQueries({ queryKey: ['clusters', 'admins', clusterId] });
      qc.invalidateQueries({ queryKey: ['clusters', 'detail', clusterId] });
      close();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not assign admin.');
    }
  };

  return (
    <Dialog
      open={role !== null}
      onClose={close}
      title={meta ? `Assign ${meta.title}` : 'Assign admin'}
      description={
        role === 'CLUSTER_ADMIN'
          ? 'Choose the admin who will run this cluster.'
          : `Add ${meta?.title} for this cluster — pick an existing one or create a new account.`
      }
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : mode === 'existing' ? 'Assign' : 'Create & assign'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={mode}
          onChange={(_e, v) => v && setMode(v)}
        >
          <ToggleButton value="existing" disabled={!hasExisting}>
            Select existing
          </ToggleButton>
          <ToggleButton value="create">Create new</ToggleButton>
        </ToggleButtonGroup>

        {mode === 'existing' ? (
          <Stack spacing={2}>
            {!hasExisting && !existing.isLoading ? (
              <Alert severity="info">
                No {meta?.title.toLowerCase()} accounts exist yet — create one instead.
              </Alert>
            ) : (
              <Stack spacing={1}>
                <Typography variant="subtitle2">{meta?.title} *</Typography>
                <UserPicker
                  role={meta?.pickRole}
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  placeholder={`Pick a ${meta?.title.toLowerCase()}…`}
                />
              </Stack>
            )}
            {meta?.needsCategory && hasExisting && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Category *</Typography>
                <CategoryPicker value={categoryId} onChange={setCategoryId} />
              </Stack>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <PhoneInput fullWidth label="Mobile" value={mobile} onChange={setMobile} country="IN" />
            </Box>
            <TextField
              fullWidth
              label="Temporary password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            {meta?.needsCategory && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Category *</Typography>
                <CategoryPicker value={categoryId} onChange={setCategoryId} />
              </Stack>
            )}
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Dialog>
  );
};
