import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, ToggleRight } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
import { usePromotionsList, useUpdatePromotion } from './api';
import { PromotionFormDialog } from './PromotionFormDialog';
import type {
  Promotion,
  PromotionScope,
  PromotionType,
  PromotionsListQuery,
} from './types';

const TYPE_OPTIONS: Array<{ value: '' | PromotionType; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'banner', label: 'Banners' },
  { value: 'coupon', label: 'Coupons' },
  { value: 'featured', label: 'Featured slots' },
  { value: 'sale_event', label: 'Sale events' },
];

const SCOPE_OPTIONS: Array<{ value: '' | PromotionScope; label: string }> = [
  { value: '', label: 'Any scope' },
  { value: 'platform', label: 'Platform' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'category', label: 'Category' },
];

const PAGE_SIZE = 25;

const typeVariant: Record<PromotionType, 'info' | 'success' | 'warning' | 'destructive'> = {
  banner: 'info',
  coupon: 'success',
  featured: 'warning',
  sale_event: 'destructive',
};

const promotionSummary = (p: Promotion): string => {
  if (p.coupon) {
    const v =
      p.coupon.discountType === 'percent'
        ? `${p.coupon.discountValue}% off`
        : `₹${p.coupon.discountValue} off`;
    const uses = p.coupon.maxUses
      ? `${p.coupon.currentUses}/${p.coupon.maxUses} uses`
      : `${p.coupon.currentUses} uses`;
    return `${p.coupon.code} · ${v} · ${uses}`;
  }
  if (p.banner) return p.banner.targetUrl;
  if (p.featured)
    return `slot ${p.featured.slotPosition} · ${p.featured.productIds.length} products / ${p.featured.storefrontUserIds.length} storefronts`;
  if (p.saleEvent)
    return `${p.saleEvent.discountMinPercent}–${p.saleEvent.discountMaxPercent}% across ${p.saleEvent.eligibleCategoryIds.length} categories`;
  return '—';
};

export const PromotionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = (searchParams.get('type') as PromotionType | null) ?? '';
  const scope = (searchParams.get('scope') as PromotionScope | null) ?? '';
  const activeParam = searchParams.get('active');
  const active = activeParam === null ? '' : activeParam;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<PromotionsListQuery>(
    () => ({
      type: type || undefined,
      scope: scope || undefined,
      active: active === '' ? undefined : active === 'true',
      page,
      limit: PAGE_SIZE,
    }),
    [type, scope, active, page],
  );

  const { data, isLoading, isError, error } = usePromotionsList(query);
  const updateMut = useUpdatePromotion();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">
            Banners, coupon codes, featured slots and sale events. Scope can be platform-wide,
            cluster-specific, or category-specific. Validity is enforced server-side at validate-coupon time.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New promotion
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={type}
          onChange={(e) => setParam({ type: e.target.value })}
          className="w-48"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={scope}
          onChange={(e) => setParam({ scope: e.target.value })}
          className="w-40"
        >
          {SCOPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={active}
          onChange={(e) => setParam({ active: e.target.value })}
          className="w-40"
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load promotions'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((p) => {
                const id = p.id ?? p._id;
                const now = Date.now();
                const live =
                  p.active &&
                  new Date(p.startsAt).getTime() <= now &&
                  new Date(p.endsAt).getTime() > now;
                return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.isOverride && (
                        <Badge variant="info" className="ml-2">
                          override
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeVariant[p.type]}>{p.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="muted">{p.scope}</Badge>
                      {p.scope === 'cluster' && p.clusterId && (
                        <div className="mt-0.5 font-mono">{p.clusterId.slice(-8)}</div>
                      )}
                      {p.scope === 'category' && p.categoryId && (
                        <div className="mt-0.5 font-mono">{p.categoryId.slice(-8)}</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-xs" title={promotionSummary(p)}>
                      {promotionSummary(p)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(p.startsAt)} → {formatDate(p.endsAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={live ? 'success' : p.active ? 'warning' : 'muted'}>
                        {live ? 'Live now' : p.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateMut.mutate({ id, patch: { active: !p.active } })
                        }
                        disabled={updateMut.isPending}
                        title={p.active ? 'Deactivate' : 'Activate'}
                      >
                        <ToggleRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No promotions match the current filter.
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

      <PromotionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        defaultType={type || 'banner'}
      />
    </div>
  );
};
