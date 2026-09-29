import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';

import { useRedeemSupportPin } from './api';

// ----------------------------------------------------------------------

/**
 * The support admin's way in.
 *
 * Only shown on an open ticket assigned to them, because only they can redeem
 * the PIN — a PIN overheard by somebody else in the room is no use to that
 * person, and offering the form to everyone would just invite the attempt.
 */
export function SupportEnterAccountCard({
  ticketId,
  sellerEmail,
}: {
  ticketId: string;
  sellerEmail?: string | null;
}) {
  const { startSupportSession } = useAuth();
  const redeemMut = useRedeemSupportPin();
  const navigate = useNavigate();

  const [email, setEmail] = useState(sellerEmail ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const enter = async () => {
    setError(null);
    try {
      const session = await redeemMut.mutateAsync({
        sellerEmail: email.trim().toLowerCase(),
        pin: pin.trim(),
      });
      startSupportSession({
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
        sellerId: session.seller.id,
        sellerName: session.seller.name,
        ticketId,
      });
      toast.success(`You are now working in ${session.seller.name}'s account`);
      navigate('/seller/products');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the session');
      setPin('');
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify width={20} icon="solar:shield-user-bold" />
        <Typography variant="h6">Work in this seller&apos;s account</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        Ask the seller to generate a PIN on their side of this ticket, then enter it here. You
        will be able to manage their products and storefront for an hour — not their wallet,
        payouts, orders or bank details.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Seller's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Six-digit PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputProps={{ inputMode: 'numeric', maxLength: 6 }}
          InputLabelProps={{ shrink: true }}
        />
        <Box>
          <LoadingButton
            variant="contained"
            loading={redeemMut.isPending}
            disabled={!email.trim() || pin.length !== 6}
            onClick={enter}
          >
            Enter account
          </LoadingButton>
        </Box>
      </Stack>
    </Card>
  );
}
