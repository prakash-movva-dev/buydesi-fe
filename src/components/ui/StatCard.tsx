import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Skeleton } from './Skeleton';

type Tone = 'default' | 'info' | 'warning' | 'success' | 'destructive';

interface StatCardProps {
  label: ReactNode;
  /** Pre-formatted display value; when null/undefined a skeleton shows. */
  value?: ReactNode;
  secondary?: ReactNode;
  tone?: Tone;
  loading?: boolean;
}

const TONE_COLOR: Record<Tone, string> = {
  default: 'text.primary',
  info: 'info.main',
  warning: 'warning.dark',
  success: 'success.main',
  destructive: 'error.main',
};

/**
 * Compact metric tile used on dashboards and list summaries. Material card with
 * a label, a large tinted value, and an optional secondary line.
 */
export const StatCard = ({ label, value, secondary, tone = 'default', loading }: StatCardProps) => (
  <Card sx={{ p: 3 }}>
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      {loading || value === null || value === undefined ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <Typography variant="h3" sx={{ color: TONE_COLOR[tone], lineHeight: 1.1 }}>
          {value}
        </Typography>
      )}
      {secondary != null && (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {secondary}
        </Typography>
      )}
    </Stack>
  </Card>
);
