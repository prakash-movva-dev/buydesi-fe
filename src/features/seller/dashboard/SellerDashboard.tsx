import type { ReactNode } from 'react';

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ButtonBase from '@mui/material/ButtonBase';
import Grid from '@mui/material/Unstable_Grid2';
import { alpha } from '@mui/material/styles';

import { Iconify } from '@/components/iconify';
import { useOrdersList } from '@/features/orders/api';
import { useProductsList } from '@/features/products/api';
import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { useSellerAnalytics, useSellerMe } from '@/features/seller/profile/api';
import { useMyWallet } from '@/features/seller/wallet/api';

import { DashboardWidget } from './DashboardWidget';

// ----------------------------------------------------------------------

// Day-rounded range so the analytics query key is STABLE across renders.
// Using raw `new Date()` millisecond timestamps made the key change every
// render → react-query refetched in an infinite loop.
const analyticsRange = () => {
  const to = new Date();
  to.setHours(23, 59, 59, 0);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString(), granularity: 'daily' as const };
};

export const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: me } = useSellerMe();

  const wallet = useMyWallet();
  // Freeze the range for the component's lifetime — a fresh object each render
  // would change the query key and retrigger the fetch endlessly.
  const range = useMemo(() => analyticsRange(), []);
  const analytics = useSellerAnalytics(range);
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

  const orders30d = analytics.data?.sales.totalOrders ?? null;
  const revenue30d = analytics.data?.sales.totalRevenueInr ?? null;
  const rating = analytics.data?.customers.averageRating;

  return (
    <Stack spacing={3}>
      {/* ── Greeting ── */}
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="h4" component="h1">
            {`Hi, ${user?.name.split(' ')[0] ?? ''} 👋`}
          </Typography>
          {me?.verifiedBadge && (
            <Chip size="small" variant="soft" color="info" label="Verified by Buy Desi" />
          )}
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Your storefront at a glance — orders waiting on you, stock running low, and the last 30
          days of trading.
        </Typography>
      </Box>

      {/* ── The four things that need action ── */}
      <Grid container spacing={3}>
        <Grid xs={12} sm={6} lg={3}>
          <DashboardWidget
            title="New orders to pack"
            value={pendingOrders.data ? String(pendingOrders.data.meta.total) : null}
            caption="Waiting for you to start"
            color="info"
            icon={<Iconify width={22} icon="solar:cart-large-4-bold-duotone" />}
            onClick={() => navigate('/seller/orders?status=PLACED')}
          />
        </Grid>

        <Grid xs={12} sm={6} lg={3}>
          <DashboardWidget
            title="Pending dispatch"
            value={packedOrders.data ? String(packedOrders.data.meta.total) : null}
            caption="Packed, awaiting pickup"
            color="warning"
            icon={<Iconify width={22} icon="solar:box-bold-duotone" />}
            onClick={() => navigate('/seller/orders?status=PACKED')}
          />
        </Grid>

        <Grid xs={12} sm={6} lg={3}>
          <DashboardWidget
            title="Low-stock products"
            value={lowStock.isLoading ? null : String(lowStockCount)}
            caption={lowStockCount > 0 ? 'Restock before they sell out' : 'Nothing running low'}
            color={lowStockCount > 0 ? 'error' : 'success'}
            icon={<Iconify width={22} icon="solar:graph-down-bold-duotone" />}
            onClick={() => navigate('/seller/products?status=LIVE')}
          />
        </Grid>

        <Grid xs={12} sm={6} lg={3}>
          <DashboardWidget
            title="Wallet available"
            value={wallet.data ? formatInr(wallet.data.availableInr) : null}
            caption="Ready to withdraw"
            color="success"
            icon={<Iconify width={22} icon="solar:wallet-money-bold-duotone" />}
            onClick={() => navigate('/seller/wallet')}
          />
        </Grid>
      </Grid>

      {/* ── Trading summary + shortcuts ── */}
      <Grid container spacing={3}>
        <Grid xs={12} md={7}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Last 30 days"
              subheader="How your storefront has been trading"
            />
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
                spacing={3}
              >
                <Figure label="Orders" value={orders30d === null ? null : String(orders30d)} />
                <Figure
                  label="Revenue"
                  value={revenue30d === null ? null : formatInr(revenue30d)}
                />
                <Figure
                  label="Average rating"
                  value={
                    rating === undefined ? null : rating ? rating.toFixed(1) : 'No ratings yet'
                  }
                  icon={rating ? <Iconify width={16} icon="solar:star-bold" /> : undefined}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={5}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Money" subheader="Wallet and payouts" />
            <CardContent>
              <Stack spacing={1}>
                <ShortcutRow
                  icon={<Iconify width={18} icon="solar:wallet-money-bold" />}
                  label="Wallet"
                  hint={
                    wallet.data ? `${formatInr(wallet.data.availableInr)} available` : 'Open wallet'
                  }
                  onClick={() => navigate('/seller/wallet')}
                />
                <ShortcutRow
                  icon={<Iconify width={18} icon="solar:card-transfer-bold" />}
                  label="Payouts"
                  hint="Schedule and line items"
                  onClick={() => navigate('/seller/payouts')}
                />
                <ShortcutRow
                  icon={<Iconify width={18} icon="solar:headphones-round-bold" />}
                  label="Support"
                  hint="Raise a ticket if anything's stuck"
                  onClick={() => navigate('/seller/support')}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

// ----------------------------------------------------------------------

/** A single figure in the 30-day summary. */
const Figure = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null;
  icon?: ReactNode;
}) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 600,
      }}
    >
      {label}
    </Typography>
    {value === null ? (
      <Skeleton variant="text" width={100} height={36} />
    ) : (
      <Stack direction="row" spacing={0.75} alignItems="center">
        {icon && <Box sx={{ display: 'flex', color: 'warning.main' }}>{icon}</Box>}
        <Typography variant="h5" sx={{ lineHeight: 1.3 }}>
          {value}
        </Typography>
      </Stack>
    )}
  </Box>
);

/** Tappable row used by the shortcut card. */
const ShortcutRow = ({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      p: 1.5,
      width: 1,
      gap: 1.5,
      borderRadius: 1.5,
      display: 'flex',
      textAlign: 'left',
      justifyContent: 'flex-start',
      transition: (theme) => theme.transitions.create('background-color'),
      '&:hover': { bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08) },
    }}
  >
    <Box
      sx={{
        width: 36,
        height: 36,
        flexShrink: 0,
        display: 'flex',
        borderRadius: '50%',
        alignItems: 'center',
        color: 'text.secondary',
        justifyContent: 'center',
        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
      }}
    >
      {icon}
    </Box>

    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
      <Typography variant="subtitle2" noWrap>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
        {hint}
      </Typography>
    </Box>

    <Iconify width={16} icon="eva:arrow-ios-forward-fill" />
  </ButtonBase>
);
