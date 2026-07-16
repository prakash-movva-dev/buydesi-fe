import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatInr } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import {
  useApproveTradeListing,
  useRejectTradeListing,
  useSetTradeConfig,
  useTradeConfig,
  useTradeListings,
} from './api';
import type { TradeCategoryOverride, TradeListingStatus } from './types';

const REVIEW_HEAD = [
  { id: 'listing', label: 'Listing' },
  { id: 'status', label: 'Status' },
  { id: 'seller', label: 'Seller' },
  { id: 'price', label: 'Unit ₹', align: 'right' as const },
  { id: 'avail', label: 'Avail / Total', align: 'right' as const },
  { id: 'submitted', label: 'Submitted' },
  { id: 'actions', label: '' },
];

// Local editor state: commissionPercent is a string while typing, and `key`
// gives each row a stable React identity independent of the chosen category.
interface OverrideRow {
  key: string;
  categoryId: string | null;
  commissionPercent: string;
}

const cryptoKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const TradeSettingsPage = () => {
  const { user } = useAuth();
  const isSuper = user?.role === UserRole.SUPER_ADMIN;

  const { data: config, isLoading, isError, error } = useTradeConfig();
  const setMut = useSetTradeConfig();

  const [tab, setTab] = useState<'settings' | 'review'>('settings');
  const [commission, setCommission] = useState('');
  const [platformFee, setPlatformFee] = useState('');
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (config) {
      setCommission(String(config.interClusterCommissionPercent));
      setPlatformFee(String(config.platformFeeInr));
      setOverrides(
        (config.categoryOverrides ?? []).map((o) => ({
          key: o.categoryId || cryptoKey(),
          categoryId: o.categoryId,
          commissionPercent: String(o.commissionPercent),
        })),
      );
    }
  }, [config]);

  const addOverride = () =>
    setOverrides((rows) => [
      ...rows,
      { key: cryptoKey(), categoryId: null, commissionPercent: '' },
    ]);

  const updateOverride = (key: string, patch: Partial<OverrideRow>) =>
    setOverrides((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeOverride = (key: string) =>
    setOverrides((rows) => rows.filter((r) => r.key !== key));

  const save = async () => {
    setSaveError(null);
    const c = Number(commission);
    const p = Number(platformFee);
    if (!Number.isFinite(c) || c < 0 || c > 100) {
      setSaveError('Commission must be between 0 and 100');
      return;
    }
    if (!Number.isFinite(p) || p < 0) {
      setSaveError('Platform fee must be ≥ 0');
      return;
    }

    const cleaned: TradeCategoryOverride[] = [];
    const seen = new Set<string>();
    for (const row of overrides) {
      if (!row.categoryId) {
        setSaveError('Every override needs a category selected');
        return;
      }
      if (seen.has(row.categoryId)) {
        setSaveError('Each category can only have one override');
        return;
      }
      const pct = Number(row.commissionPercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setSaveError('Override commission must be between 0 and 100');
        return;
      }
      seen.add(row.categoryId);
      cleaned.push({ categoryId: row.categoryId, commissionPercent: pct });
    }

    try {
      await setMut.mutateAsync({
        interClusterCommissionPercent: c,
        platformFeeInr: p,
        categoryOverrides: cleaned,
      });
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Trade settings"
        description="Configuration for the inter-cluster B2B marketplace (Buy Desi Trade). These values apply globally to every trade order placed across clusters."
      />

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="settings" label="Settings" />
        <Tab value="review" label="Listing review" />
      </Tabs>

      {tab === 'settings' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Inter-cluster commission & fee
          </CardTitle>
          <CardDescription>
            Buyer-cluster pays the commission %; the platform fee is added on top. Super admin
            edits these; everyone else sees them read-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-32 w-full" />}
          {isError && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load config'}
            </p>
          )}
          {config && (
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                fullWidth
                type="number"
                label="Inter-cluster commission %"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                disabled={!isSuper}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, max: 100, step: '0.1' }}
                helperText={`Currently ${config.interClusterCommissionPercent}%`}
              />
              <TextField
                fullWidth
                type="number"
                label="Platform fee (₹) per order"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                disabled={!isSuper}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, step: '1' }}
                helperText={`Currently ${formatInr(config.platformFeeInr)}`}
              />
            </Box>
          )}

          {config && (
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Per-category commission overrides</h3>
                  <p className="text-xs text-muted-foreground">
                    Override the global inter-cluster commission % for specific categories. The
                    global rate applies to any category not listed here.
                  </p>
                </div>
                {isSuper && (
                  <Button type="button" variant="outline" size="sm" onClick={addOverride}>
                    <Plus className="h-4 w-4" />
                    Add override
                  </Button>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {overrides.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No category overrides — every category uses the global rate above.
                  </p>
                )}
                {overrides.map((row) => (
                  <div key={row.key} className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[16rem] flex-1">
                      <CategoryPicker
                        value={row.categoryId}
                        onChange={(id) => updateOverride(row.key, { categoryId: id })}
                        disabled={!isSuper}
                        activeOnly={false}
                        placeholder="Pick a category…"
                      />
                    </div>
                    <TextField
                      type="number"
                      size="small"
                      value={row.commissionPercent}
                      onChange={(e) =>
                        updateOverride(row.key, { commissionPercent: e.target.value })
                      }
                      disabled={!isSuper}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: '0.1',
                        'aria-label': 'Override commission percent',
                      }}
                      InputProps={{ endAdornment: '%' }}
                      sx={{ width: 120 }}
                    />
                    {isSuper && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOverride(row.key)}
                        title="Remove override"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSuper && config && (
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={save} disabled={setMut.isPending}>
                <Save className="h-4 w-4" />
                {setMut.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              {savedAt && (
                <span className="text-sm text-emerald-700">
                  Saved {formatDateTime(savedAt)}
                </span>
              )}
              {saveError && (
                <span className="text-sm text-destructive">{saveError}</span>
              )}
            </div>
          )}
          {config?.updatedAt && (
            <p className="mt-4 text-xs text-muted-foreground">
              Last updated {formatDateTime(config.updatedAt)}
              {config.updatedBy && <> by {config.updatedBy.slice(-10)}</>}
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {tab === 'review' && <ListingReviewPanel />}
    </Stack>
  );
};

// Lists pending (and other-status) trade listings for cluster-admin review.
// Backed by GET /admin/trade/listings; per-row approve/reject + a notes dialog.
const STATUS_OPTIONS: Array<{ value: '' | TradeListingStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending review' },
  { value: '', label: 'All statuses' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
];

const statusVariant: Record<TradeListingStatus, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  PAUSED: 'muted',
  CLOSED: 'muted',
};

const PAGE_SIZE = 20;

const ListingReviewPanel = () => {
  const { user } = useAuth();
  const canReview =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;

  const [status, setStatus] = useState<'' | TradeListingStatus>('PENDING');
  const [page, setPage] = useState(1);
  const query = useMemo(
    () => ({ status: status || undefined, page, limit: PAGE_SIZE }),
    [status, page],
  );
  const { data, isLoading, isError, error } = useTradeListings(query);
  const approve = useApproveTradeListing();
  const reject = useRejectTradeListing();
  const [reviewing, setReviewing] = useState<{ id: string; action: 'approve' | 'reject' } | null>(
    null,
  );

  if (!canReview) return null;

  const total = data?.meta.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade listing review</CardTitle>
        <CardDescription>
          B2B inter-cluster listings submitted by sellers. Approve to make them visible to
          buyers in other clusters; reject to send back with notes.
        </CardDescription>
      </CardHeader>
      <Box>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" sx={{ p: 2.5 }}>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | TradeListingStatus);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isError && (
          <Box sx={{ px: 2.5, pb: 2, color: 'error.main', typography: 'body2' }}>
            {error instanceof Error ? error.message : 'Failed to load listings'}
          </Box>
        )}

        <Scrollbar>
          <Table sx={{ minWidth: 900 }}>
            <TableHeadCustom headLabel={REVIEW_HEAD} />
            <TableBody>
              {(data?.items ?? []).map((l) => (
                <TableRow key={l.id ?? l._id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {l.name}
                    <Box sx={{ color: 'text.secondary', typography: 'caption' }}>
                      {l.unit} · {l.weightGramsPerUnit}g
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[l.status]}>{l.status}</Badge>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                    {l.sellerId.slice(-8)}
                  </TableCell>
                  <TableCell align="right">{formatInr(l.unitPriceInr)}</TableCell>
                  <TableCell align="right">
                    {l.availableUnits} / {l.totalUnits}
                  </TableCell>
                  <TableCell sx={{ typography: 'caption' }}>{formatDateTime(l.createdAt)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {l.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReviewing({ id: l.id ?? l._id, action: 'approve' })}
                          title="Approve"
                          disabled={approve.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReviewing({ id: l.id ?? l._id, action: 'reject' })}
                          title="Reject"
                          disabled={reject.isPending}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
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
          rowsPerPageOptions={[PAGE_SIZE]}
          onPageChange={(_e, p) => setPage(p + 1)}
        />
      </Box>
      <TradeReviewDialog
        open={reviewing !== null}
        action={reviewing?.action ?? null}
        onClose={() => setReviewing(null)}
        onSubmit={async (notes) => {
          if (!reviewing) return;
          if (reviewing.action === 'approve') {
            await approve.mutateAsync({ id: reviewing.id, notes });
          } else {
            await reject.mutateAsync({ id: reviewing.id, notes });
          }
        }}
      />
    </Card>
  );
};

interface TradeReviewDialogProps {
  open: boolean;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
  onSubmit: (notes: string | undefined) => Promise<unknown>;
}

const TradeReviewDialog = ({ open, action, onClose, onSubmit }: TradeReviewDialogProps) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!action) return null;

  const submit = async () => {
    if (action === 'reject' && !notes.trim()) {
      setError('Notes are required when rejecting.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(notes.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={action === 'approve' ? 'Approve listing' : 'Reject listing'}
      description={
        action === 'approve'
          ? 'The listing goes live and is browsable by buyers in other clusters.'
          : 'The seller sees your reason and can resubmit.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'primary'}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Working…' : action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <TextField
          fullWidth
          label={action === 'reject' ? 'Notes' : 'Notes (optional)'}
          required={action === 'reject'}
          multiline
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Dialog>
  );
};
