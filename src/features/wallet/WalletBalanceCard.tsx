import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';

import { varAlpha } from '@/theme/styles';
import { formatInr } from '@/lib/format';
import { Iconify } from '@/components/iconify';
import type { WalletSnapshot } from './types';

// ----------------------------------------------------------------------

type Props = {
  snapshot?: WalletSnapshot;
  /** Name shown where a bank card would print the holder. */
  holder?: string;
};

/**
 * The wallet as a card, following Minimal's banking balance card — dark, the
 * balance set large, and maskable with the eye so a figure isn't left on show
 * over someone's shoulder. The wallet reference stands in for a card number.
 */
export function WalletBalanceCard({ snapshot, holder }: Props) {
  const [masked, setMasked] = useState(false);

  const show = (value?: number) =>
    masked ? '••••••' : typeof value === 'number' ? formatInr(value) : '—';

  return (
    <Card
      sx={{
        mb: 2,
        p: 3,
        borderRadius: 2,
        color: 'common.white',
        position: 'relative',
        bgcolor: 'grey.800',
        backgroundImage: (theme) =>
          `linear-gradient(135deg, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.92)}, ${varAlpha(
            theme.vars.palette.grey['800Channel'],
            0.92,
          )})`,
        // The stacked shadows read as a small deck of cards.
        '&::before, &::after': {
          left: 0,
          right: 0,
          mx: '28px',
          zIndex: -2,
          height: 40,
          bottom: -16,
          content: "''",
          opacity: 0.16,
          borderRadius: 1.5,
          bgcolor: 'grey.500',
          position: 'absolute',
        },
        '&::after': { mx: '16px', bottom: -8, opacity: 0.32 },
      }}
    >
      <Box sx={{ mb: 1.5, typography: 'subtitle2', opacity: 0.48 }}>Current balance</Box>

      <Stack direction="row" alignItems="center" spacing={1}>
        <Box component="span" sx={{ typography: 'h3' }}>
          {show(snapshot?.balanceInr)}
        </Box>
        <IconButton color="inherit" onClick={() => setMasked((v) => !v)} sx={{ opacity: 0.48 }}>
          <Iconify icon={masked ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />
        </IconButton>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ my: 3, typography: 'subtitle1', justifyContent: 'flex-end' }}
      >
        <Box
          sx={{
            px: 0.75,
            display: 'inline-flex',
            borderRadius: 0.5,
            bgcolor: 'common.white',
            color: 'grey.800',
          }}
        >
          <Iconify width={24} icon="solar:wallet-money-bold" />
        </Box>
        {/* A wallet has no card number; its reference is the nearest thing. */}
        {snapshot?.walletId ? `•••• ${snapshot.walletId.slice(-4)}` : '••••'}
      </Stack>

      <Stack direction="row" spacing={5} flexWrap="wrap" useFlexGap sx={{ typography: 'subtitle1' }}>
        <Box>
          <Box sx={{ mb: 1, opacity: 0.48, typography: 'caption' }}>Account holder</Box>
          <Box component="span">{holder ?? '—'}</Box>
        </Box>
        <Box>
          <Box sx={{ mb: 1, opacity: 0.48, typography: 'caption' }}>Available</Box>
          <Box component="span">{show(snapshot?.availableInr)}</Box>
        </Box>
        <Box>
          <Box sx={{ mb: 1, opacity: 0.48, typography: 'caption' }}>Clearing</Box>
          <Box component="span">{show(snapshot?.pendingCreditInr)}</Box>
        </Box>
      </Stack>
    </Card>
  );
}
