import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Box,
  FolderTree,
  ImageOff,
  MessageSquareText,
  Package,
  RefreshCw,
  Star,
  TrendingDown,
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
import { useCategoriesList } from '@/features/categories/api';
import { useProductsList } from '@/features/products/api';
import { useReviewsList } from '@/features/reviews/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import type { SafeCategory } from '@/features/categories/types';

const PAGE_SIZE = 200;

export const CategoryAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myCategoryId = user?.category;

  // Build my category branch (own + descendants).
  const cats = useCategoriesList();
  const myBranch = useMemo<SafeCategory[]>(() => {
    const list = cats.data ?? [];
    if (!myCategoryId) return [];
    const byParent = new Map<string | null, SafeCategory[]>();
    for (const c of list) {
      const arr = byParent.get(c.parentId) ?? [];
      arr.push(c);
      byParent.set(c.parentId, arr);
    }
    const out: SafeCategory[] = [];
    const queue = [myCategoryId];
    while (queue.length) {
      const id = queue.shift()!;
      const self = list.find((c) => c.id === id);
      if (self) out.push(self);
      const children = byParent.get(id) ?? [];
      for (const child of children) queue.push(child.id);
    }
    return out;
  }, [cats.data, myCategoryId]);
  const myCategory = myBranch[0];

  // Pull a wide slice of products in my (single) primary category — backend
  // returns my-branch only thanks to the P2 category-admin scoping, plus the
  // explicit `category=` filter pins it tighter.
  const pendingProducts = useProductsList({
    status: 'PENDING',
    category: myCategoryId,
    page: 1,
    limit: PAGE_SIZE,
  });
  const liveProducts = useProductsList({
    status: 'LIVE',
    category: myCategoryId,
    page: 1,
    limit: PAGE_SIZE,
  });
  const rejectedProducts = useProductsList({
    status: 'REJECTED',
    category: myCategoryId,
    page: 1,
    limit: 50,
  });

  const reviews = useReviewsList({
    status: 'pending',
    targetType: 'product',
    page: 1,
    limit: 50,
  });

  // Quality signals computed client-side from the live products page.
  const liveItems = liveProducts.data?.items ?? [];
  const lowStockCount = liveItems.filter((p) => p.stock.quantity <= p.stock.threshold).length;
  const outOfStockCount = liveItems.filter((p) => p.stock.quantity === 0).length;
  const noImagesCount = liveItems.filter((p) => p.images.length === 0).length;
  const shortDescriptionCount = liveItems.filter((p) => (p.description ?? '').trim().length < 20)
    .length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {`Hi, ${user?.name.split(' ')[0] ?? 'Admin'}`}
          </h1>
          <p className="text-muted-foreground">
            Catalog quality cockpit. Approve pending listings, watch for low stock, and keep
            your category's product info clean.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            pendingProducts.refetch();
            liveProducts.refetch();
            reviews.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <ScopedAdminBanner />

      {myCategoryId && myCategory && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderTree className="h-4 w-4" />
              Your branch
            </CardTitle>
            <CardDescription>
              {myBranch.length === 1
                ? 'No sub-categories yet — create them from the Categories page.'
                : `${myBranch.length - 1} sub-categories under ${myCategory.name}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {myBranch.map((c) => (
                <Badge key={c.id} variant={c.id === myCategoryId ? 'info' : 'muted'}>
                  {c.name}
                </Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => navigate('/admin/categories')}
            >
              Manage taxonomy
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Pending my approval"
          value={pendingProducts.isLoading ? null : pendingProducts.data?.meta.total ?? 0}
          icon={Package}
          tone="warning"
        />
        <Metric
          label="Live products"
          value={liveProducts.isLoading ? null : liveProducts.data?.meta.total ?? 0}
          icon={Box}
          tone="success"
        />
        <Metric
          label="Low stock"
          value={liveProducts.isLoading ? null : lowStockCount}
          icon={TrendingDown}
          tone={lowStockCount > 0 ? 'warning' : 'muted'}
        />
        <Metric
          label="Pending reviews"
          value={reviews.isLoading ? null : reviews.data?.meta.total ?? 0}
          icon={Star}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval queue</CardTitle>
          <CardDescription>
            Products in your category awaiting decision. Click in to review and act.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionTile
            icon={Package}
            label="Pending approval"
            count={pendingProducts.data?.meta.total}
            loading={pendingProducts.isLoading}
            onClick={() => navigate('/admin/products?status=PENDING')}
          />
          <ActionTile
            icon={AlertCircle}
            label="Rejected (recent)"
            count={rejectedProducts.data?.meta.total}
            loading={rejectedProducts.isLoading}
            hint="Follow up with sellers"
            onClick={() => navigate('/admin/products?status=REJECTED')}
          />
          <ActionTile
            icon={Star}
            label="Reviews to moderate"
            count={reviews.data?.meta.total}
            loading={reviews.isLoading}
            onClick={() => navigate(`/admin/reviews?status=pending${myCategoryId ? `&categoryId=${myCategoryId}` : ''}`)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality signals</CardTitle>
          <CardDescription>
            Lightweight checks across {liveItems.length} live products in your category.
            Use these to nudge sellers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QualityTile
            icon={TrendingDown}
            label="Low stock"
            count={liveProducts.isLoading ? undefined : lowStockCount}
            description="Stock ≤ threshold"
            tone={lowStockCount > 0 ? 'warning' : 'muted'}
            onClick={() => navigate('/admin/products?status=LIVE')}
          />
          <QualityTile
            icon={Box}
            label="Out of stock"
            count={liveProducts.isLoading ? undefined : outOfStockCount}
            description="Sellers should restock"
            tone={outOfStockCount > 0 ? 'destructive' : 'muted'}
            onClick={() => navigate('/admin/products?status=LIVE')}
          />
          <QualityTile
            icon={ImageOff}
            label="Without images"
            count={liveProducts.isLoading ? undefined : noImagesCount}
            description="Visual quality issue"
            tone={noImagesCount > 0 ? 'warning' : 'muted'}
            onClick={() => navigate('/admin/products?status=LIVE')}
          />
          <QualityTile
            icon={MessageSquareText}
            label="Short description"
            count={liveProducts.isLoading ? undefined : shortDescriptionCount}
            description="< 20 characters"
            tone={shortDescriptionCount > 0 ? 'warning' : 'muted'}
            onClick={() => navigate('/admin/products?status=LIVE')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink label="My products" hint="Approval queue" onClick={() => navigate('/admin/products')} />
          <QuickLink label="My categories" hint="Tree + subcategories" onClick={() => navigate('/admin/categories')} />
          <QuickLink label="My reviews" hint="Moderation queue" onClick={() => navigate(`/admin/reviews${myCategoryId ? `?categoryId=${myCategoryId}` : ''}`)} />
          <QuickLink label="Commission rules" hint="Read-only" onClick={() => navigate('/admin/commission')} />
          <QuickLink label="Users" hint="Team directory" onClick={() => navigate('/admin/users')} />
        </CardContent>
      </Card>
    </div>
  );
};

interface MetricProps {
  label: string;
  value: number | null;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'info' | 'warning' | 'success' | 'muted' | 'destructive';
}

const toneClasses: Record<MetricProps['tone'], string> = {
  info: 'text-blue-700',
  warning: 'text-amber-700',
  success: 'text-emerald-700',
  muted: 'text-muted-foreground',
  destructive: 'text-destructive',
};

const Metric = ({ label, value, icon: Icon, tone }: MetricProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </CardDescription>
      {value === null ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <CardTitle className={`text-3xl ${toneClasses[tone]}`}>{value}</CardTitle>
      )}
    </CardHeader>
  </Card>
);

const ActionTile = ({
  icon: Icon,
  label,
  count,
  loading,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | undefined;
  loading: boolean;
  hint?: string;
  onClick: () => void;
}) => (
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

const QualityTile = ({
  icon: Icon,
  label,
  count,
  description,
  tone,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | undefined;
  description: string;
  tone: 'info' | 'warning' | 'success' | 'muted' | 'destructive';
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-md border border-border bg-secondary/20 p-3 text-left transition-colors hover:bg-secondary/40"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </div>
      {count === undefined ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <Badge variant={count > 0 && tone !== 'muted' ? 'warning' : 'muted'}>{count}</Badge>
      )}
    </div>
    <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>
      {count === undefined ? '—' : count}
    </p>
    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
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
