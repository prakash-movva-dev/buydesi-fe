import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, ShieldOff, Users as UsersIcon } from 'lucide-react';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { useClustersList } from '@/features/clusters/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/lib/auth';
import { CreateUserDialog } from './CreateUserDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { formatDate } from '@/lib/format';
import { UserRole } from '@/types/api';
import { useUsersList } from './api';
import { UserStatusDialog } from './UserStatusDialog';
import type { SafeUser, UserStatus, UsersListQuery } from './types';

const ROLE_OPTIONS = [
  { value: '', label: 'Any role' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'SUB_SUPER_ADMIN', label: 'Sub-Super Admin' },
  { value: 'REGIONAL_ADMIN', label: 'Regional Admin' },
  { value: 'CATEGORY_ADMIN', label: 'Category Admin' },
  { value: 'SUPPORT_ADMIN', label: 'Support Admin' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'BUYER', label: 'Buyer' },
  { value: 'PROMOTER', label: 'Promoter' },
];

const STATUS_OPTIONS: Array<{ value: '' | UserStatus; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
];

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'destructive',
};

const roleVariant = (role: UserRole): 'info' | 'warning' | 'success' | 'muted' | 'destructive' => {
  if (role === UserRole.SUPER_ADMIN) return 'destructive';
  if (role === UserRole.SUB_SUPER_ADMIN) return 'warning';
  if (
    role === UserRole.REGIONAL_ADMIN ||
    role === UserRole.CATEGORY_ADMIN ||
    role === UserRole.SUPPORT_ADMIN
  )
    return 'info';
  if (role === UserRole.SELLER || role === UserRole.PROMOTER) return 'success';
  return 'muted';
};

const PAGE_SIZE = 25;

export const UsersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = (searchParams.get('role') as UserRole | null) ?? '';
  const status = (searchParams.get('status') as UserStatus | null) ?? '';
  const clusterId = searchParams.get('clusterId') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<UsersListQuery>(
    () => ({
      role: role || undefined,
      status: status || undefined,
      clusterId: clusterId || undefined,
      q: searchParams.get('q') || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [role, status, clusterId, page, searchParams],
  );

  const { data, isLoading, isError, error } = useUsersList(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  // Map cluster id → name so the table shows readable cluster names.
  const { data: clustersData } = useClustersList({ page: 1, limit: 200 });
  const clusterName = useMemo(() => {
    const map = new Map<string, string>();
    (clustersData?.items ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clustersData]);

  // Debounced text → URL `q` param → fed back into the query via memo.
  const [scrub, setScrub] = useState(searchParams.get('q') ?? '');
  useEffect(() => {
    const t = setTimeout(() => {
      const current = searchParams.get('q') ?? '';
      if (scrub.trim() === current) return;
      const params = new URLSearchParams(searchParams);
      if (scrub.trim()) params.set('q', scrub.trim());
      else params.delete('q');
      params.set('page', '1');
      setSearchParams(params);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrub]);
  const visible = data?.items ?? [];

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  const [editing, setEditing] = useState<SafeUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuth();
  const canCreate =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.REGIONAL_ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            All accounts on the platform — admins, sellers, buyers, promoters. Use status to
            suspend or reactivate. Suspending now also revokes all active refresh-token
            sessions; the 15-min access token is the longest residual access path.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create user
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2">
            <ShieldOff className="h-4 w-4" />
            Suspending a user blocks login immediately and revokes every refresh token. Any
            in-flight 15-min access token will keep working until it expires; for a true hard
            cut, suspend then wait the access-TTL window.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={role} onChange={(e) => setParam({ role: e.target.value })}>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setParam({ status: e.target.value })}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <ClusterPicker
          value={clusterId || null}
          onChange={(id) => setParam({ clusterId: id ?? '' })}
          placeholder="Filter by cluster…"
        />
        <Input
          value={scrub}
          onChange={(e) => setScrub(e.target.value)}
          placeholder="Search by name / email / mobile"
        />
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load users'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {u.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[u.status]}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.email && <div>{u.email}</div>}
                    {u.mobile && <div className="text-muted-foreground">{u.mobile}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.clusterId ? (clusterName.get(u.clusterId) ?? u.clusterId.slice(-10)) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                      Update status
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No users match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {visible.length} of {total} · page {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.max(1, page - 1)) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.min(pageCount, page + 1)) })}
                disabled={page >= pageCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <UserStatusDialog open={editing !== null} user={editing} onClose={() => setEditing(null)} />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
};
