import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  CreditCard,
  Headset,
  Package,
  ShoppingBag,
  Truck,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOrdersList } from '@/features/orders/api';
import { useProductsList } from '@/features/products/api';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { useSellerAnalytics, useSellerMe } from '@/features/seller/profile/api';
import { useMyWallet } from '@/features/seller/wallet/api';

const monthAgoIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
};

export const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: me } = useSellerMe();

  const wallet = useMyWallet();
  const analytics = useSellerAnalytics({
    from: monthAgoIso(),
    to: new Date().toISOString(),
    granularity: 'daily',
  });
  const pendingOrders = useOrdersList({ status: 'PLACED', page: 1, limit: 50 });
  const packedOrders = useOrdersList({ status: 'PACKED', page: 1, limit: 50 });
  const lowStock = useProductsList({
    status: 'LIVE',
    sellerId: user?.id,
    page: 1,
    limit: 100,
  });

  const lowStockCount = useMemo(
    () => (lowStock.data?.items ?? []).filter((p) => p.stock.quantity <= p.stock.threshold).length,
    [lowStock.data],
  );
  const todayOrdersCount = analytics.data?.sales.totalOrders ?? null;
  const monthRevenue = analytics.data?.sales.totalRevenueInr ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {`Hi, ${user?.name.split(' ')[0] ?? ''}`}
        </h1>
        <p className="text-muted-foreground">
          Your storefront at a glance — pending orders, low stock, wallet, and the last
          30 days of sales.
        </p>
        {me && me.verifiedBadge && (
          <Badge variant="info" className="mt-2">
            Verified by Buy Desi
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Pending dispatch"
          icon={Package}
          value={packedOrders.data ? String(packedOrders.data.meta.total) : null}
          tone="warning"
          onClick={() => navigate('/seller/orders?status=PACKED')}
        />
        <Metric
          label="New orders to pack"
          icon={ShoppingBag}
          value={pendingOrders.data ? String(pendingOrders.data.meta.total) : null}
          tone="info"
          onClick={() => navigate('/seller/orders?status=PLACED')}
        />
        <Metric
          label="Low-stock products"
          icon={Box}
          value={lowStock.isLoading ? null : String(lowStockCount)}
          tone={lowStockCount > 0 ? 'warning' : 'muted'}
          onClick={() => navigate('/seller/products?status=LIVE')}
        />
        <Metric
          label="Wallet available"
          icon={WalletIcon}
          value={wallet.data ? formatInr(wallet.data.availableInr) : null}
          tone="success"
          onClick={() => navigate('/seller/wallet')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last 30 days</CardTitle>
          <CardDescription>Snapshot from your analytics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <SubMetric
            label="Orders"
            value={todayOrdersCount === null ? null : String(todayOrdersCount)}
          />
          <SubMetric
            label="Revenue"
            value={monthRevenue === null ? null : formatInr(monthRevenue)}
          />
          <SubMetric
            label="Average rating"
            value={
              analytics.data?.customers.averageRating === undefined
                ? null
                : analytics.data.customers.averageRating
                  ? analytics.data.customers.averageRating.toFixed(1)
                  : '—'
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Money</CardTitle>
            <CardDescription>Wallet + payouts + cash entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <DashboardLink
              icon={WalletIcon}
              label="Wallet"
              hint={
                wallet.data
                  ? `${formatInr(wallet.data.availableInr)} available`
                  : 'Open'
              }
              onClick={() => navigate('/seller/wallet')}
            />
            <DashboardLink
              icon={CreditCard}
              label="Payouts"
              hint="Schedule + line items"
              onClick={() => navigate('/seller/payouts')}
            />
            <DashboardLink
              icon={Truck}
              label="Cash entries"
              hint="Offline trade settlements"
              onClick={() => navigate('/seller/cash-entries')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support</CardTitle>
            <CardDescription>Open a ticket if anything's stuck.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <DashboardLink
              icon={Headset}
              label="Support tickets"
              hint="Raise a new ticket"
              onClick={() => navigate('/seller/support')}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Metric = ({
  label,
  icon: Icon,
  value,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  tone: 'success' | 'info' | 'warning' | 'muted';
  onClick: () => void;
}) => {
  const toneCls =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-blue-700';
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {value === null ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</p>
      )}
    </button>
  );
};

const SubMetric = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    {value === null ? <Skeleton className="mt-1 h-7 w-20" /> : <p className="text-xl font-semibold">{value}</p>}
  </div>
);

const DashboardLink = ({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/40"
  >
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </button>
);
