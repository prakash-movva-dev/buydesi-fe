import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemText from '@mui/material/ListItemText';

import { varAlpha } from '@/theme/styles';
import { Scrollbar } from '@/components/scrollbar';
import { EmptyContent } from '@/components/empty-content';
import { TableHeadCustom, TablePaginationCustom } from '@/components/table';

import { fDate, fTime } from '@/utils/format-time';
import { formatInr } from '@/lib/format';
import { SOURCE_LABEL, TxAvatar, TxStatusBadge } from './status-badge';
import type { WalletTransaction } from './types';

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  subheader?: string;
  rows: WalletTransaction[];
  loading?: boolean;
  /** True while a background refetch runs over rows already on screen. */
  refreshing?: boolean;
  /** Filter controls, rendered between the header and the table. */
  filters?: ReactNode;
  /** Chips summarising the active filters, rendered under them. */
  filtersResult?: ReactNode;
  /** Name the wallet owner — the admin ledger spans sellers, a seller's does not. */
  showSeller?: boolean;
  /** Right-hand actions column — the admin settles withdrawals from here. */
  renderActions?: (row: WalletTransaction) => ReactNode;
  /** Shown in place of the table when there is nothing at all. */
  emptyTitle?: string;
  emptyDescription?: string;
  page: number;
  rowsPerPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
};

/**
 * The ledger, in the Minimal banking style: each row leads with an avatar
 * badged by direction, so credits and debits separate at a glance without
 * reading a single number.
 */
export function WalletTransactionsCard({
  title = 'Transactions',
  subheader,
  rows,
  loading,
  refreshing,
  filters,
  filtersResult,
  showSeller,
  renderActions,
  emptyTitle = 'Nothing here',
  emptyDescription = 'No wallet movement matches these filters.',
  page,
  rowsPerPage,
  total,
  onPageChange,
  onRowsPerPageChange,
}: Props) {
  const head = [
    { id: 'source', label: 'Movement' },
    ...(showSeller ? [{ id: 'seller', label: 'Seller', width: 200 }] : []),
    { id: 'date', label: 'When', width: 150 },
    { id: 'amount', label: 'Amount', width: 150, align: 'right' as const },
    { id: 'status', label: 'Status', width: 120 },
    ...(renderActions ? [{ id: 'actions', label: '', width: 210 }] : []),
  ];

  const colSpan = head.length;
  const isEmpty = !loading && rows.length === 0;

  return (
    <Card>
      <CardHeader title={title} subheader={subheader} sx={{ mb: filters ? 1 : 3 }} />

      {filters}
      {filtersResult}

      {isEmpty ? (
        <EmptyContent filled title={emptyTitle} description={emptyDescription} sx={{ py: 10 }} />
      ) : (
        <Box sx={{ position: 'relative' }}>
          {refreshing && !loading && (
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} />
          )}

          <Scrollbar sx={{ minHeight: 320 }}>
            <Table sx={{ minWidth: showSeller ? 1000 : 720 }}>
              <TableHeadCustom headLabel={head} />

              <TableBody>
                {loading &&
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={colSpan}>
                        <Skeleton height={44} />
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading &&
                  rows.map((row) => {
                    // A withdrawal still pending is the one row on this page
                    // that is waiting for a person, so it is tinted.
                    const waiting = row.source === 'withdrawal' && row.status === 'PENDING';

                    return (
                      <TableRow
                        key={row.id}
                        hover
                        sx={
                          waiting
                            ? {
                                bgcolor: (theme) =>
                                  varAlpha(theme.vars.palette.warning.mainChannel, 0.08),
                              }
                            : undefined
                        }
                      >
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <TxAvatar type={row.type} source={row.source} />
                            <Box sx={{ minWidth: 0 }}>
                              <Box sx={{ typography: 'subtitle2' }}>
                                {SOURCE_LABEL[row.source] ?? row.source}
                              </Box>
                              {row.notes ? (
                                <Tooltip title={row.notes} placement="top-start" arrow>
                                  <Box
                                    sx={{
                                      typography: 'caption',
                                      color: 'text.secondary',
                                      maxWidth: 280,
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {row.notes}
                                  </Box>
                                </Tooltip>
                              ) : (
                                row.referenceId && (
                                  <Box
                                    sx={{
                                      typography: 'caption',
                                      color: 'text.disabled',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {row.referenceType} · {row.referenceId.slice(-8)}
                                  </Box>
                                )
                              )}
                            </Box>
                          </Stack>
                        </TableCell>

                        {showSeller && (
                          <TableCell>
                            {row.seller ? (
                              <ListItemText
                                primary={row.seller.farmName ?? row.seller.name}
                                secondary={row.seller.sellerCode ?? row.seller.name}
                                primaryTypographyProps={{ typography: 'body2', noWrap: true }}
                                secondaryTypographyProps={{
                                  mt: 0.25,
                                  component: 'span',
                                  typography: 'caption',
                                  noWrap: true,
                                }}
                              />
                            ) : (
                              <Box component="span" sx={{ color: 'text.disabled' }}>
                                Unknown
                              </Box>
                            )}
                          </TableCell>
                        )}

                        <TableCell>
                          <ListItemText
                            primary={fDate(row.createdAt)}
                            secondary={fTime(row.createdAt)}
                            primaryTypographyProps={{ typography: 'body2', noWrap: true }}
                            secondaryTypographyProps={{
                              mt: 0.5,
                              component: 'span',
                              typography: 'caption',
                            }}
                          />
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            whiteSpace: 'nowrap',
                            typography: 'subtitle1',
                            color: row.type === 'CREDIT' ? 'success.main' : 'error.main',
                          }}
                        >
                          {row.type === 'CREDIT' ? '+' : '−'}
                          {formatInr(row.amountInr)}
                        </TableCell>

                        <TableCell>
                          <TxStatusBadge status={row.status} />
                        </TableCell>

                        {renderActions && (
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {renderActions(row)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
      )}

      <Divider sx={{ borderStyle: 'dashed' }} />

      <TablePaginationCustom
        count={total}
        page={page - 1}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_e, next) => onPageChange(next + 1)}
        onRowsPerPageChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
      />
    </Card>
  );
}
