import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';

import { varAlpha } from '@/theme/styles';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyContent } from '@/components/empty-content';

import { fDate } from '@/utils/format-time';
import { fCurrency, fNumber } from '@/utils/format-number';
import { useRegionsList } from '@/features/regions/api';

import {
  useCluster,
  useClusterPerformance,
  useClusterStats,
} from './api';
import { ClusterFormDialog } from './ClusterFormDialog';
import { ClusterStaffingCard } from './ClusterStaffingCard';
import { CLUSTER_STATUS_COLOR } from './cluster-table-row';

// ----------------------------------------------------------------------

/** The last thirty days, which is the window an ops question is usually about. */
const last30 = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 86_400_000);
  return {
    from: `${from.toISOString().slice(0, 10)}T00:00:00.000Z`,
    to: `${to.toISOString().slice(0, 10)}T23:59:59.999Z`,
  };
};

type TabValue = 'overview' | 'staffing' | 'performance';

// ----------------------------------------------------------------------

/**
 * One cluster: where it operates, who runs it, and how it has been doing.
 *
 * Staffing gets its own tab and a warning on the header, because an unstaffed
 * cluster is the failure mode that hurts sellers first.
 */
export const ClusterDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabValue>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const cluster = useCluster(id);
  const stats = useClusterStats(id);
  const { data: regions } = useRegionsList();

  const range = useMemo(last30, []);
  const performance = useClusterPerformance(
    { from: range.from, to: range.to, clusterId: id },
    Boolean(id),
  );
  const perf =
    performance.data?.rows.find((r) => r.clusterId === id) ?? performance.data?.rows[0];

  const isSuper =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  if (cluster.isLoading) return <LoadingScreen />;

  const c = cluster.data;
  if (cluster.isError || !c) {
    return (
      <>
        <PageHeader title="Cluster" />
        <Alert severity="error" sx={{ mt: 3 }}>
          {cluster.error instanceof Error ? cluster.error.message : 'Could not load this cluster'}
        </Alert>
      </>
    );
  }

  const regionName = (regions ?? []).find((r) => r.id === c.regionId)?.name;

  const FACTS: Array<{ label: string; value: string; icon: string }> = [
    { label: 'Sellers', value: fNumber(stats.data?.sellerCount ?? 0), icon: 'solar:users-group-rounded-bold' },
    { label: 'PIN codes', value: fNumber(c.pinCodes.length), icon: 'solar:map-point-bold' },
    { label: 'Categories live', value: fNumber(stats.data?.activeCategoryCount ?? 0), icon: 'solar:widget-bold' },
    { label: 'Cash on delivery', value: c.codAllowed ? 'Allowed' : 'Off', icon: 'solar:wallet-money-bold' },
  ];

  return (
    <>
      <PageHeader
        title={c.name}
        links={[
          { name: 'Dashboard', href: '/admin' },
          { name: 'Clusters', href: '/admin/clusters' },
          { name: c.name },
        ]}
        description={`${c.district}, ${c.state}${c.zone ? ` · ${c.zone} zone` : ''}${
          regionName ? ` · ${regionName} region` : ''
        }`}
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/admin/sellers?cluster=${c.id}`)}
              startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
            >
              Its sellers
            </Button>
            {isSuper && (
              <Button
                variant="contained"
                onClick={() => setEditOpen(true)}
                startIcon={<Iconify icon="solar:pen-bold" />}
              >
                Edit cluster
              </Button>
            )}
          </Stack>
        }
      />

      <Card sx={{ mt: 3, p: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          divider={
            <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />
          }
          alignItems={{ md: 'center' }}
        >
          <Stack spacing={0.5} sx={{ minWidth: 200 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">{c.name}</Typography>
              <Label variant="soft" color={CLUSTER_STATUS_COLOR[c.status] ?? 'default'}>
                {c.status}
              </Label>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {c.code ? `Code ${c.code} · ` : ''}
              {c.launchDate ? `live since ${fDate(c.launchDate)}` : 'not launched yet'}
            </Typography>
          </Stack>

          <Grid container spacing={2} sx={{ flexGrow: 1, width: 1 }}>
            {FACTS.map((fact) => (
              <Grid key={fact.label} xs={6} sm={3}>
                <Stack spacing={0.25}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon={fact.icon} width={16} sx={{ color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {fact.label}
                    </Typography>
                  </Stack>
                  <Typography variant="h6">{fact.value}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Card>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setTab(value as TabValue)}
          sx={{
            px: 3,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="staffing" label="Who staffs it" />
          <Tab value="performance" label="Last 30 days" />
        </Tabs>

        {tab === 'overview' && (
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid xs={12} md={6}>
              <Stack spacing={2}>
                <Typography variant="subtitle2">Where it delivers</Typography>
                {c.pinCodes.length === 0 ? (
                  <Alert severity="warning" variant="outlined">
                    No PIN codes yet — nothing can be delivered here until at least one is added.
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {c.pinCodes.map((pin) => (
                      <Label key={pin} variant="soft">
                        {pin}
                      </Label>
                    ))}
                  </Box>
                )}

                {c.hubPincode && (
                  <>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">Pickup hub</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {c.hubAddress ?? 'No address on file'} — {c.hubPincode}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Where the carrier collects this cluster&apos;s parcels
                      </Typography>
                    </Stack>
                  </>
                )}
              </Stack>
            </Grid>

            <Grid xs={12} md={6}>
              <Stack spacing={2}>
                <Typography variant="subtitle2">Trading rules</Typography>
                <Stack spacing={1.5}>
                  <Fact
                    label="Cash on delivery"
                    value={c.codAllowed ? 'Allowed' : 'Not allowed'}
                    tone={c.codAllowed ? 'success' : 'default'}
                  />
                  <Fact
                    label="Minimum order"
                    value={
                      c.minOrderValueInr ? fCurrency(c.minOrderValueInr) : 'No minimum'
                    }
                  />
                  <Fact label="Region" value={regionName ?? 'Not in a region'} />
                </Stack>

                {(c.contactPhone || c.contactEmail) && (
                  <>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">Cluster contact</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {[c.contactPhone, c.contactEmail].filter(Boolean).join(' · ')}
                      </Typography>
                    </Stack>
                  </>
                )}

                {c.description && (
                  <>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {c.description}
                    </Typography>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}

        {tab === 'staffing' && (
          <Box sx={{ p: 3 }}>
            <ClusterStaffingCard
              clusterId={c.id}
              clusterName={c.name}
              canAssign={isSuper}
            />
            {!isSuper && (
              <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                Only a super admin can move people between clusters.
              </Alert>
            )}
          </Box>
        )}

        {tab === 'performance' && (
          <Box sx={{ p: 3 }}>
            {!perf ? (
              <EmptyContent
                filled
                sx={{ py: 8 }}
                title="Nothing to report yet"
                description="Thirty days of orders, revenue and tickets will appear here once this cluster starts trading."
              />
            ) : (
              <Grid container spacing={3}>
                {[
                  { label: 'Sellers', value: fNumber(perf.sellers), icon: 'solar:users-group-rounded-bold' },
                  { label: 'Live listings', value: fNumber(perf.liveListings), icon: 'solar:box-bold' },
                  { label: 'Orders', value: fNumber(perf.orders), icon: 'solar:bag-check-bold' },
                  { label: 'Revenue', value: fCurrency(perf.revenueInr), icon: 'solar:wallet-money-bold' },
                  { label: 'Open tickets', value: fNumber(perf.openTickets), icon: 'solar:chat-round-dots-bold' },
                  {
                    label: 'Average delivery',
                    value: perf.avgDeliveryHours ? `${perf.avgDeliveryHours} h` : '—',
                    icon: 'solar:delivery-bold',
                  },
                ].map((item) => (
                  <Grid key={item.label} xs={6} sm={4} md={2}>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify icon={item.icon} width={16} sx={{ color: 'text.disabled' }} />
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {item.label}
                        </Typography>
                      </Stack>
                      <Typography variant="h6">{item.value}</Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Card>

      <ClusterFormDialog open={editOpen} editing={c} onClose={() => setEditOpen(false)} />
    </>
  );
};

// ----------------------------------------------------------------------

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'default';
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      {tone ? (
        <Label variant="soft" color={tone}>
          {value}
        </Label>
      ) : (
        <Typography variant="body2">{value}</Typography>
      )}
    </Stack>
  );
}
