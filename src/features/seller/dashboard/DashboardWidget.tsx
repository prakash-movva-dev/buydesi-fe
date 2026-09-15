import type { CardProps } from '@mui/material/Card';
import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';

import { bgGradient, varAlpha } from '@/theme/styles';

// ----------------------------------------------------------------------

type WidgetColor = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

type Props = CardProps & {
  title: string;
  /** Already formatted — currency, counts, whatever the metric needs. */
  value: string | null;
  icon: ReactNode;
  color?: WidgetColor;
  /** Optional line under the value, e.g. "3 need packing today". */
  caption?: string;
  onClick?: () => void;
};

/**
 * The Minimal dashboard summary widget — tinted gradient card, icon, label and
 * a large figure. `value === null` renders the loading skeleton so the grid
 * never jumps as data arrives.
 */
export function DashboardWidget({
  icon,
  title,
  value,
  caption,
  color = 'primary',
  onClick,
  sx,
  ...other
}: Props) {
  const theme = useTheme();

  return (
    <Card
      onClick={onClick}
      sx={{
        ...bgGradient({
          color: `135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(
            theme.vars.palette[color].lightChannel,
            0.48,
          )}`,
        }),
        p: 3,
        height: 1,
        boxShadow: 'none',
        position: 'relative',
        color: `${color}.darker`,
        backgroundColor: 'common.white',
        ...(onClick && {
          cursor: 'pointer',
          transition: theme.transitions.create(['transform', 'box-shadow']),
          '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.customShadows?.z8 },
        }),
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          mb: 3,
          width: 48,
          height: 48,
          display: 'flex',
          borderRadius: '50%',
          alignItems: 'center',
          justifyContent: 'center',
          color: `${color}.dark`,
          bgcolor: (t) => varAlpha(t.vars.palette[color].mainChannel, 0.16),
        }}
      >
        {icon}
      </Box>

      <Box sx={{ typography: 'subtitle2', mb: 1 }}>{title}</Box>

      {value === null ? (
        <Skeleton variant="text" width={90} height={40} />
      ) : (
        <Box sx={{ typography: 'h3', lineHeight: 1.1 }}>{value}</Box>
      )}

      {caption && (
        <Box sx={{ mt: 0.5, typography: 'caption', opacity: 0.72 }}>{caption}</Box>
      )}
    </Card>
  );
}
