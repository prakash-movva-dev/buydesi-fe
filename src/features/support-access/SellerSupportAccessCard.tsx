import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { ApiError } from '@/types/api';
import { fDateTime } from '@/utils/format-time';
import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';

import {
  useCreateSupportPin,
  useMyGrants,
  useRevokeSupportAccess,
  type SupportAccessEndReason,
  type SupportAccessGrant,
} from './api';

// ----------------------------------------------------------------------

const ENDED_BECAUSE: Record<SupportAccessEndReason, string> = {
  seller_revoked: 'You ended it',
  support_ended: 'Support finished',
  expired: 'Timed out',
  ticket_closed: 'Ticket was closed',
  ticket_reassigned: 'Ticket moved to someone else',
  password_changed: 'You changed your password',
};

const isLive = (g: SupportAccessGrant): boolean =>
  Boolean(g.redeemedAt) && !g.endedAt &&
  Boolean(g.sessionExpiresAt) && new Date(g.sessionExpiresAt!) > new Date();

const nameOf = (g: SupportAccessGrant): string =>
  typeof g.grantedToId === 'string' ? 'Support' : g.grantedToId.name;

const countdown = (until: string): string => {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * The seller's side of letting support into their account.
 *
 * Three states in one card: nothing happening, a PIN waiting to be read out,
 * and somebody currently inside. The last one carries an End now button that
 * works immediately — access the seller cannot stop is not access they granted.
 */
export function SellerSupportAccessCard({
  ticketId,
  ticketOpen,
}: {
  ticketId: string;
  ticketOpen: boolean;
}) {
  const grants = useMyGrants();
  const createMut = useCreateSupportPin();
  const revokeMut = useRevokeSupportAccess();

  const [pin, setPin] = useState<{ value: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const rows = grants.data ?? [];
  const live = rows.find(isLive);
  const forThisTicket = rows.filter(
    (g) => (typeof g.ticketId === 'string' ? g.ticketId : g.ticketId._id) === ticketId,
  );

  // A PIN that has run out is no longer worth showing.
  const activePin = pin && new Date(pin.expiresAt) > new Date() ? pin : null;

  const generate = async () => {
    setError(null);
    try {
      const out = await createMut.mutateAsync(ticketId);
      setPin({ value: out.pin, expiresAt: out.expiresAt });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create a PIN');
    }
  };

  const revoke = async () => {
    try {
      await revokeMut.mutateAsync();
      setPin(null);
      toast.success('Support access ended');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not end access');
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify width={20} icon="solar:shield-user-bold" />
        <Typography variant="h6">Let support work in your account</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        Stuck listing something? Give the support admin a one-time PIN and they can do it for
        you. They will never see your wallet, payouts, orders or bank details.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {live ? (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: (t) => t.palette.warning.lighter,
            border: (t) => `1px solid ${t.palette.warning.light}`,
          }}
        >
          <Typography variant="subtitle2">
            {nameOf(live)} is working in your account
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Started {fDateTime(live.redeemedAt)} · ends in{' '}
            {countdown(live.sessionExpiresAt!)}
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <LoadingButton
              size="small"
              color="error"
              variant="contained"
              loading={revokeMut.isPending}
              onClick={revoke}
            >
              End now
            </LoadingButton>
          </Box>
        </Box>
      ) : activePin ? (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            textAlign: 'center',
            bgcolor: 'background.neutral',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Read this to the support admin
          </Typography>
          <Typography
            variant="h3"
            sx={{ letterSpacing: 6, fontFamily: 'monospace', my: 0.5 }}
          >
            {activePin.value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Expires in {countdown(activePin.expiresAt)} · we also sent it to you
          </Typography>
        </Box>
      ) : (
        <LoadingButton
          variant="contained"
          loading={createMut.isPending}
          disabled={!ticketOpen}
          onClick={generate}
          startIcon={<Iconify icon="solar:key-bold" />}
        >
          Generate PIN
        </LoadingButton>
      )}

      {!ticketOpen && !live && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
          This ticket is closed, so access cannot be granted against it.
        </Typography>
      )}

      {forThisTicket.some((g) => g.endedAt) && (
        <>
          <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Earlier visits
          </Typography>
          <Stack spacing={1.25}>
            {forThisTicket
              .filter((g) => g.endedAt)
              .map((g) => (
                <Stack
                  key={g._id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {nameOf(g)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {g.redeemedAt ? fDateTime(g.redeemedAt) : 'Never used'}
                    </Typography>
                  </Box>
                  <Label variant="soft" color="default">
                    {g.endReason ? ENDED_BECAUSE[g.endReason] : 'Ended'}
                  </Label>
                </Stack>
              ))}
          </Stack>
        </>
      )}
    </Card>
  );
}
