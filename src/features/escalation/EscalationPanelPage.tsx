import { Link as RouterLink } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { useTicketsList } from '@/features/support/api';
import { formatDateTime } from '@/lib/format';

const PAGE_SIZE = 50;

const TICKETS_HEAD = [
  { id: 'ticket', label: 'Ticket' },
  { id: 'subject', label: 'Subject' },
  { id: 'category', label: 'Category' },
  { id: 'status', label: 'Status' },
  { id: 'raised', label: 'Raised' },
  { id: 'open', label: '' },
];


/**
 * SA-7 Escalation Panel (story 1.16). A read-only, unified queue for the
 * super tier: support tickets escalated to the super level.
 * listings awaiting approval. Every row deep-links to its existing detail
 * page where the actual action happens — nothing is mutated here.
 */
export const EscalationPanelPage = () => {
  const tickets = useTicketsList({
    escalationLevel: 'super',
    status: 'ESCALATED',
    page: 1,
    limit: PAGE_SIZE,
  });

  const ticketItems = tickets.data?.items ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Escalation Panel"
        description="A unified queue of items escalated to the super tier. Open any row to act on it from its detail page."
      />

      {/* Section 1 — Escalated support tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Escalated support tickets
            <Badge variant="warning">{tickets.data?.meta.total ?? ticketItems.length}</Badge>
          </CardTitle>
          <CardDescription>
            Tickets escalated to the super level. Open one to claim, resolve, refund, or escalate
            further.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.isLoading && <Skeleton className="h-32 w-full" />}
          {tickets.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {tickets.error instanceof Error
                ? tickets.error.message
                : 'Failed to load escalated tickets'}
            </div>
          )}
          {!tickets.isLoading && !tickets.isError && (
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={TICKETS_HEAD} />
                <TableBody>
                  {ticketItems.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                        {t.ticketNumber}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{t.subject}</TableCell>
                      <TableCell sx={{ typography: 'caption', textTransform: 'capitalize' }}>
                        {t.category.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">{t.status}</Badge>
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {formatDateTime(t.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Link
                          component={RouterLink}
                          to={`/admin/support/${t.id}`}
                          variant="subtitle2"
                          sx={{ display: 'inline-flex', alignItems: 'center' }}
                        >
                          Open
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableNoData notFound={ticketItems.length === 0} />
                </TableBody>
              </Table>
            </Scrollbar>
          )}
        </CardContent>
      </Card>

    </Stack>
  );
};
