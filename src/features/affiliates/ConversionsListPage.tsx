import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { varAlpha } from '@/theme/styles';

import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import {
  useTable,
  emptyRows,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '@/components/table';

import { fDate, fTime } from '@/utils/format-time';
import { fCurrency } from '@/utils/format-number';

import { useConversionsList, useReverseConversion, useRunCommissionBatch } from './api';
import { ConversionStatusBadge, CONVERSION_LABEL, VIA_ICON, VIA_LABEL } from './status-badge';
import type { AffiliateConversion, AffiliateConversionStatus, ConversionsListQuery } from './types';

// ----------------------------------------------------------------------

const STATUS_TABS: Array<{ value: '' | AffiliateConversionStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: CONVERSION_LABEL.PENDING },
  { value: 'APPROVED', label: CONVERSION_LABEL.APPROVED },
  { value: 'PAID', label: CONVERSION_LABEL.PAID },
  { value: 'REVERSED', label: CONVERSION_LABEL.REVERSED },
];

const TABLE_HEAD = [
  { id: 'affiliate', label: 'Affiliate' },
  { id: 'order', label: 'Order', width: 170 },
  { id: 'via', label: 'Attributed by', width: 170 },
  { id: 'value', label: 'Order value', align: 'right' as const, width: 130 },
  { id: 'rate', label: 'Rate', align: 'right' as const, width: 80 },
  { id: 'commission', label: 'Commission', align: 'right' as const, width: 130 },
  { id: 'placed', label: 'Placed', width: 140 },
  { id: 'status', label: 'Status', width: 140 },
  { id: '', width: 60 },
];

const DEFAULT_LIMIT = 10;

// ----------------------------------------------------------------------

/**
 * Every sale an affiliate brought in, and where its commission stands.
 *
 * The distinction that matters here is "not owed yet" against "owed": a sale is
 * only earned once the buyer's return window has closed, so most rows sit
 * waiting rather than being unpaid.
 */
export const ConversionsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const table = useTable({ defaultRowsPerPage: DEFAULT_LIMIT });
  const [reversing, setReversing] = useState<AffiliateConversion | null>(null);

  const status = (searchParams.get('status') as AffiliateConversionStatus | null) ?? '';
  const affiliateId = searchParams.get('affiliateId') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      if (!('page' in next)) params.delete('page');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const query = useMemo<ConversionsListQuery>(
    () => ({
      status: status || undefined,
      affiliateId: affiliateId || undefined,
      page,
      limit,
    }),
    [status, affiliateId, page, limit],
  );

  const { data, isLoading, isError, error } = useConversionsList(query);
  const runBatch = useRunCommissionBatch();

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.meta.counts;

  const settle = async () => {
    try {
      const out = await runBatch.mutateAsync({});
      if (out.paid === 0 && out.approved === 0) {
        toast.info('Nothing was due — every attributed order is still inside its return window.');
      } else {
        toast.success(
          `${out.paid} commission${out.paid === 1 ? '' : 's'} paid, ${fCurrency(out.totalPaidInr)} credited`,
        );
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not settle');
    }
  };

  const notFound = !isLoading && rows.length === 0;
  const canSettle = user?.role === UserRole.SUPER_ADMIN;

  return (
    <>
      <PageHeader
        title="Attributed sales"
        links={[
          { name: 'Dashboard', href: '/admin' },
          { name: 'Affiliates', href: '/admin/affiliates' },
          { name: 'Attributed sales' },
        ]}
        description="Orders an affiliate brought in. Commission is owed once the order is delivered and its return window has closed, and is paid into their wallet."
        action={
          <Stack direction="row" spacing={1.5}>
            {affiliateId && (
              <Button variant="outlined" onClick={() => setParams({ affiliateId: null })}>
                Show everyone
              </Button>
            )}
            {canSettle && (
              <LoadingButton
                variant="contained"
                loading={runBatch.isPending}
                onClick={settle}
                startIcon={<Iconify icon="solar:play-bold" />}
              >
                Settle now
              </LoadingButton>
            )}
          </Stack>
        }
      />

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load attributed sales'}
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={status}
          onChange={(_e, value) => setParams({ status: value })}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value || 'all'}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={tab.value === status ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'PENDING' && 'warning') ||
                    (tab.value === 'APPROVED' && 'info') ||
                    (tab.value === 'PAID' && 'success') ||
                    'default'
                  }
                >
                  {counts ? (counts[tab.value || 'all'] ?? 0) : '-'}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1100 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />

              <TableBody>
                {isLoading
                  ? Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: table.dense ? 56 : 76 }} />
                    ))
                  : rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Box
                            component="span"
                            onClick={() => navigate(`/admin/affiliates/${row.affiliateId}`)}
                            sx={{
                              typography: 'subtitle2',
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            {row.affiliateName}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                          {row.orderNumber ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Iconify
                              icon={VIA_ICON[row.via]}
                              width={16}
                              sx={{ color: 'text.disabled' }}
                            />
                            <Box component="span" sx={{ typography: 'body2' }}>
                              {row.code ?? VIA_LABEL[row.via]}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{fCurrency(row.orderSubtotalInr)}</TableCell>
                        <TableCell align="right">{row.commissionRatePercent}%</TableCell>
                        <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                          {fCurrency(row.commissionInr)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ typography: 'body2' }}>{fDate(row.createdAt)}</Box>
                          <Box
                            component="span"
                            sx={{ color: 'text.disabled', typography: 'caption' }}
                          >
                            {fTime(row.createdAt)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {row.status === 'REVERSED' && row.reversedReason ? (
                            <Tooltip title={row.reversedReason}>
                              <Box component="span">
                                <ConversionStatusBadge status={row.status} />
                              </Box>
                            </Tooltip>
                          ) : (
                            <ConversionStatusBadge status={row.status} />
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ px: 1 }}>
                          {row.status !== 'REVERSED' && (
                            <Tooltip title="Take this commission back" placement="top" arrow>
                              <IconButton color="default" onClick={() => setReversing(row)}>
                                <Iconify icon="solar:undo-left-bold" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(page - 1, limit, total)}
                />

                {notFound && (
                  <TableRow>
                    <TableCell colSpan={TABLE_HEAD.length}>
                      <EmptyContent
                        filled
                        sx={{ py: 10 }}
                        title={status ? 'Nothing in this state' : 'No attributed sales yet'}
                        description={
                          status
                            ? 'Try another tab.'
                            : 'A sale lands here when a buyer orders after following an affiliate link or using their code.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={page - 1}
          dense={table.dense}
          count={total}
          rowsPerPage={limit}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={(e) => setParams({ limit: e.target.value, page: '1' })}
        />
      </Card>

      <ReverseDialog conversion={reversing} onClose={() => setReversing(null)} />
    </>
  );
};

// ----------------------------------------------------------------------

/** Taking a commission back debits a wallet, so it asks why and says so. */
function ReverseDialog({
  conversion,
  onClose,
}: {
  conversion: AffiliateConversion | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const reverse = useReverseConversion();

  const submit = async () => {
    if (!conversion) return;
    if (reason.trim().length < 2) return;
    try {
      await reverse.mutateAsync({ conversionId: conversion.id, reason: reason.trim() });
      toast.success('Commission taken back');
      setReason('');
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reverse it');
    }
  };

  return (
    <Dialog fullWidth maxWidth="xs" open={Boolean(conversion)} onClose={onClose}>
      <DialogTitle sx={{ pb: 2 }}>Take this commission back?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {conversion?.status === 'PAID'
              ? `${fCurrency(conversion.commissionInr)} has already been credited to ${conversion.affiliateName}'s wallet — reversing debits it again.`
              : `${conversion ? fCurrency(conversion.commissionInr) : ''} for ${conversion?.affiliateName} will not be paid.`}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            autoFocus
            label="Why"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Kept on the record"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={reverse.isPending}>
          Cancel
        </Button>
        <LoadingButton
          color="error"
          variant="contained"
          loading={reverse.isPending}
          disabled={reason.trim().length < 2}
          onClick={submit}
        >
          Take it back
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
