import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
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
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Textarea } from '@/components/ui/Textarea';
import { useCancelOrder, useOrder } from '@/features/orders/api';
import { EscrowStatusBadge, OrderStatusBadge, PaymentStatusBadge } from '@/features/orders/status-badge';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useTransitionOrderStatus } from './api';

export const SellerOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: order, isLoading, isError, error } = useOrder(id);
  const transition = useTransitionOrderStatus();
  const cancel = useCancelOrder();

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
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

  const myItems = order.items.filter((it) => it.sellerId === user?.id);
  const myTotal = myItems.reduce((sum, it) => sum + it.subtotalInr, 0);

  const onMarkPacked = () => transition.mutate({ id: order.id, status: 'PACKED' });
  const onMarkDelivered = () => transition.mutate({ id: order.id, status: 'DELIVERED' });

  const canPack = order.status === 'PLACED';
  const canDispatch = order.status === 'PACKED';
  const canMarkDelivered = order.status === 'DISPATCHED';
  const canCancel = order.status === 'PLACED' || order.status === 'PACKED';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/seller/orders')}>
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            placed {formatDateTime(order.createdAt)} · {order.shippingAddress.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment.status} />
            <EscrowStatusBadge status={order.escrowStatus} />
            <Badge variant="muted">{order.payment.mode}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPack && (
            <Button onClick={onMarkPacked} disabled={transition.isPending}>
              <Package className="h-4 w-4" />
              Mark packed
            </Button>
          )}
          {canDispatch && (
            <Button onClick={() => setDispatchOpen(true)}>
              <Truck className="h-4 w-4" />
              Dispatch
            </Button>
          )}
          {canMarkDelivered && (
            <Button variant="outline" onClick={onMarkDelivered} disabled={transition.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              Mark delivered
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
            <CardTitle>My items in this order</CardTitle>
            <CardDescription>
              The buyer placed an order containing items from multiple sellers — only yours are
              shown here.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit ₹</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myItems.map((it, idx) => (
                  <TableRow key={it.id ?? `${it.productId}-${idx}`}>
                    <TableCell className="font-medium">
                      {it.name}
                      <div className="text-xs text-muted-foreground">{it.unit}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{it.tier}</Badge>
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
            <CardTitle>My total</CardTitle>
            <CardDescription>
              Funds are held in escrow until the return window closes, then released to your
              wallet (less commission).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Items subtotal</span>
              <span className="font-medium">{formatInr(myTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Commission is deducted at payout time based on the resolved rate per item.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer & delivery</CardTitle>
          <CardDescription>
            {order.payment.mode === 'COD'
              ? 'Cash on Delivery — collected by the courier on delivery.'
              : 'Prepaid — payment already captured in escrow.'}
          </CardDescription>
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
            <p className="text-xs text-muted-foreground">
              Shipment {order.delhiveryShipmentId} · {order.deliveryProvider}
            </p>
          )}
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Truck className="h-3.5 w-3.5" />
              Track shipment
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {order.statusHistory.map((entry, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={entry.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.at)}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="mt-1 whitespace-pre-wrap">{entry.notes}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <DispatchDialog
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        onSubmit={async ({ shipmentId, trackingUrl, notes }) => {
          await transition.mutateAsync({
            id: order.id,
            status: 'DISPATCHED',
            delhiveryShipmentId: shipmentId,
            trackingUrl,
            notes,
          });
        }}
      />
      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSubmit={async (reason) => {
          await cancel.mutateAsync({ id: order.id, reason });
        }}
      />
    </div>
  );
};

const DispatchDialog = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: { shipmentId?: string; trackingUrl?: string; notes?: string }) => Promise<unknown>;
}) => {
  const [shipmentId, setShipmentId] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setShipmentId('');
      setTrackingUrl('');
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        shipmentId: shipmentId.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Dispatch failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Dispatch order"
      description="Enter the carrier's shipment id and tracking URL. If your dispatcher creates the Delhivery shipment via API, leave blank and the webhook will fill them in."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Dispatching…' : 'Mark dispatched'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="dp-shipment">Shipment id (AWB)</Label>
          <Input
            id="dp-shipment"
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dp-tracking">Tracking URL</Label>
          <Input
            id="dp-tracking"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dp-notes">Notes (optional)</Label>
          <Textarea id="dp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};

const CancelDialog = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancel order"
      description="The buyer is refunded automatically if they prepaid."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Keep order
          </Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting ? 'Cancelling…' : 'Cancel order'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="co-reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea id="co-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
