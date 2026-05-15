import { useMemo, useState } from 'react';
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
  Lock,
  MessageSquare,
  Send,
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
import { Textarea } from '@/components/ui/Textarea';
import { useOrder } from '@/features/orders/api';
import {
  readBoolean,
  useExposedSettingMap,
} from '@/features/platform-settings/exposed';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDateTime, formatInr } from '@/lib/format';
import { ADMIN_ROLES, ApiError, UserRole } from '@/types/api';
import { useScheduleReversePickup, useTicket, usePostTicketMessage } from './api';
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
import type { SupportTicket, SupportTicketMessage } from './types';

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
  const { data, isLoading, isError, error } = useTicket(id);
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

  if (isError || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Ticket not found'}
      </div>
    );
  }

  const ticket = data.ticket;
  const isStaff = user ? ADMIN_ROLES.has(user.role) : false;
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
            {data.sla.responseBreached && (
              <Badge variant="destructive">response SLA breached</Badge>
            )}
            {data.sla.resolutionBreached && (
              <Badge variant="destructive">resolution SLA breached</Badge>
            )}
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
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          <ConversationCard ticket={ticket} active={isActive} isStaff={isStaff} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SLA</CardTitle>
              <CardDescription>Windows are set from platform settings.</CardDescription>
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
                  <span>
                    No first response yet — posting a customer reply below stamps it.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <OrderContextCard orderId={ticket.orderId} raisedBy={ticket.raisedBy} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Action" value={ticket.resolution.action ?? '—'} />
            <Row
              label="By"
              value={
                ticket.resolution.by ?? <span className="text-muted-foreground">—</span>
              }
            />
            <Row
              label="At"
              value={ticket.resolution.at ? formatDateTime(ticket.resolution.at) : '—'}
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
      </div>

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

const ConversationCard = ({
  ticket,
  active,
  isStaff,
}: {
  ticket: SupportTicket;
  active: boolean;
  isStaff: boolean;
}) => {
  // The exposed-settings endpoint is admin-only — skip it for raiser views.
  const { map: settings } = useExposedSettingMap(isStaff);
  const internalAllowed =
    isStaff && readBoolean(settings, 'support.allowInternalNotes', true);
  const post = usePostTicketMessage();

  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = useMemo(
    () =>
      [...(ticket.messages ?? [])].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
    [ticket.messages],
  );

  const submit = async () => {
    if (!body.trim()) return;
    setError(null);
    try {
      await post.mutateAsync({
        id: ticket.id,
        body: body.trim(),
        internal: internalAllowed && internal,
      });
      setBody('');
      setInternal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post message');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversation
        </CardTitle>
        <CardDescription>
          Customer replies are visible to the raiser. Internal notes stay staff-only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Post a reply to start the thread.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => (
              <MessageBubble key={m._id ?? i} message={m} />
            ))}
          </ul>
        )}

        {active ? (
          <div className="space-y-2 border-t border-border pt-4">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder={
                internal
                  ? 'Internal note — visible to staff only…'
                  : 'Reply to the customer…'
              }
              className={cn(internal && 'bg-amber-50')}
            />
            <div className="flex flex-wrap items-center gap-3">
              {internalAllowed && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" />
                    Internal note (staff-only)
                  </span>
                </label>
              )}
              <Button
                size="sm"
                onClick={submit}
                disabled={post.isPending || !body.trim()}
                className="ml-auto"
              >
                <Send className="h-4 w-4" />
                {post.isPending
                  ? 'Posting…'
                  : internal
                    ? 'Post internal note'
                    : 'Send reply'}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            This ticket is {ticket.status.toLowerCase()} — the thread is closed to new
            messages.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const MessageBubble = ({ message }: { message: SupportTicketMessage }) => {
  const isStaff = message.authorRole === 'STAFF';
  if (message.internal) {
    return (
      <li className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="warning">
            <Lock className="mr-1 h-3 w-3" />
            Internal note
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(message.at)}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
      </li>
    );
  }
  return (
    <li
      className={cn(
        'rounded-md border p-3',
        isStaff ? 'border-blue-200 bg-blue-50/60' : 'border-border bg-secondary/30',
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <Badge variant={isStaff ? 'info' : 'muted'}>
          {isStaff ? 'Support' : message.authorRole === 'SELLER' ? 'Seller' : 'Buyer'}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatDateTime(message.at)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{message.body}</p>
    </li>
  );
};

const OrderContextCard = ({
  orderId,
  raisedBy,
}: {
  orderId: string | null;
  raisedBy: string;
}) => {
  const navigate = useNavigate();
  const order = useOrder(orderId ?? undefined);

  if (!orderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Raiser" value={<span className="font-mono text-xs">{raisedBy}</span>} />
          <p className="text-muted-foreground">No order linked to this ticket.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Linked order</CardTitle>
          <CardDescription>Context for resolving this ticket.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/admin/orders/${orderId}`)}
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {order.isLoading && <Skeleton className="h-24 w-full" />}
        {order.isError && (
          <p className="text-xs text-destructive">
            {order.error instanceof Error ? order.error.message : 'Failed to load order'}
          </p>
        )}
        {order.data && (
          <>
            <Row label="Order" value={order.data.orderNumber} />
            <Row
              label="Status"
              value={<Badge variant="muted">{order.data.status}</Badge>}
            />
            <Row
              label="Payment"
              value={
                <span>
                  {order.data.payment.mode} · {order.data.payment.status}
                </span>
              }
            />
            <Row label="Escrow" value={<Badge variant="muted">{order.data.escrowStatus}</Badge>} />
            <Row label="Total" value={formatInr(order.data.totalInr)} />
            <Row
              label="Items"
              value={`${order.data.items.length} · ${order.data.items
                .reduce((n, it) => n + it.quantity, 0)} units`}
            />
            <div className="border-t border-border pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Items
              </p>
              <ul className="mt-1 space-y-1">
                {order.data.items.slice(0, 5).map((it, i) => (
                  <li key={it.id ?? i} className="flex justify-between gap-2 text-xs">
                    <span className="truncate">
                      {it.name} ×{it.quantity}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatInr(it.subtotalInr)}
                    </span>
                  </li>
                ))}
                {order.data.items.length > 5 && (
                  <li className="text-xs text-muted-foreground">
                    +{order.data.items.length - 5} more
                  </li>
                )}
              </ul>
            </div>
            <Row
              label="Buyer"
              value={<span className="font-mono text-xs">{order.data.buyerId}</span>}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);
