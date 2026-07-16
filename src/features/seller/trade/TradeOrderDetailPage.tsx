import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Truck,
  XCircle,
} from 'lucide-react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
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
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import {
  useAcceptTradeOrder,
  useCancelTradeOrder,
  useDeclineTradeOrder,
  useDispatchTradeOrder,
  useMarkTradeDelivered,
  useTradeOrder,
} from './api';
import type { TradeOrderStatus } from './types';

const statusVariant: Record<TradeOrderStatus, 'info' | 'warning' | 'success' | 'destructive' | 'muted'> = {
  PLACED: 'info',
  SELLER_CONFIRMED: 'info',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

export const TradeOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: o, isLoading, isError, error } = useTradeOrder(id);
  const accept = useAcceptTradeOrder();
  const decline = useDeclineTradeOrder();
  const dispatch = useDispatchTradeOrder();
  const delivered = useMarkTradeDelivered();
  const cancel = useCancelTradeOrder();

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !o) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Trade order not found'}
      </div>
    );
  }

  const isSeller = o.sellerId === user?.id;
  const isBuyer = o.buyerId === user?.id;
  const canAcceptOrDecline = isSeller && o.status === 'PLACED';
  const canDispatch = isSeller && o.status === 'SELLER_CONFIRMED';
  const canMarkDelivered = (isSeller || isBuyer) && o.status === 'DISPATCHED';
  const canCancel =
    (o.status === 'PLACED' || o.status === 'SELLER_CONFIRMED') && (isSeller || isBuyer);

  return (
    <Stack spacing={3}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/seller/trade/orders')}>
        <ArrowLeft className="h-4 w-4" />
        Back to trade orders
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Typography variant="h4" component="h1">{o.productName}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            placed {formatDateTime(o.createdAt)} ·{' '}
            {isSeller ? 'I am the seller' : isBuyer ? 'I am the buyer' : 'observer'}
          </Typography>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
            <Badge variant="muted">{o.paymentMode}</Badge>
            <Badge variant="info">{o.transportMode}</Badge>
            {o.cashApprovalStatus !== 'NOT_REQUIRED' && (
              <Badge variant={o.cashApprovalStatus === 'APPROVED' ? 'success' : 'warning'}>
                Cash approval: {o.cashApprovalStatus}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAcceptOrDecline && (
            <>
              <Button onClick={() => accept.mutate(o.id ?? o._id)} disabled={accept.isPending}>
                <CheckCircle2 className="h-4 w-4" />
                Accept
              </Button>
              <Button
                variant="destructive"
                onClick={() => decline.mutate({ id: o.id ?? o._id })}
                disabled={decline.isPending}
              >
                <XCircle className="h-4 w-4" />
                Decline
              </Button>
            </>
          )}
          {canDispatch && (
            <Button onClick={() => setDispatchOpen(true)}>
              <Truck className="h-4 w-4" />
              Dispatch
            </Button>
          )}
          {canMarkDelivered && (
            <Button
              variant="outline"
              onClick={() => delivered.mutate(o.id ?? o._id)}
              disabled={delivered.isPending}
            >
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
            <CardTitle>Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Units" value={`${o.units} × ${o.unit}`} />
            <Row label="Unit price" value={formatInr(o.unitPriceInr)} />
            <Row label="Subtotal" value={formatInr(o.subtotalInr)} />
            <Row
              label={`Commission (${o.commissionRatePercent}%)`}
              value={`− ${formatInr(o.commissionInr)}`}
              muted
            />
            <Row label="Delivery" value={formatInr(o.deliveryFeeInr)} />
            <Row label="Platform fee" value={formatInr(o.platformFeeInr)} muted />
            <hr className="border-border" />
            <Row label="Total" value={formatInr(o.totalInr)} bold />
          </CardContent>
        </Card>
        </Box>

        <Card>
          <CardHeader>
            <CardTitle>Counterparty</CardTitle>
            <CardDescription>
              {isSeller ? 'Buyer' : 'Seller'} on this order.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">
              {(isSeller ? o.buyerName : o.sellerName) ?? '—'}
            </p>
            {o.shipmentId && (
              <p className="mt-3 text-xs text-muted-foreground">
                Shipment {o.shipmentId}
              </p>
            )}
            {o.trackingUrl && (
              <a
                href={o.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Track
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>
      </Box>

      {o.cancellation && (
        <Card>
          <CardHeader>
            <CardTitle>Cancellation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Reason" value={o.cancellation.reason ?? '—'} />
            <Row
              label="At"
              value={o.cancellation.at ? formatDateTime(o.cancellation.at) : '—'}
            />
          </CardContent>
        </Card>
      )}

      <DispatchDialog
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        onSubmit={async ({ shipmentId, trackingUrl, notes }) => {
          await dispatch.mutateAsync({
            id: o.id ?? o._id,
            shipmentId,
            trackingUrl,
            notes,
          });
        }}
      />
      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSubmit={async (reason) => {
          await cancel.mutateAsync({ id: o.id ?? o._id, reason });
        }}
      />
    </Stack>
  );
};

const Row = ({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={`${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}
    >
      {value}
    </span>
  </div>
);

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
    setSubmitting(true);
    setError(null);
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
      title="Dispatch trade order"
      description="Tell the buyer it's on its way. Shipment id and tracking URL are optional."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Dispatching…' : 'Dispatch'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField
          fullWidth
          label="Shipment id"
          value={shipmentId}
          onChange={(e) => setShipmentId(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Tracking URL"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
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
      title="Cancel trade order"
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
      </div>
    </Dialog>
  );
};
