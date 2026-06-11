import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useTicketsList } from '@/features/support/api';
import { useTradeListings } from '@/features/trade/api';
import { formatDateTime, formatInr } from '@/lib/format';

const PAGE_SIZE = 50;

/**
 * SA-7 Escalation Panel (story 1.16). A read-only, unified queue for the
 * super tier: support tickets escalated to the super level, and trade
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
  const listings = useTradeListings({ status: 'PENDING', page: 1, limit: PAGE_SIZE });

  const ticketItems = tickets.data?.items ?? [];
  const listingItems = listings.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Escalation Panel</h1>
        <p className="text-muted-foreground">
          A unified queue of items escalated to the super tier. Open any row to act on it from
          its detail page.
        </p>
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketItems.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.ticketNumber}</TableCell>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell className="text-xs capitalize">
                      {t.category.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/support/${t.id}`}
                        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                      >
                        Open
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {ticketItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No escalated support tickets.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Pending trade listings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-blue-500" />
            Pending trade listings
            <Badge variant="info">{listings.data?.meta.total ?? listingItems.length}</Badge>
          </CardTitle>
          <CardDescription>
            Inter-cluster trade listings awaiting approval. Review and approve or reject from trade
            settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listings.isLoading && <Skeleton className="h-32 w-full" />}
          {listings.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {listings.error instanceof Error
                ? listings.error.message
                : 'Failed to load pending trade listings'}
            </div>
          )}
          {!listings.isLoading && !listings.isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listingItems.map((l) => {
                  const id = l.id ?? l._id;
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell>{formatInr(l.unitPriceInr)}</TableCell>
                      <TableCell className="text-xs">
                        {l.availableUnits} / {l.totalUnits} {l.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDateTime(l.createdAt)}</TableCell>
                      <TableCell>
                        <Link
                          to="/admin/trade"
                          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                        >
                          Review
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {listingItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No pending trade listings.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
