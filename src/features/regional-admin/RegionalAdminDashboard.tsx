import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  ClipboardList,
  CreditCard,
  Headset,
  Lock,
  Package,
  RefreshCw,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDashboardOverview } from '@/features/dashboard/api';
import { usePayoutsList } from '@/features/payouts/api';
import { useProductsList } from '@/features/products/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';

export const RegionalAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const overview = useDashboardOverview();
  const pendingPayouts = usePayoutsList({ status: 'PENDING', page: 1, limit: 1 });
  const lowStock = useProductsList({ status: 'LIVE', page: 1, limit: 200 });

  const lowStockCount = useMemo(
    () =>
      (lowStock.data?.items ?? []).filter((p) => p.stock.quantity <= p.stock.threshold).length,
    [lowStock.data],
  );

  const o = overview.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {`Hi, ${user?.name.split(' ')[0] ?? 'Admin'}`}
          </h1>
          <p className="text-muted-foreground">
            Cluster operations cockpit. Every list and queue below is scoped to your cluster
            automatically.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => overview.refetch()}
          disabled={overview.isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${overview.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <ScopedAdminBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Pending seller KYC"
          value={overview.isLoading ? null : o?.sellers.pendingApproval ?? 0}
          secondary={
            overview.isLoading
              ? null
              : `${o?.sellers.approved ?? 0} approved · ${o?.sellers.total ?? 0} total`
          }
          tone="warning"
        />
        <Metric
          label="Orders today"
          value={overview.isLoading ? null : o?.orders.placedToday ?? 0}
          secondary={
            overview.isLoading ? null : `${o?.orders.cancelledToday ?? 0} cancelled today`
          }
          tone="info"
        />
        <Metric
          label="Open support tickets"
          value={overview.isLoading ? null : o?.support.open ?? 0}
          secondary={overview.isLoading ? null : `${o?.support.escalated ?? 0} escalated`}
          tone="warning"
        />
        <Metric
          label="Escrow held"
          value={overview.isLoading ? null : o?.escrow.held ?? 0}
          secondary={
            overview.isLoading ? null : `${o?.escrow.releasedToday ?? 0} released today`
          }
          tone="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Needs your attention</CardTitle>
          <CardDescription>
            Direct links into work queues, pre-filtered to your cluster.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionTile
            icon={UserCheck}
            label="Pending seller KYC"
            count={o?.sellers.pendingApproval}
            loading={overview.isLoading}
            onClick={() => navigate('/admin/sellers?status=PENDING')}
          />
          <ActionTile
            icon={Package}
            label="Products awaiting review"
            count={undefined}
            loading={false}
            hint="Open queue"
            onClick={() => navigate('/admin/products?status=PENDING')}
          />
          <ActionTile
            icon={Headset}
            label="Escalated tickets"
            count={o?.support.escalated}
            loading={overview.isLoading}
            onClick={() => navigate('/admin/support?escalationLevel=cluster')}
          />
          <ActionTile
            icon={CreditCard}
            label="Pending payouts"
            count={pendingPayouts.data?.meta.total}
            loading={pendingPayouts.isLoading}
            onClick={() => navigate('/admin/payouts?status=PENDING')}
          />
          <ActionTile
            icon={Box}
            label="Low-stock products"
            count={lowStock.isLoading ? undefined : lowStockCount}
            loading={lowStock.isLoading}
            hint="From your cluster's sellers"
            onClick={() => navigate('/admin/products?status=LIVE')}
          />
          <ActionTile
            icon={ShoppingBag}
            label="Orders placed today"
            count={o?.orders.placedToday}
            loading={overview.isLoading}
            onClick={() => navigate('/admin/orders')}
          />
          <ActionTile
            icon={Lock}
            label="Escrow held"
            count={o?.escrow.held}
            loading={overview.isLoading}
            hint="Orders awaiting payout"
            onClick={() => navigate('/admin/orders')}
          />
          <ActionTile
            icon={ClipboardList}
            label="All cluster orders"
            count={o?.orders.total}
            loading={overview.isLoading}
            onClick={() => navigate('/admin/orders')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink label="Sellers" hint="Approve / verify" onClick={() => navigate('/admin/sellers')} />
          <QuickLink label="Products" hint="Approval queue" onClick={() => navigate('/admin/products')} />
          <QuickLink label="Orders" hint="Search / refund" onClick={() => navigate('/admin/orders')} />
          <QuickLink label="Wallet" hint="Per-seller adjustments" onClick={() => navigate('/admin/wallet')} />
          <QuickLink label="Promoters" hint="Create / manage" onClick={() => navigate('/admin/promoters')} />
          <QuickLink label="Reports" hint="Cluster-scoped totals" onClick={() => navigate('/admin/reports')} />
        </CardContent>
      </Card>

      {overview.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {overview.error instanceof Error ? overview.error.message : 'Failed to load dashboard'}
        </div>
      )}
    </div>
  );
};

interface MetricProps {
  label: string;
  value: number | null;
  secondary: string | null;
  tone: 'info' | 'warning' | 'success' | 'destructive';
}

const toneClasses: Record<MetricProps['tone'], string> = {
  info: 'text-blue-700',
  warning: 'text-amber-700',
  success: 'text-emerald-700',
  destructive: 'text-destructive',
};

const Metric = ({ label, value, secondary, tone }: MetricProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
      {value === null ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <CardTitle className={`text-3xl ${toneClasses[tone]}`}>{value}</CardTitle>
      )}
      {secondary !== null && <p className="text-xs text-muted-foreground">{secondary}</p>}
    </CardHeader>
  </Card>
);

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

const QuickLink = ({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-3 text-left transition-colors hover:bg-secondary/40"
  >
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </button>
);
