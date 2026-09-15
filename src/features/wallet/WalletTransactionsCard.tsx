import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';

import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';

import { fDate, fTime } from '@/utils/format-time';
import { formatInr } from '@/lib/format';
import { SOURCE_LABEL, TxAvatar, TxStatusBadge } from './status-badge';
import type { WalletTransaction } from './types';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'source', label: 'Transaction' },
  { id: 'date', label: 'Date', width: 160 },
  { id: 'amount', label: 'Amount', width: 140, align: 'right' as const },
  { id: 'status', label: 'Status', width: 120 },
];

type Props = {
  title?: string;
  subheader?: string;
  rows: WalletTransaction[];
  loading?: boolean;
  /** Filter controls, rendered between the header and the table. */
  filters?: ReactNode;
  /** Extra column rendered before Status — the admin uses it for the owner. */
  renderExtraCell?: (row: WalletTransaction) => ReactNode;
  extraHead?: { id: string; label: string; width?: number };
  /** Right-hand actions column — the admin settles withdrawals from here. */
  renderActions?: (row: WalletTransaction) => ReactNode;
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
  filters,
  renderExtraCell,
  extraHead,
  renderActions,
  page,
  rowsPerPage,
  total,
  onPageChange,
  onRowsPerPageChange,
}: Props) {
  const head = [
    ...TABLE_HEAD.slice(0, 3),
    ...(extraHead ? [extraHead] : []),
    TABLE_HEAD[3],
    ...(renderActions ? [{ id: 'actions', label: '', width: 180 }] : []),
  ];

  return (
    <Card>
      <CardHeader title={title} subheader={subheader} sx={{ mb: filters ? 1 : 3 }} />

      {filters}

      <Scrollbar sx={{ minHeight: 320 }}>
        <Table sx={{ minWidth: 720 }}>
          <TableHeadCustom headLabel={head} />

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TxAvatar type={row.type} source={row.source} />
                    <ListItemText
                      primary={SOURCE_LABEL[row.source] ?? row.source}
                      secondary={row.notes ?? '—'}
                      secondaryTypographyProps={{
                        noWrap: true,
                        component: 'span',
                        typography: 'caption',
                        sx: { maxWidth: 320, display: 'block' },
                      }}
                    />
                  </Stack>
                </TableCell>

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
                    typography: 'subtitle2',
                    color: row.type === 'CREDIT' ? 'success.main' : 'error.main',
                  }}
                >
                  {row.type === 'CREDIT' ? '+' : '−'}
                  {formatInr(row.amountInr)}
                </TableCell>

                {renderExtraCell && <TableCell>{renderExtraCell(row)}</TableCell>}

                <TableCell>
                  <TxStatusBadge status={row.status} />
                </TableCell>

                {renderActions && (
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {renderActions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}

            <TableNoData notFound={!loading && rows.length === 0} />
          </TableBody>
        </Table>
      </Scrollbar>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box>
        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, next) => onPageChange(next + 1)}
          onRowsPerPageChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
        />
      </Box>
    </Card>
  );
}
