import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Headset,
  Inbox,
  Search,
  Truck,
  UserCheck,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useDashboardOverview } from '@/features/dashboard/api';
import { resolveOrderId } from '@/features/orders/api';
import {
  readBoolean,
  readNumber,
  useExposedSettingMap,
} from '@/features/platform-settings/exposed';
import { useTicketsList } from '@/features/support/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/types/api';
import type { SupportTicket } from '@/features/support/types';

const inrFromPaise = (paise: number): string => `₹${(paise / 100).toLocaleString('en-IN')}`;

export const SupportAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const overview = useDashboardOverview();
  const { map: settings, isLoading: settingsLoading } = useExposedSettingMap();

  // Tickets cohorts.
  const myOpen = useTicketsList({
    status: 'OPEN',
    assignedTo: user?.id,
    page: 1,
    limit: 200,
  });
  const unassigned = useTicketsList({
    status: 'OPEN',
    assignedTo: 'none',
    page: 1,
    limit: 200,
  });
  const escalated = useTicketsList({
    status: 'ESCALATED',
    page: 1,
    limit: 50,
  });

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

  const overCap = mineCount > maxClaimed;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`Hi, ${user?.name.split(' ')[0] ?? 'Support'}`}
        description="Your triage cockpit. Claim from the unassigned queue, work your own list, escalate what you can't resolve."
      />

      {/* Hero metrics */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2,1fr)',
            lg: 'repeat(4,1fr)',
          },
        }}
      >
        <Metric
          label="My open tickets"
          value={myOpen.isLoading ? null : mineCount}
          secondary={overCap ? `Over soft cap of ${maxClaimed}` : `Soft cap ${maxClaimed}`}
          tone={overCap ? 'warning' : 'info'}
        />
        <Metric
          label="Unassigned in queue"
          value={unassigned.isLoading ? null : unassignedCount}
          secondary={canCrossCluster ? 'Any cluster claimable' : 'Cluster-restricted'}
          tone="warning"
        />
        <Metric
          label="SLA risk / breached"
          value={
            myOpen.isLoading || unassigned.isLoading
              ? null
              : slaCounts.warning + slaCounts.breached
          }
          secondary={
            myOpen.isLoading
              ? null
              : `${slaCounts.warning} approaching · ${slaCounts.breached} breached`
          }
          tone={slaCounts.breached > 0 ? 'destructive' : 'warning'}
        />
        <Metric
          label="All open (platform)"
          value={overview.isLoading ? null : platformOpen ?? 0}
          secondary={`${escalatedCount} escalated open`}
          tone="info"
        />
      </Box>

      {/* Authority & caps card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your authority</CardTitle>
          <CardDescription>
            Configured by platform admins. Above these, escalate to a super admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' },
            }}
          >
          <AuthorityCell
            label="Per-refund cap"
            value={settingsLoading ? '…' : inrFromPaise(refundCapPaise)}
          />
          <AuthorityCell
            label="Rolling 24h refund cap"
            value={settingsLoading ? '…' : inrFromPaise(refundDailyCapPaise)}
          />
          <AuthorityCell
            label="Cross-cluster claim"
            value={settingsLoading ? '…' : canCrossCluster ? 'Allowed' : 'Restricted to your cluster'}
          />
          </Box>
        </CardContent>
      </Card>

      {/* Work queues */}
      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
          <CardDescription>Pre-filtered queues. The number is the live count.</CardDescription>
        </CardHeader>
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2,1fr)',
                lg: 'repeat(3,1fr)',
              },
            }}
          >
          <ActionTile
            icon={Headset}
            label="My open tickets"
            count={mineCount}
            loading={myOpen.isLoading}
            onClick={() =>
              navigate(
                user?.id
                  ? `/admin/support?assignedTo=${user.id}&status=OPEN`
                  : '/admin/support?status=OPEN',
              )
            }
          />
          <ActionTile
            icon={Inbox}
            label="Unassigned (claim from here)"
            count={unassignedCount}
            loading={unassigned.isLoading}
            onClick={() => navigate('/admin/support?assignedTo=none&status=OPEN')}
          />
          <ActionTile
            icon={AlertTriangle}
            label="Escalated to me"
            count={escalatedCount}
            loading={escalated.isLoading}
            onClick={() => navigate('/admin/support?status=ESCALATED')}
          />
          <ActionTile
            icon={Truck}
            label="Delivery exceptions"
            count={undefined}
            loading={false}
            hint="Track / push / reverse pickup"
            onClick={() => navigate('/admin/delivery')}
          />
          <ActionTile
            icon={ClipboardList}
            label="All orders"
            count={overview.data?.orders.total}
            loading={overview.isLoading}
            onClick={() => navigate('/admin/orders')}
          />
          <ActionTile
            icon={UserCheck}
            label="Sellers"
            count={overview.data?.sellers.total}
            loading={overview.isLoading}
            hint="Look up seller for context"
            onClick={() => navigate('/admin/sellers')}
          />
          </Box>
        </CardContent>
      </Card>

      {/* Lookup shortcut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick lookup</CardTitle>
          <CardDescription>
            Most tickets reference an order. Jump straight in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderLookup />
        </CardContent>
      </Card>

      {/* Recent activity from the platform overview, scoped to support actions */}
      <RecentSupportActivity />
    </Stack>
  );
};

interface MetricProps {
  label: string;
  value: number | null;
  secondary: string | null;
  tone: 'info' | 'warning' | 'success' | 'destructive';
}

const Metric = ({ label, value, secondary, tone }: MetricProps) => (
  <StatCard
    label={label}
    value={value}
    loading={value === null}
    secondary={secondary}
    tone={tone}
  />
);

const AuthorityCell = ({ label, value }: { label: string; value: string }) => (
  <Box
    sx={{
      borderRadius: 1,
      border: 1,
      borderColor: 'divider',
      bgcolor: 'action.hover',
      p: 1.5,
    }}
  >
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography sx={{ mt: 0.5, fontWeight: 600 }}>{value}</Typography>
  </Box>
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

const OrderLookup = () => {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setError(null);
    setPending(true);
    try {
      // Accepts either a Mongo id or a human order number (e.g. BD-...). The
      // number is resolved server-side to the real id before we navigate, so
      // pasting an order number no longer routes to the ObjectId param validator.
      const id = await resolveOrderId(value);
      navigate(`/admin/orders/${id}`);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? `No order found for "${value}".`
          : err instanceof Error
            ? err.message
            : 'Lookup failed.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        alignItems="center"
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('orderId') as string) ?? '';
          void submit(v);
        }}
      >
        <Box sx={{ position: 'relative', flex: 1, minWidth: '16rem' }}>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            name="orderId"
            placeholder="Paste an order id or order number"
            className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </Box>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? 'Opening…' : 'Open'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Stack>
      {error && (
        <Typography variant="body2" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      )}
    </Stack>
  );
};

const RecentSupportActivity = () => {
  // Lightweight: use the latest escalated tickets as "recent significant
  // activity". The activity-log API is super-only so we don't read it here.
  const escalated = useTicketsList({ status: 'ESCALATED', page: 1, limit: 5 });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4" />
          Latest escalations
        </CardTitle>
        <CardDescription>
          Other admins escalated these — handle them or note them so they don't slip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {escalated.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}
        {!escalated.isLoading && (
          <ul className="space-y-2">
            {(escalated.data?.items ?? []).map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary/30"
              >
                <Badge variant="warning">ESCALATED</Badge>
                <span className="font-medium">{t.ticketNumber}</span>
                <span className="truncate text-muted-foreground">{t.subject}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(t.updatedAt)}
                </span>
              </li>
            ))}
            {(escalated.data?.items.length ?? 0) === 0 && !escalated.isLoading && (
              <li className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                No escalations open.
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
