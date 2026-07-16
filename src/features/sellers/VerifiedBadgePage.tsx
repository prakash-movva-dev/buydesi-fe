import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { formatDate } from '@/lib/format';
import { useSellersList, useToggleVerifiedBadge } from './api';
import type { SellersListQuery } from './types';

const PAGE_SIZE = 25;
const FILTER_OPTIONS = [
  { value: 'all', label: 'All approved sellers' },
  { value: 'verified', label: 'Verified only' },
  { value: 'not_verified', label: 'Not verified yet' },
];

const HEAD = [
  { id: 'farm', label: 'Farm' },
  { id: 'pincode', label: 'Pincode' },
  { id: 'storefront', label: 'Storefront' },
  { id: 'verified', label: 'Verified' },
  { id: 'approved', label: 'Approved' },
  { id: 'action', label: '' },
];

export const VerifiedBadgePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const verifiedFilter = searchParams.get('filter') ?? 'all';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  // The backend list endpoint takes a status filter only — we fetch approved
  // sellers, then filter client-side by verifiedBadge.
  const query = useMemo<SellersListQuery>(
    () => ({ status: 'APPROVED', page, limit: PAGE_SIZE }),
    [page],
  );

  const { data, isLoading, isError, error } = useSellersList(query);
  const toggle = useToggleVerifiedBadge();

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    if (verifiedFilter === 'verified') return items.filter((s) => s.verifiedBadge);
    if (verifiedFilter === 'not_verified') return items.filter((s) => !s.verifiedBadge);
    return items;
  }, [data, verifiedFilter]);

  const verifiedCount = (data?.items ?? []).filter((s) => s.verifiedBadge).length;
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Verified badge"
        description={'"Verified by Buy Desi" is a trust signal granted by Super Admin to approved sellers with complete KYC and storefront. Use it sparingly.'}
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        <StatCard label="Approved sellers (this page)" value={data?.items.length ?? 0} />
        <StatCard label="Verified (this page)" value={verifiedCount} tone="success" />
        <StatCard label="Total approved on platform" value={total} />
      </Box>

      {isLoading && <Skeleton className="h-40 w-full" />}

      <Card>
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          alignItems="center"
          sx={{ p: 2.5 }}
        >
          <TextField
            select
            label="Filter"
            value={verifiedFilter}
            onChange={(e) => setParam({ filter: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 240 }}
          >
            {FILTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isError && (
          <Box sx={{ px: 2.5, pb: 2, color: 'error.main', typography: 'body2' }}>
            {error instanceof Error ? error.message : 'Failed to load sellers'}
          </Box>
        )}

        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHeadCustom headLabel={HEAD} />
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {s.farmName}
                    <Box sx={{ color: 'text.secondary', typography: 'caption' }}>{s.id}</Box>
                  </TableCell>
                  <TableCell>{s.pincode}</TableCell>
                  <TableCell>
                    {s.storefront.description ||
                    (s.storefront.banner && s.storefront.profilePhoto) ? (
                      <Badge variant="success">Complete</Badge>
                    ) : (
                      <Badge variant="warning">Incomplete</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.verifiedBadge ? (
                      <Badge variant="info">
                        <BadgeCheck className="mr-1 inline h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Box component="span" sx={{ color: 'text.secondary', typography: 'caption' }}>
                        —
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ typography: 'caption' }}>
                    {s.liveAt ? formatDate(s.liveAt) : formatDate(s.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={s.verifiedBadge ? 'outline' : 'primary'}
                      onClick={() =>
                        toggle.mutate({ id: s.id, verifiedBadge: !s.verifiedBadge })
                      }
                      disabled={toggle.isPending}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {s.verifiedBadge ? 'Revoke' : 'Grant'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableNoData notFound={!isLoading && filtered.length === 0} />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, newPage) =>
            setParam({ page: String(Math.max(1, Math.min(pageCount, newPage + 1))) })
          }
          onRowsPerPageChange={() => setParam({ page: '1' })}
        />
      </Card>
    </Stack>
  );
};
