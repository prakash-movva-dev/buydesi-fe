import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Clock, UserX } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import {
  readNumber,
  useExposedSettingMap,
} from '@/features/platform-settings/exposed';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
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

const HEAD = [
  { id: 'ticket', label: 'Ticket' },
  { id: 'status', label: 'Status' },
  { id: 'tier', label: 'Tier' },
  { id: 'category', label: 'Category' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'sla', label: 'SLA' },
  { id: 'created', label: 'Created' },
];

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

  const rows = useMemo(() => {
    return (data?.items ?? [])
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
      .filter(({ worst }) => !slaRiskOnly || worst !== 'ok');
  }, [data, slaWarningHours, slaRiskOnly]);

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
        description="Customer and seller issues raised by buyers and sellers."
      />

      <ScopedAdminBanner />

      <Card>
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          alignItems="center"
          sx={{ p: 2.5 }}
        >
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setParam({ status: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setParam({ category: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Tier"
            value={escalationLevel}
            onChange={(e) => setParam({ escalationLevel: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          >
            {LEVEL_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
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

        {isError && (
          <Box sx={{ px: 2.5, pb: 2, color: 'error.main', typography: 'body2' }}>
            {error instanceof Error ? error.message : 'Failed to load tickets'}
          </Box>
        )}

        {isLoading && (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Stack spacing={1}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </Stack>
          </Box>
        )}

        {!isLoading && !isError && (
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={HEAD} />
              <TableBody>
                {rows.map(({ t, respState, resoState, worst }) => {
                  const rowTone =
                    worst === 'breached'
                      ? 'error.lighter'
                      : worst === 'warning'
                        ? 'warning.lighter'
                        : undefined;
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
                      hover
                      sx={{ cursor: 'pointer', bgcolor: rowTone }}
                      onClick={() => navigate(`/admin/support/${t.id}`)}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        <Box>{t.ticketNumber}</Box>
                        <Box
                          sx={{
                            color: 'text.secondary',
                            typography: 'caption',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {t.subject}
                        </Box>
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
                          <Box sx={{ typography: 'caption', fontFamily: 'monospace' }}>
                            {t.assignedTo.slice(-6)}
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              typography: 'caption',
                              color: 'text.secondary',
                            }}
                          >
                            <UserX className="h-3 w-3" />
                            unclaimed
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {worst === 'breached' && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              typography: 'caption',
                              fontWeight: 500,
                              color: 'error.main',
                            }}
                          >
                            <AlertCircle className="h-3 w-3" />
                            {slaLabel}
                          </Box>
                        )}
                        {worst === 'warning' && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              typography: 'caption',
                              fontWeight: 500,
                              color: 'warning.dark',
                            }}
                          >
                            <Clock className="h-3 w-3" />
                            {slaLabel}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(t.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableNoData notFound={!isLoading && (data?.items.length ?? 0) === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        )}

        {slaRiskOnly && (
          <Typography
            variant="caption"
            sx={{ display: 'block', px: 2.5, pt: 1, color: 'text.secondary' }}
          >
            SLA-risk filter is page-local — total below includes all tickets.
          </Typography>
        )}

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
          onRowsPerPageChange={() => {}}
        />
      </Card>
    </Stack>
  );
};
