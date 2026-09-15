import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserPicker } from '@/components/pickers/UserPicker';
import { EmptyContent } from '@/components/empty-content';

import { WalletBalanceCard } from './WalletBalanceCard';
import { WalletOverviewCard } from './WalletOverviewCard';
import { WalletTransactionsCard } from './WalletTransactionsCard';
import { WalletAdjustDialog } from './WalletAdjustDialog';
import {
  useCancelWithdrawal,
  useCompleteWithdrawal,
  useSellerWallet,
  useSellerWalletSummary,
  useWalletTxList,
} from './api';
import type { WalletTxListQuery, WalletTxSource, WalletTxStatus, WalletTxType } from './types';

// ----------------------------------------------------------------------

const TX_TYPE_OPTIONS: Array<{ value: '' | WalletTxType; label: string }> = [
  { value: '', label: 'Any type' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'DEBIT', label: 'Debit' },
];

const TX_STATUS_OPTIONS: Array<{ value: '' | WalletTxStatus; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

const TX_SOURCE_OPTIONS: Array<{ value: '' | WalletTxSource; label: string }> = [
  { value: '', label: 'Any source' },
  { value: 'consumer_payout', label: 'Consumer payout' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'platform_fee', label: 'Platform fee' },
  { value: 'admin_adjustment', label: 'Admin adjustment' },
];

const PAGE_SIZE = 25;

// ----------------------------------------------------------------------

export const WalletPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const sellerIdFilter = searchParams.get('sellerId') ?? '';
  const type = (searchParams.get('type') as WalletTxType | null) ?? '';
  const status = (searchParams.get('status') as WalletTxStatus | null) ?? '';
  const source = (searchParams.get('source') as WalletTxSource | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<WalletTxListQuery>(
    () => ({
      userId: sellerIdFilter || undefined,
      type: type || undefined,
      status: status || undefined,
      source: source || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [sellerIdFilter, type, status, source, page],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useWalletTxList(query);
  const snapshot = useSellerWallet(sellerIdFilter || undefined);
  const summary = useSellerWalletSummary(sellerIdFilter || undefined);
  const completeMut = useCompleteWithdrawal();
  const cancelMut = useCancelWithdrawal();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const total = data?.meta.total ?? 0;

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  const filters = (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ px: 2.5, pb: 2.5, pt: 1 }}
    >
      <TextField
        select
        label="Type"
        value={type}
        onChange={(e) => setParam({ type: e.target.value })}
        InputLabelProps={{ shrink: true }}
        sx={{ width: { xs: 1, md: 144 } }}
      >
        {TX_TYPE_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Status"
        value={status}
        onChange={(e) => setParam({ status: e.target.value })}
        InputLabelProps={{ shrink: true }}
        sx={{ width: { xs: 1, md: 160 } }}
      >
        {TX_STATUS_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Source"
        value={source}
        onChange={(e) => setParam({ source: e.target.value })}
        InputLabelProps={{ shrink: true }}
        sx={{ width: { xs: 1, md: 200 } }}
      >
        {TX_SOURCE_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Every wallet movement across sellers. Pick a seller to pin the view to one wallet and unlock adjustments."
        action={
          <Button
            variant="outlined"
            onClick={() => refetch()}
            disabled={isFetching}
            startIcon={<Iconify icon="solar:refresh-bold" />}
          >
            Refresh
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid xs={12} md={5}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Seller wallet"
              subheader="Pick a seller to see their balance and queue an adjustment."
            />
            <CardContent>
              <Stack spacing={2}>
                <UserPicker
                  role={UserRole.SELLER}
                  label="Seller"
                  value={sellerIdFilter || null}
                  onChange={(id) => setParam({ sellerId: id ?? '' })}
                  placeholder="Pick a seller…"
                />
                <Box>
                  <Button
                    variant="contained"
                    disabled={!sellerIdFilter}
                    onClick={() => setAdjustOpen(true)}
                    startIcon={<Iconify icon="solar:pen-new-square-bold" />}
                  >
                    Adjust wallet
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={7}>
          {sellerIdFilter ? (
            <WalletBalanceCard snapshot={snapshot.data} />
          ) : (
            <EmptyContent
              filled
              title="No seller selected"
              description="Pick one to see their balance and movement; the ledger below spans every seller until you do."
              sx={{ height: 1, py: 6 }}
            />
          )}
        </Grid>

        {sellerIdFilter && (
          <Grid xs={12}>
            <WalletOverviewCard snapshot={snapshot.data} summary={summary.data} />
          </Grid>
        )}

        {isError && (
          <Grid xs={12}>
            <Alert severity="error">
              {error instanceof Error ? error.message : 'Failed to load transactions'}
            </Alert>
          </Grid>
        )}

        <Grid xs={12}>
          <WalletTransactionsCard
            title="Ledger"
            subheader={total ? `${total} movement${total === 1 ? '' : 's'}` : undefined}
            rows={data?.items ?? []}
            loading={isLoading}
            filters={filters}
            extraHead={{ id: 'reference', label: 'Reference', width: 160 }}
            renderExtraCell={(row) =>
              row.referenceType ? (
                <Stack spacing={0.25}>
                  <Label variant="soft">{row.referenceType}</Label>
                  {row.referenceId && (
                    <Box
                      component="span"
                      sx={{ fontFamily: 'monospace', typography: 'caption', color: 'text.disabled' }}
                    >
                      {row.referenceId.slice(-8)}
                    </Box>
                  )}
                </Stack>
              ) : (
                <Box component="span" sx={{ color: 'text.disabled' }}>
                  —
                </Box>
              )
            }
            renderActions={(row) =>
              // Only a pending withdrawal is waiting on an admin to settle it.
              row.source === 'withdrawal' && row.status === 'PENDING' ? (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate({ id: row.id })}
                  >
                    Complete
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={cancelMut.isPending}
                    onClick={() => cancelMut.mutate({ id: row.id })}
                  >
                    Cancel
                  </Button>
                </Stack>
              ) : null
            }
            page={page}
            rowsPerPage={PAGE_SIZE}
            total={total}
            onPageChange={(next) => setParam({ page: String(next) })}
          />
        </Grid>
      </Grid>

      <WalletAdjustDialog
        open={adjustOpen}
        sellerId={sellerIdFilter || null}
        onClose={() => setAdjustOpen(false)}
      />
    </>
  );
};
