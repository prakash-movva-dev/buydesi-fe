import type { HTMLAttributes } from 'react';
import Box from '@mui/material/Box';

import { varAlpha } from 'src/theme/styles';

type Variant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

// Maps our variants onto Minimal palette channels for the soft (bg-tinted) look.
const PALETTE: Record<Variant, string> = {
  default: 'primary',
  success: 'success',
  warning: 'warning',
  destructive: 'error',
  info: 'info',
  muted: 'grey',
};

export const Badge = ({ className, variant = 'default', children, ...rest }: BadgeProps) => {
  const key = PALETTE[variant];
  const isGrey = variant === 'muted';

  return (
    <Box
      component="span"
      className={className}
      sx={(theme) => {
        const channel = isGrey
          ? theme.vars.palette.grey['500Channel']
          : theme.vars.palette[key as 'primary'].mainChannel;
        return {
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 1,
          px: 0.875,
          py: 0.375,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
          color: isGrey
            ? theme.vars.palette.text.secondary
            : theme.vars.palette[key as 'primary'].dark,
          backgroundColor: varAlpha(channel, 0.16),
        };
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};
