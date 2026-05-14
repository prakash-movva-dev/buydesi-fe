import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CircleDollarSign,
  ExternalLink,
  Lock,
  Package,
  Truck,
  XCircle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { UserRole } from '@/types/api';
import { useOrder } from './api';
import { useEscrowAudit, type EscrowAuditEntry } from './escrow-api';
import { CancelOrderDialog, RefundOrderDialog } from './OrderActionDialogs';
import { EscrowStatusBadge, OrderStatusBadge, PaymentStatusBadge } from './status-badge';

const ESCROW_VIEWER_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.SUPPORT_ADMIN,
]);

const triggerLabel: Record<EscrowAuditEntry['trigger'], string> = {
  payment_captured: 'Payment captured',
  payment_failed: 'Payment failed',
  shipment_delivered: 'Shipment delivered',
  shipment_returned: 'Shipment returned',
  order_cancelled: 'Order cancelled',
  admin_manual: 'Admin manual override',
  cod_collected: 'COD collected',
  system: 'System',
};

const REFUND_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.SUPPORT_ADMIN,
]);

export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: order, isLoading, isError, error } = useOrder(id);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const canSeeEscrowAudit = user ? ESCROW_VIEWER_ROLES.has(user.role) : false;
  const escrowAudit = useEscrowAudit(canSeeEscrowAudit ? id : undefined);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Order not found'}
      </div>
    );
  }

  const canRefund =
    user && REFUND_ROLES.has(user.role) && order.payment.status === 'CAPTURED';
  const canCancel =
    user &&
    [
      UserRole.SUPER_ADMIN,
      UserRole.SUB_SUPER_ADMIN,
      UserRole.REGIONAL_ADMIN,
    ].includes(user.role as never) &&
    order.status !== 'CANCELLED' &&
    order.status !== 'DELIVERED' &&
    order.status !== 'RETURNED';

  const remainingRefund = order.totalInr; // backend tracks refundedAmountInr on Payment, not Order

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            placed {formatDateTime(order.createdAt)} · buyer {order.buyerId} · {order.kind}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment.status} />
            <EscrowStatusBadge status={order.escrowStatus} />
            <Badge variant="muted">{order.payment.mode}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRefund && (
            <Button onClick={() => setRefundOpen(true)}>
              <CircleDollarSign className="h-4 w-4" />
              Refund
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <CardDescription>
              {order.items.length} item(s) · {order.totalWeightGrams} g total
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit ₹</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((it, idx) => (
                  <TableRow key={it.id ?? `${it.productId}-${idx}`}>
                    <TableCell className="font-medium">
                      <div>{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.unit}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{it.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {it.sellerId.slice(-6)}
                    </TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">{formatInr(it.unitPriceInr)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatInr(it.subtotalInr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatInr(order.subtotalInr)} />
            {order.discountInr > 0 && (
              <Row
                label={order.coupon ? `Coupon ${order.coupon.code}` : 'Discount'}
                value={`− ${formatInr(order.discountInr)}`}
              />
            )}
            <Row label="Delivery" value={formatInr(order.deliveryFeeInr)} />
            <hr className="border-border" />
            <Row label="Total" value={formatInr(order.totalInr)} bold />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
            <CardDescription>Snapshot taken when the order was placed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">
              {order.shippingAddress.name} · {order.shippingAddress.phone}
            </p>
            <p>
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
              {order.shippingAddress.pincode}
            </p>
            {order.delhiveryShipmentId && (
              <p className="pt-2 text-xs text-muted-foreground">
                Shipment {order.delhiveryShipmentId} · {order.deliveryProvider}
              </p>
            )}
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                <Truck className="h-3.5 w-3.5" />
                Track shipment
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {order.returnWindowEndsAt && (
              <p className="text-xs text-muted-foreground">
                Return window ends {formatDateTime(order.returnWindowEndsAt)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Mode" value={order.payment.mode} />
            <Row label="Status" value={order.payment.status} />
            <Row label="Amount" value={formatInr(order.payment.amountInr)} />
            {order.payment.razorpayOrderId && (
              <Row label="Razorpay order" value={order.payment.razorpayOrderId} mono />
            )}
            {order.payment.razorpayPaymentId && (
              <Row label="Razorpay payment" value={order.payment.razorpayPaymentId} mono />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {order.statusHistory.map((entry, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={entry.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.at)}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-sm">{entry.notes}</p>
                  )}
                  {entry.byUserId && (
                    <p className="text-xs text-muted-foreground">by {entry.byUserId}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {canSeeEscrowAudit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Escrow audit
            </CardTitle>
            <CardDescription>
              Every state change to this order's escrow funds with the trigger and actor that
              caused it. Restricted to super/sub-super and support admins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {escrowAudit.isLoading && <Skeleton className="h-24 w-full" />}
            {escrowAudit.isError && (
              <p className="text-sm text-destructive">
                {escrowAudit.error instanceof Error
                  ? escrowAudit.error.message
                  : 'Failed to load audit'}
              </p>
            )}
            {!escrowAudit.isLoading && !escrowAudit.isError && (
              <>
                {(escrowAudit.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No escrow transitions recorded for this order.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {(escrowAudit.data ?? []).map((e) => (
                      <li key={e.id ?? e._id} className="flex items-start gap-3">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <EscrowStatusBadge status={e.fromStatus} />
                            <span className="text-xs text-muted-foreground">→</span>
                            <EscrowStatusBadge status={e.toStatus} />
                            <Badge variant="muted">{triggerLabel[e.trigger] ?? e.trigger}</Badge>
                            <Badge variant="info">{e.actor}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(e.createdAt)}
                            </span>
                          </div>
                          {e.reason && (
                            <p className="mt-1 whitespace-pre-wrap text-sm">{e.reason}</p>
                          )}
                          {e.actorId && (
                            <p className="text-xs text-muted-foreground">by {e.actorId}</p>
                          )}
                          {Object.keys(e.metadata).length > 0 && (
                            <pre className="mt-1 whitespace-pre-wrap rounded-md bg-secondary/30 p-2 font-mono text-xs">
                              {JSON.stringify(e.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {order.cancellation && (
        <Card>
          <CardHeader>
            <CardTitle>Cancellation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Reason" value={order.cancellation.reason ?? '—'} />
            <Row
              label="Cancelled at"
              value={order.cancellation.at ? formatDateTime(order.cancellation.at) : '—'}
            />
            <Row
              label="Refunded at"
              value={
                order.cancellation.refundedAt
                  ? formatDateTime(order.cancellation.refundedAt)
                  : 'Not yet'
              }
            />
          </CardContent>
        </Card>
      )}

      {order.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Package className="mr-2 inline h-4 w-4" />
              Sellers on this order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {Array.from(new Set(order.items.map((i) => i.sellerId))).map((sid) => (
                <li key={sid} className="font-mono text-xs">
                  {sid}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <CancelOrderDialog
        open={cancelOpen}
        orderId={order.id}
        onClose={() => setCancelOpen(false)}
      />
      <RefundOrderDialog
        open={refundOpen}
        orderId={order.id}
        maxAmount={remainingRefund}
        onClose={() => setRefundOpen(false)}
      />
    </div>
  );
};

const Row = ({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className={`${bold ? 'font-semibold' : ''} ${mono ? 'font-mono text-xs' : ''}`}>
      {value}
    </span>
  </div>
);
