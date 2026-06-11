import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
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
import { ProductStatusBadge } from '@/features/products/status-badge';
import { BulkUploadDialog } from '@/features/products/BulkUploadDialog';
import { formatDate, formatInr } from '@/lib/format';
import type { ProductStatus, ProductsListQuery } from '@/features/products/types';
import { useDeleteProduct, useMyProducts } from './api';

const STATUS_OPTIONS: Array<{ value: '' | ProductStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending review' },
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

export const MyProductsPage = () => {
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

  const { data, isLoading } = useMyProducts(query);
  const remove = useDeleteProduct();
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

  const [bulkOpen, setBulkOpen] = useState(false);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this product? Cannot be undone.')) return;
    remove.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My products</h1>
          <p className="text-muted-foreground">
            Manage your catalogue. New products start in PENDING and go LIVE after a Category
            Admin approves them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" />
            Bulk upload
          </Button>
          <Button onClick={() => navigate('/seller/products/new')}>
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
        <div className="w-56">
          <CategoryPicker
            value={category || null}
            onChange={(id) => setParam({ category: id ?? '' })}
            placeholder="All my categories"
          />
        </div>
        <div className="relative w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setParam({ q: e.target.value })}
            placeholder="Search by name…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell
                    className="font-medium"
                    onClick={() => navigate(`/seller/products/${p.id}`)}
                  >
                    {p.name}
                    <div className="text-xs text-muted-foreground">{p.unit}</div>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/seller/products/${p.id}`)}>
                    <ProductStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={() => navigate(`/seller/products/${p.id}`)}
                  >
                    {p.stock.quantity}
                    {p.stock.quantity <= p.stock.threshold && (
                      <span className="ml-1 text-xs text-amber-700">low</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={() => navigate(`/seller/products/${p.id}`)}
                  >
                    {formatInr(lowestPrice(p))}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/seller/products/${p.id}`)}>
                    {formatDate(p.updatedAt)}
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/seller/products/${p.id}/edit`);
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(p.id);
                      }}
                      disabled={remove.isPending}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No products yet. Create your first to start selling.
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

      <BulkUploadDialog open={bulkOpen} onClose={() => setBulkOpen(false)} forSelf />
    </div>
  );
};
