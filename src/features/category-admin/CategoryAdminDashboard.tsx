import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { useAuth } from '@/lib/auth';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';

import { useCategoriesList } from '@/features/categories/api';
import { useProductsList } from '@/features/products/api';
import { useReviewsList } from '@/features/reviews/api';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { NeedsAttentionCard, type AttentionItem } from '@/features/dashboard/NeedsAttentionCard';

import type { SafeCategory } from '@/features/categories/types';

// ----------------------------------------------------------------------

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

  // A wide slice of products in my category — the backend already scopes a
  // category admin to their own branch; `category=` pins it tighter.
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
  const shortDescriptionCount = liveItems.filter(
    (p) => (p.description ?? '').trim().length < 20,
  ).length;

  const loading = liveProducts.isLoading;
  const reviewsPath = `/admin/reviews?status=pending${
    myCategoryId ? `&categoryId=${myCategoryId}` : ''
  }`;

  const queue: AttentionItem[] = [
    {
      key: 'pending',
      icon: 'solar:box-bold',
      label: 'Pending approval',
      count: pendingProducts.data?.meta.total,
      onClick: () => navigate('/admin/products?status=PENDING'),
    },
    {
      key: 'rejected',
      icon: 'solar:danger-triangle-bold',
      label: 'Rejected recently',
      count: rejectedProducts.data?.meta.total,
      hint: 'Follow up with the seller',
      onClick: () => navigate('/admin/products?status=REJECTED'),
    },
    {
      key: 'reviews',
      icon: 'solar:star-bold',
      label: 'Reviews to moderate',
      count: reviews.data?.meta.total,
      onClick: () => navigate(reviewsPath),
    },
  ];

  const quality: AttentionItem[] = [
    {
      key: 'low-stock',
      icon: 'solar:graph-down-bold',
      label: 'Low stock',
      count: loading ? undefined : lowStockCount,
      hint: 'Stock at or below threshold',
      onClick: () => navigate('/admin/stock-monitor?stockState=low'),
    },
    {
      key: 'out-of-stock',
      icon: 'solar:box-minimalistic-bold',
      label: 'Out of stock',
      count: loading ? undefined : outOfStockCount,
      hint: 'Sellers should restock',
      onClick: () => navigate('/admin/stock-monitor?stockState=out'),
    },
    {
      key: 'no-images',
      icon: 'solar:gallery-remove-bold',
      label: 'Without images',
      count: loading ? undefined : noImagesCount,
      hint: 'Hurts conversion',
      onClick: () => navigate('/admin/products?status=LIVE'),
    },
    {
      key: 'short-description',
      icon: 'solar:document-text-bold',
      label: 'Thin description',
      count: loading ? undefined : shortDescriptionCount,
      hint: 'Under 20 characters',
      onClick: () => navigate('/admin/products?status=LIVE'),
    },
  ];

  const quickLinks: AttentionItem[] = [
    {
      key: 'products',
      icon: 'solar:box-bold',
      label: 'My products',
      hint: 'Approval queue',
      onClick: () => navigate('/admin/products'),
    },
    {
      key: 'categories',
      icon: 'solar:folder-with-files-bold',
      label: 'My categories',
      hint: 'Tree and sub-categories',
      onClick: () => navigate('/admin/categories'),
    },
    {
      key: 'reviews-all',
      icon: 'solar:star-bold',
      label: 'My reviews',
      hint: 'Moderation queue',
      onClick: () =>
        navigate(`/admin/reviews${myCategoryId ? `?categoryId=${myCategoryId}` : ''}`),
    },
    {
      key: 'commission',
      icon: 'solar:tag-price-bold',
      label: 'Commission rules',
      hint: 'Read-only',
      onClick: () => navigate('/admin/commission'),
    },
    {
      key: 'users',
      icon: 'solar:users-group-rounded-bold',
      label: 'Users',
      hint: 'Team directory',
      onClick: () => navigate('/admin/users'),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name.split(' ')[0] ?? 'Admin'} 👋`}
        description="Your catalogue at a glance — approve what is waiting, and keep listings clean."
        action={
          <Button
            variant="outlined"
            onClick={() => {
              pendingProducts.refetch();
              liveProducts.refetch();
              reviews.refetch();
            }}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            Refresh
          </Button>
        }
      />

      <Box sx={{ mt: 3 }}>
        <ScopedAdminBanner />
      </Box>

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Pending my approval"
            total={pendingProducts.isLoading ? null : (pendingProducts.data?.meta.total ?? 0)}
            color="warning"
            icon={<Iconify width={48} icon="solar:clock-circle-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Live products"
            total={liveProducts.isLoading ? null : (liveProducts.data?.meta.total ?? 0)}
            color="success"
            icon={<Iconify width={48} icon="solar:box-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Low stock"
            total={loading ? null : lowStockCount}
            color={lowStockCount > 0 ? 'error' : 'info'}
            icon={<Iconify width={48} icon="solar:graph-down-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Reviews to moderate"
            total={reviews.isLoading ? null : (reviews.data?.meta.total ?? 0)}
            color="info"
            icon={<Iconify width={48} icon="solar:star-bold-duotone" />}
          />
        </Grid>

        {myCategoryId && myCategory && (
          <Grid xs={12}>
            <Card>
              <CardHeader
                title="Your branch"
                subheader={
                  myBranch.length === 1
                    ? 'No sub-categories yet — create them from the Categories page.'
                    : `${myBranch.length - 1} sub-categories under ${myCategory.name}.`
                }
              />
              <CardContent>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {myBranch.map((c) => (
                    <Chip
                      key={c.id}
                      size="small"
                      variant="soft"
                      color={c.id === myCategoryId ? 'primary' : 'default'}
                      label={c.name}
                      onClick={() => navigate(`/admin/products?category=${c.id}`)}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid xs={12}>
          <NeedsAttentionCard
            title="Approval queue"
            subheader="Listings in your category waiting on a decision."
            items={queue}
            loading={pendingProducts.isLoading}
          />
        </Grid>

        <Grid xs={12}>
          <NeedsAttentionCard
            title="Quality signals"
            subheader={`Lightweight checks across ${liveItems.length} live products — use these to nudge sellers.`}
            items={quality}
            loading={loading}
            columns={4}
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
