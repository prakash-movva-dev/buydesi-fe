import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight, Clock, UserX } from 'lucide-react';
import Stack from '@mui/material/Stack';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  readNumber,
  useExposedSettingMap,
} from '@/features/platform-settings/exposed';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useTicketsList } from './api';
import {
  TicketCategoryBadge,
  TicketLevelBadge,
  TicketStatusBadge,
} from './status-badge';
import type {
  SupportCategory,
  SupportEscalationLevel,
  SupportStatus,
  TicketsListQuery,
} from './types';

const STATUS_OPTIONS: Array<{ value: '' | SupportStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const CATEGORY_OPTIONS: Array<{ value: '' | SupportCategory; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'return', label: 'Return' },
  { value: 'refund', label: 'Refund' },
  { value: 'grievance', label: 'Grievance' },
  { value: 'product_quality', label: 'Quality' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' },
];

const LEVEL_OPTIONS: Array<{ value: '' | SupportEscalationLevel; label: string }> = [
  { value: '', label: 'All tiers' },
  { value: 'support', label: 'Support' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'super', label: 'Super' },
];

const PAGE_SIZE = 20;

type SlaState = 'ok' | 'warning' | 'breached';

const slaState = (
  dueAt: string,
  fulfilledAt: string | null,
  warningMs: number,
): SlaState => {
  if (fulfilledAt) return 'ok';
  const delta = new Date(dueAt).getTime() - Date.now();
  if (delta < 0) return 'breached';
  if (delta < warningMs) return 'warning';
  return 'ok';
};

const worstSla = (a: SlaState, b: SlaState): SlaState => {
  if (a === 'breached' || b === 'breached') return 'breached';
  if (a === 'warning' || b === 'warning') return 'warning';
  return 'ok';
};

export const TicketsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { map: settings } = useExposedSettingMap();
  const slaWarningHours = readNumber(settings, 'support.slaWarningHours', 4);

  const status = (searchParams.get('status') as SupportStatus | null) ?? '';
  const category = (searchParams.get('category') as SupportCategory | null) ?? '';
  const escalationLevel =
    (searchParams.get('escalationLevel') as SupportEscalationLevel | null) ?? '';
  const assignedToParam = searchParams.get('assignedTo') ?? '';
  const mineOnly = assignedToParam === 'me' || (user && assignedToParam === user.id);
  const unassignedOnly = assignedToParam === 'none';
  const slaRiskOnly = searchParams.get('slaRisk') === '1';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<TicketsListQuery>(
    () => ({
      status: status || undefined,
      category: category || undefined,
      escalationLevel: escalationLevel || undefined,
      assignedTo: unassignedOnly
        ? 'none'
        : mineOnly && user
          ? user.id
          : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, category, escalationLevel, mineOnly, unassignedOnly, user, page],
  );

  const { data, isLoading, isError, error } = useTicketsList(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Support tickets"
        description="Customer and seller issues. Claim a ticket to take ownership; escalate if it needs a higher tier."
      />

      <ScopedAdminBanner />

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-44"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => setParam({ category: e.target.value })}
          className="w-44"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={escalationLevel}
          onChange={(e) => setParam({ escalationLevel: e.target.value })}
          className="w-36"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Button
          variant={mineOnly ? 'primary' : 'outline'}
          size="sm"
          onClick={() =>
            setParam({ assignedTo: mineOnly ? null : user?.id ?? 'me' })
          }
        >
          {mineOnly ? 'Showing mine' : 'Show only mine'}
        </Button>
        <Button
          variant={unassignedOnly ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setParam({ assignedTo: unassignedOnly ? null : 'none' })}
        >
          {unassignedOnly ? 'Showing unassigned' : 'Unassigned only'}
        </Button>
        <Button
          variant={slaRiskOnly ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setParam({ slaRisk: slaRiskOnly ? null : '1' })}
        >
          {slaRiskOnly ? 'SLA risk (page)' : 'SLA risk only'}
        </Button>
      </Stack>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load tickets'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? [])
                .map((t) => {
                  const warningMs = slaWarningHours * 60 * 60 * 1000;
                  const respState = slaState(
                    t.sla.responseDueAt,
                    t.sla.firstResponseAt,
                    warningMs,
                  );
                  const resoState = slaState(
                    t.sla.resolutionDueAt,
                    t.sla.resolvedAt,
                    warningMs,
                  );
                  const worst = worstSla(respState, resoState);
                  return { t, respState, resoState, worst };
                })
                .filter(({ worst }) => !slaRiskOnly || worst !== 'ok')
                .map(({ t, respState, resoState, worst }) => {
                  const rowTone =
                    worst === 'breached'
                      ? 'bg-destructive/5 hover:bg-destructive/10'
                      : worst === 'warning'
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : '';
                  const slaLabel = (() => {
                    if (resoState === 'breached') return 'resolution breach';
                    if (respState === 'breached') return 'response breach';
                    if (resoState === 'warning') return 'resolution due soon';
                    if (respState === 'warning') return 'response due soon';
                    return null;
                  })();
                  return (
                    <TableRow
                      key={t.id}
                      className={cn('cursor-pointer', rowTone)}
                      onClick={() => navigate(`/admin/support/${t.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div>{t.ticketNumber}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{t.subject}</div>
                      </TableCell>
                      <TableCell>
                        <TicketStatusBadge status={t.status} />
                      </TableCell>
                      <TableCell>
                        <TicketLevelBadge level={t.escalationLevel} />
                      </TableCell>
                      <TableCell>
                        <TicketCategoryBadge category={t.category} />
                      </TableCell>
                      <TableCell>
                        {t.assignedTo ? (
                          <span className="text-xs font-mono">{t.assignedTo.slice(-6)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <UserX className="h-3 w-3" />
                            unclaimed
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {worst === 'breached' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {slaLabel}
                          </span>
                        )}
                        {worst === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                            <Clock className="h-3 w-3" />
                            {slaLabel}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(t.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No tickets match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data?.items.length ?? 0} of {total} · page {page} / {pageCount}
              {slaRiskOnly && (
                <span className="ml-2 text-xs">
                  (SLA-risk filter is page-local — total above includes all tickets.)
                </span>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.max(1, page - 1)) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.min(pageCount, page + 1)) })}
                disabled={page >= pageCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Stack>
  );
};
