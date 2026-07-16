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
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
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
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { useCancelOrder, useOrder } from '@/features/orders/api';
import { EscrowStatusBadge, OrderStatusBadge, PaymentStatusBadge } from '@/features/orders/status-badge';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useTransitionOrderStatus } from './api';

const ITEMS_HEAD = [
  { id: 'product', label: 'Product' },
  { id: 'tier', label: 'Tier' },
  { id: 'qty', label: 'Qty', align: 'right' as const },
  { id: 'unit', label: 'Unit ₹', align: 'right' as const },
  { id: 'subtotal', label: 'Subtotal', align: 'right' as const },
];

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
      <Stack spacing={2}>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
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

  const myItems = order.items.filter((it) => it.sellerId === user?.id);
  const myTotal = myItems.reduce((sum, it) => sum + it.subtotalInr, 0);

  const onMarkPacked = () => transition.mutate({ id: order.id, status: 'PACKED' });
  const onMarkDelivered = () => transition.mutate({ id: order.id, status: 'DELIVERED' });

  const canPack = order.status === 'PLACED';
  const canDispatch = order.status === 'PACKED';
  const canMarkDelivered = order.status === 'DISPATCHED';
  const canCancel = order.status === 'PLACED' || order.status === 'PACKED';

  return (
    <Stack spacing={3}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/seller/orders')}>
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Typography variant="h4" component="h1">{order.orderNumber}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            placed {formatDateTime(order.createdAt)} · {order.shippingAddress.name}
          </Typography>
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

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3,1fr)' },
        }}
      >
        <Box sx={{ gridColumn: { lg: 'span 2' } }}>
        <Card>
          <CardHeader>
            <CardTitle>My items in this order</CardTitle>
            <CardDescription>
              The buyer placed an order containing items from multiple sellers — only yours are
              shown here.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={ITEMS_HEAD} />
                <TableBody>
                  {myItems.map((it, idx) => (
                    <TableRow key={it.id ?? `${it.productId}-${idx}`} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {it.name}
                        <Box sx={{ color: 'text.secondary', typography: 'caption' }}>{it.unit}</Box>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{it.tier}</Badge>
                      </TableCell>
                      <TableCell align="right">{it.quantity}</TableCell>
                      <TableCell align="right">{formatInr(it.unitPriceInr)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatInr(it.subtotalInr)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableNoData notFound={myItems.length === 0} />
                </TableBody>
              </Table>
            </Scrollbar>
          </CardContent>
        </Card>
        </Box>

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
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Commission is deducted at payout time based on the resolved rate per item.
            </Typography>
          </CardContent>
        </Card>
      </Box>

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
            <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
              Shipment {order.delhiveryShipmentId} · {order.deliveryProvider}
            </Typography>
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
    </Stack>
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
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Shipment id (AWB)"
          value={shipmentId}
          onChange={(e) => setShipmentId(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Tracking URL"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder="https://…"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
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
      <Stack spacing={2}>
        <TextField
          fullWidth
          required
          multiline
          minRows={4}
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Dialog>
  );
};
