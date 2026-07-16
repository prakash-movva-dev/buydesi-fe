import { useMemo, useState } from 'react';
import { Pencil, Plus, ReceiptText, Wand2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom } from '@/components/table';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { UserRole } from '@/types/api';
import { useCommissionRates, useResolveCommission } from './api';
import { CommissionRateDialog } from './CommissionRateDialog';
import type { CommissionRate, CommissionScope, ResolvedSource } from './types';

const SCOPE_OPTIONS: Array<{ value: '' | CommissionScope; label: string }> = [
  { value: '', label: 'All scopes' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'seller', label: 'Seller' },
];

const scopeVariant: Record<CommissionScope, 'info' | 'warning' | 'success'> = {
  category: 'info',
  product: 'warning',
  seller: 'success',
};

const SOURCE_LABEL: Record<ResolvedSource, string> = {
  seller: 'Seller override',
  product: 'Product override',
  category: 'Category rule',
  category_default: 'Category default',
};

const RULE_HEAD = [
  { id: 'appliesTo', label: 'Applies to' },
  { id: 'rate', label: 'Rate', align: 'right' as const },
  { id: 'active', label: 'Active' },
  { id: 'from', label: 'From' },
  { id: 'to', label: 'To' },
  { id: 'notes', label: 'Notes' },
];

const RULE_HEAD_SUPER = [...RULE_HEAD, { id: 'edit', label: '' }];

export const CommissionPage = () => {
  const { user } = useAuth();
  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  const [scope, setScope] = useState<'' | CommissionScope>('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionRate | null>(null);

  const query = useMemo(
    () => ({
      scope: scope || undefined,
      active: activeOnly ? true : undefined,
    }),
    [scope, activeOnly],
  );

  const { data, isLoading, isError, error } = useCommissionRates(query);

  const grouped = useMemo(() => {
    const out: Record<CommissionScope, CommissionRate[]> = { category: [], product: [], seller: [] };
    for (const r of data ?? []) out[r.scope].push(r);
    for (const s of Object.keys(out) as CommissionScope[]) {
      out[s].sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    }
    return out;
  }, [data]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Commission rules"
        description="Resolution order — seller > product > category > category default. The payout pipeline picks the most specific live rule at payout time."
        action={
          isSuper ? (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New rule
            </Button>
          ) : undefined
        }
      />

      <ScopedAdminBanner />

      <ResolveTool />

      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
        <TextField
          select
          label="Scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as '' | CommissionScope)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 200 }}
        >
          {SCOPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active only
        </label>
      </Stack>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load rules'}
        </div>
      )}

      {!isLoading && !isError && (
        <Stack spacing={3}>
          {(['seller', 'product', 'category'] as const).map((s) => (
            <Card key={s}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base capitalize">
                  <ReceiptText className="h-4 w-4" />
                  {s} rules
                  <Badge variant={scopeVariant[s]}>{grouped[s].length}</Badge>
                </CardTitle>
                <CardDescription>
                  {s === 'seller'
                    ? 'Override for special-deal sellers. Wins over product / category.'
                    : s === 'product'
                      ? 'Override for specific products (e.g. featured offers).'
                      : 'Default per category. Wins when no seller/product override is set.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {grouped[s].length === 0 ? (
                  <Typography
                    variant="body2"
                    sx={{ px: 3, pb: 2, color: 'text.secondary' }}
                  >
                    No {s} rules{activeOnly ? ' active' : ''}.
                  </Typography>
                ) : (
                  <Scrollbar>
                    <Table sx={{ minWidth: 800 }}>
                      <TableHeadCustom headLabel={isSuper ? RULE_HEAD_SUPER : RULE_HEAD} />
                      <TableBody>
                        {grouped[s].map((r) => (
                          <TableRow key={r.id} hover>
                            <TableCell>
                              <Box component="span" sx={{ fontWeight: 600 }}>
                                {r.targetName}
                              </Box>
                              <Box
                                component="span"
                                sx={{ ml: 1, color: 'text.secondary', typography: 'caption' }}
                              >
                                {r.targetType}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {r.ratePercent}%
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.active ? 'success' : 'muted'}>
                                {r.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell sx={{ typography: 'caption' }}>
                              {formatDate(r.effectiveFrom)}
                            </TableCell>
                            <TableCell sx={{ typography: 'caption' }}>
                              {r.effectiveTo ? formatDate(r.effectiveTo) : 'open-ended'}
                            </TableCell>
                            <TableCell
                              sx={{
                                maxWidth: 320,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: 'text.secondary',
                                typography: 'caption',
                              }}
                            >
                              {r.notes ?? '—'}
                            </TableCell>
                            {isSuper && (
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditing(r);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <CommissionRateDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
      />
    </Stack>
  );
};

const ResolveTool = () => {
  const [sellerId, setSellerId] = useState('');
  const [productId, setProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const result = useResolveCommission({ sellerId, productId, categoryId });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4" />
          Resolver
        </CardTitle>
        <CardDescription>
          Probe which rule applies for a seller × product × category triple. Useful before
          rolling out a new override.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          <div className="space-y-1.5">
            <Label>Seller</Label>
            <UserPicker
              role={UserRole.SELLER}
              value={sellerId || null}
              onChange={(id) => setSellerId(id ?? '')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Product</Label>
            <ProductPicker
              status="LIVE"
              value={productId || null}
              onChange={(id) => setProductId(id ?? '')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <CategoryPicker
              value={categoryId || null}
              onChange={(id) => setCategoryId(id ?? '')}
            />
          </div>
        </Box>
        {result.data && (
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {result.data.ratePercent}%
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              Matched rule: <Badge variant="muted">{SOURCE_LABEL[result.data.source]}</Badge>
            </Typography>
          </div>
        )}
        {result.isError && (
          <p className="text-sm text-destructive">
            {result.error instanceof Error ? result.error.message : 'Lookup failed'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
