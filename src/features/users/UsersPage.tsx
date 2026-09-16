import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';

import { varAlpha } from '@/theme/styles';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { useDebounce } from '@/hooks/use-debounce';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';
import Chip from '@mui/material/Chip';
import {
  useTable,
  emptyRows,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '@/components/table';

import { useClustersList } from '@/features/clusters/api';
import { useRegionsList } from '@/features/regions/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useUsersList } from './api';
import { CreateUserDialog } from './CreateUserDialog';
import { UserStatusDialog } from './UserStatusDialog';
import { ROLE_LABEL, UserTableRow } from './user-table-row';
import type { SafeUser, UserStatus, UsersListQuery } from './types';

// ----------------------------------------------------------------------

const STATUS_TABS: Array<{ value: '' | UserStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
];

/** Staff first — they are who an admin comes here to manage. */
const ROLE_ORDER: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
  UserRole.CATEGORY_ADMIN,
  UserRole.PROMOTER,
  UserRole.SELLER,
  UserRole.BUYER,
];

const TABLE_HEAD = [
  { id: 'name', label: 'Account' },
  { id: 'role', label: 'Role', width: 160 },
  { id: 'scope', label: 'Covers', width: 170 },
  { id: 'lastLogin', label: 'Last seen', width: 150 },
  { id: 'created', label: 'Added', width: 120 },
  { id: 'status', label: 'Status', width: 120 },
  { id: '', width: 60 },
];

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * Every account on the platform.
 *
 * The column that earns its place is "covers": a cluster or support admin with
 * no cluster, or a category admin with no category, can sign in and do nothing.
 * That is invisible on a plain user list and obvious here.
 */
export const UsersPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });

  const [editing, setEditing] = useState<SafeUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const status = (searchParams.get('status') as UserStatus | null) ?? '';
  const role = (searchParams.get('role') as UserRole | null) ?? '';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));

  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search, 400);

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      if (!('page' in next)) params.delete('page');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // One request per pause in typing, not one per keystroke.
  useMemo(() => {
    if (debounced !== q) setParams({ q: debounced || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const query = useMemo<UsersListQuery>(
    () => ({
      status: status || undefined,
      role: role || undefined,
      q: q || undefined,
      page,
      limit,
    }),
    [status, role, q, page, limit],
  );

  const { data, isLoading, isError, error } = useUsersList(query);
  const { data: clusters } = useClustersList({ page: 1, limit: 100 });
  const { data: regions } = useRegionsList();

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.meta.counts;
  const roleCounts = data?.meta.roleCounts;

  const clusterName = useMemo(
    () => new Map((clusters?.items ?? []).map((c) => [c.id, c.name])),
    [clusters],
  );
  const regionName = useMemo(
    () => new Map((regions ?? []).map((r) => [r.id, r.name])),
    [regions],
  );

  const canCreate =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.REGIONAL_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;

  const canReset = !!role || !!q;
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account — staff, sellers, buyers and affiliates. Suspending one blocks sign-in at once and ends its sessions."
        action={
          canCreate ? (
            <Button
              variant="contained"
              onClick={() => setCreateOpen(true)}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New account
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load accounts'}
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={status}
          onChange={(_e, value) => setParams({ status: value })}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value || 'all'}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === status ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'active' && 'success') ||
                    (tab.value === 'pending' && 'warning') ||
                    (tab.value === 'suspended' && 'error') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Stack
          spacing={2}
          alignItems={{ xs: 'flex-end', md: 'center' }}
          direction={{ xs: 'column', md: 'row' }}
          sx={{ p: 2.5 }}
        >
          <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 240 } }}>
            <InputLabel htmlFor="user-filter-role">Role</InputLabel>
            <Select
              value={role}
              onChange={(e) => setParams({ role: e.target.value })}
              input={<OutlinedInput label="Role" />}
              inputProps={{ id: 'user-filter-role' }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              <MenuItem value="">Any role</MenuItem>
              {ROLE_ORDER.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                  {roleCounts?.[r] !== undefined ? ` (${roleCounts[r]})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ width: 1 }}>
            <TextField
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a name, email or mobile…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Stack>

        {canReset && (
          <FiltersResult
            totalResults={total}
            onReset={() => {
              setSearch('');
              setParams({ role: null, q: null });
            }}
            sx={{ p: 2.5, pt: 0 }}
          >
            <FiltersBlock label="Role:" isShow={!!role}>
              <Chip
                {...chipProps}
                label={ROLE_LABEL[role] ?? role}
                onDelete={() => setParams({ role: null })}
              />
            </FiltersBlock>
            <FiltersBlock label="Keyword:" isShow={!!q}>
              <Chip
                {...chipProps}
                label={q}
                onDelete={() => {
                  setSearch('');
                  setParams({ q: null });
                }}
              />
            </FiltersBlock>
          </FiltersResult>
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1000 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />

              <TableBody>
                {isLoading
                  ? Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: table.dense ? 56 : 76 }} />
                    ))
                  : rows.map((row) => (
                      <UserTableRow
                        key={row.id}
                        row={row}
                        clusterName={row.clusterId ? clusterName.get(row.clusterId) : undefined}
                        regionName={row.regionId ? regionName.get(row.regionId) : undefined}
                        onEditStatus={() => setEditing(row)}
                      />
                    ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(page - 1, limit, total)}
                />

                {notFound && (
                  <TableRow>
                    <TableCell colSpan={TABLE_HEAD.length}>
                      <EmptyContent
                        filled
                        sx={{ py: 10 }}
                        title={canReset || status ? 'Nothing matches' : 'No accounts'}
                        description={
                          canReset || status
                            ? 'Try another tab, or clear the filters.'
                            : 'Accounts appear here as people sign up or you provision them.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={page - 1}
          dense={table.dense}
          count={total}
          rowsPerPage={limit}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={(e) => setParams({ limit: e.target.value, page: '1' })}
        />
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserStatusDialog
        open={Boolean(editing)}
        user={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
};
