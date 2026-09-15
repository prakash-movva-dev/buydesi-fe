import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { varAlpha } from '@/theme/styles';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { UserRole } from '@/types/api';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserPicker } from '@/components/pickers/UserPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import { useUser } from '@/features/users/api';
import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';

import { WalletAdjustDialog } from './WalletAdjustDialog';
import { WalletBalanceCard } from './WalletBalanceCard';
import { WalletOverviewCard } from './WalletOverviewCard';
import { WalletTransactionsCard } from './WalletTransactionsCard';
import { WithdrawalActionDialog, type WithdrawalAction } from './WithdrawalActionDialog';
import {
  useAdminWalletStats,
  useSellerWallet,
  useSellerWalletSummary,
  useWalletTxList,
} from './api';
import type {
  WalletTransaction,
  WalletTxListQuery,
  WalletTxSource,
  WalletTxStatus,
} from './types';

// ----------------------------------------------------------------------

/**
 * The views of the ledger.
 *
 * "To settle" is the only one that asks anything of the admin — a withdrawal
 * sitting in PENDING is money a seller has asked for and nobody has answered.
 * The rest are ways of reading history.
 */
type LedgerView = 'settle' | 'all' | 'in' | 'out' | 'adjustments';

const TAB_OPTIONS: Array<{ value: LedgerView; label: string; icon: string }> = [
  { value: 'settle', label: 'To settle', icon: 'solar:card-transfer-bold' },
  { value: 'all', label: 'All movement', icon: 'solar:list-bold' },
  { value: 'in', label: 'Money in', icon: 'eva:diagonal-arrow-left-down-fill' },
  { value: 'out', label: 'Money out', icon: 'eva:diagonal-arrow-right-up-fill' },
  { value: 'adjustments', label: 'Adjustments', icon: 'solar:pen-new-square-bold' },
];

/** Each view is the same list query with a different slice pinned. */
const sliceFor = (view: LedgerView): Partial<WalletTxListQuery> => {
  switch (view) {
    case 'settle':
      return { source: 'withdrawal', status: 'PENDING' };
    case 'in':
      return { type: 'CREDIT' };
    case 'out':
      return { type: 'DEBIT' };
    case 'adjustments':
      return { source: 'admin_adjustment' };
    default:
      return {};
  }
};

/** A tab that already pins a field must not offer a filter that contradicts it. */
const OFFERS_STATUS: Record<LedgerView, boolean> = {
  settle: false,
  all: true,
  in: true,
  out: true,
  adjustments: true,
};
const OFFERS_SOURCE: Record<LedgerView, boolean> = {
  settle: false,
  all: true,
  in: true,
  out: true,
  adjustments: false,
};

const TX_STATUS_OPTIONS: Array<{ value: '' | WalletTxStatus; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

const TX_SOURCE_OPTIONS: Array<{ value: '' | WalletTxSource; label: string }> = [
  { value: '', label: 'Any reason' },
  { value: 'consumer_payout', label: 'Order payout' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'platform_fee', label: 'Platform fee' },
  { value: 'admin_adjustment', label: 'Manual adjustment' },
];

const SOURCE_LABELS: Record<WalletTxSource, string> = {
  consumer_payout: 'Order payout',
  withdrawal: 'Withdrawal',
  platform_fee: 'Platform fee',
  admin_adjustment: 'Manual adjustment',
};

const DEFAULT_LIMIT = 25;

const EMPTY_FOR: Record<LedgerView, { title: string; description: string }> = {
  settle: {
    title: 'Nothing waiting',
    description: 'No seller is waiting on a withdrawal. Anything they ask for lands here.',
  },
  all: {
    title: 'No movement',
    description: 'No wallet movement matches these filters.',
  },
  in: {
    title: 'No money in',
    description: 'Nothing has been credited to a wallet under these filters.',
  },
  out: {
    title: 'No money out',
    description: 'Nothing has left a wallet under these filters.',
  },
  adjustments: {
    title: 'No manual adjustments',
    description: 'Nobody has hand-corrected a wallet under these filters. That is a good sign.',
  },
};

// ----------------------------------------------------------------------

export const WalletPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const view = (searchParams.get('view') as LedgerView | null) ?? 'settle';
  const sellerId = searchParams.get('sellerId') ?? '';
  const clusterId = isSuper ? (searchParams.get('clusterId') ?? '') : '';
  const status = (searchParams.get('status') as WalletTxStatus | null) ?? '';
  const source = (searchParams.get('source') as WalletTxSource | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      // Any change but paging puts you back on page one — otherwise you land
      // on page 4 of a three-page result and see nothing.
      if (!('page' in next)) params.delete('page');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const query = useMemo<WalletTxListQuery>(
    () => ({
      userId: sellerId || undefined,
      clusterId: clusterId || undefined,
      status: (OFFERS_STATUS[view] && status ? status : undefined) as WalletTxStatus | undefined,
      source: (OFFERS_SOURCE[view] && source ? source : undefined) as WalletTxSource | undefined,
      ...sliceFor(view),
      page,
      limit,
    }),
    [sellerId, clusterId, status, source, view, page, limit],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useWalletTxList(query);
  const stats = useAdminWalletStats(clusterId || undefined);
  const snapshot = useSellerWallet(sellerId || undefined);
  const summary = useSellerWalletSummary(sellerId || undefined);
  // Named from the user record, not from whichever rows happen to be on this
  // page — a seller with no movement yet still has a name.
  const selectedSeller = useUser(sellerId || undefined);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [pending, setPending] = useState<{
    action: WithdrawalAction;
    row: WalletTransaction;
  } | null>(null);

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const waiting = stats.data?.pendingWithdrawals.count ?? 0;

  const canReset = Boolean(
    sellerId || clusterId || (OFFERS_STATUS[view] && status) || (OFFERS_SOURCE[view] && source),
  );

  const onSettled = (action: WithdrawalAction) => {
    toast.success(action === 'complete' ? 'Payout sent to the bank' : 'Request turned down');
  };

  const renderFilters = (
    <Stack
      spacing={2}
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{ p: 2.5 }}
    >
      <Box sx={{ width: { xs: 1, md: 260 } }}>
        <UserPicker
          role={UserRole.SELLER}
          label="Seller"
          value={sellerId || null}
          onChange={(id) => setParams({ sellerId: id ?? '' })}
          placeholder="Every seller"
        />
      </Box>

      {isSuper && (
        <Box sx={{ width: { xs: 1, md: 220 } }}>
          <ClusterPicker
            label="Cluster"
            value={clusterId || null}
            onChange={(id) => setParams({ clusterId: id ?? '' })}
            placeholder="Every cluster"
          />
        </Box>
      )}

      {OFFERS_STATUS[view] && (
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setParams({ status: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: 1, md: 170 } }}
        >
          {TX_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      )}

      {OFFERS_SOURCE[view] && (
        <TextField
          select
          label="Reason"
          value={source}
          onChange={(e) => setParams({ source: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: 1, md: 200 } }}
        >
          {TX_SOURCE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Button
        variant="outlined"
        color="inherit"
        onClick={() => refetch()}
        disabled={isFetching}
        startIcon={<Iconify icon="solar:refresh-bold" />}
      >
        Refresh
      </Button>
    </Stack>
  );

  const renderFiltersResult = canReset && (
    <FiltersResult
      totalResults={total}
      onReset={() =>
        setParams({ sellerId: null, clusterId: null, status: null, source: null })
      }
      sx={{ px: 2.5, pb: 2.5 }}
    >
      <FiltersBlock label="Seller:" isShow={!!sellerId}>
        <Chip
          {...chipProps}
          label={selectedSeller.data?.name ?? 'Selected seller'}
          onDelete={() => setParams({ sellerId: null })}
        />
      </FiltersBlock>

      <FiltersBlock label="Cluster:" isShow={!!clusterId}>
        <Chip
          {...chipProps}
          label="Selected cluster"
          onDelete={() => setParams({ clusterId: null })}
        />
      </FiltersBlock>

      <FiltersBlock label="Status:" isShow={OFFERS_STATUS[view] && !!status}>
        <Chip {...chipProps} label={status} onDelete={() => setParams({ status: null })} />
      </FiltersBlock>

      <FiltersBlock label="Reason:" isShow={OFFERS_SOURCE[view] && !!source}>
        <Chip
          {...chipProps}
          label={source ? SOURCE_LABELS[source] : ''}
          onDelete={() => setParams({ source: null })}
        />
      </FiltersBlock>
    </FiltersResult>
  );

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Every rupee that moves through a seller wallet — what they earned, what they asked to withdraw, and what you corrected by hand. Cluster admins see only their own cluster."
        action={
          <Tooltip title={sellerId ? '' : 'Pick a seller first'} placement="top" arrow>
            <span>
              <Button
                variant="contained"
                disabled={!sellerId}
                onClick={() => setAdjustOpen(true)}
                startIcon={<Iconify icon="solar:pen-new-square-bold" />}
              >
                Adjust wallet
              </Button>
            </span>
          </Tooltip>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load the ledger'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Waiting to pay out"
            total={stats.isLoading ? null : waiting}
            displayTotal={
              stats.data
                ? `${waiting} · ${formatInr(stats.data.pendingWithdrawals.amountInr)}`
                : undefined
            }
            color={waiting > 0 ? 'warning' : 'success'}
            icon={<Iconify width={48} icon="solar:card-transfer-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title={`Paid out · ${stats.data?.windowDays ?? 30}d`}
            total={stats.isLoading ? null : (stats.data?.paidOut.amountInr ?? 0)}
            displayTotal={stats.data ? formatInr(stats.data.paidOut.amountInr) : undefined}
            color="info"
            icon={<Iconify width={48} icon="solar:banknote-2-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title={`Sellers earned · ${stats.data?.windowDays ?? 30}d`}
            total={stats.isLoading ? null : (stats.data?.earned.amountInr ?? 0)}
            displayTotal={stats.data ? formatInr(stats.data.earned.amountInr) : undefined}
            color="success"
            icon={<Iconify width={48} icon="solar:cart-large-4-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Held in wallets"
            total={stats.isLoading ? null : (stats.data?.heldInr ?? 0)}
            displayTotal={stats.data ? formatInr(stats.data.heldInr) : undefined}
            color="secondary"
            icon={<Iconify width={48} icon="solar:safe-square-bold-duotone" />}
          />
        </Grid>
      </Grid>

      {/* The queue is the job. If it has anything in it, say so from anywhere. */}
      {waiting > 0 && view !== 'settle' && (
        <Alert
          severity="warning"
          sx={{ mt: 3 }}
          action={
            <Button color="warning" size="small" onClick={() => setParams({ view: 'settle' })}>
              Show them
            </Button>
          }
        >
          {waiting} withdrawal{waiting === 1 ? '' : 's'} worth{' '}
          {formatInr(stats.data?.pendingWithdrawals.amountInr ?? 0)}{' '}
          {waiting === 1 ? 'is' : 'are'} waiting on you.
        </Alert>
      )}

      {sellerId && (
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid xs={12} md={5}>
            <WalletBalanceCard
              snapshot={snapshot.data}
              holder={
                rows.find((r) => r.userId === sellerId)?.seller?.farmName ??
                selectedSeller.data?.name
              }
            />
          </Grid>
          <Grid xs={12} md={7}>
            <WalletOverviewCard snapshot={snapshot.data} summary={summary.data} />
          </Grid>
        </Grid>
      )}

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
              // Only the queue carries a count: it is the one number that means
              // "do something". A badge on every tab would flatten that.
              icon={
                tab.value === 'settle' ? (
                  <Label
                    variant={view === 'settle' ? 'filled' : 'soft'}
                    color={waiting > 0 ? 'warning' : 'success'}
                  >
                    {waiting}
                  </Label>
                ) : (
                  <Iconify width={18} icon={tab.icon} sx={{ opacity: 0.6 }} />
                )
              }
            />
          ))}
        </Tabs>

        {renderFilters}
        {renderFiltersResult}
      </Card>

      <Box sx={{ mt: 3 }}>
        <WalletTransactionsCard
          title={view === 'settle' ? 'Withdrawals waiting on you' : 'Ledger'}
          subheader={
            total
              ? `${total} movement${total === 1 ? '' : 's'}`
              : undefined
          }
          rows={rows}
          loading={isLoading}
          refreshing={isFetching}
          showSeller
          emptyTitle={EMPTY_FOR[view].title}
          emptyDescription={EMPTY_FOR[view].description}
          renderActions={(row) => {
            // Only a pending withdrawal is waiting on an admin to settle it,
            // and only a full admin may move money — a cluster admin can read
            // and adjust, so showing them buttons that 403 would be a lie.
            if (row.source !== 'withdrawal' || row.status !== 'PENDING') return null;
            if (!isSuper) {
              return (
                <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                  Super admin only
                </Box>
              );
            }
            return (
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => setPending({ action: 'complete', row })}
                >
                  Pay out
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => setPending({ action: 'cancel', row })}
                >
                  Turn down
                </Button>
              </Stack>
            );
          }}
          page={page}
          rowsPerPage={limit}
          total={total}
          onPageChange={(next) => setParams({ page: String(next) })}
          onRowsPerPageChange={(next) => setParams({ limit: String(next) })}
        />
      </Box>

      <WithdrawalActionDialog
        open={Boolean(pending)}
        action={pending?.action ?? 'complete'}
        row={pending?.row ?? null}
        onClose={() => setPending(null)}
        onDone={onSettled}
      />

      <WalletAdjustDialog
        open={adjustOpen}
        sellerId={sellerId || null}
        onClose={() => setAdjustOpen(false)}
      />
    </>
  );
};
