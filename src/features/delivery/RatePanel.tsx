import { useState, type FormEvent } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { EmptyContent } from '@/components/empty-content';

import { fCurrency, fNumber } from '@/utils/format-number';
import { ApiError } from '@/types/api';

import { useQuoteRate } from './api';
import type { DeliveryPaymentMode, DeliveryServiceMode } from './types';

// ----------------------------------------------------------------------

/** Reads better than the raw keys the carrier returns. */
const CHARGE_LABEL: Record<string, string> = {
  freight: 'Freight',
  cod: 'COD collection',
  fuel: 'Fuel surcharge',
  risk: 'Risk cover',
  handling: 'Handling',
  base: 'Base fee',
  perKg: 'Per kg',
  billedKg: 'Billed kg',
};

/** billedKg is a count, not money — everything else is rupees. */
const isMoney = (key: string) => key !== 'billedKg';

// ----------------------------------------------------------------------

/**
 * What a parcel costs to send on a given lane. Answered by whichever rate
 * engine is configured, so the provider is named on the result — a flat-rate
 * answer and a live carrier answer look nothing alike in practice.
 */
export function RatePanel() {
  const [pickupPincode, setPickup] = useState('');
  const [dropPincode, setDrop] = useState('');
  const [weightGrams, setWeight] = useState('500');
  const [paymentMode, setPaymentMode] = useState<DeliveryPaymentMode>('PREPAID');
  const [serviceMode, setServiceMode] = useState<DeliveryServiceMode>('surface');
  const [declaredValueInr, setValue] = useState('0');

  const quote = useQuoteRate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    quote.mutate({
      pickupPincode: pickupPincode.trim(),
      dropPincode: dropPincode.trim(),
      weightGrams: Number(weightGrams),
      paymentMode,
      serviceMode,
      declaredValueInr: Number(declaredValueInr) || 0,
    });
  };

  const result = quote.data;
  const errorMsg =
    quote.error instanceof ApiError
      ? quote.error.message
      : quote.isError
        ? 'Could not price this lane'
        : null;

  return (
    <Grid container spacing={3} sx={{ p: 3 }}>
      <Grid xs={12} md={7}>
        <Stack component="form" onSubmit={onSubmit} spacing={2.5}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              fullWidth
              required
              label="From pincode"
              value={pickupPincode}
              onChange={(e) => setPickup(e.target.value)}
              inputProps={{ pattern: '\\d{6}', maxLength: 6, inputMode: 'numeric' }}
              helperText="Where the seller ships from"
            />
            <TextField
              fullWidth
              required
              label="To pincode"
              value={dropPincode}
              onChange={(e) => setDrop(e.target.value)}
              inputProps={{ pattern: '\\d{6}', maxLength: 6, inputMode: 'numeric' }}
              helperText="Where the buyer is"
            />
          </Stack>

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              fullWidth
              required
              type="number"
              label="Weight (grams)"
              value={weightGrams}
              onChange={(e) => setWeight(e.target.value)}
              inputProps={{ min: 1 }}
            />
            <TextField
              select
              fullWidth
              label="Network"
              value={serviceMode}
              onChange={(e) => setServiceMode(e.target.value as DeliveryServiceMode)}
              helperText={serviceMode === 'surface' ? 'Road — cheaper, slower' : 'Air — faster, dearer'}
            >
              <MenuItem value="surface">Surface</MenuItem>
              <MenuItem value="express">Express</MenuItem>
            </TextField>
          </Stack>

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              select
              fullWidth
              label="Payment"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as DeliveryPaymentMode)}
            >
              <MenuItem value="PREPAID">Prepaid</MenuItem>
              <MenuItem value="COD">Cash on delivery</MenuItem>
            </TextField>
            <TextField
              fullWidth
              type="number"
              label="Declared value (₹)"
              value={declaredValueInr}
              onChange={(e) => setValue(e.target.value)}
              inputProps={{ min: 0 }}
              helperText={
                paymentMode === 'COD' ? 'Also the amount to collect' : 'Sets the risk cover'
              }
            />
          </Stack>

          <Box>
            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              loading={quote.isPending}
              startIcon={<Iconify icon="solar:calculator-bold" />}
            >
              Get quote
            </LoadingButton>
          </Box>
        </Stack>
      </Grid>

      <Grid xs={12} md={5}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        {!result && !errorMsg && (
          <EmptyContent
            filled
            sx={{ py: 6, height: 1 }}
            title="No quote yet"
            description="Fill the lane in and the rate engine will price it."
          />
        )}

        {result && !errorMsg && (
          <Card sx={{ p: 3, bgcolor: 'background.neutral', boxShadow: 'none' }}>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                  {result.provider === 'delhivery' ? 'Delhivery live rate' : `${result.provider} rate`}
                </Typography>
                {result.zone && <Label variant="soft">Zone {result.zone}</Label>}
              </Stack>

              <Typography variant="h3">{fCurrency(result.amountInr)}</Typography>

              {result.chargedWeightGrams !== undefined && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Billed at {fNumber(result.chargedWeightGrams)} g
                  {result.chargedWeightGrams > Number(weightGrams)
                    ? ' — volumetric weight is higher than actual'
                    : ''}
                </Typography>
              )}
            </Stack>

            {result.breakdown && Object.keys(result.breakdown).length > 0 && (
              <>
                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                <Stack spacing={1}>
                  {Object.entries(result.breakdown).map(([key, value]) => (
                    <Stack key={key} direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {CHARGE_LABEL[key] ?? key}
                      </Typography>
                      <Typography variant="body2">
                        {isMoney(key) ? fCurrency(value) : fNumber(value)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
          </Card>
        )}
      </Grid>
    </Grid>
  );
}
