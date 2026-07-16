import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { DirectRegisterSellerDialog } from './DirectRegisterSellerDialog';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { formatDate } from '@/lib/format';
import { useSellersList } from './api';
import { SellerStatusBadge } from './status-badge';
import type { SellerStatus, SellersListQuery } from './types';

const STATUS_OPTIONS: Array<{ value: '' | SellerStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending review' },
  { value: 'INFO_REQUESTED', label: 'Info requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const HEAD = [
  { id: 'farm', label: 'Farm' },
  { id: 'status', label: 'Status' },
  { id: 'pincode', label: 'Pincode' },
  { id: 'kyc', label: 'KYC docs' },
  { id: 'verified', label: 'Verified' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'action', label: '' },
];

const PAGE_SIZE = 20;

export const SellersListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('status') as SellerStatus | null) ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<SellersListQuery>(
    () => ({
      status: status || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, page],
  );

  const { data, isLoading, isError, error } = useSellersList(query);
  const total = data?.meta.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const { user } = useAuth();
  const canDirectRegister =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;
  const [registerOpen, setRegisterOpen] = useState(false);

  // The backend doesn't expose a name/pincode search on this endpoint yet;
  // filter client-side so the operator can scrub the current page.
  const [scrub, setScrub] = useState('');
  const visible = useMemo(() => {
    const s = scrub.trim().toLowerCase();
    if (!s || !data) return data?.items ?? [];
    return data.items.filter(
      (it) =>
        it.farmName.toLowerCase().includes(s) ||
        it.pincode.includes(s) ||
        it.id.includes(s),
    );
  }, [scrub, data]);

  const setStatus = (next: '' | SellerStatus) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('status', next);
    else params.delete('status');
    params.set('page', '1');
    setSearchParams(params);
  };

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(Math.max(1, Math.min(pageCount, next))));
    setSearchParams(params);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Sellers"
        description="Onboarding queue and existing accounts. KYC and storefront review."
        action={
          <>
            {canDirectRegister && (
              <Button onClick={() => setRegisterOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Direct register seller
              </Button>
            )}
          </>
        }
      />

      <DirectRegisterSellerDialog open={registerOpen} onClose={() => setRegisterOpen(false)} />

      <ScopedAdminBanner />

      {isLoading && (
        <Stack spacing={1}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Stack>
      )}

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
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | SellerStatus)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Quick filter"
            type="search"
            placeholder="Page only: farm, pincode, id"
            value={scrub}
            onChange={(e) => setScrub(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 320 }}
          />
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
              {visible.map((seller) => (
                <TableRow key={seller.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell
                    sx={{ fontWeight: 500 }}
                    onClick={() => navigate(`/admin/sellers/${seller.id}`)}
                  >
                    <Box>{seller.farmName}</Box>
                    <Box sx={{ color: 'text.secondary', typography: 'caption' }}>{seller.id}</Box>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/sellers/${seller.id}`)}>
                    <SellerStatusBadge status={seller.status} />
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/sellers/${seller.id}`)}>
                    {seller.pincode}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/sellers/${seller.id}`)}>
                    {seller.kycDocuments.length}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/sellers/${seller.id}`)}>
                    {seller.verifiedBadge ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/sellers/${seller.id}`)}>
                    {formatDate(seller.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/sellers/${seller.id}`)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableNoData notFound={!isLoading && visible.length === 0} />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, newPage) => setPage(newPage + 1)}
          onRowsPerPageChange={() => setPage(1)}
        />
      </Card>
    </Stack>
  );
};
