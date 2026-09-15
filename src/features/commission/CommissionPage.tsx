import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
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
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';
import { TableHeadCustom, TableNoData } from '@/components/table';

import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { useCommissionRates, useUpdateCommissionRate } from './api';
import { CommissionRateDialog } from './CommissionRateDialog';
import { CommissionResolverCard } from './CommissionResolverCard';
import { CommissionTableRow, rateState, SCOPE_LABEL } from './commission-table-row';
import type { CommissionRate, CommissionScope } from './types';

// ----------------------------------------------------------------------

type RulesView = 'all' | CommissionScope | 'check';

const TAB_OPTIONS: Array<{
  value: RulesView;
  label: string;
  color: 'info' | 'error' | 'warning' | 'default';
}> = [
  { value: 'all', label: 'All rules', color: 'info' },
  { value: 'seller', label: 'Seller overrides', color: 'error' },
  { value: 'product', label: 'Product overrides', color: 'warning' },
  { value: 'category', label: 'Category rules', color: 'info' },
  { value: 'check', label: 'Check a rate', color: 'default' },
];

const TABLE_HEAD = [
  { id: 'target', label: 'Applies to' },
  { id: 'rate', label: 'Rate', width: 120, align: 'right' as const },
  { id: 'state', label: 'Status', width: 150 },
  { id: 'window', label: 'In effect', width: 170 },
  { id: 'notes', label: 'Why', width: 260 },
  { id: '', width: 64 },
];

/** The ladder, stated once at the top so the ordering is never a guess. */
const LADDER: Array<{
  scope: CommissionScope | null;
  title: string;
  blurb: string;
  color: 'error' | 'warning' | 'info' | 'default';
  icon: string;
}> = [
  {
    scope: 'seller',
    title: 'Seller override',
    blurb: 'A deal with one seller, across everything they sell.',
    color: 'error',
    icon: 'solar:shop-bold-duotone',
  },
  {
    scope: 'product',
    title: 'Product override',
    blurb: 'One product, whoever is selling it.',
    color: 'warning',
    icon: 'solar:box-bold-duotone',
  },
  {
    scope: 'category',
    title: 'Category rule',
    blurb: 'Everything in a category, unless overridden above.',
    color: 'info',
    icon: 'solar:widget-4-bold-duotone',
  },
  {
    scope: null,
    title: 'Category default',
    blurb: 'The rate on the category itself. The last word.',
    color: 'default',
    icon: 'solar:shield-check-bold-duotone',
  },
];

// ----------------------------------------------------------------------

export const CommissionPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Only a super admin may write rules; the other ops roles read them.
  const canEdit = user?.role === UserRole.SUPER_ADMIN;

  const view = (searchParams.get('view') as RulesView | null) ?? 'all';
  const q = searchParams.get('q') ?? '';
  const liveOnly = searchParams.get('all') !== '1';

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [search, setSearch] = useState(q);
  useEffect(() => {
    // The list is small and already in memory, so filtering is instant —
    // no debounce needed, and none of the lag one would add.
    if (search !== q) setParams({ q: search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => {
    if (q !== search) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Always fetch the whole set: it is small, and the tabs, counts and the
  // resolver's ladder all need to see rules the current tab is hiding.
  const { data, isLoading, isFetching, isError, error } = useCommissionRates({});
  const update = useUpdateCommissionRate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionRate | null>(null);
  const [toggling, setToggling] = useState<CommissionRate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((r) => (view === 'all' || view === 'check' ? true : r.scope === view))
      .filter((r) => (liveOnly ? rateState(r) === 'live' : true))
      .filter((r) =>
        needle
          ? r.targetName.toLowerCase().includes(needle) ||
            (r.notes ?? '').toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => {
        // Most specific first, then newest — the order the resolver walks.
        const rank: Record<CommissionScope, number> = { seller: 0, product: 1, category: 2 };
        if (rank[a.scope] !== rank[b.scope]) return rank[a.scope] - rank[b.scope];
        return new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
      });
  }, [all, view, liveOnly, q]);

  const countFor = (v: RulesView) => {
    if (v === 'check') return 0;
    const pool = v === 'all' ? all : all.filter((r) => r.scope === v);
    return liveOnly ? pool.filter((r) => rateState(r) === 'live').length : pool.length;
  };

  const liveCountFor = (scope: CommissionScope) =>
    all.filter((r) => r.scope === scope && rateState(r) === 'live').length;

  const canReset = Boolean(q) || !liveOnly;

  const onToggleActive = async () => {
    if (!toggling) return;
    setBusyId(toggling.id);
    try {
      await update.mutateAsync({ id: toggling.id, patch: { active: !toggling.active } });
      toast.success(toggling.active ? 'Rate switched off' : 'Rate switched back on');
      setToggling(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not change that rate');
    } finally {
      setBusyId(null);
    }
  };

  const notFound = !isLoading && visible.length === 0;

  return (
    <>
      <PageHeader
        title="Commission rules"
        description="What the platform charges on a sale. The most specific rule wins — a seller deal beats a product override, which beats a category rule, which beats the category's own default."
        action={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              New rule
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load rules'}
        </Alert>
      )}

      {/* The ladder. Everything else on this page is easier to read once you
          know which rule beats which. */}
      <Card sx={{ mt: 3, p: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, md: 0 }}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          {LADDER.map((tier, index) => (
            <Stack
              key={tier.title}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ flex: 1, minWidth: 0 }}
            >
              <Iconify
                width={36}
                icon={tier.icon}
                sx={{ flexShrink: 0, color: `${tier.color === 'default' ? 'text.disabled' : `${tier.color}.main`}` }}
              />

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ typography: 'subtitle2' }}>{tier.title}</Box>
                  {tier.scope && (
                    <Tooltip
                      title={`${liveCountFor(tier.scope)} in effect right now`}
                      placement="top"
                      arrow
                    >
                      <Label
                        variant="soft"
                        color={tier.color === 'default' ? 'default' : tier.color}
                      >
                        {liveCountFor(tier.scope)} live
                      </Label>
                    </Tooltip>
                  )}
                </Stack>
                <Box sx={{ typography: 'caption', color: 'text.secondary' }}>{tier.blurb}</Box>
              </Box>

              {index < LADDER.length - 1 && (
                <Iconify
                  width={18}
                  icon="eva:arrow-ios-forward-fill"
                  sx={{
                    flexShrink: 0,
                    color: 'text.disabled',
                    display: { xs: 'none', md: 'block' },
                  }}
                />
              )}
            </Stack>
          ))}
        </Stack>
      </Card>

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
                tab.value === 'check' ? (
                  <Iconify width={18} icon="solar:magnifer-bold" sx={{ opacity: 0.6 }} />
                ) : (
                  <Label variant={view === tab.value ? 'filled' : 'soft'} color={tab.color}>
                    {countFor(tab.value)}
                  </Label>
                )
              }
            />
          ))}
        </Tabs>

        {view !== 'check' && (
          <>
            <Stack
              spacing={2}
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'stretch', md: 'center' }}
              sx={{ p: 2.5 }}
            >
              <TextField
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by who it applies to, or by note…"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControlLabel
                sx={{ flexShrink: 0, mr: 0 }}
                label="Only rules in effect"
                control={
                  <Switch
                    checked={liveOnly}
                    onChange={(e) => setParams({ all: e.target.checked ? null : '1' })}
                  />
                }
              />
            </Stack>

            {canReset && (
              <FiltersResult
                totalResults={visible.length}
                onReset={() => setParams({ q: null, all: null })}
                sx={{ px: 2.5, pb: 2.5 }}
              >
                <FiltersBlock label="Search:" isShow={!!q}>
                  <Chip {...chipProps} label={q} onDelete={() => setParams({ q: null })} />
                </FiltersBlock>

                <FiltersBlock label="Showing:" isShow={!liveOnly}>
                  <Chip
                    {...chipProps}
                    label="Including switched off, expired and scheduled"
                    onDelete={() => setParams({ all: null })}
                  />
                </FiltersBlock>
              </FiltersResult>
            )}

            <Box sx={{ position: 'relative' }}>
              {isFetching && !isLoading && (
                <LinearProgress
                  sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }}
                />
              )}

              {notFound && !isError ? (
                <EmptyContent
                  filled
                  title={liveOnly ? 'No rules in effect here' : 'No rules here'}
                  description={
                    liveOnly
                      ? 'Nothing is charging at this level right now. Switch off "Only rules in effect" to see expired and scheduled ones.'
                      : 'Nothing matches. Category defaults still apply even with no rules at all.'
                  }
                  sx={{ py: 10 }}
                />
              ) : (
                <Scrollbar>
                  <Table sx={{ minWidth: 960 }}>
                    <TableHeadCustom headLabel={TABLE_HEAD} />

                    <TableBody>
                      {visible.map((row) => (
                        <CommissionTableRow
                          key={row.id}
                          row={row}
                          canEdit={canEdit}
                          busy={busyId === row.id}
                          onEdit={() => {
                            setEditing(row);
                            setDialogOpen(true);
                          }}
                          onToggleActive={() => setToggling(row)}
                        />
                      ))}

                      <TableNoData notFound={notFound} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              )}
            </Box>
          </>
        )}
      </Card>

      {view === 'check' && (
        <Box sx={{ mt: 3 }}>
          <CommissionResolverCard rules={all} />
        </Box>
      )}

      <CommissionRateDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        title={toggling?.active ? 'Switch off this rate?' : 'Switch this rate back on?'}
        content={
          toggling?.active ? (
            <>
              Sales for <strong>{toggling?.targetName}</strong> stop being charged{' '}
              <strong>{toggling?.ratePercent}%</strong> and fall through to the next rule down
              — {SCOPE_LABEL[toggling.scope].toLowerCase() === 'seller'
                ? 'a product override, then the category'
                : 'the category rule, then the category default'}
              . The rate is kept on the record, not deleted.
            </>
          ) : (
            <>
              <strong>{toggling?.targetName}</strong> goes back to being charged{' '}
              <strong>{toggling?.ratePercent}%</strong>, as long as today falls inside its
              effective dates.
            </>
          )
        }
        action={
          <Button
            variant="contained"
            color={toggling?.active ? 'error' : 'primary'}
            onClick={onToggleActive}
            disabled={update.isPending}
          >
            {toggling?.active ? 'Switch off' : 'Switch on'}
          </Button>
        }
      />
    </>
  );
};
