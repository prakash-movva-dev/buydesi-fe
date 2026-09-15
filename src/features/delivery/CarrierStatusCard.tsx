import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import AlertTitle from '@mui/material/AlertTitle';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { fCurrency } from '@/utils/format-number';

import type { DeliveryProviderStatus } from './types';

// ----------------------------------------------------------------------

/** What each missing credential actually stops, in plain words. */
const CONSEQUENCE: Record<string, string> = {
  DELHIVERY_API_TOKEN: 'quotes and tracking',
  DELHIVERY_CLIENT_NAME: 'booking shipments',
  DELHIVERY_WEBHOOK_SECRET: 'automatic status updates',
};

type Props = {
  status?: DeliveryProviderStatus;
};

/**
 * Says which carrier is answering before anything is looked up.
 *
 * On the mock, every panel on this page still returns a confident-looking reply
 * — a shipment id, a status, a price — none of which came from a carrier. That
 * is worth knowing before acting on it, so it is stated at the top rather than
 * left to be inferred.
 */
export function CarrierStatusCard({ status }: Props) {
  if (!status) return null;

  const { live, rateEngine, flatRate, missing } = status;

  return (
    <Card sx={{ p: 3 }}>
      <Stack
        spacing={3}
        direction={{ xs: 'column', md: 'row' }}
        divider={
          <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />
        }
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 240 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 48,
              height: 48,
              bgcolor: live ? 'success.lighter' : 'warning.lighter',
              color: live ? 'success.dark' : 'warning.dark',
            }}
          >
            <Iconify icon={live ? 'solar:delivery-bold' : 'solar:test-tube-bold'} width={24} />
          </Avatar>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Carrier</Typography>
            <Label variant="soft" color={live ? 'success' : 'warning'}>
              {live ? 'Delhivery — live' : 'Mock — no carrier'}
            </Label>
          </Stack>
        </Stack>

        <Stack spacing={0.5} sx={{ minWidth: 240 }}>
          <Typography variant="subtitle2">Delivery charge</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {rateEngine === 'delhivery' ? (
              "Quoted live from Delhivery's rate card"
            ) : (
              <>
                Flat: {fCurrency(flatRate.baseInr)} + {fCurrency(flatRate.perKgInr)} per kg
              </>
            )}
          </Typography>
        </Stack>

        <Stack spacing={0.5} flexGrow={1}>
          <Typography variant="subtitle2">Credentials</Typography>
          {missing.length === 0 ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'success.main' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                All configured
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {missing.map((key) => (
                <Label key={key} variant="soft" color="error">
                  {key.replace('DELHIVERY_', '').replace(/_/g, ' ').toLowerCase()}
                </Label>
              ))}
            </Box>
          )}
        </Stack>
      </Stack>

      {!live && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 3 }}>
          <AlertTitle sx={{ mb: 0.5 }}>Nothing here reaches a real carrier yet</AlertTitle>
          Shipment ids, statuses and prices below are generated locally. Set{' '}
          <Box component="code" sx={{ typography: 'caption', fontFamily: 'monospace' }}>
            DELIVERY_PROVIDER=delhivery
          </Box>{' '}
          to switch over.
        </Alert>
      )}

      {missing.length > 0 && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          Still needed:{' '}
          {missing
            .map((k) => `${k} (${CONSEQUENCE[k] ?? 'part of the integration'})`)
            .join(', ')}
          .
        </Alert>
      )}
    </Card>
  );
}
