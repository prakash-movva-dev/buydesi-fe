import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2, Upload } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { ProductStatusBadge } from '@/features/products/status-badge';
import { BulkUploadDialog } from '@/features/products/BulkUploadDialog';
import { formatDate, formatInr } from '@/lib/format';
import type { ProductStatus, ProductsListQuery } from '@/features/products/types';
import { useDeleteProduct, useMyProducts } from './api';

const STATUS_OPTIONS: Array<{ value: '' | ProductStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending review' },
  { value: 'LIVE', label: 'Live' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PAGE_SIZE = 20;

const HEAD = [
  { id: 'product', label: 'Product' },
  { id: 'status', label: 'Status' },
  { id: 'stock', label: 'Stock', align: 'right' as const },
  { id: 'price', label: 'Price', align: 'right' as const },
  { id: 'updated', label: 'Last updated' },
  { id: 'actions', label: '' },
];

const lowestPrice = (p: { pricing: { standard?: number; organic?: number; premium?: number } }) =>
  Math.min(
    ...[p.pricing.standard, p.pricing.organic, p.pricing.premium].filter(
      (x): x is number => typeof x === 'number',
    ),
  );

export const MyProductsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('status') as ProductStatus | null) ?? '';
  const category = searchParams.get('category') ?? '';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const query = useMemo<ProductsListQuery>(
    () => ({
      status: status || undefined,
      category: category || undefined,
      q: q || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, category, q, page],
  );

  const { data, isLoading } = useMyProducts(query);
  const remove = useDeleteProduct();
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

  const [bulkOpen, setBulkOpen] = useState(false);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this product? Cannot be undone.')) return;
    remove.mutate(id);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My products"
        description="Manage your catalogue. New products start in PENDING and go LIVE after a Category Admin approves them."
        action={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4" />
              Bulk upload
            </Button>
            <Button onClick={() => navigate('/seller/products/new')}>
              <Plus className="h-4 w-4" />
              New product
            </Button>
          </>
        }
      />

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
            onChange={(e) => setParam({ status: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 192 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ width: 224 }}>
            <CategoryPicker
              value={category || null}
              onChange={(id) => setParam({ category: id ?? '' })}
              placeholder="All my categories"
            />
          </Box>
          <TextField
            label="Search"
            value={q}
            onChange={(e) => setParam({ q: e.target.value })}
            placeholder="Search by name…"
            InputLabelProps={{ shrink: true }}
            sx={{ width: 320 }}
          />
        </Stack>

        {isLoading && (
          <Box sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </Stack>
          </Box>
        )}

        {!isLoading && (
          <>
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={HEAD} />
                <TableBody>
                  {(data?.items ?? []).map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Link
                          component={RouterLink}
                          to={`/seller/products/${p.id}`}
                          color="inherit"
                        >
                          {p.name}
                        </Link>
                        <Box sx={{ color: 'text.secondary', typography: 'caption' }}>{p.unit}</Box>
                      </TableCell>
                      <TableCell>
                        <ProductStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell align="right">
                        {p.stock.quantity}
                        {p.stock.quantity <= p.stock.threshold && (
                          <Box component="span" sx={{ ml: 0.5, typography: 'caption', color: 'warning.dark' }}>
                            low
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatInr(lowestPrice(p))}</TableCell>
                      <TableCell>{formatDate(p.updatedAt)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/seller/products/${p.id}/edit`)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onDelete(p.id)}
                          disabled={remove.isPending}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableNoData notFound={!isLoading && (data?.items.length ?? 0) === 0} />
                </TableBody>
              </Table>
            </Scrollbar>

            <TablePaginationCustom
              count={total}
              page={page - 1}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[10, 25, 50]}
              onPageChange={(_e, newPage) => setParam({ page: String(newPage + 1) })}
              onRowsPerPageChange={() => {}}
            />
          </>
        )}
      </Card>

      <BulkUploadDialog open={bulkOpen} onClose={() => setBulkOpen(false)} forSelf />
    </Stack>
  );
};
