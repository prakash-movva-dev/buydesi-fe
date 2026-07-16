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
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom } from '@/components/table';
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
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
]);

export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: order, isLoading, isError, error } = useOrder(id);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [tab, setTab] = useState<'summary' | 'timeline' | 'escrow'>('summary');

  const canSeeEscrowAudit = user ? ESCROW_VIEWER_ROLES.has(user.role) : false;
  const escrowAudit = useEscrowAudit(canSeeEscrowAudit ? id : undefined);

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </Stack>
    );
  }

  if (isError || !order) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Order not found'}
      </div>
    );
  }

  // Optional/array fields are guarded so the page renders for every order state
  // (placed, cancelled, etc.) even when older/partial records omit them.
  const items = order.items ?? [];
  const statusHistory = order.statusHistory ?? [];

  const canRefund =
    user && REFUND_ROLES.has(user.role) && order.payment?.status === 'CAPTURED';
  const canCancel =
    user &&
    [
      UserRole.SUPER_ADMIN,
      UserRole.SUB_SUPER_ADMIN,
      UserRole.CLUSTER_ADMIN,
    ].includes(user.role as never) &&
    order.status !== 'CANCELLED' &&
    order.status !== 'DELIVERED' &&
    order.status !== 'RETURNED';

  const remainingRefund = order.totalInr; // backend tracks refundedAmountInr on Payment, not Order

  return (
    <Stack spacing={3}>
      <Box>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Button>
      </Box>

      <Stack spacing={2}>
        <PageHeader
          title={order.orderNumber}
          description={`placed ${formatDateTime(order.createdAt)} · buyer ${order.buyerId} · ${order.kind}`}
          action={
            <>
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
            </>
          }
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <OrderStatusBadge status={order.status} />
          {order.payment?.status && <PaymentStatusBadge status={order.payment.status} />}
          <EscrowStatusBadge status={order.escrowStatus} />
          {order.payment?.mode && <Badge variant="muted">{order.payment.mode}</Badge>}
        </Stack>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="summary" label="Summary" />
        <Tab value="timeline" label="Timeline" />
        {canSeeEscrowAudit && <Tab value="escrow" label="Escrow" />}
      </Tabs>

      {tab === 'summary' && (
      <Stack spacing={3}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <CardDescription>
              {items.length} item(s) · {order.totalWeightGrams} g total
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom
                  headLabel={[
                    { id: 'product', label: 'Product' },
                    { id: 'tier', label: 'Tier' },
                    { id: 'seller', label: 'Seller' },
                    { id: 'qty', label: 'Qty', align: 'right' },
                    { id: 'unit', label: 'Unit ₹', align: 'right' },
                    { id: 'subtotal', label: 'Subtotal', align: 'right' },
                  ]}
                />
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={it.id ?? `${it.productId}-${idx}`} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        <Box>{it.name}</Box>
                        <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                          {it.unit}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{it.tier}</Badge>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', typography: 'caption' }}>
                        {it.sellerId.slice(-6)}
                      </TableCell>
                      <TableCell align="right">{it.quantity}</TableCell>
                      <TableCell align="right">{formatInr(it.unitPriceInr)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {formatInr(it.subtotalInr)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
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
            {order.shippingAddress ? (
              <>
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
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No shipping address on file.
              </Typography>
            )}
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
            <Row label="Mode" value={order.payment?.mode ?? '—'} />
            <Row label="Status" value={order.payment?.status ?? '—'} />
            <Row label="Amount" value={formatInr(order.payment?.amountInr)} />
            {order.payment?.razorpayOrderId && (
              <Row label="Razorpay order" value={order.payment.razorpayOrderId} mono />
            )}
            {order.payment?.razorpayPaymentId && (
              <Row label="Razorpay payment" value={order.payment.razorpayPaymentId} mono />
            )}
          </CardContent>
        </Card>
      </div>

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

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Package className="mr-2 inline h-4 w-4" />
              Sellers on this order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {Array.from(new Set(items.map((i) => i.sellerId))).map((sid) => (
                <li key={sid} className="font-mono text-xs">
                  {sid}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      </Stack>
      )}

      {tab === 'timeline' && (
      <Stack spacing={3}>
      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {statusHistory.map((entry, i) => (
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
      </Stack>
      )}

      {tab === 'escrow' && canSeeEscrowAudit && (
      <Stack spacing={3}>
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
              <Typography variant="body2" color="error.main">
                {escrowAudit.error instanceof Error
                  ? escrowAudit.error.message
                  : 'Failed to load audit'}
              </Typography>
            )}
            {!escrowAudit.isLoading && !escrowAudit.isError && (
              <>
                {(escrowAudit.data?.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No escrow transitions recorded for this order.
                  </Typography>
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
                          {e.metadata && Object.keys(e.metadata).length > 0 && (
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
      </Stack>
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
    </Stack>
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
