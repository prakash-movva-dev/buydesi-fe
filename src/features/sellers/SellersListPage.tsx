import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
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
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sellers</h1>
          <p className="text-muted-foreground">
            Onboarding queue and existing accounts. KYC and storefront review.
          </p>
        </div>
      </div>

      <ScopedAdminBanner />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | SellerStatus)}
          className="w-56"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <input
          type="search"
          placeholder="Quick filter (page only): farm, pincode, id"
          value={scrub}
          onChange={(e) => setScrub(e.target.value)}
          className="h-10 w-96 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load sellers'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farm</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pincode</TableHead>
                <TableHead>KYC docs</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((seller) => (
                <TableRow key={seller.id} className="cursor-pointer">
                  <TableCell
                    className="font-medium"
                    onClick={() => navigate(`/admin/sellers/${seller.id}`)}
                  >
                    <div>{seller.farmName}</div>
                    <div className="text-xs text-muted-foreground">{seller.id}</div>
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
              {visible.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No sellers match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {visible.length} of {total} · page {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pageCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
