import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import { alpha } from '@mui/material/styles';

import { useAuth } from '@/lib/auth';
import { formatInr } from '@/lib/format';
import { fDate, fDateTime } from '@/utils/format-time';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';
import { TableHeadCustom, TableNoData } from '@/components/table';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { NeedsAttentionCard, type AttentionItem } from '@/features/dashboard/NeedsAttentionCard';

import { useMyPromoterDashboard, useMyPromoterUsage } from '../api';
import { buildShareLink } from '../share/helpers';

// ----------------------------------------------------------------------

const USAGE_HEAD = [
  { id: 'when', label: 'When' },
  { id: 'buyer', label: 'Buyer' },
  { id: 'order', label: 'Order' },
  { id: 'total', label: 'Order total', align: 'right' as const },
  { id: 'discount', label: 'Discount', align: 'right' as const },
];

export const PromoterDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: d, isLoading, isError, error, refetch, isFetching } = useMyPromoterDashboard();
  const usage = useMyPromoterUsage(1, 10);

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copy = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable (insecure origin, denied permission) — the
      // button simply does nothing rather than claiming success.
    }
  };

  if (isLoading) return <LoadingScreen sx={{ py: 20 }} />;

  if (isError || !d) {
    return (
      <>
        <PageHeader title="Promoter" />
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error
            ? error.message
            : 'No promoter record found for your account. Contact support if you think this is wrong.'}
        </Alert>
      </>
    );
  }

  const shareLink = buildShareLink(d.couponCode);
  const usageItems = usage.data?.items ?? [];

  const avgDiscountPerOrder = d.totalUses > 0 ? d.totalDiscountInr / d.totalUses : 0;
  const avgOrderValue = d.totalUses > 0 ? d.totalOrderValueInr / d.totalUses : 0;
  const gmvPerRupee = d.totalDiscountInr > 0 ? d.totalOrderValueInr / d.totalDiscountInr : null;

  const quickLinks: AttentionItem[] = [
    {
      key: 'share',
      icon: 'solar:share-bold',
      label: 'Share kit',
      hint: 'QR code, templates, WhatsApp',
      onClick: () => navigate('/promoter/share'),
    },
    {
      key: 'support',
      icon: 'solar:headphones-round-bold',
      label: 'My support tickets',
      hint: 'Raise an issue',
      onClick: () => navigate('/promoter/support'),
    },
    {
      key: 'profile',
      icon: 'solar:user-id-bold',
      label: 'My profile',
      hint: 'Name and language',
      onClick: () => navigate('/promoter/profile'),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name.split(' ')[0] ?? d.name} 👋`}
        description="How your code is doing, and everything you need to share it."
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => refetch()}
              disabled={isFetching}
              startIcon={<Iconify icon="solar:refresh-bold" />}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/promoter/share')}
              startIcon={<Iconify icon="solar:share-bold" />}
            >
              Share kit
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* The code is the whole job, so it leads. */}
        <Grid xs={12}>
          <Card
            sx={{
              p: 3,
              color: 'common.white',
              bgcolor: 'grey.900',
              backgroundImage: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.darker}, ${theme.palette.grey[900]})`,
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ typography: 'subtitle2', opacity: 0.64 }}>Your code</Box>
                  <Label variant="filled" color={d.active ? 'success' : 'error'}>
                    {d.active ? 'Active' : 'Inactive'}
                  </Label>
                </Stack>

                <Typography
                  variant="h3"
                  sx={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}
                >
                  {d.couponCode}
                </Typography>

                <Box sx={{ mt: 1, typography: 'caption', opacity: 0.64 }}>
                  Active since {fDate(d.since)}
                </Box>
              </Box>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  color="inherit"
                  onClick={() => copy(d.couponCode, 'code')}
                  startIcon={
                    <Iconify
                      icon={copied === 'code' ? 'solar:check-circle-bold' : 'solar:copy-bold'}
                    />
                  }
                  sx={{ color: 'grey.800', bgcolor: 'common.white' }}
                >
                  {copied === 'code' ? 'Copied' : 'Copy code'}
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => copy(shareLink, 'link')}
                  startIcon={
                    <Iconify
                      icon={copied === 'link' ? 'solar:check-circle-bold' : 'solar:link-bold'}
                    />
                  }
                  sx={{ borderColor: alpha('#fff', 0.32) }}
                >
                  {copied === 'link' ? 'Copied' : 'Copy link'}
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Total uses"
            total={d.totalUses}
            color="primary"
            icon={<Iconify width={48} icon="solar:magic-stick-3-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="GMV driven"
            total={d.totalOrderValueInr}
            displayTotal={formatInr(d.totalOrderValueInr)}
            color="success"
            icon={<Iconify width={48} icon="solar:cart-large-4-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Discount given"
            total={d.totalDiscountInr}
            displayTotal={formatInr(d.totalDiscountInr)}
            color="warning"
            icon={<Iconify width={48} icon="solar:gift-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Unique buyers"
            total={d.uniqueBuyers}
            color="info"
            icon={<Iconify width={48} icon="solar:users-group-rounded-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} md={5}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Effectiveness"
              subheader="What each rupee of discount is buying."
            />
            <CardContent>
              <Stack spacing={2}>
                <Figure
                  label="Avg. discount per order"
                  value={d.totalUses > 0 ? formatInr(avgDiscountPerOrder) : '—'}
                />
                <Figure
                  label="Avg. order value"
                  value={d.totalUses > 0 ? formatInr(avgOrderValue) : '—'}
                />
                <Figure
                  label="GMV per ₹1 discount"
                  value={gmvPerRupee !== null ? `₹${gmvPerRupee.toFixed(1)}` : '—'}
                />
                <Figure label="Buyers referred" value={String(d.buyersReferred)} />
                <Figure label="Sellers referred" value={String(d.sellersReferred)} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={7}>
          <NeedsAttentionCard
            title="Quick links"
            subheader="Everything else you need."
            items={quickLinks}
            columns={2}
          />
        </Grid>

        <Grid xs={12}>
          <Card>
            <CardHeader
              title="Recent uses"
              subheader="Checkouts that applied your code, newest first."
            />

            {usage.isLoading && (
              <Stack spacing={1.5} sx={{ p: 3 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height={40} />
                ))}
              </Stack>
            )}

            {usage.isError && (
              <Alert severity="error" sx={{ m: 3 }}>
                Couldn&apos;t load the usage feed.
              </Alert>
            )}

            {!usage.isLoading && !usage.isError && (
              <Scrollbar>
                <Table sx={{ minWidth: 800 }}>
                  <TableHeadCustom headLabel={USAGE_HEAD} />
                  <TableBody>
                    {usageItems.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(u.usedAt)}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                          {u.buyerId.slice(-8)}
                        </TableCell>
                        <TableCell>
                          {u.orderNumber ?? (
                            <Box component="span" sx={{ color: 'text.disabled' }}>
                              validate-only
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {u.orderTotalInr !== null ? formatInr(u.orderTotalInr) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>
                          {u.discountInr !== null ? formatInr(u.discountInr) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableNoData notFound={usageItems.length === 0} />
                  </TableBody>
                </Table>
              </Scrollbar>
            )}
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

// ----------------------------------------------------------------------

const Figure = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2}>
    <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
      {label}
    </Box>
    <Box component="span" sx={{ typography: 'subtitle1' }}>
      {value}
    </Box>
  </Stack>
);
