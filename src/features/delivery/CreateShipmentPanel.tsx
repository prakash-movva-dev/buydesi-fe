import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AlertTitle from '@mui/material/AlertTitle';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { EmptyContent } from '@/components/empty-content';

import { fCurrency } from '@/utils/format-number';
import { ApiError } from '@/types/api';
import { resolveOrderId, useOrder } from '@/features/orders/api';
import type { OrderStatus } from '@/features/orders/types';

import { useCreateShipment } from './api';

// ----------------------------------------------------------------------

const ORDER_COLOR: Record<OrderStatus, 'info' | 'warning' | 'success' | 'error' | 'default'> = {
  PLACED: 'info',
  PACKED: 'warning',
  DISPATCHED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
};

// ----------------------------------------------------------------------

/**
 * Hands an order to the carrier.
 *
 * The admin types the order number they have — the Mongo id is resolved behind
 * the scenes and never shown. The order is laid out before the button so the
 * destination and the payment mode can be read first; booking a parcel is not
 * something to undo.
 */
type Props = {
  /** True when a credential is missing that booking specifically needs. */
  blocked?: boolean;
};

export function CreateShipmentPanel({ blocked }: Props) {
  const [orderRef, setOrderRef] = useState('');
  // Resolved id, kept out of the UI — only ever sent to the API.
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
      setResolvedId(await resolveOrderId(ref));
    } catch (err) {
      setLookupError(err instanceof ApiError ? err.message : 'No order found for that number');
    } finally {
      setLooking(false);
    }
  };

  const o = order.data;
  const alreadyShipped = Boolean(o?.delhiveryShipmentId);

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Stack
        component="form"
        onSubmit={lookup}
        spacing={2}
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'flex-start' }}
      >
        <TextField
          fullWidth
          label="Order number"
          value={orderRef}
          onChange={(e) => {
            setOrderRef(e.target.value);
            setResolvedId(null);
            setLookupError(null);
          }}
          placeholder="BD-MP6NN7XL-00CA7F"
          helperText="The number on the order, not an internal id"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:bill-list-bold" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <LoadingButton
          type="submit"
          variant="outlined"
          size="large"
          loading={looking}
          disabled={!orderRef.trim()}
          sx={{ mt: { sm: 0.5 }, flexShrink: 0 }}
        >
          Look up
        </LoadingButton>
      </Stack>

      {blocked && (
        <Alert severity="warning" variant="outlined">
          <AlertTitle sx={{ mb: 0.5 }}>Booking is not configured yet</AlertTitle>
          The carrier needs the registered pickup name (
          <Box component="span" sx={{ fontFamily: 'monospace', typography: 'caption' }}>
            DELHIVERY_CLIENT_NAME
          </Box>
          ) before it will accept a parcel. Looking an order up still works.
        </Alert>
      )}

      {lookupError && <Alert severity="error">{lookupError}</Alert>}

      {!resolvedId && !lookupError && (
        <EmptyContent
          filled
          sx={{ py: 8 }}
          title="No order loaded"
          description="Look an order up to see where it is going before booking the parcel."
        />
      )}

      {resolvedId && order.isLoading && <Skeleton variant="rounded" height={220} />}

      {o && (
        <Card sx={{ p: 3, bgcolor: 'background.neutral', boxShadow: 'none' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" sx={{ fontFamily: 'monospace' }}>
              {o.orderNumber}
            </Typography>
            <Label variant="soft" color={ORDER_COLOR[o.status] ?? 'default'}>
              {o.status}
            </Label>
            <Label variant="soft">{o.payment.mode === 'COD' ? 'Cash on delivery' : 'Prepaid'}</Label>
            {alreadyShipped && (
              <Label variant="soft" color="warning">
                Already booked
              </Label>
            )}
          </Stack>

          <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar sx={{ bgcolor: 'background.paper', color: 'text.secondary' }}>
                <Iconify icon="solar:user-rounded-bold" width={20} />
              </Avatar>
              <Stack spacing={0.25}>
                <Typography variant="subtitle2">{o.shippingAddress.name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {o.shippingAddress.phone}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar sx={{ bgcolor: 'background.paper', color: 'text.secondary' }}>
                <Iconify icon="solar:map-point-bold" width={20} />
              </Avatar>
              <Stack spacing={0.25}>
                <Typography variant="subtitle2">
                  {o.shippingAddress.city}, {o.shippingAddress.state}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {o.shippingAddress.pincode}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
              <Box component="span" sx={{ color: 'text.primary', typography: 'subtitle2' }}>
                {fCurrency(o.totalInr)}
              </Box>
            </Typography>

            <LoadingButton
              variant="contained"
              size="large"
              loading={create.isPending}
              disabled={alreadyShipped || blocked}
              onClick={() => resolvedId && create.mutate(resolvedId)}
              startIcon={<Iconify icon="solar:delivery-bold" />}
            >
              {(alreadyShipped && 'Already with the carrier') ||
                (blocked && 'Booking unavailable') ||
                'Book the parcel'}
            </LoadingButton>
          </Stack>
        </Card>
      )}

      {create.error && (
        <Alert severity="error">
          {create.error instanceof ApiError ? create.error.message : 'Could not book the parcel'}
        </Alert>
      )}

      {create.data && (
        <Alert
          severity="success"
          action={
            create.data.trackingUrl ? (
              <Button
                size="small"
                color="inherit"
                href={create.data.trackingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Carrier page
              </Button>
            ) : undefined
          }
        >
          <AlertTitle sx={{ mb: 0.5 }}>Parcel booked</AlertTitle>
          Waybill{' '}
          <Box component="span" sx={{ fontFamily: 'monospace' }}>
            {create.data.shipmentId}
          </Box>{' '}
          · {create.data.status.toLowerCase()}
          {resolvedId && (
            <>
              {' · '}
              <Link component={RouterLink} to={`/admin/orders/${resolvedId}`} color="inherit">
                open the order
              </Link>
            </>
          )}
        </Alert>
      )}
    </Stack>
  );
}
