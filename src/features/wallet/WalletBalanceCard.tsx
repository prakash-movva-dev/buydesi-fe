import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';

import { CONFIG } from '@/config-global';
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

/** One figure in the footer row. */
const Figure = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ minWidth: 0 }}>
    <Box sx={{ mb: 0.5, opacity: 0.48, typography: 'caption' }}>{label}</Box>
    <Box
      sx={{ typography: 'subtitle1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      {value}
    </Box>
  </Box>
);

/**
 * The wallet as a card, following Minimal's banking balance card — dark, the
 * balance set large, and maskable with the eye so a figure isn't left on show
 * over someone's shoulder.
 *
 * The "deck of cards" shadow the starter draws lives on the wrapper, not the
 * Card: MUI's Card hides its overflow, which would clip the shadow into a grey
 * slab across the bottom edge.
 */
export function WalletBalanceCard({ snapshot, holder }: Props) {
  const [masked, setMasked] = useState(false);

  const show = (value?: number) =>
    masked ? '••••' : formatInr(typeof value === 'number' ? value : 0);

  return (
    <Box
      sx={{
        position: 'relative',
        '&::before, &::after': {
          left: 0,
          right: 0,
          mx: '28px',
          zIndex: 0,
          height: 40,
          bottom: -16,
          content: "''",
          opacity: 0.16,
          borderRadius: 2,
          bgcolor: 'grey.500',
          position: 'absolute',
        },
        '&::after': { mx: '16px', bottom: -8, opacity: 0.32 },
      }}
    >
      <Card
        sx={{
          p: 3,
          zIndex: 1,
          borderRadius: 2,
          position: 'relative',
          color: 'common.white',
          bgcolor: 'grey.900',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // A photo under the tint, as the starter does: in dark mode the page
          // is already grey.900, so a flat dark card would vanish into it.
          backgroundImage: (theme) =>
            `linear-gradient(135deg, ${varAlpha(
              theme.vars.palette.grey['900Channel'],
              0.88,
            )}, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.88)}), url('${
              CONFIG.assetsDir
            }/assets/background/background-4.jpg')`,
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Box sx={{ mb: 1, typography: 'subtitle2', opacity: 0.48 }}>Current balance</Box>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Box component="span" sx={{ typography: 'h3' }}>
                {show(snapshot?.balanceInr)}
              </Box>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setMasked((v) => !v)}
                sx={{ opacity: 0.48, '&:hover': { opacity: 1 } }}
              >
                <Iconify
                  width={20}
                  icon={masked ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
                />
              </IconButton>
            </Stack>
          </Box>

          <Iconify width={40} icon="solar:wallet-money-bold-duotone" sx={{ opacity: 0.24 }} />
        </Stack>

        <Divider sx={{ my: 3, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.16)' }} />

        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          <Figure label="Available" value={show(snapshot?.availableInr)} />
          <Figure label="Clearing" value={show(snapshot?.pendingCreditInr)} />
          <Figure label="On hold" value={show(snapshot?.pendingDebitInr)} />
        </Box>

        {holder && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ mb: 0.5, opacity: 0.48, typography: 'caption' }}>Account holder</Box>
            <Box
              sx={{
                typography: 'subtitle1',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {holder}
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}
