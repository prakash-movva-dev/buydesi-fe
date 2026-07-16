import { useMemo, useState } from 'react';
import { Plus, ToggleRight } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
import { usePromotionsList, useUpdatePromotion } from './api';
import { PromotionFormDialog } from './PromotionFormDialog';
import type {
  Promotion,
  PromotionScope,
  PromotionType,
  PromotionsListQuery,
} from './types';

const HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'type', label: 'Type' },
  { id: 'scope', label: 'Scope' },
  { id: 'summary', label: 'Summary' },
  { id: 'window', label: 'Window' },
  { id: 'active', label: 'Active' },
  { id: 'actions', label: '' },
];

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
    <Stack spacing={3}>
      <PageHeader
        title="Promotions"
        description="Banners, coupon codes, featured slots and sale events. Scope can be platform-wide, cluster-specific, or category-specific. Validity is enforced server-side at validate-coupon time."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New promotion
          </Button>
        }
      />

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load promotions'}
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
              label="Type"
              value={type}
              onChange={(e) => setParam({ type: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Scope"
              value={scope}
              onChange={(e) => setParam({ scope: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            >
              {SCOPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={active}
              onChange={(e) => setParam({ active: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
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
                  const id = p.id ?? p._id;
                  const now = Date.now();
                  const live =
                    p.active &&
                    new Date(p.startsAt).getTime() <= now &&
                    new Date(p.endsAt).getTime() > now;
                  return (
                    <TableRow key={id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
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
                      <TableCell sx={{ typography: 'caption' }}>
                        <Badge variant="muted">{p.scope}</Badge>
                        {p.scope === 'cluster' && p.clusterId && (
                          <Box sx={{ mt: 0.25, fontFamily: 'monospace' }}>
                            {p.clusterId.slice(-8)}
                          </Box>
                        )}
                        {p.scope === 'category' && p.categoryId && (
                          <Box sx={{ mt: 0.25, fontFamily: 'monospace' }}>
                            {p.categoryId.slice(-8)}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell
                        title={promotionSummary(p)}
                        sx={{
                          maxWidth: 360,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          typography: 'caption',
                        }}
                      >
                        {promotionSummary(p)}
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {formatDate(p.startsAt)} → {formatDate(p.endsAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={live ? 'success' : p.active ? 'warning' : 'muted'}>
                          {live ? 'Live now' : p.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell align="right">
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

      <PromotionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        defaultType={type || 'banner'}
      />
    </Stack>
  );
};
