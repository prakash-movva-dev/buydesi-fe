import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';

import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { ADMIN_ROLES, UserRole } from '@/types/api';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';

import { useActivityList } from '@/features/activity/api';
import { CategoryAdminDashboard } from '@/features/category-admin/CategoryAdminDashboard';
import { PromoterDashboard } from '@/features/promoter/dashboard/PromoterDashboard';
import { RegionalAdminDashboard } from '@/features/regional-admin/RegionalAdminDashboard';
import { SellerDashboard } from '@/features/seller/dashboard/SellerDashboard';
import { SupportAdminDashboard } from '@/features/support-admin/SupportAdminDashboard';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { NeedsAttentionCard, type AttentionItem } from '@/features/dashboard/NeedsAttentionCard';
import { RecentActivityCard } from '@/features/dashboard/RecentActivityCard';
import { useDashboardOverview, type DashboardPeriod } from '@/features/dashboard/api';

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

export const DashboardPage = () => {
  const { user } = useAuth();

  // Role-specific dashboards. Each owns its own layout and queries; the rest of
  // this component is the super-tier admin overview.
  const role = user?.role;
  if (role === UserRole.SELLER) return <SellerDashboard />;
  if (role === UserRole.PROMOTER) return <PromoterDashboard />;
  if (role === UserRole.CLUSTER_ADMIN) return <RegionalAdminDashboard />;
  if (role === UserRole.CATEGORY_ADMIN) return <CategoryAdminDashboard />;
  if (role === UserRole.SUPPORT_ADMIN) return <SupportAdminDashboard />;

  return <AdminOverview />;
};

// ----------------------------------------------------------------------

function AdminOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const overview = useDashboardOverview(undefined, period);
  const activity = useActivityList({ page: 1, limit: 6 });

  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;
  const isSuperTier =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  if (!user) return null;

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
      onClick: () => navigate('/admin/support?escalationLevel=super'),
    },
    {
      key: 'payouts',
      icon: 'solar:card-transfer-bold',
      label: 'Pending payouts',
      count: o?.payouts.pending,
      onClick: () => navigate('/admin/payouts?status=PENDING'),
    },
    {
      key: 'tickets',
      icon: 'solar:chat-round-dots-bold',
      label: 'Open tickets',
      count: o?.support.open,
      onClick: () => navigate('/admin/support?status=OPEN'),
    },
    {
      key: 'escrow',
      icon: 'solar:lock-password-bold',
      label: 'Escrow held',
      count: o?.escrow.held,
      hint: 'Orders with funds still held',
      onClick: () => navigate('/admin/orders'),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${user.name.split(' ')[0]} 👋`}
        description="How the platform is doing right now."
        action={
          isAdmin ? (
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
          ) : undefined
        }
      />

      {!isAdmin && (
        <Card sx={{ mt: 3 }}>
          <CardHeader
            title="Welcome"
            subheader="Your role-specific dashboard will appear here."
          />
        </Card>
      )}

      {isAdmin && overview.isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Couldn&apos;t load dashboard data:{' '}
          {overview.error instanceof Error ? overview.error.message : 'Unknown error'}
        </Alert>
      )}

      {isAdmin && (
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
              // Money is shown in full: "₹1.2L" hides the figure people check.
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
              title="Buyers"
              total={n(o?.buyers)}
              color="primary"
              icon={<Iconify width={48} icon="solar:users-group-rounded-bold-duotone" />}
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

          <Grid xs={12} md={isSuperTier ? 7 : 12}>
            <NeedsAttentionCard items={attention} loading={loading} />
          </Grid>

          {isSuperTier && (
            <Grid xs={12} md={5}>
              <RecentActivityCard
                entries={activity.data?.items ?? []}
                loading={activity.isLoading}
                error={
                  activity.isError
                    ? activity.error instanceof Error
                      ? activity.error.message
                      : 'Failed to load activity'
                    : null
                }
                onSeeAll={() => navigate('/admin/activity-log')}
              />
            </Grid>
          )}
        </Grid>
      )}
    </>
  );
}
