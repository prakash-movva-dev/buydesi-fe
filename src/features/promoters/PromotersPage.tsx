import { useMemo, useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { formatDate, formatInr } from '@/lib/format';
import { UserRole } from '@/types/api';
import { useClustersList } from '@/features/clusters/api';
import { useDeletePromoter, usePromotersList } from './api';
import { PromoterFormDialog } from './PromoterFormDialog';
import { PromoterPerformancePanel } from './PromoterPerformancePanel';
import type { Promoter, PromotersListQuery } from './types';

const HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'contact', label: 'Contact' },
  { id: 'status', label: 'Status' },
  { id: 'discount', label: 'Discount given' },
  { id: 'cluster', label: 'Cluster' },
  { id: 'user', label: 'Linked user' },
  { id: 'created', label: 'Created' },
  { id: 'actions', label: '' },
];

const PAGE_SIZE = 25;

/** Renders the discount terms entered at creation (from the linked coupon). */
const formatDiscount = (p: Promoter): string => {
  if (p.discountValue == null || !p.discountType) return '—';
  const base = p.discountType === 'percent' ? `${p.discountValue}%` : formatInr(p.discountValue);
  return p.maxDiscountInr != null && p.maxDiscountInr > 0
    ? `${base} (max ${formatInr(p.maxDiscountInr)})`
    : base;
};

export const PromotersPage = () => {
  const { user } = useAuth();
  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  const canCreate =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;

  const [searchParams, setSearchParams] = useSearchParams();
  const activeParam = searchParams.get('active');
  const active = activeParam === null ? '' : activeParam;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<PromotersListQuery>(
    () => ({
      active: active === '' ? undefined : active === 'true',
      page,
      limit: PAGE_SIZE,
    }),
    [active, page],
  );

  const { data, isLoading, isError, error } = usePromotersList(query);
  const total = data?.meta.total ?? 0;
  const deleteMut = useDeletePromoter();

  const { data: clustersData } = useClustersList({ page: 1, limit: 100 });
  const clusterName = useMemo(() => {
    const map = new Map<string, string>();
    (clustersData?.items ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clustersData]);

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promoter | null>(null);
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<string | null>(null);

  const onConfirmDelete = (id: string) => {
    if (
      !window.confirm(
        'Delete this promoter? Their coupon is disabled and the promoter is removed from the list. Past order history is preserved.',
      )
    )
      return;
    deleteMut.mutate(id);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Promoters"
        description="People with a unique DESI-XXX coupon code. Track usage, discount given, and buyer/seller referrals (SOW 4.18)."
        action={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New promoter
            </Button>
          ) : undefined
        }
      />

      {newlyCreatedCode && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-medium text-emerald-900">Promoter created</p>
          <p className="mt-1 text-emerald-800">
            Their coupon code is{' '}
            <code className="font-mono">{newlyCreatedCode}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(newlyCreatedCode);
              }}
              aria-label="Copy"
              className="ml-2 inline-flex align-middle"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </p>
        </div>
      )}

      <PromoterPerformancePanel />

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load promoters'}
        </div>
      )}

      {!isLoading && !isError && (
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
              label="Status"
              value={active}
              onChange={(e) => setParam({ active: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            >
              <MenuItem value="">Any status</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>
          </Stack>

          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {(data?.items ?? []).map((p) => {
                  const id = p.id ?? p._id!;
                  return (
                    <TableRow key={id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {p.mobile && <Box>{p.mobile}</Box>}
                        {p.email && <Box sx={{ color: 'text.secondary' }}>{p.email}</Box>}
                        {!p.mobile && !p.email && (
                          <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? 'success' : 'muted'}>
                          {p.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>{formatDiscount(p)}</TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {p.clusterId ? (clusterName.get(p.clusterId) ?? '—') : '—'}
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        <Badge variant={p.userId ? 'success' : 'muted'}>
                          {p.userId ? 'Linked' : 'Not linked'}
                        </Badge>
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>{formatDate(p.createdAt)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isSuper && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onConfirmDelete(id)}
                            disabled={deleteMut.isPending}
                            title="Deactivate"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableNoData notFound={!isLoading && (data?.items.length ?? 0) === 0} />
              </TableBody>
            </Table>
          </Scrollbar>

          <TablePaginationCustom
            count={total}
            page={page - 1}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
            onRowsPerPageChange={() => {}}
          />
        </Card>
      )}

      <PromoterFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onCreated={(code) => setNewlyCreatedCode(code)}
      />
    </Stack>
  );
};
