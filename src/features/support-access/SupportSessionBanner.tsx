import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useAuth } from '@/lib/auth';
import { Iconify } from '@/components/iconify';
import { toast } from '@/components/snackbar';

import { useEndMySupportSession } from './api';

// ----------------------------------------------------------------------

const countdown = (until: string): string => {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Says whose account this is, the whole time it is somebody else's.
 *
 * Not dismissible, and pinned above everything. A support admin working in a
 * seller's portal sees the seller's products, the seller's storefront and the
 * seller's name everywhere — the one thing that must never be ambiguous is
 * whether what they are about to change belongs to them.
 */
export function SupportSessionBanner() {
  const { supportSession, endSupportSession } = useAuth();
  const endMut = useEndMySupportSession();
  const navigate = useNavigate();
  const [, tick] = useState(0);

  // Re-render once a second purely for the countdown.
  useEffect(() => {
    if (!supportSession) return undefined;
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [supportSession]);

  if (!supportSession) return null;

  const leave = async () => {
    try {
      await endMut.mutateAsync();
    } catch {
      // Ending server-side is best-effort — the session dies on its own either
      // way, and leaving the admin stuck inside the account would be worse.
    }
    endSupportSession();
    toast.success('Support session ended');
    navigate(`/support/${supportSession.ticketId}`, { replace: true });
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar + 2,
        bgcolor: 'warning.dark',
        color: 'common.white',
        px: { xs: 2, md: 3 },
        py: 1,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Iconify width={18} icon="solar:shield-user-bold" />
        <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0 }} noWrap>
          Working in {supportSession.sellerName}&apos;s account — payments and payouts are
          hidden
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85, whiteSpace: 'nowrap' }}>
          ends in {countdown(supportSession.expiresAt)}
        </Typography>
        <Button
          size="small"
          variant="contained"
          color="inherit"
          onClick={leave}
          disabled={endMut.isPending}
          sx={{ color: 'warning.dark', bgcolor: 'common.white', flexShrink: 0 }}
        >
          End session
        </Button>
      </Stack>
    </Box>
  );
}
