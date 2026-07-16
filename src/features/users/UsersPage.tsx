import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ShieldOff, Users as UsersIcon } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { useClustersList } from '@/features/clusters/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/auth';
import { CreateUserDialog } from './CreateUserDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
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
  { value: 'CLUSTER_ADMIN', label: 'Cluster Admin' },
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

const HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'contact', label: 'Contact' },
  { id: 'cluster', label: 'Cluster' },
  { id: 'lastLogin', label: 'Last login' },
  { id: 'created', label: 'Created' },
  { id: 'action', label: '' },
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
    role === UserRole.CLUSTER_ADMIN ||
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
  const { data: clustersData } = useClustersList({ page: 1, limit: 100 });
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
    user?.role === UserRole.CLUSTER_ADMIN;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Users"
        description="All accounts on the platform — admins, sellers, buyers, promoters. Use status to suspend or reactivate. Suspending now also revokes all active refresh-token sessions; the 15-min access token is the longest residual access path."
        action={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create user
            </Button>
          ) : undefined
        }
      />

      <Card sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ color: 'text.secondary' }}>
          <ShieldOff className="h-4 w-4" />
          <Typography variant="body2" color="text.secondary">
            Suspending a user blocks login immediately and revokes every refresh token. Any
            in-flight 15-min access token will keep working until it expires; for a true hard
            cut, suspend then wait the access-TTL window.
          </Typography>
        </Stack>
      </Card>

      <Card>
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          alignItems="center"
          sx={{ p: 2.5 }}
        >
          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => setParam({ role: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          >
            {ROLE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setParam({ status: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ width: 240 }}>
            <ClusterPicker
              value={clusterId || null}
              onChange={(id) => setParam({ clusterId: id ?? '' })}
              placeholder="Filter by cluster…"
            />
          </Box>
          <TextField
            label="Search"
            value={scrub}
            onChange={(e) => setScrub(e.target.value)}
            placeholder="Name / email / mobile"
            InputLabelProps={{ shrink: true }}
            sx={{ width: 240 }}
          />
        </Stack>

        {isError && (
          <Box sx={{ px: 2.5, pb: 2, color: 'error.main', typography: 'body2' }}>
            {error instanceof Error ? error.message : 'Failed to load users'}
          </Box>
        )}

        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHeadCustom headLabel={HEAD} />
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {u.name}
                    </Stack>
                    <Box sx={{ color: 'text.secondary', typography: 'caption' }}>{u.id}</Box>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[u.status]}>{u.status}</Badge>
                  </TableCell>
                  <TableCell sx={{ typography: 'caption' }}>
                    {u.email && <Box>{u.email}</Box>}
                    {u.mobile && <Box sx={{ color: 'text.secondary' }}>{u.mobile}</Box>}
                  </TableCell>
                  <TableCell sx={{ typography: 'caption' }}>
                    {u.clusterId ? (clusterName.get(u.clusterId) ?? u.clusterId.slice(-10)) : '—'}
                  </TableCell>
                  <TableCell sx={{ typography: 'caption' }}>
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                  </TableCell>
                  <TableCell sx={{ typography: 'caption' }}>{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                      Update status
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableNoData notFound={!isLoading && visible.length === 0} />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, newPage) =>
            setParam({ page: String(Math.max(1, Math.min(pageCount, newPage + 1))) })
          }
          onRowsPerPageChange={() => setParam({ page: '1' })}
        />
      </Card>

      {isLoading && <Skeleton className="h-40 w-full" />}

      <UserStatusDialog open={editing !== null} user={editing} onClose={() => setEditing(null)} />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Stack>
  );
};
