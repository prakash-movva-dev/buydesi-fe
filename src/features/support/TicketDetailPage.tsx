import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Hand,
  Truck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { UserRole } from '@/types/api';
import { useScheduleReversePickup, useTicket } from './api';
import {
  ClaimDialog,
  EscalateDialog,
  ForceRefundDialog,
  ResolveDialog,
} from './TicketActionDialogs';
import {
  TicketCategoryBadge,
  TicketLevelBadge,
  TicketStatusBadge,
} from './status-badge';

const REFUND_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
]);

const slaPill = (dueAt: string, fulfilledAt: string | null) => {
  if (fulfilledAt) {
    return <Badge variant="success">met</Badge>;
  }
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms < 0) return <Badge variant="destructive">breached</Badge>;
  const h = Math.round(ms / 3_600_000);
  return <Badge variant={h < 6 ? 'warning' : 'info'}>{h}h left</Badge>;
};

export const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ticket, isLoading, isError, error } = useTicket(id);
  const reversePickup = useScheduleReversePickup();

  const [claimOpen, setClaimOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Ticket not found'}
      </div>
    );
  }

  const isAssignedToMe = user && ticket.assignedTo === user.id;
  const isActive = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
  const canRefund = user && REFUND_ROLES.has(user.role);
  const canSchedulePickup = isActive && Boolean(ticket.orderId);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/support')}>
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ticket.ticketNumber}</h1>
          <p className="mt-1 text-base">{ticket.subject}</p>
          <p className="text-sm text-muted-foreground">
            raised {formatDateTime(ticket.createdAt)} by {ticket.raiserRole.toLowerCase()}{' '}
            {ticket.raisedBy}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketLevelBadge level={ticket.escalationLevel} />
            <TicketCategoryBadge category={ticket.category} />
            {isAssignedToMe && <Badge variant="info">Assigned to me</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isActive && !ticket.assignedTo && (
            <Button onClick={() => setClaimOpen(true)}>
              <Hand className="h-4 w-4" />
              Claim
            </Button>
          )}
          {isActive && ticket.assignedTo && (
            <Button onClick={() => setResolveOpen(true)}>
              <CheckCircle2 className="h-4 w-4" />
              Resolve
            </Button>
          )}
          {isActive && ticket.escalationLevel !== 'super' && (
            <Button variant="outline" onClick={() => setEscalateOpen(true)}>
              <ArrowUpFromLine className="h-4 w-4" />
              Escalate
            </Button>
          )}
          {canRefund && ticket.orderId && (
            <Button variant="outline" onClick={() => setRefundOpen(true)}>
              <CircleDollarSign className="h-4 w-4" />
              Force refund
            </Button>
          )}
          {canSchedulePickup && (
            <Button
              variant="outline"
              onClick={() => reversePickup.mutate({ id: ticket.id })}
              disabled={reversePickup.isPending}
            >
              <Truck className="h-4 w-4" />
              Reverse pickup
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA</CardTitle>
            <CardDescription>Configured per backend env.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="First response"
              value={slaPill(ticket.sla.responseDueAt, ticket.sla.firstResponseAt)}
            />
            <p className="-mt-2 text-xs text-muted-foreground">
              due {formatDateTime(ticket.sla.responseDueAt)}
            </p>
            <Row
              label="Resolution"
              value={slaPill(ticket.sla.resolutionDueAt, ticket.sla.resolvedAt)}
            />
            <p className="-mt-2 text-xs text-muted-foreground">
              due {formatDateTime(ticket.sla.resolutionDueAt)}
            </p>
            {ticket.sla.firstResponseAt === null && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                <span>No first response logged yet.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Linked order</CardTitle>
          </CardHeader>
          <CardContent>
            {ticket.orderId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/orders/${ticket.orderId}`)}
              >
                Open order
                <ExternalLink className="h-3 w-3" />
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No order attached.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Action" value={ticket.resolution.action ?? '—'} />
            <Row
              label="By"
              value={
                ticket.resolution.by ?? (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
            <Row
              label="At"
              value={
                ticket.resolution.at ? formatDateTime(ticket.resolution.at) : '—'
              }
            />
            {ticket.resolution.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap">{ticket.resolution.notes}</p>
              </div>
            )}
            {ticket.refundIssued && (
              <div className="mt-3 rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">
                Refund of {formatInr(ticket.refundIssued.amountInr)} issued{' '}
                {formatDateTime(ticket.refundIssued.at)} by {ticket.refundIssued.by}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>{ticket.attachments.length} file(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {ticket.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments uploaded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {ticket.attachments.map((key, i) => (
                <li key={`${key}-${i}`} className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{key}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {ticket.history.map((event, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{event.event}</span>
                    {event.fromStatus && event.toStatus && (
                      <span className="text-xs text-muted-foreground">
                        {event.fromStatus} → {event.toStatus}
                      </span>
                    )}
                    {event.fromLevel && event.toLevel && (
                      <span className="text-xs text-muted-foreground">
                        {event.fromLevel} → {event.toLevel}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(event.at)}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-sm">{event.notes}</p>
                  )}
                  {event.byUserId && (
                    <p className="text-xs text-muted-foreground">by {event.byUserId}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <ClaimDialog open={claimOpen} ticketId={ticket.id} onClose={() => setClaimOpen(false)} />
      <ResolveDialog
        open={resolveOpen}
        ticketId={ticket.id}
        onClose={() => setResolveOpen(false)}
      />
      <EscalateDialog
        open={escalateOpen}
        ticketId={ticket.id}
        onClose={() => setEscalateOpen(false)}
      />
      <ForceRefundDialog
        open={refundOpen}
        ticketId={ticket.id}
        onClose={() => setRefundOpen(false)}
      />
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);
