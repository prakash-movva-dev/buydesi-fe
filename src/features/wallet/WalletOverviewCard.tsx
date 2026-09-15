import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';

import { useTabs } from '@/hooks/use-tabs';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { CustomTabs } from '@/components/custom-tabs';
import { Chart, useChart } from '@/components/chart';

import { formatInr } from '@/lib/format';
import type { WalletSnapshot, WalletSummary } from './types';

// ----------------------------------------------------------------------

/** 'YYYY-MM' → 'Jan', for the chart axis. */
const monthLabel = (key: string): string => {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', { month: 'short' });
};

const fPercent = (value: number): string =>
  `${value > 0 ? '+' : ''}${value.toFixed(1).replace(/\.0$/, '')}%`;

type Props = CardProps & {
  snapshot?: WalletSnapshot;
  summary?: WalletSummary;
  onWithdraw?: () => void;
  withdrawDisabled?: boolean;
};

/**
 * The headline wallet card, following Minimal's banking overview: the balance
 * and its actions on top, money-in / money-out as two selectable tabs, and the
 * chart below redrawing for whichever of the two is selected.
 */
export function WalletOverviewCard({
  snapshot,
  summary,
  onWithdraw,
  withdrawDisabled,
  sx,
  ...other
}: Props) {
  const theme = useTheme();

  const tabs = useTabs('in');

  const months = summary?.months ?? [];

  const TABS = [
    {
      value: 'in',
      label: 'Money in',
      hint: 'Payouts and credits that have settled',
      percent: summary?.creditChangePercent ?? 0,
      total: summary?.totalCreditInr ?? 0,
      series: months.map((m) => m.creditInr),
    },
    {
      value: 'out',
      label: 'Money out',
      hint: 'Withdrawals and fees taken from the wallet',
      percent: summary?.debitChangePercent ?? 0,
      total: summary?.totalDebitInr ?? 0,
      series: months.map((m) => m.debitInr),
    },
  ];

  const active = TABS.find((t) => t.value === tabs.value) ?? TABS[0];

  const chartOptions = useChart({
    colors: [tabs.value === 'in' ? theme.palette.primary.dark : theme.palette.warning.dark],
    xaxis: { categories: months.map((m) => monthLabel(m.month)) },
    stroke: { width: 3 },
    tooltip: {
      y: { formatter: (value: number) => formatInr(value), title: { formatter: () => '' } },
    },
  });

  const renderBalance = (
    <Box sx={{ flexGrow: 1 }}>
      <Box
        sx={{
          mb: 1,
          gap: 0.5,
          display: 'flex',
          alignItems: 'center',
          color: 'text.secondary',
          typography: 'subtitle2',
        }}
      >
        Total balance
        <Tooltip title="Everything in the wallet, including amounts still clearing">
          <Iconify width={16} icon="eva:info-outline" sx={{ color: 'text.disabled' }} />
        </Tooltip>
      </Box>
      <Box sx={{ typography: 'h3' }}>{formatInr(snapshot?.balanceInr ?? 0)}</Box>
    </Box>
  );

  const renderActions = onWithdraw && (
    <Box sx={{ gap: 1, display: 'flex' }}>
      <Button
        variant="soft"
        size="small"
        onClick={onWithdraw}
        disabled={withdrawDisabled}
        startIcon={<Iconify width={16} icon="eva:arrow-upward-fill" />}
      >
        Withdraw
      </Button>
    </Box>
  );

  const renderTabs = (
    <CustomTabs
      value={tabs.value}
      onChange={tabs.onChange}
      variant="fullWidth"
      sx={{ my: 3, borderRadius: 2 }}
      slotProps={{
        indicator: { borderRadius: 1.5, boxShadow: theme.customShadows.z4 },
        tab: { p: 3 },
      }}
    >
      {TABS.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={
            <Box
              sx={{
                width: 1,
                display: 'flex',
                gap: { xs: 1, md: 2.5 },
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'center', md: 'flex-start' },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: '50%',
                  alignItems: 'center',
                  color: 'primary.lighter',
                  justifyContent: 'center',
                  bgcolor: 'primary.darker',
                  display: { xs: 'none', md: 'inline-flex' },
                  ...(tab.value === 'out' && {
                    color: 'warning.lighter',
                    bgcolor: 'warning.darker',
                  }),
                }}
              >
                <Iconify
                  width={24}
                  icon={
                    tab.value === 'out'
                      ? 'eva:diagonal-arrow-right-up-fill'
                      : 'eva:diagonal-arrow-left-down-fill'
                  }
                />
              </Box>

              <div>
                <Box
                  sx={{
                    mb: 1,
                    gap: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    typography: 'subtitle2',
                  }}
                >
                  {tab.label}
                  <Tooltip title={tab.hint} placement="top">
                    <Iconify width={16} icon="eva:info-outline" sx={{ color: 'text.disabled' }} />
                  </Tooltip>
                </Box>

                <Box sx={{ typography: 'h4' }}>{formatInr(tab.total)}</Box>
              </div>

              {/* A flat month reads as no news, so the chip stays off. */}
              {tab.percent !== 0 && (
                <Label
                  color={tab.percent < 0 ? 'error' : 'success'}
                  startIcon={
                    <Iconify
                      width={24}
                      icon={
                        tab.percent < 0
                          ? 'solar:double-alt-arrow-down-bold-duotone'
                          : 'solar:double-alt-arrow-up-bold-duotone'
                      }
                    />
                  }
                  sx={{ top: 8, right: 8, position: { md: 'absolute' } }}
                >
                  {fPercent(tab.percent)}
                </Label>
              )}
            </Box>
          }
        />
      ))}
    </CustomTabs>
  );

  return (
    <Card
      sx={{ p: 3, height: 1, display: 'flex', flexDirection: 'column', ...sx }}
      {...other}
    >
      <Box
        sx={{
          gap: 2,
          display: 'flex',
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {renderBalance}
        {renderActions}
      </Box>

      {renderTabs}

      <Chart
        type="line"
        series={[{ name: active.label, data: active.series }]}
        options={chartOptions}
        height="100%"
        sx={{ flex: '1 1 auto', flexShrink: 1, minHeight: 320 }}
      />
    </Card>
  );
}
