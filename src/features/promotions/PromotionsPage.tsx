import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import LinearProgress from '@mui/material/LinearProgress';

import { varAlpha } from '@/theme/styles';
import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { ConfirmDialog } from '@/components/custom-dialog';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';
import { TableHeadCustom, TablePaginationCustom } from '@/components/table';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { usePromotionsList, useUpdatePromotion } from './api';
import { PromotionFormDialog } from './PromotionFormDialog';
import {
  idOf,
  promotionState,
  PromotionTableRow,
  TYPE_LABEL,
} from './promotion-table-row';
import type { Promotion, PromotionScope, PromotionType, PromotionsListQuery } from './types';

// ----------------------------------------------------------------------

type PromoView = 'all' | PromotionType;

const TAB_OPTIONS: Array<{
  value: PromoView;
  label: string;
  color: 'info' | 'success' | 'warning';
  icon: string;
}> = [
  { value: 'all', label: 'Everything', color: 'info', icon: 'solar:list-bold' },
  { value: 'banner', label: 'Banners', color: 'info', icon: 'solar:gallery-wide-bold' },
  { value: 'coupon', label: 'Coupons', color: 'success', icon: 'solar:ticket-sale-bold' },
  { value: 'featured', label: 'Featured', color: 'warning', icon: 'solar:star-bold' },
];

const SCOPE_OPTIONS: Array<{ value: '' | PromotionScope; label: string }> = [
  { value: '', label: 'Anywhere' },
  { value: 'platform', label: 'Everywhere' },
  { value: 'cluster', label: 'One cluster' },
  { value: 'category', label: 'One category' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'true', label: 'Switched on' },
  { value: 'false', label: 'Switched off' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Promotion' },
  { id: 'detail', label: 'What it does', width: 320 },
  { id: 'scope', label: 'Where', width: 140 },
  { id: 'window', label: 'When', width: 160 },
  { id: 'state', label: 'Status', width: 140 },
  { id: '', width: 64 },
];

const PAGE_SIZE = 25;

/** What each tab says when it has nothing in it. */
const EMPTY_FOR: Record<PromoView, { title: string; description: string }> = {
  all: {
    title: 'No promotions yet',
    description: 'Banners, coupons and featured slots all live here.',
  },
  banner: {
    title: 'No banners',
    description: 'Banners fill the storefront home — the main carousel and the cards beside it.',
  },
  coupon: {
    title: 'No coupons',
    description: 'A coupon is a code shoppers type at checkout for money off their order.',
  },
  featured: {
    title: 'No featured slots',
    description: 'A featured slot pins chosen products to the top of a listing.',
  },
};

// ----------------------------------------------------------------------

export const PromotionsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canEdit =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;
  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const view = (searchParams.get('view') as PromoView | null) ?? 'all';
  const scope = (searchParams.get('scope') as PromotionScope | null) ?? '';
  const clusterId = searchParams.get('clusterId') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const activeParam = searchParams.get('active') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? PAGE_SIZE));

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

  const query = useMemo<PromotionsListQuery>(
    () => ({
      type: view === 'all' ? undefined : view,
      scope: (scope || undefined) as PromotionScope | undefined,
      clusterId: clusterId || undefined,
      categoryId: categoryId || undefined,
      active: activeParam === '' ? undefined : activeParam === 'true',
      page,
      limit,
    }),
    [view, scope, clusterId, categoryId, activeParam, page, limit],
  );

  const { data, isLoading, isFetching, isError, error } = usePromotionsList(query);

  // Counts per tab, under the same filters so the numbers match the table.
  const common = useMemo(
    () => ({
      scope: (scope || undefined) as PromotionScope | undefined,
      clusterId: clusterId || undefined,
      categoryId: categoryId || undefined,
      active: activeParam === '' ? undefined : activeParam === 'true',
      page: 1,
      limit: 1,
    }),
    [scope, clusterId, categoryId, activeParam],
  );
  const allCount = usePromotionsList(common);
  const bannerCount = usePromotionsList({ ...common, type: 'banner' });
  const couponCount = usePromotionsList({ ...common, type: 'coupon' });
  const featuredCount = usePromotionsList({ ...common, type: 'featured' });

  const countFor = (v: PromoView) =>
    ({
      all: allCount,
      banner: bannerCount,
      coupon: couponCount,
      featured: featuredCount,
    })[v].data?.meta.total ?? 0;

  const update = useUpdatePromotion();
  const [formOpen, setFormOpen] = useState(false);
  // The promotion the form is editing; null means it is creating a new one.
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [toggling, setToggling] = useState<Promotion | null>(null);
  const [ending, setEnding] = useState<Promotion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const canReset = Boolean(scope || clusterId || categoryId || activeParam);

  /** How many of the promotions on this page are actually running. */
  const runningNow = rows.filter((p) => promotionState(p) === 'live').length;
  const startingSoon = rows.filter((p) => promotionState(p) === 'scheduled').length;
  const spentCoupons = rows.filter(
    (p) => p.coupon && p.coupon.maxUses > 0 && p.coupon.currentUses >= p.coupon.maxUses,
  ).length;

  const act = async (row: Promotion, patch: { active?: boolean; endsAt?: string }, done: string) => {
    setBusyId(idOf(row));
    try {
      await update.mutateAsync({ id: idOf(row), patch });
      toast.success(done);
      setToggling(null);
      setEnding(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not go through');
    } finally {
      setBusyId(null);
    }
  };

  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Promotions"
        description="The three things that push a product in front of a shopper: banners on the home page, coupon codes for money off, and featured slots that pin products to the top of a listing."
        action={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New promotion
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load promotions'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Running now"
            total={isLoading ? null : runningNow}
            color="success"
            icon={<Iconify width={48} icon="solar:play-circle-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Starting later"
            total={isLoading ? null : startingSoon}
            color="info"
            icon={<Iconify width={48} icon="solar:clock-circle-bold-duotone" />}
          />
        </Grid>
        <Grid xs={12} sm={4}>
          <AnalyticsWidget
            title="Coupons fully used"
            total={isLoading ? null : spentCoupons}
            color={spentCoupons > 0 ? 'warning' : 'secondary'}
            icon={<Iconify width={48} icon="solar:ticket-sale-bold-duotone" />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={view}
          onChange={(_e, value) => setParams({ view: value })}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {TAB_OPTIONS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              iconPosition="end"
              icon={
                <Label variant={view === tab.value ? 'filled' : 'soft'} color={tab.color}>
                  {countFor(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Stack
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <TextField
            select
            label="Where"
            value={scope}
            onChange={(e) => setParams({ scope: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: 1, md: 180 } }}
          >
            {SCOPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          {isSuper && (
            <Box sx={{ width: { xs: 1, md: 220 } }}>
              <ClusterPicker
                label="Cluster"
                value={clusterId || null}
                onChange={(id) => setParams({ clusterId: id ?? '' })}
                placeholder="Any cluster"
              />
            </Box>
          )}

          <Box sx={{ width: { xs: 1, md: 220 } }}>
            <CategoryPicker
              label="Category"
              value={categoryId || null}
              onChange={(id) => setParams({ categoryId: id ?? '' })}
              placeholder="Any category"
            />
          </Box>

          <TextField
            select
            label="Status"
            value={activeParam}
            onChange={(e) => setParams({ active: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: 1, md: 170 } }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {canReset && (
          <FiltersResult
            totalResults={total}
            onReset={() =>
              setParams({ scope: null, clusterId: null, categoryId: null, active: null })
            }
            sx={{ px: 2.5, pb: 2.5 }}
          >
            <FiltersBlock label="Where:" isShow={!!scope}>
              <Chip
                {...chipProps}
                label={SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? scope}
                onDelete={() => setParams({ scope: null })}
              />
            </FiltersBlock>

            <FiltersBlock label="Cluster:" isShow={!!clusterId}>
              <Chip
                {...chipProps}
                label="Selected cluster"
                onDelete={() => setParams({ clusterId: null })}
              />
            </FiltersBlock>

            <FiltersBlock label="Category:" isShow={!!categoryId}>
              <Chip
                {...chipProps}
                label="Selected category"
                onDelete={() => setParams({ categoryId: null })}
              />
            </FiltersBlock>

            <FiltersBlock label="Status:" isShow={!!activeParam}>
              <Chip
                {...chipProps}
                label={activeParam === 'true' ? 'Switched on' : 'Switched off'}
                onDelete={() => setParams({ active: null })}
              />
            </FiltersBlock>
          </FiltersResult>
        )}

        <Box sx={{ position: 'relative' }}>
          {isFetching && !isLoading && (
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} />
          )}

          {notFound && !isError ? (
            <EmptyContent
              filled
              title={EMPTY_FOR[view].title}
              description={EMPTY_FOR[view].description}
              sx={{ py: 10 }}
            />
          ) : (
            <Scrollbar>
              <Table sx={{ minWidth: 1040 }}>
                <TableHeadCustom headLabel={TABLE_HEAD} />

                <TableBody>
                  {rows.map((row) => (
                    <PromotionTableRow
                      key={idOf(row)}
                      row={row}
                      canEdit={canEdit}
                      busy={busyId === idOf(row)}
                      onEdit={() => {
                        setEditing(row);
                        setFormOpen(true);
                      }}
                      onToggleActive={() => setToggling(row)}
                      onEndNow={() => setEnding(row)}
                    />
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
          )}
        </Box>

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={limit}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          onRowsPerPageChange={(e) => setParams({ limit: e.target.value })}
        />
      </Card>

      <PromotionFormDialog
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        title={toggling?.active ? 'Switch this off?' : 'Switch this back on?'}
        content={
          toggling?.active ? (
            <>
              <strong>{toggling?.name}</strong> stops showing to shoppers straight away. Its
              dates are untouched, so switching it back on resumes it.
              {toggling?.type === 'coupon' &&
                ' Anyone typing the code at checkout will be told it is not available.'}
            </>
          ) : (
            <>
              <strong>{ending?.name ?? toggling?.name}</strong> starts showing again, as long as
              today falls inside its start and end dates.
            </>
          )
        }
        action={
          <Button
            variant="contained"
            color={toggling?.active ? 'error' : 'primary'}
            disabled={update.isPending}
            onClick={() =>
              toggling &&
              act(
                toggling,
                { active: !toggling.active },
                toggling.active ? 'Switched off' : 'Switched back on',
              )
            }
          >
            {toggling?.active ? 'Switch off' : 'Switch on'}
          </Button>
        }
      />

      <ConfirmDialog
        open={Boolean(ending)}
        onClose={() => setEnding(null)}
        title="End this now?"
        content={
          <>
            <strong>{ending?.name}</strong> gets an end date of today, so it stops on its own and
            reads as finished rather than switched off. Use this when a{' '}
            {ending ? TYPE_LABEL[ending.type].toLowerCase() : 'promotion'} has run its course.
          </>
        }
        action={
          <Button
            variant="contained"
            color="warning"
            disabled={update.isPending}
            onClick={() =>
              ending && act(ending, { endsAt: new Date().toISOString() }, 'Ended')
            }
          >
            End it
          </Button>
        }
      />
    </>
  );
};
