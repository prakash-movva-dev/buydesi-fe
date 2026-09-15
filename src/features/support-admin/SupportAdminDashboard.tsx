import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';

import { fDateTime } from '@/utils/format-time';
import { useDashboardOverview } from '@/features/dashboard/api';
import { resolveOrderId } from '@/features/orders/api';
import {
  readBoolean,
  readNumber,
  useExposedSettingMap,
} from '@/features/platform-settings/exposed';
import { useTicketsList } from '@/features/support/api';
import { AnalyticsWidget } from '@/features/dashboard/AnalyticsWidget';
import { NeedsAttentionCard, type AttentionItem } from '@/features/dashboard/NeedsAttentionCard';

import type { SupportTicket } from '@/features/support/types';

// ----------------------------------------------------------------------

const inrFromPaise = (paise: number): string => `₹${(paise / 100).toLocaleString('en-IN')}`;

export const SupportAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const overview = useDashboardOverview();
  const { map: settings, isLoading: settingsLoading } = useExposedSettingMap();

  // Ticket cohorts.
  const myOpen = useTicketsList({ status: 'OPEN', assignedTo: user?.id, page: 1, limit: 200 });
  const unassigned = useTicketsList({ status: 'OPEN', assignedTo: 'none', page: 1, limit: 200 });
  const escalated = useTicketsList({ status: 'ESCALATED', page: 1, limit: 50 });

  const slaWarningHours = readNumber(settings, 'support.slaWarningHours', 4);
  const maxClaimed = readNumber(settings, 'support.maxClaimedTicketsPerAdmin', 25);
  const refundCapPaise = readNumber(settings, 'support.refundCapPaise', 200_000);
  const refundDailyCapPaise = readNumber(settings, 'support.refundDailyCapPaise', 1_000_000);
  const canCrossCluster = readBoolean(settings, 'support.canClaimCrossCluster', true);

  const slaCounts = useMemo(() => {
    const all: SupportTicket[] = [
      ...(myOpen.data?.items ?? []),
      ...(unassigned.data?.items ?? []),
    ];
    const now = Date.now();
    const warningMs = slaWarningHours * 60 * 60 * 1000;
    let warning = 0;
    let breached = 0;
    const seen = new Set<string>();
    for (const t of all) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      const due = new Date(
        t.sla.firstResponseAt ? t.sla.resolutionDueAt : t.sla.responseDueAt,
      ).getTime();
      const delta = due - now;
      if (delta < 0) breached += 1;
      else if (delta < warningMs) warning += 1;
    }
    return { warning, breached };
  }, [myOpen.data, unassigned.data, slaWarningHours]);

  const mineCount = myOpen.data?.meta.total ?? 0;
  const unassignedCount = unassigned.data?.meta.total ?? 0;
  const escalatedCount = escalated.data?.meta.total ?? 0;
  const platformOpen = overview.data?.support.open ?? null;
  const atRisk = slaCounts.warning + slaCounts.breached;

  const overCap = mineCount > maxClaimed;

  const queues: AttentionItem[] = [
    {
      key: 'mine',
      icon: 'solar:inbox-in-bold',
      label: 'My open tickets',
      count: myOpen.isLoading ? undefined : mineCount,
      onClick: () => navigate(`/admin/support?status=OPEN${user?.id ? `&assignedTo=${user.id}` : ''}`),
    },
    {
      key: 'unassigned',
      icon: 'solar:inbox-bold',
      label: 'Unassigned',
      hint: 'Claim from here',
      count: unassigned.isLoading ? undefined : unassignedCount,
      onClick: () => navigate('/admin/support?assignedTo=none&status=OPEN'),
    },
    {
      key: 'escalated',
      icon: 'solar:danger-triangle-bold',
      label: 'Escalated to me',
      count: escalated.isLoading ? undefined : escalatedCount,
      onClick: () => navigate('/admin/support?status=ESCALATED'),
    },
    {
      key: 'delivery',
      icon: 'solar:box-bold',
      label: 'Delivery exceptions',
      hint: 'Track, push, reverse pickup',
      onClick: () => navigate('/admin/delivery'),
    },
    {
      key: 'orders',
      icon: 'solar:clipboard-list-bold',
      label: 'All orders',
      count: overview.data?.orders.total,
      onClick: () => navigate('/admin/orders'),
    },
    {
      key: 'sellers',
      icon: 'solar:shop-bold',
      label: 'Sellers',
      hint: 'Look one up for context',
      count: overview.data?.sellers.total,
      onClick: () => navigate('/admin/sellers'),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name.split(' ')[0] ?? 'Admin'} 👋`}
        description="Your desk — what is waiting on you, and what is running out of time."
      />

      {overCap && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          You are holding {mineCount} tickets, over the {maxClaimed} cap. Resolve some before
          claiming more.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="My open tickets"
            total={myOpen.isLoading ? null : mineCount}
            color={overCap ? 'error' : 'primary'}
            icon={<Iconify width={48} icon="solar:inbox-in-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="Unassigned in queue"
            total={unassigned.isLoading ? null : unassignedCount}
            color="warning"
            icon={<Iconify width={48} icon="solar:inbox-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title="SLA at risk or breached"
            total={myOpen.isLoading ? null : atRisk}
            color={slaCounts.breached > 0 ? 'error' : atRisk > 0 ? 'warning' : 'success'}
            icon={<Iconify width={48} icon="solar:alarm-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidget
            title={canCrossCluster ? 'All open (platform)' : 'Open in my cluster'}
            total={platformOpen}
            color="info"
            icon={<Iconify width={48} icon="solar:headphones-round-bold-duotone" />}
          />
        </Grid>

        <Grid xs={12} md={7}>
          <NeedsAttentionCard
            title="Needs attention"
            subheader="Pre-filtered queues — the number is the live count."
            items={queues}
            loading={myOpen.isLoading}
            columns={2}
          />
        </Grid>

        <Grid xs={12} md={5}>
          <Stack spacing={3}>
            <AuthorityCard
              loading={settingsLoading}
              maxClaimed={maxClaimed}
              refundCap={inrFromPaise(refundCapPaise)}
              dailyCap={inrFromPaise(refundDailyCapPaise)}
              canCrossCluster={canCrossCluster}
              slaWarningHours={slaWarningHours}
            />
            <OrderLookupCard />
          </Stack>
        </Grid>

        <Grid xs={12}>
          <LatestEscalations />
        </Grid>
      </Grid>
    </>
  );
};

// ----------------------------------------------------------------------

/** What this admin is allowed to do without asking — read from platform settings. */
function AuthorityCard({
  loading,
  maxClaimed,
  refundCap,
  dailyCap,
  canCrossCluster,
  slaWarningHours,
}: {
  loading: boolean;
  maxClaimed: number;
  refundCap: string;
  dailyCap: string;
  canCrossCluster: boolean;
  slaWarningHours: number;
}) {
  const cells = [
    { label: 'Per-refund cap', value: refundCap },
    { label: 'Rolling 24h refund cap', value: dailyCap },
    { label: 'Ticket claim cap', value: String(maxClaimed) },
    { label: 'Cross-cluster claim', value: canCrossCluster ? 'Allowed' : 'Blocked' },
    { label: 'SLA warning at', value: `${slaWarningHours}h` },
  ];

  return (
    <Card>
      <CardHeader
        title="Your authority"
        subheader="Set by platform settings — refunds above these need a super admin."
      />
      <CardContent>
        <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {cells.map((cell) => (
            <Box
              key={cell.label}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {cell.label}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                {loading ? <Skeleton width={60} /> : cell.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

/**
 * Most tickets reference an order, so the fastest route in is pasting its
 * number. Order numbers are resolved to the real id server-side first — the
 * detail route validates an ObjectId and would reject "BD-…" outright.
 */
function OrderLookupCard() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const raw = value.trim();
    if (!raw) return;
    setError(null);
    setPending(true);
    try {
      const id = await resolveOrderId(raw);
      navigate(`/admin/orders/${id}`);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? `No order found for "${raw}".`
          : err instanceof Error
            ? err.message
            : 'Lookup failed.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Quick lookup" subheader="Jump straight to the order a ticket mentions." />
      <CardContent>
        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <TextField
            fullWidth
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Order id or order number"
            error={Boolean(error)}
            helperText={error}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <LoadingButton
            type="submit"
            variant="contained"
            loading={pending}
            disabled={!value.trim()}
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
          >
            Open order
          </LoadingButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

/**
 * The activity-log API is super-admin only, so the most recent escalations
 * stand in as "what changed lately" for this desk.
 */
function LatestEscalations() {
  const navigate = useNavigate();
  const escalated = useTicketsList({ status: 'ESCALATED', page: 1, limit: 5 });
  const items = escalated.data?.items ?? [];

  return (
    <Card>
      <CardHeader
        title="Latest escalations"
        subheader="Raised by other admins — pick them up so they don't slip."
      />

      <Box sx={{ p: 3 }}>
        {escalated.isLoading && (
          <Stack spacing={1.5}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </Stack>
        )}

        {!escalated.isLoading && items.length === 0 && (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 3 }}>
            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No escalations open.
            </Typography>
          </Stack>
        )}

        {!escalated.isLoading && items.length > 0 && (
          <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />}>
            {items.map((ticket) => (
              <ButtonBase
                key={ticket.id}
                onClick={() => navigate(`/admin/support/${ticket.id}`)}
                sx={{
                  py: 1.5,
                  width: 1,
                  borderRadius: 1,
                  justifyContent: 'flex-start',
                  '&:hover': { bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08) },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: 1, px: 1 }}>
                  <Label variant="soft" color="warning">
                    Escalated
                  </Label>
                  <ListItemText
                    primary={ticket.subject}
                    secondary={ticket.ticketNumber}
                    primaryTypographyProps={{ typography: 'subtitle2', noWrap: true }}
                    secondaryTypographyProps={{ typography: 'caption' }}
                    sx={{ textAlign: 'left', minWidth: 0 }}
                  />
                  <Box
                    component="span"
                    sx={{ ml: 'auto', flexShrink: 0, typography: 'caption', color: 'text.disabled' }}
                  >
                    {fDateTime(ticket.updatedAt)}
                  </Box>
                </Stack>
              </ButtonBase>
            ))}
          </Stack>
        )}
      </Box>
    </Card>
  );
}
