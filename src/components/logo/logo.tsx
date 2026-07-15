import type { BoxProps } from '@mui/material/Box';

import { forwardRef } from 'react';
import { Sprout } from 'lucide-react';

import Box from '@mui/material/Box';

import { RouterLink } from 'src/routes/components';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = BoxProps & {
  href?: string;
  isSingle?: boolean;
  disableLink?: boolean;
};

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ href = '/', isSingle = false, disableLink = false, className, sx, ...other }, ref) => (
    <Box
      ref={ref}
      component={disableLink ? 'div' : RouterLink}
      href={href}
      className={logoClasses.root.concat(className ? ` ${className}` : '')}
      aria-label="Buy Desi"
      sx={{
        gap: 1,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'text.primary',
        ...(disableLink && { pointerEvents: 'none' }),
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1.5,
          color: 'primary.main',
          bgcolor: (theme) => `${theme.vars.palette.primary.main}14`,
        }}
      >
        <Sprout size={22} strokeWidth={2} />
      </Box>
      {!isSingle && (
        <Box component="span" sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Buy Desi
        </Box>
      )}
    </Box>
  ),
);
