import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import AlertTitle from '@mui/material/AlertTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Unstable_Grid2';

import { useAuth } from '@/lib/auth';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';

import { fDate } from '@/utils/format-time';
import { fCurrency, fNumber } from '@/utils/format-number';

import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { useMyAffiliateDashboard, useMyLinks } from '@/features/affiliates/api';

import { shareUrl } from '../links/helpers';

// ----------------------------------------------------------------------

/**
 * The affiliate's own front page.
 *
 * Built around the only chain that matters to them: clicks became orders,
 * orders became money, and some of that money has not arrived yet. Anything
 * that does not sit on that chain is a distraction from the job.
 */
export const PromoterDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: d, isLoading, isError, error } = useMyAffiliateDashboard();
  const { data: links } = useMyLinks();

  if (isLoading) return <LoadingScreen />;

  if (isError || !d) {
    return (
      <>
        <PageHeader title="Affiliate" />
        <Alert severity="error" sx={{ mt: 3 }}>
          <AlertTitle>No affiliate account yet</AlertTitle>
          {error instanceof Error
            ? error.message
            : 'Your account is not set up as an affiliate. Ask an admin to add you.'}
        </Alert>
      </>
    );
  }

  const bestLink = (links ?? [])
    .filter((l) => l.clickCount > 0)
    .sort((a, b) => b.conversionCount / b.clickCount - a.conversionCount / a.clickCount)[0];

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name?.split(' ')[0] ?? d.name}`}
        description="Everything you have brought in, and what it has earned you."
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => navigate('/promoter/earnings')}
              startIcon={<Iconify icon="solar:wallet-money-bold" />}
            >
              Earnings
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/promoter/links')}
              startIcon={<Iconify icon="solar:link-round-bold" />}
            >
              Share links
            </Button>
          </Stack>
        }
      />

      {d.status !== 'active' && (
        <Alert severity={d.status === 'pending' ? 'info' : 'warning'} sx={{ mt: 3 }}>
          {d.status === 'pending'
            ? 'Your account is waiting for approval — you can look around, but links stay off until an admin approves you.'
            : 'Your account is suspended, so your links are switched off. Talk to your cluster admin.'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Clicks"
            total={d.clicks}
            color="info"
            icon={<Iconify icon="solar:cursor-bold" width={32} />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Orders"
            total={d.orders}
            color="primary"
            icon={<Iconify icon="solar:bag-check-bold" width={32} />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Paid to you"
            total={d.paidInr}
            displayTotal={fCurrency(d.paidInr)}
            color="success"
            icon={<Iconify icon="solar:wallet-money-bold" width={32} />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="On the way"
            total={d.pendingInr}
            displayTotal={fCurrency(d.pendingInr)}
            color="warning"
            icon={<Iconify icon="solar:clock-circle-bold" width={32} />}
          />
        </Grid>

        <Grid xs={12} md={7}>
          <Card>
            <CardHeader
              title="How your sharing is going"
              subheader="Every hundred people who click, this many buy"
            />
            <Stack spacing={3} sx={{ p: 3 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                  <Typography variant="h3">{d.conversionRatePercent}%</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {fNumber(d.orders)} of {fNumber(d.clicks)} clicks
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, d.conversionRatePercent)}
                  color={
                    d.conversionRatePercent >= 5
                      ? 'success'
                      : d.conversionRatePercent > 0
                        ? 'warning'
                        : 'inherit'
                  }
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {d.conversionRatePercent >= 5
                    ? 'That is a good rate — keep sharing the same way.'
                    : d.clicks === 0
                      ? 'Share a link to get started.'
                      : 'Links to one product usually do better than links to the whole shop.'}
                </Typography>
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                }}
              >
                <Figure label="Your rate" value={`${d.commissionRatePercent}%`} />
                <Figure label="Sales value" value={fCurrency(d.grossAttributedInr)} />
                <Figure label="Buyers you signed up" value={fNumber(d.buyersReferred)} />
                <Figure label="Sellers you signed up" value={fNumber(d.sellersReferred)} />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={5}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Your links"
              subheader={`${fNumber(d.linkCount)} made`}
              action={
                <Button size="small" onClick={() => navigate('/promoter/links')}>
                  Manage
                </Button>
              }
            />
            <Stack spacing={2} sx={{ p: 3 }}>
              {bestLink ? (
                <>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    Working best for you
                  </Typography>
                  <Stack
                    spacing={1}
                    sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontFamily: 'monospace' }}>
                        {bestLink.code}
                      </Typography>
                      <Label variant="soft" color="success">
                        {bestLink.clickCount === 0
                          ? '0%'
                          : `${Math.round((bestLink.conversionCount / bestLink.clickCount) * 100)}% buy`}
                      </Label>
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontFamily: 'monospace', wordBreak: 'break-all' }}
                    >
                      {shareUrl(bestLink.code)}
                    </Typography>
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {d.linkCount === 0
                    ? 'You have not made a link yet. One code, shared in a group, is enough to start.'
                    : 'No clicks yet on any of your links — share one and the numbers will follow.'}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate('/promoter/links')}
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                {d.linkCount === 0 ? 'Make your first link' : 'Make another link'}
              </Button>

              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Affiliate since {fDate(d.since)}
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

// ----------------------------------------------------------------------

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        {label}
      </Typography>
      <Typography variant="subtitle1">{value}</Typography>
    </Stack>
  );
}
