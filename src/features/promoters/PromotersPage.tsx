import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
import { formatDate } from '@/lib/format';
import { UserRole } from '@/types/api';
import { useDeletePromoter, usePromotersList } from './api';
import { PromoterFormDialog } from './PromoterFormDialog';
import type { Promoter, PromotersListQuery } from './types';

const PAGE_SIZE = 25;

export const PromotersPage = () => {
  const { user } = useAuth();
  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  const canCreate =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.REGIONAL_ADMIN;

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
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const deleteMut = useDeletePromoter();

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
    if (!window.confirm('Soft-delete this promoter? The coupon will be disabled but history is preserved.')) return;
    deleteMut.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promoters</h1>
          <p className="text-muted-foreground">
            People with a unique DESI-XXX coupon code. Track usage, discount given, and
            buyer/seller referrals (SOW 4.18).
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New promoter
          </Button>
        )}
      </div>

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

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={active}
          onChange={(e) => setParam({ active: e.target.value })}
          className="w-44"
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load promoters'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Linked user</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((p) => {
                const id = p.id ?? p._id!;
                return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? 'success' : 'muted'}>
                        {p.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.clusterId ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.userId ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
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
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No promoters yet.
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

      <PromoterFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onCreated={(code) => setNewlyCreatedCode(code)}
      />
    </div>
  );
};
