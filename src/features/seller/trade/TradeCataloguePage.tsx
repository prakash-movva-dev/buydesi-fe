import { useEffect, useState } from 'react';
import { ShoppingBasket } from 'lucide-react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
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
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { usePlaceTradeOrder, useTradeCatalogue } from './api';
import type { TradeListing } from '@/features/trade/types';
import type { TradePaymentMode, TradeTransportMode } from './types';

export const TradeCataloguePage = () => {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const { data, isLoading } = useTradeCatalogue({
    status: 'APPROVED',
    categoryId: categoryId ?? undefined,
    clusterId: clusterId ?? undefined,
    page: 1,
    limit: 50,
  });
  const [placing, setPlacing] = useState<TradeListing | null>(null);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Trade catalogue"
        description="Buy from other sellers across clusters. Place orders, pay online or via cash settlement, and arrange delivery yourself or via Delhivery."
      />

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="flex-end">
        <div className="w-56">
          <Box sx={{ mb: 0.75, typography: 'caption', color: 'text.secondary' }}>Category</Box>
          <CategoryPicker
            value={categoryId}
            onChange={setCategoryId}
            placeholder="All categories"
          />
        </div>
        <div className="w-56">
          <Box sx={{ mb: 0.75, typography: 'caption', color: 'text.secondary' }}>Cluster</Box>
          <ClusterPicker
            value={clusterId}
            onChange={setClusterId}
            placeholder="All clusters"
          />
        </div>
      </Stack>

      {isLoading && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </Box>
      )}

      {!isLoading && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
          }}
        >
          {(data?.items ?? []).map((l) => (
            <Card key={l.id ?? l._id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{l.name}</CardTitle>
                <CardDescription className="line-clamp-2">{l.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatInr(l.unitPriceInr)} / {l.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span>{l.availableUnits} / {l.totalUnits}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {l.acceptedPaymentModes.map((m) => (
                    <Badge key={m} variant="muted">{m}</Badge>
                  ))}
                  {l.acceptedTransportModes.map((m) => (
                    <Badge key={m} variant="info">{m}</Badge>
                  ))}
                </div>
                <Button className="mt-2 w-full" onClick={() => setPlacing(l)}>
                  <ShoppingBasket className="h-4 w-4" />
                  Place order
                </Button>
              </CardContent>
            </Card>
          ))}
          {(data?.items.length ?? 0) === 0 && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No listings match the current filter.
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      <PlaceOrderDialog
        listing={placing}
        onClose={() => setPlacing(null)}
      />
    </Stack>
  );
};

const PlaceOrderDialog = ({
  listing,
  onClose,
}: {
  listing: TradeListing | null;
  onClose: () => void;
}) => {
  const mut = usePlaceTradeOrder();
  const [units, setUnits] = useState('');
  const [paymentMode, setPaymentMode] = useState<TradePaymentMode>('ONLINE');
  const [transportMode, setTransportMode] = useState<TradeTransportMode>('LOCAL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listing) {
      setUnits(String(listing.minOrderUnits));
      setPaymentMode(
        (listing.acceptedPaymentModes[0] as TradePaymentMode) ?? 'ONLINE',
      );
      setTransportMode(
        (listing.acceptedTransportModes[0] as TradeTransportMode) ?? 'LOCAL',
      );
      setError(null);
    }
  }, [listing]);

  if (!listing) return null;

  const submit = async () => {
    setError(null);
    const u = Number(units);
    if (!Number.isFinite(u) || u <= 0) {
      setError('Units must be positive.');
      return;
    }
    if (u < listing.minOrderUnits) {
      setError(`Minimum order is ${listing.minOrderUnits} units.`);
      return;
    }
    if (listing.maxOrderUnits && u > listing.maxOrderUnits) {
      setError(`Maximum order is ${listing.maxOrderUnits} units.`);
      return;
    }
    if (u > listing.availableUnits) {
      setError(`Only ${listing.availableUnits} units available.`);
      return;
    }
    try {
      await mut.mutateAsync({
        listingId: listing.id ?? listing._id,
        units: u,
        paymentMode,
        transportMode,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Place order failed');
    }
  };

  return (
    <Dialog
      open={Boolean(listing)}
      onClose={onClose}
      title={`Place order — ${listing.name}`}
      description={`${formatInr(listing.unitPriceInr)} per ${listing.unit}. ${listing.availableUnits} available.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Placing…' : 'Place order'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField
          fullWidth
          type="number"
          label="Units"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            min: listing.minOrderUnits,
            max: listing.maxOrderUnits ?? listing.availableUnits,
          }}
          helperText={`Min ${listing.minOrderUnits}${
            listing.maxOrderUnits ? ` · Max ${listing.maxOrderUnits}` : ''
          } · Available ${listing.availableUnits}`}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            select
            fullWidth
            label="Payment mode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as TradePaymentMode)}
            InputLabelProps={{ shrink: true }}
          >
            {listing.acceptedPaymentModes.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Transport mode"
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as TradeTransportMode)}
            InputLabelProps={{ shrink: true }}
          >
            {listing.acceptedTransportModes.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">
              {formatInr((Number(units) || 0) * listing.unitPriceInr)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Commission, platform fee, and delivery charges are computed on confirmation.
          </p>
        </div>
        {error && <Alert severity="error">{error}</Alert>}
      </div>
    </Dialog>
  );
};
