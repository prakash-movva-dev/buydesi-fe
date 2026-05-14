import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Save, Sparkles, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
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
import { Textarea } from '@/components/ui/Textarea';
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
import type { TradeListingStatus } from './types';

export const TradeSettingsPage = () => {
  const { user } = useAuth();
  const isSuper = user?.role === UserRole.SUPER_ADMIN;

  const { data: config, isLoading, isError, error } = useTradeConfig();
  const setMut = useSetTradeConfig();

  const [commission, setCommission] = useState('');
  const [platformFee, setPlatformFee] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (config) {
      setCommission(String(config.interClusterCommissionPercent));
      setPlatformFee(String(config.platformFeeInr));
    }
  }, [config]);

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
    try {
      await setMut.mutateAsync({ interClusterCommissionPercent: c, platformFeeInr: p });
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trade settings</h1>
        <p className="text-muted-foreground">
          Configuration for the inter-cluster B2B marketplace (Buy Desi Trade). These values
          apply globally to every trade order placed across clusters.
        </p>
      </div>

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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="t-comm">Inter-cluster commission %</Label>
                <Input
                  id="t-comm"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  disabled={!isSuper}
                />
                <p className="text-xs text-muted-foreground">
                  Currently {config.interClusterCommissionPercent}%
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-fee">Platform fee (₹) per order</Label>
                <Input
                  id="t-fee"
                  type="number"
                  min={0}
                  step="1"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                  disabled={!isSuper}
                />
                <p className="text-xs text-muted-foreground">
                  Currently {formatInr(config.platformFeeInr)}
                </p>
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

      <ListingReviewPanel />
    </div>
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
    user?.role === UserRole.REGIONAL_ADMIN;

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
  const pageCount = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade listing review</CardTitle>
        <CardDescription>
          B2B inter-cluster listings submitted by sellers. Approve to make them visible to
          buyers in other clusters; reject to send back with notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | TradeListingStatus);
              setPage(1);
            }}
            className="w-48"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load listings'}
          </p>
        )}

        {!isLoading && !isError && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Unit ₹</TableHead>
                  <TableHead className="text-right">Avail / Total</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((l) => (
                  <TableRow key={l.id ?? l._id}>
                    <TableCell className="font-medium">
                      {l.name}
                      <div className="text-xs text-muted-foreground">
                        {l.unit} · {l.weightGramsPerUnit}g
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[l.status]}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.sellerId.slice(-8)}
                    </TableCell>
                    <TableCell className="text-right">{formatInr(l.unitPriceInr)}</TableCell>
                    <TableCell className="text-right">
                      {l.availableUnits} / {l.totalUnits}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(l.createdAt)}</TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      {l.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setReviewing({ id: l.id ?? l._id, action: 'approve' })
                            }
                            title="Approve"
                            disabled={approve.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setReviewing({ id: l.id ?? l._id, action: 'reject' })
                            }
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
                {(data?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      No listings match the current filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data?.items.length ?? 0} of {total} · page {page} / {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
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
      <div className="space-y-2">
        <Label htmlFor="tr-notes">
          Notes {action === 'reject' ? <span className="text-destructive">*</span> : '(optional)'}
        </Label>
        <Textarea id="tr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
