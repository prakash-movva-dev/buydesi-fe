import type { ReactNode } from 'react';
import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';

import { CONFIG } from '@/config-global';
import { varAlpha, bgGradient } from '@/theme/styles';

import { Iconify } from '@/components/iconify';
import { SvgColor } from '@/components/svg-color';
import { Chart, useChart } from '@/components/chart';

import { fNumber, fPercent, fShortenNumber } from '@/utils/format-number';

// ----------------------------------------------------------------------

type WidgetColor = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

type Props = CardProps & {
  title: string;
  /** `null` while the figure is still loading. */
  total: number | null;
  /** Change against the previous period; omit when there is nothing to compare. */
  percent?: number;
  color?: WidgetColor;
  icon: ReactNode;
  /** Already-formatted figure, for money where a shortened number would mislead. */
  displayTotal?: string;
  chart?: { series: number[]; categories: string[] };
  /** When provided, the card becomes a clickable navigation shortcut. */
  onClick?: () => void;
};

/**
 * Minimal's analytics summary widget — tinted gradient, an icon, the figure,
 * a sparkline, and the period-on-period move in the corner.
 * Pass `onClick` to make the card a clickable navigation shortcut.
 */
export function AnalyticsWidget({
  icon,
  title,
  total,
  percent,
  chart,
  displayTotal,
  color = 'primary',
  onClick,
  sx,
  ...other
}: Props) {
  const theme = useTheme();

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: [theme.palette[color].dark],
    xaxis: { categories: chart?.categories ?? [] },
    grid: { padding: { top: 6, left: 6, right: 6, bottom: 6 } },
    tooltip: {
      y: { formatter: (value: number) => fNumber(value), title: { formatter: () => '' } },
    },
  });

  const renderTrending = percent !== undefined && (
    <Box
      sx={{
        top: 16,
        gap: 0.5,
        right: 16,
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
      }}
    >
      <Iconify width={20} icon={percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'} />
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {percent > 0 && '+'}
        {fPercent(percent)}
      </Box>
    </Box>
  );

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
        // Clickable styling — lift + pointer only when onClick is wired up.
        ...(onClick && {
          cursor: 'pointer',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: theme.customShadows?.z8 ?? '0 8px 24px 0 rgba(0,0,0,0.12)',
          },
          '&:active': {
            transform: 'translateY(-1px)',
          },
        }),
        ...sx,
      }}
      {...other}
    >
      <Box sx={{ width: 48, height: 48, mb: 3 }}>{icon}</Box>

      {/* Arrow icon in top-right when clickable — signals navigation to the user */}
      {onClick ? (
        <Box
          sx={{
            top: 16,
            right: 16,
            position: 'absolute',
            opacity: 0.55,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Iconify width={18} icon="eva:arrow-ios-forward-fill" />
        </Box>
      ) : (
        renderTrending
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 112 }}>
          <Box sx={{ mb: 1, typography: 'subtitle2' }}>{title}</Box>
          <Box sx={{ typography: 'h4' }}>
            {total === null ? (
              <Skeleton width={80} />
            ) : (
              (displayTotal ?? fShortenNumber(total))
            )}
          </Box>
        </Box>

        {chart && chart.series.some((n) => n > 0) && (
          <Chart
            type="line"
            series={[{ data: chart.series }]}
            options={chartOptions}
            width={84}
            height={56}
          />
        )}
      </Box>

      <SvgColor
        src={`${CONFIG.assetsDir}/assets/background/shape-square.svg`}
        sx={{
          top: 0,
          left: -20,
          width: 240,
          zIndex: -1,
          height: 240,
          opacity: 0.24,
          position: 'absolute',
          color: `${color}.main`,
        }}
      />
    </Card>
  );
}
