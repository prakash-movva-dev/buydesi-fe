import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { useClustersList } from './api';
import { ClusterFormDialog } from './ClusterFormDialog';
import type { ClusterStatus, ClustersListQuery, SafeCluster } from './types';

const STATUS_OPTIONS: Array<{ value: '' | ClusterStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

const statusVariant: Record<ClusterStatus, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'muted',
};

const PAGE_SIZE = 25;

export const ClustersPage = () => {
  const { user } = useAuth();
  // Super & Sub-Super Admin can create/edit clusters (story 2.1 / 2.2).
  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as ClusterStatus | null) ?? '';
  const stateFilter = searchParams.get('state') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<ClustersListQuery>(
    () => ({
      status: status || undefined,
      state: stateFilter || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, stateFilter, page],
  );

  const { data, isLoading, isError, error } = useClustersList(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

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
  const [editing, setEditing] = useState<SafeCluster | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clusters</h1>
          <p className="text-muted-foreground">
            Geographic operating units. Each cluster has its own Regional Admin, pin codes
            served, and default trade-transport mode.
          </p>
        </div>
        {isSuper && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New cluster
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-44"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Input
          value={stateFilter}
          onChange={(e) => setParam({ state: e.target.value })}
          placeholder="Filter by state"
          className="w-56"
        />
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load clusters'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>State / District</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pin codes</TableHead>
                <TableHead className="text-right">Active categories</TableHead>
                <TableHead>Transport default</TableHead>
                <TableHead>Regional admin</TableHead>
                <TableHead className="w-px" />
                {isSuper && <TableHead className="w-px" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link to={`/admin/clusters/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{c.state}</div>
                    <div className="text-muted-foreground">{c.district}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{c.pinCodes.length}</TableCell>
                  <TableCell className="text-right">{c.activeCategories.length}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{c.defaultTradeTransport}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.adminId ? c.adminId.slice(-10) : '— unassigned'}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/admin/clusters/${c.id}`}
                      className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-primary hover:bg-accent hover:text-accent-foreground"
                    >
                      View
                    </Link>
                  </TableCell>
                  {isSuper && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    No clusters match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data?.items.length ?? 0} of {total} · page {page} / {pageCount}
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

      <ClusterFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};
