import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';

import { useDashboardOverview, type DashboardPeriod } from '@/features/dashboard/api';
import { usePayoutsList } from '@/features/payouts/api';
import { useProductsList } from '@/features/products/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { NeedsAttentionCard, type AttentionItem } from '@/features/dashboard/NeedsAttentionCard';

// ----------------------------------------------------------------------

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

const periodLabel = (p: DashboardPeriod): string =>
  ({ today: 'today', week: 'this week', month: 'this month', all: 'all time' })[p];

// ----------------------------------------------------------------------

export const RegionalAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const overview = useDashboardOverview(undefined, period);
  const pendingPayouts = usePayoutsList({ status: 'PENDING', page: 1, limit: 1 });
  const lowStock = useProductsList({ status: 'LIVE', page: 1, limit: 200 });

  const lowStockCount = useMemo(
    () => (lowStock.data?.items ?? []).filter((p) => p.stock.quantity <= p.stock.threshold).length,
    [lowStock.data],
  );

  const o = overview.data;
  const loading = overview.isLoading;
  const n = (value?: number) => (loading ? null : (value ?? 0));

  const attention: AttentionItem[] = [
    {
      key: 'kyc',
      icon: 'solar:user-check-rounded-bold',
      label: 'Pending seller KYC',
      count: o?.sellers.pendingApproval,
      onClick: () => navigate('/admin/sellers?status=PENDING'),
    },
    {
      key: 'products',
      icon: 'solar:box-bold',
      label: 'Products awaiting review',
      hint: 'Open the review queue',
      onClick: () => navigate('/admin/products?status=PENDING'),
    },
    {
      key: 'escalated',
      icon: 'solar:headphones-round-bold',
      label: 'Escalated tickets',
      count: o?.support.escalated,
      onClick: () => navigate('/admin/support?escalationLevel=cluster'),
    },
    {
      key: 'payouts',
      icon: 'solar:card-transfer-bold',
      label: 'Pending payouts',
      count: pendingPayouts.data?.meta.total,
      onClick: () => navigate('/admin/payouts?status=PENDING'),
    },
    {
      key: 'low-stock',
      icon: 'solar:graph-down-bold',
      label: 'Low-stock products',
      count: lowStock.isLoading ? undefined : lowStockCount,
      hint: "From your cluster's sellers",
      onClick: () => navigate('/admin/stock-monitor?stockState=low'),
    },
    {
      key: 'escrow',
      icon: 'solar:lock-password-bold',
      label: 'Escrow held',
      count: o?.escrow.held,
      hint: 'Orders awaiting payout',
      onClick: () => navigate('/admin/orders'),
    },
  ];

  const quickLinks: AttentionItem[] = [
    {
      key: 'sellers',
      icon: 'solar:shop-bold',
      label: 'Sellers',
      hint: 'Approve and verify',
      onClick: () => navigate('/admin/sellers'),
    },
    {
      key: 'products',
      icon: 'solar:box-bold',
      label: 'Products',
      hint: 'Approval queue',
      onClick: () => navigate('/admin/products'),
    },
    {
      key: 'orders',
      icon: 'solar:cart-large-4-bold',
      label: 'Orders',
      hint: 'Search and refund',
      onClick: () => navigate('/admin/orders'),
    },
    {
      key: 'wallet',
      icon: 'solar:wallet-money-bold',
      label: 'Wallet',
      hint: 'Per-seller adjustments',
      onClick: () => navigate('/admin/wallet'),
    },
    {
      key: 'promoters',
      icon: 'solar:users-group-rounded-bold',
      label: 'Promoters',
      hint: 'Create and manage',
      onClick: () => navigate('/admin/promoters'),
    },
    {
      key: 'reports',
      icon: 'solar:chart-square-bold',
      label: 'Reports',
      hint: 'Cluster-scoped totals',
      onClick: () => navigate('/admin/reports'),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name.split(' ')[0] ?? 'Admin'} 👋`}
        description="Your cluster at a glance — every list and queue below is scoped to it automatically."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              select
              size="small"
              value={period}
              onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
              sx={{ minWidth: 140 }}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="outlined"
              onClick={() => overview.refetch()}
              disabled={overview.isFetching}
              startIcon={<Iconify icon="solar:refresh-bold" />}
            >
              Refresh
            </Button>
          </Stack>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      {overview.isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Couldn&apos;t load dashboard data:{' '}
          {overview.error instanceof Error ? overview.error.message : 'Unknown error'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidget
            title="Sellers awaiting KYC"
            total={n(o?.sellers.pendingApproval)}
            color="warning"
            icon={<Iconify width={48} icon="solar:user-check-rounded-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidget
            title={`Orders ${periodLabel(period)}`}
            total={n(o?.orders.placed)}
            color="info"
            icon={<Iconify width={48} icon="solar:cart-large-4-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidget
            title={`Revenue ${periodLabel(period)}`}
            total={n(o?.orders.revenueInr)}
            // Money is shown in full: a shortened figure hides what is checked.
            displayTotal={loading ? undefined : formatInr(o?.orders.revenueInr ?? 0)}
            color="success"
            icon={<Iconify width={48} icon="solar:wallet-money-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidget
            title="Open support tickets"
            total={n(o?.support.open)}
            color="error"
            icon={<Iconify width={48} icon="solar:headphones-round-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidget
            title="Low-stock products"
            total={lowStock.isLoading ? null : lowStockCount}
            color={lowStockCount > 0 ? 'error' : 'primary'}
            icon={<Iconify width={48} icon="solar:graph-down-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={4}>
          <AnalyticsWidget
            title="Escrow held"
            total={n(o?.escrow.held)}
            color="secondary"
            icon={<Iconify width={48} icon="solar:lock-password-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12}>
          <NeedsAttentionCard
            title="Needs your attention"
            subheader="Work queues for your cluster — the number is the live count."
            items={attention}
            loading={loading}
          />
        </Grid>

        <Grid xs={12}>
          <NeedsAttentionCard
            title="Quick links"
            subheader="The pages you open most."
            items={quickLinks}
          />
        </Grid>
      </Grid>
    </>
  );
};
