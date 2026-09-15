import { useState, type FormEvent } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { EmptyContent } from '@/components/empty-content';

import { ApiError } from '@/types/api';

import { useCheckPincode } from './api';
import type { PincodeServiceability } from './types';

// ----------------------------------------------------------------------

const CAPABILITIES: Array<{
  key: keyof Pick<PincodeServiceability, 'prepaid' | 'cod' | 'pickup' | 'replacement'>;
  label: string;
  icon: string;
  why: string;
}> = [
  {
    key: 'prepaid',
    label: 'Prepaid delivery',
    icon: 'solar:card-bold',
    why: 'Orders paid online can be delivered here',
  },
  {
    key: 'cod',
    label: 'Cash on delivery',
    icon: 'solar:wallet-money-bold',
    why: 'The courier will collect cash at the door',
  },
  {
    key: 'pickup',
    label: 'Pickup',
    icon: 'solar:box-bold',
    why: 'A seller here can have parcels collected',
  },
  {
    key: 'replacement',
    label: 'Reverse pickup',
    icon: 'solar:restart-bold',
    why: 'Returns can be collected from a buyer here',
  },
];

// ----------------------------------------------------------------------

/**
 * Whether the carrier goes to a pincode at all — and on what terms.
 *
 * Worth checking before a seller is onboarded or a COD order is accepted: a
 * pincode that takes prepaid but not cash, or that is out of the delivery area,
 * is the difference between a smooth order and a stuck one.
 */
export function PincodePanel() {
  const [pincode, setPincode] = useState('');
  const check = useCheckPincode();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pincode.trim().length !== 6) return;
    check.mutate(pincode.trim());
  };

  const result = check.data;
  const errorMsg =
    check.error instanceof ApiError
      ? check.error.message
      : check.isError
        ? 'Could not reach the carrier'
        : null;

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Stack
        component="form"
        onSubmit={onSubmit}
        spacing={2}
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'flex-start' }}
      >
        <TextField
          label="Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6 digits"
          inputProps={{ inputMode: 'numeric', maxLength: 6 }}
          helperText="Any Indian pincode — the seller's or the buyer's"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:map-point-bold" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: 1, sm: 260 } }}
        />
        <LoadingButton
          type="submit"
          variant="contained"
          size="large"
          loading={check.isPending}
          disabled={pincode.trim().length !== 6}
          sx={{ mt: { sm: 0.5 }, flexShrink: 0 }}
        >
          Check
        </LoadingButton>
      </Stack>

      {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      {!result && !errorMsg && !check.isPending && (
        <EmptyContent
          filled
          sx={{ py: 8 }}
          title="No pincode checked yet"
          description="Ask the carrier whether it delivers there, and whether it will collect cash."
        />
      )}

      {result && !check.isPending && (
        <Card sx={{ p: 3, bgcolor: 'background.neutral', boxShadow: 'none' }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="h5" sx={{ fontFamily: 'monospace' }}>
              {result.pincode}
            </Typography>
            <Label variant="soft" color={result.serviceable ? 'success' : 'error'}>
              {result.serviceable ? 'Serviceable' : 'Not serviceable'}
            </Label>
            {result.outOfDeliveryArea && (
              <Label variant="soft" color="warning">
                Out of delivery area
              </Label>
            )}
            {(result.district || result.stateCode) && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {[result.district, result.stateCode].filter(Boolean).join(', ')}
              </Typography>
            )}
          </Stack>

          {result.serviceable ? (
            <>
              <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                {CAPABILITIES.map((cap) => {
                  const on = result[cap.key];
                  return (
                    <Stack key={cap.key} direction="row" spacing={1.5} alignItems="flex-start">
                      <Iconify
                        icon={on ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
                        width={22}
                        sx={{ color: on ? 'success.main' : 'text.disabled', flexShrink: 0 }}
                      />
                      <Stack spacing={0.25}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Iconify
                            icon={cap.icon}
                            width={16}
                            sx={{ color: 'text.secondary' }}
                          />
                          <Typography variant="subtitle2">{cap.label}</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {on ? cap.why : 'Not available here'}
                        </Typography>
                      </Stack>
                    </Stack>
                  );
                })}
              </Box>

              {result.outOfDeliveryArea && (
                <Alert severity="warning" variant="outlined" sx={{ mt: 2.5 }}>
                  Reachable, but off the regular route — expect longer transit and a possible
                  surcharge.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="error" variant="outlined" sx={{ mt: 2.5 }}>
              The carrier does not serve this pincode. An order to this address cannot be
              fulfilled through Delhivery.
            </Alert>
          )}
        </Card>
      )}
    </Stack>
  );
}
