import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Search, Upload, XCircle } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { BulkUploadDialog } from './BulkUploadDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
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
import { useCategoriesList } from '@/features/categories/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { formatDate, formatInr } from '@/lib/format';
import { useProductsList, useSetProductStatus } from './api';
import { ProductStatusBadge } from './status-badge';
import { StatusReviewDialog, type StatusAction } from './StatusReviewDialog';
import type { ProductStatus, ProductsListQuery } from './types';

const STATUS_OPTIONS: Array<{ value: '' | ProductStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending approval' },
  { value: 'LIVE', label: 'Live' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PAGE_SIZE = 20;

const lowestPrice = (p: { pricing: { standard?: number; organic?: number; premium?: number } }) =>
  Math.min(
    ...[p.pricing.standard, p.pricing.organic, p.pricing.premium].filter(
      (x): x is number => typeof x === 'number',
    ),
  );

export const ProductsListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('status') as ProductStatus | null) ?? '';
  const category = searchParams.get('category') ?? '';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<ProductsListQuery>(
    () => ({
      status: status || undefined,
      category: category || undefined,
      q: q || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, category, q, page],
  );

  const { data, isLoading, isError, error } = useProductsList(query);
  const { data: categories } = useCategoriesList();
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    (categories ?? []).forEach((c) => map.set(c.id, c.name));
    return (id: string) => map.get(id) ?? id;
  }, [categories]);

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  // ─── Bulk select state ─────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<StatusAction | null>(null);
  const setStatusMut = useSetProductStatus();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPageSelected =
    data && data.items.length > 0 && data.items.every((p) => selected.has(p.id));

  const toggleAll = () => {
    if (!data) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        data.items.forEach((p) => next.delete(p.id));
      } else {
        data.items.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const submitBulk = async (notes: string | undefined) => {
    if (!bulkAction) return;
    const target: ProductStatus =
      bulkAction === 'approve' ? 'LIVE' : bulkAction === 'reject' ? 'REJECTED' : 'SUSPENDED';
    // Run sequentially — the backend doesn't expose a bulk-status endpoint,
    // and parallel writes against the same indexes can deadlock under load.
    const ids = Array.from(selected);
    for (const id of ids) {
      await setStatusMut.mutateAsync({ id, status: target, notes });
    }
    setSelected(new Set());
  };

  // ─── Quick single-row action ────────────────────────────────────────────
  const [singleAction, setSingleAction] = useState<{ id: string; action: StatusAction } | null>(
    null,
  );

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Products"
        description="Approval queue and catalogue. Category Admins see only their assigned branch."
        action={
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Bulk upload CSV
          </Button>
        }
      />

      <BulkUploadDialog open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />

      <ScopedAdminBanner />

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-48"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => setParam({ category: e.target.value })}
          className="w-56"
        >
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="relative w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setParam({ q: e.target.value })}
            placeholder="Search by name / description"
            className="pl-9"
          />
        </div>
      </Stack>

      {selected.size > 0 && (
        <Box
          className="rounded-md border border-border bg-secondary/40 px-4 py-3 text-sm"
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
        >
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-muted-foreground">·</span>
          <Button size="sm" onClick={() => setBulkAction('approve')}>
            <CheckCircle2 className="h-4 w-4" />
            Approve all
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setBulkAction('reject')}>
            <XCircle className="h-4 w-4" />
            Reject all
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('suspend')}>
            Suspend all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </Box>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load products'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-px">
                  <input
                    type="checkbox"
                    checked={Boolean(allOnPageSelected)}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((product) => (
                <TableRow key={product.id}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggle(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell
                    className="cursor-pointer font-medium"
                    onClick={() => navigate(`/admin/products/${product.id}`)}
                  >
                    <div>{product.name}</div>
                    <div className="text-xs text-muted-foreground">{formatInr(lowestPrice(product))} / {product.unit}</div>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/products/${product.id}`)} className="cursor-pointer">
                    {categoryName(product.categoryId)}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/products/${product.id}`)} className="cursor-pointer">
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/products/${product.id}`)} className="cursor-pointer">
                    <span className="text-xs text-muted-foreground">{product.sellerId.slice(-6)}</span>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/products/${product.id}`)} className="cursor-pointer">
                    {product.stock.quantity}
                    {product.stock.quantity <= product.stock.threshold && (
                      <span className="ml-1 text-xs text-amber-700">low</span>
                    )}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/products/${product.id}`)} className="cursor-pointer">
                    {formatDate(product.createdAt)}
                  </TableCell>
                  <TableCell>
                    {product.status === 'PENDING' ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSingleAction({ id: product.id, action: 'approve' })}
                          aria-label="Quick approve"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSingleAction({ id: product.id, action: 'reject' })}
                          aria-label="Quick reject"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/products/${product.id}`)}
                      >
                        Open
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No products match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ fontSize: 14, color: 'text.secondary' }}
          >
            <span>
              {data?.items.length ?? 0} of {total} · page {page} / {pageCount}
            </span>
            <Stack direction="row" spacing={1}>
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
            </Stack>
          </Stack>
        </>
      )}

      <StatusReviewDialog
        open={bulkAction !== null}
        action={bulkAction}
        count={selected.size}
        onClose={() => setBulkAction(null)}
        onSubmit={submitBulk}
      />

      <StatusReviewDialog
        open={singleAction !== null}
        action={singleAction?.action ?? null}
        count={1}
        onClose={() => setSingleAction(null)}
        onSubmit={async (notes) => {
          if (!singleAction) return;
          const target: ProductStatus =
            singleAction.action === 'approve'
              ? 'LIVE'
              : singleAction.action === 'reject'
                ? 'REJECTED'
                : 'SUSPENDED';
          await setStatusMut.mutateAsync({ id: singleAction.id, status: target, notes });
        }}
      />
    </Stack>
  );
};
