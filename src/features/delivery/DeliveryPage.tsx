import { useState, type FormEvent } from 'react';
import { ExternalLink, MapPin, PackageSearch, Receipt, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { resolveOrderId, useOrder } from '@/features/orders/api';
import { OrderStatusBadge } from '@/features/orders/status-badge';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { formatDateTime, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useCreateShipment, useQuoteRate, useTrackShipment } from './api';
import type {
  DeliveryPaymentMode,
  DeliveryQuote,
  ShipmentStatus,
  TrackingResult,
} from './types';

const statusVariant: Record<ShipmentStatus, 'info' | 'warning' | 'success' | 'destructive' | 'muted'> = {
  CREATED: 'info',
  PICKED_UP: 'warning',
  IN_TRANSIT: 'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  RETURNED: 'destructive',
  FAILED: 'destructive',
};

export const DeliveryPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Delivery</h1>
        <p className="text-muted-foreground">
          Track a Delhivery shipment by AWB / shipment id, compute a freight quote, or push a
          fresh shipment for a paid order. Reverse pickups are scheduled from the linked support
          ticket.
        </p>
      </div>

      <ScopedAdminBanner />

      <div className="grid gap-6 lg:grid-cols-2">
        <TrackPanel />
        <RatePanel />
      </div>

      <CreateShipmentPanel />
    </div>
  );
};

// ─── Tracking lookup ──────────────────────────────────────────────────────

const TrackPanel = () => {
  const [shipmentId, setShipmentId] = useState('');
  const track = useTrackShipment();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!shipmentId.trim()) return;
    track.mutate(shipmentId.trim());
  };

  const result: TrackingResult | undefined = track.data;
  const errorMsg =
    track.error instanceof ApiError ? track.error.message : track.isError ? 'Lookup failed' : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageSearch className="h-5 w-5" />
          Track shipment
        </CardTitle>
        <CardDescription>
          Enter the Delhivery shipment id or AWB number. Returns the carrier's latest events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
            placeholder="e.g. DHL12345 / AWB number"
            className="flex-1"
          />
          <Button type="submit" disabled={track.isPending}>
            {track.isPending ? 'Tracking…' : 'Track'}
          </Button>
        </form>

        {track.isPending && <Skeleton className="h-40 w-full" />}
        {errorMsg && (
          <p className="text-sm text-destructive">{errorMsg}</p>
        )}
        {result && !track.isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[result.status]}>{result.status}</Badge>
              <span className="text-xs text-muted-foreground">
                shipment {result.shipmentId}
                {result.awbNumber ? ` · AWB ${result.awbNumber}` : ''}
              </span>
            </div>
            {result.trackingUrl && (
              <a
                href={result.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                Carrier tracking page
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {result.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet from the carrier.</p>
            ) : (
              <ol className="space-y-2 border-l border-border pl-4">
                {result.events.map((e, i) => (
                  <li key={i} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
                    </div>
                    {e.remarks && (
                      <p className="text-sm text-muted-foreground">{e.remarks}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Rate quote ───────────────────────────────────────────────────────────

const RatePanel = () => {
  const [pickupPincode, setPickup] = useState('');
  const [dropPincode, setDrop] = useState('');
  const [weightGrams, setWeight] = useState('500');
  const [paymentMode, setMode] = useState<DeliveryPaymentMode>('PREPAID');
  const [declaredValueInr, setValue] = useState('0');
  const quote = useQuoteRate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    quote.mutate({
      pickupPincode: pickupPincode.trim(),
      dropPincode: dropPincode.trim(),
      weightGrams: Number(weightGrams),
      paymentMode,
      declaredValueInr: Number(declaredValueInr) || 0,
    });
  };

  const result: DeliveryQuote | undefined = quote.data;
  const errorMsg =
    quote.error instanceof ApiError ? quote.error.message : quote.isError ? 'Quote failed' : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Rate quote
        </CardTitle>
        <CardDescription>
          Estimates the delivery charge using the configured carrier strategy (flat or Delhivery
          live rates).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quote-pickup">Pickup pincode</Label>
              <Input
                id="quote-pickup"
                pattern="\d{6}"
                maxLength={6}
                value={pickupPincode}
                onChange={(e) => setPickup(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-drop">Drop pincode</Label>
              <Input
                id="quote-drop"
                pattern="\d{6}"
                maxLength={6}
                value={dropPincode}
                onChange={(e) => setDrop(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-weight">Weight (g)</Label>
              <Input
                id="quote-weight"
                type="number"
                min={1}
                value={weightGrams}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-mode">Payment</Label>
              <Select
                id="quote-mode"
                value={paymentMode}
                onChange={(e) => setMode(e.target.value as DeliveryPaymentMode)}
              >
                <option value="PREPAID">Prepaid</option>
                <option value="COD">Cash on delivery</option>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="quote-value">Declared value (₹)</Label>
              <Input
                id="quote-value"
                type="number"
                min={0}
                value={declaredValueInr}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={quote.isPending}>
            {quote.isPending ? 'Quoting…' : 'Get quote'}
          </Button>
        </form>

        {errorMsg && <p className="mt-3 text-sm text-destructive">{errorMsg}</p>}

        {result && (
          <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3">
            <p className="text-sm text-muted-foreground">
              Provider <span className="font-medium">{result.provider}</span>
            </p>
            <p className="mt-1 text-2xl font-semibold">{formatInr(result.amountInr)}</p>
            {result.breakdown && (
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                {Object.entries(result.breakdown).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt>{k}</dt>
                    <dd>{formatInr(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Create shipment ──────────────────────────────────────────────────────

const CreateShipmentPanel = () => {
  // What the admin types — a human order number (BD-…) or a raw order id.
  const [orderRef, setOrderRef] = useState('');
  // The resolved Mongo id, set once a lookup succeeds. Only this is sent to the
  // carrier — it is never surfaced in the UI.
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const order = useOrder(resolvedId ?? undefined);
  const create = useCreateShipment();

  const lookup = async (e: FormEvent) => {
    e.preventDefault();
    const ref = orderRef.trim();
    if (!ref) return;
    setLookupError(null);
    setResolvedId(null);
    setLooking(true);
    try {
      const id = await resolveOrderId(ref);
      setResolvedId(id);
    } catch (err) {
      setLookupError(
        err instanceof ApiError ? err.message : 'No order found for that number',
      );
    } finally {
      setLooking(false);
    }
  };

  const dispatch = () => {
    if (!resolvedId) return;
    create.mutate(resolvedId);
  };

  const o = order.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Push shipment to carrier
        </CardTitle>
        <CardDescription>
          Look up an order by its number (BD-…), confirm the destination, then hand it to
          Delhivery. Works for a PACKED order that has no shipment yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={lookup} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1.5 min-w-[260px]">
            <Label htmlFor="create-order">Order number</Label>
            <Input
              id="create-order"
              value={orderRef}
              onChange={(e) => {
                setOrderRef(e.target.value);
                setResolvedId(null);
                setLookupError(null);
              }}
              placeholder="e.g. BD-MP6NN7XL-00CA7F"
            />
          </div>
          <Button type="submit" variant="outline" disabled={looking || !orderRef.trim()}>
            {looking ? 'Looking up…' : 'Look up order'}
          </Button>
        </form>

        {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}

        {resolvedId && order.isLoading && <Skeleton className="h-28 w-full" />}

        {o && (
          <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
              <OrderStatusBadge status={o.status} />
              <Badge variant="muted">{o.payment.mode}</Badge>
              {o.delhiveryShipmentId && (
                <Badge variant="warning">Shipment already exists</Badge>
              )}
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{o.shippingAddress.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.shippingAddress.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">
                  {o.shippingAddress.city}, {o.shippingAddress.state} —{' '}
                  {o.shippingAddress.pincode}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
                {formatInr(o.totalInr)}
              </span>
              <Button onClick={dispatch} disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create shipment'}
              </Button>
            </div>
          </div>
        )}

        {create.error && (
          <p className="text-sm text-destructive">
            {create.error instanceof ApiError ? create.error.message : 'Create failed'}
          </p>
        )}
        {create.data && (
          <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
            Created shipment <span className="font-mono">{create.data.shipmentId}</span> · status{' '}
            {create.data.status}
            {create.data.trackingUrl && (
              <>
                {' '}·{' '}
                <a
                  href={create.data.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  tracking
                </a>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
