import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { BadgeCheck, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
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
import { formatDate } from '@/lib/format';
import { useSellersList, useToggleVerifiedBadge } from './api';
import type { SellersListQuery } from './types';

const PAGE_SIZE = 25;
const FILTER_OPTIONS = [
  { value: 'all', label: 'All approved sellers' },
  { value: 'verified', label: 'Verified only' },
  { value: 'not_verified', label: 'Not verified yet' },
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

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <Select
          value={verifiedFilter}
          onChange={(e) => setParam({ filter: e.target.value })}
          className="w-64"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Stack>

      {isLoading && <Skeleton className="h-40 w-full" />}
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
                <TableHead>Pincode</TableHead>
                <TableHead>Storefront</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.farmName}
                    <div className="text-xs text-muted-foreground">{s.id}</div>
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
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No sellers match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ fontSize: 14, color: 'text.secondary' }}
          >
            <span>
              Showing {filtered.length} of {total} approved · page {page} / {pageCount}
            </span>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.max(1, page - 1)) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParam({ page: String(Math.min(pageCount, page + 1)) })}
                disabled={page >= pageCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
};
