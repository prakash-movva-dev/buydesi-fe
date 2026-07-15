import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  Headset,
  IndianRupee,
  Lock,
  Package,
  RefreshCw,
  ScrollText,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useActivityList } from '@/features/activity/api';
import { CategoryAdminDashboard } from '@/features/category-admin/CategoryAdminDashboard';
import { useDashboardOverview, type DashboardPeriod } from '@/features/dashboard/api';
import { PromoterDashboard } from '@/features/promoter/dashboard/PromoterDashboard';
import { RegionalAdminDashboard } from '@/features/regional-admin/RegionalAdminDashboard';
import { SellerDashboard } from '@/features/seller/dashboard/SellerDashboard';
import { SupportAdminDashboard } from '@/features/support-admin/SupportAdminDashboard';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { ADMIN_ROLES, UserRole } from '@/types/api';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;
  const isSuperTier =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  // Role-specific dashboards. Each one owns its own layout/queries; the rest of
  // this component is the generic super-tier admin shell.
  if (user?.role === UserRole.SELLER) return <SellerDashboard />;
  if (user?.role === UserRole.PROMOTER) return <PromoterDashboard />;
  if (user?.role === UserRole.CLUSTER_ADMIN) return <RegionalAdminDashboard />;
  if (user?.role === UserRole.CATEGORY_ADMIN) return <CategoryAdminDashboard />;
  if (user?.role === UserRole.SUPPORT_ADMIN) return <SupportAdminDashboard />;

  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const overview = useDashboardOverview(undefined, period);
  const activity = useActivityList({ page: 1, limit: 8 });

  if (!user) return null;

  // Buyers and any future roles fall through to the admin shell. Sellers and
  // promoters have already returned above.
  const greeting = 'Operations overview.';

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`Hi, ${user.name.split(' ')[0]}`}
        description={greeting}
        action={
          isAdmin ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <PeriodToggle value={period} onChange={setPeriod} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => overview.refetch()}
                disabled={overview.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${overview.isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </Stack>
          ) : undefined
        }
      />

      {isAdmin && <AdminOverview navigate={navigate} />}

      {isAdmin && isSuperTier && <RecentActivity navigate={navigate} />}

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Your role-specific dashboards land here. The seller / promoter experiences are on
              the roadmap.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {overview.isError && isAdmin && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            Couldn't load dashboard data:{' '}
            {overview.error instanceof Error ? overview.error.message : 'Unknown error'}
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  // Embedded components below — they share `overview` and `activity` via closure.

  function AdminOverview({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
    const o = overview.data;
    const loading = overview.isLoading;

    return (
      <>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2,1fr)',
              lg: 'repeat(3,1fr)',
              xl: 'repeat(5,1fr)',
            },
          }}
        >
          <MetricCard
            label="Sellers — pending KYC"
            value={loading ? null : o?.sellers.pendingApproval ?? 0}
            secondary={
              loading ? null : `${o?.sellers.approved ?? 0} approved · ${o?.sellers.total ?? 0} total`
            }
            tone="warning"
          />
          <MetricCard
            label={`Orders (${periodLabel(period)})`}
            value={loading ? null : o?.orders.placed ?? 0}
            secondary={
              loading
                ? null
                : `${o?.orders.cancelled ?? 0} cancelled · ${o?.orders.total ?? 0} all-time`
            }
            tone="info"
          />
          <MetricCard
            label={`Revenue (${periodLabel(period)})`}
            display={loading ? null : formatInr(o?.orders.revenueInr ?? 0)}
            secondary={null}
            tone="success"
          />
          <MetricCard
            label="Open support tickets"
            value={loading ? null : o?.support.open ?? 0}
            secondary={
              loading ? null : `${o?.support.escalated ?? 0} escalated`
            }
            tone="warning"
          />
          <MetricCard
            label="Buyers"
            value={loading ? null : o?.buyers ?? 0}
            secondary={loading ? null : `${o?.grievances ?? 0} open grievances`}
            tone="info"
          />
          <MetricCard
            label="Escrow held"
            value={loading ? null : o?.escrow.held ?? 0}
            secondary={
              loading ? null : `${o?.escrow.released ?? 0} released (${periodLabel(period)})`
            }
            tone="info"
          />
        </Box>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Direct links into filtered work queues. The number is the live count.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2,1fr)',
                  lg: 'repeat(4,1fr)',
                },
              }}
            >
            <ActionTile
              icon={UserCheck}
              label="Pending seller KYC"
              count={o?.sellers.pendingApproval}
              loading={loading}
              onClick={() => navigate('/admin/sellers?status=PENDING')}
            />
            <ActionTile
              icon={Package}
              label="Products awaiting review"
              count={undefined}
              loading={loading}
              hint="Open queue"
              onClick={() => navigate('/admin/products?status=PENDING')}
            />
            <ActionTile
              icon={Headset}
              label="Escalated tickets"
              count={o?.support.escalated}
              loading={loading}
              onClick={() => navigate('/admin/support?escalationLevel=super')}
            />
            <ActionTile
              icon={CreditCard}
              label="Pending payouts"
              count={o?.payouts.pending}
              loading={loading}
              onClick={() => navigate('/admin/payouts?status=PENDING')}
            />
            <ActionTile
              icon={ShoppingBag}
              label={`Orders placed (${periodLabel(period)})`}
              count={o?.orders.placed}
              loading={loading}
              onClick={() => navigate('/admin/orders')}
            />
            <ActionTile
              icon={IndianRupee}
              label={`Revenue (${periodLabel(period)})`}
              count={undefined}
              loading={loading}
              hint={loading ? undefined : formatInr(o?.orders.revenueInr ?? 0)}
              onClick={() => navigate('/admin/orders')}
            />
            <ActionTile
              icon={Lock}
              label="Escrow held"
              count={o?.escrow.held}
              loading={loading}
              hint="See orders with held escrow"
              onClick={() => navigate('/admin/orders')}
            />
            <ActionTile
              icon={ClipboardList}
              label="All orders"
              count={o?.orders.total}
              loading={loading}
              onClick={() => navigate('/admin/orders')}
            />
            <ActionTile
              icon={Headset}
              label="Open tickets"
              count={o?.support.open}
              loading={loading}
              onClick={() => navigate('/admin/support?status=OPEN')}
            />
            </Box>
          </CardContent>
        </Card>
      </>
    );
  }

  function RecentActivity({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Recent activity
            </CardTitle>
            <CardDescription>Latest admin mutations across the platform.</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/activity-log')}
          >
            See full log
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {activity.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {activity.isError && (
            <p className="text-sm text-destructive">
              {activity.error instanceof Error ? activity.error.message : 'Failed to load activity'}
            </p>
          )}
          {!activity.isLoading && !activity.isError && (
            <ul className="space-y-2">
              {(activity.data?.items ?? []).map((e) => {
                const path =
                  typeof e.metadata?.path === 'string' ? (e.metadata.path as string) : null;
                return (
                  <li
                    key={e.id ?? e._id}
                    className="flex flex-wrap items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary/30"
                  >
                    {e.actorRole && <Badge variant="muted">{e.actorRole}</Badge>}
                    <span className="font-mono text-xs">{e.action}</span>
                    {path && (
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {path}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(e.at)}
                    </span>
                  </li>
                );
              })}
              {(activity.data?.items.length ?? 0) === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">
                  No activity yet.
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }
};

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
];

const periodLabel = (p: DashboardPeriod): string =>
  PERIOD_OPTIONS.find((o) => o.value === p)?.label ?? 'Today';

const PeriodToggle = ({
  value,
  onChange,
}: {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}) => (
  <div className="inline-flex rounded-md border border-border bg-secondary/20 p-0.5">
    {PERIOD_OPTIONS.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`rounded px-2.5 py-1 text-sm font-medium transition-colors ${
          value === opt.value
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-pressed={value === opt.value}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

interface MetricCardProps {
  label: string;
  value?: number | null;
  /** Pre-formatted string value (e.g. currency). Takes precedence over `value`. */
  display?: string | null;
  secondary: string | null;
  tone: 'info' | 'warning' | 'success' | 'destructive';
}

const MetricCard = ({ label, value, display, secondary, tone }: MetricCardProps) => {
  const content = display !== undefined ? display : value;
  return (
    <StatCard
      label={label}
      value={content}
      loading={content === null || content === undefined}
      secondary={secondary}
      tone={tone}
    />
  );
};

interface ActionTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | undefined;
  loading: boolean;
  hint?: string;
  onClick: () => void;
}

const ActionTile = ({ icon: Icon, label, count, loading, hint, onClick }: ActionTileProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-3 text-left transition-colors hover:bg-secondary/40"
  >
    <div className="flex min-w-0 items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
    {loading ? (
      <Skeleton className="h-6 w-8" />
    ) : count !== undefined ? (
      <Badge variant={count > 0 ? 'warning' : 'muted'}>{count}</Badge>
    ) : (
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    )}
  </button>
);
