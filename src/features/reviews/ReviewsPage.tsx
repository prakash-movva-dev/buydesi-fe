import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
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
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { ApiError, UserRole } from '@/types/api';
import { useDeleteReview, useModerateReview, useReviewsList } from './api';
import type { ReviewStatus, ReviewTargetType, ReviewsListQuery } from './types';

const STATUS_OPTIONS: Array<{ value: '' | ReviewStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'hidden', label: 'Hidden' },
];

const TARGET_OPTIONS: Array<{ value: '' | ReviewTargetType; label: string }> = [
  { value: '', label: 'Any target' },
  { value: 'product', label: 'Product reviews' },
  { value: 'seller', label: 'Seller reviews' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '1', label: '1 star' },
  { value: '2', label: '2 stars' },
  { value: '3', label: '3 stars' },
  { value: '4', label: '4 stars' },
  { value: '5', label: '5 stars' },
];

const statusVariant: Record<ReviewStatus, 'warning' | 'success' | 'muted'> = {
  pending: 'warning',
  approved: 'success',
  hidden: 'muted',
};

const PAGE_SIZE = 25;

export const ReviewsPage = () => {
  const { user } = useAuth();
  const isCategoryAdmin = user?.role === UserRole.CATEGORY_ADMIN;
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as ReviewStatus | null) ?? '';
  const targetType = (searchParams.get('targetType') as ReviewTargetType | null) ?? '';
  const rating = searchParams.get('rating') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const urlCategoryId = searchParams.get('categoryId') ?? '';

  // For a category-scoped admin, the backend will already filter by their own
  // branch. We still forward categoryId from the URL so super admins can use
  // deep links from the Category dashboard, and we don't fight the backend by
  // sending the admin's own category — it would be redundant.
  const categoryId = isCategoryAdmin ? undefined : urlCategoryId || undefined;

  const query = useMemo<ReviewsListQuery>(() => {
    const r = rating ? Number(rating) : undefined;
    return {
      status: status || undefined,
      targetType: targetType || undefined,
      categoryId,
      minRating: r,
      maxRating: r,
      page,
      limit: PAGE_SIZE,
    };
  }, [status, targetType, rating, page, categoryId]);

  // Default the pending queue when a category admin lands on the page, since
  // their primary job is approving new reviews in their branch.
  useEffect(() => {
    if (isCategoryAdmin && !searchParams.has('status')) {
      const params = new URLSearchParams(searchParams);
      params.set('status', 'pending');
      setSearchParams(params, { replace: true });
    }
  }, [isCategoryAdmin, searchParams, setSearchParams]);

  const { data, isLoading, isError, error } = useReviewsList(query);
  const moderate = useModerateReview();
  const remove = useDeleteReview();
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

  const [moderating, setModerating] = useState<{
    id: string;
    action: 'approve' | 'hide';
  } | null>(null);

  const onDelete = (id: string) => {
    if (!window.confirm('Permanently delete this review? Cannot be undone.')) return;
    remove.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews moderation</h1>
        <p className="text-muted-foreground">
          Buyer reviews on products and sellers. Hide inappropriate content or permanently
          remove spam. Pending reviews are auto-approved by default — flagged ones land in
          pending status for review.
        </p>
      </div>

      <ScopedAdminBanner />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-48"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={targetType}
          onChange={(e) => setParam({ targetType: e.target.value })}
          className="w-44"
        >
          {TARGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          value={rating}
          onChange={(e) => setParam({ rating: e.target.value })}
          className="w-36"
        >
          {RATING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load reviews'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Text</TableHead>
                <TableHead>Rater</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((r) => {
                const id = r.id ?? r._id;
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="muted">{r.targetType}</Badge>
                      <div className="mt-0.5 font-mono">{r.targetId.slice(-10)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-xs" title={r.text ?? ''}>
                      {r.text ?? <span className="text-muted-foreground">— rating only —</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.raterId.slice(-8)}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      {r.status !== 'approved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setModerating({ id, action: 'approve' })}
                          title="Approve"
                          disabled={moderate.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {r.status !== 'hidden' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setModerating({ id, action: 'hide' })}
                          title="Hide"
                          disabled={moderate.isPending}
                        >
                          <EyeOff className="h-4 w-4 text-amber-700" />
                        </Button>
                      )}
                      {r.status === 'hidden' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setModerating({ id, action: 'approve' })}
                          title="Restore"
                          disabled={moderate.isPending}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(id)}
                        title="Delete permanently"
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No reviews match the current filter.
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
            </div>
          </div>
        </>
      )}

      <ModerateDialog
        open={moderating !== null}
        action={moderating?.action ?? null}
        onClose={() => setModerating(null)}
        onSubmit={async (notes) => {
          if (!moderating) return;
          await moderate.mutateAsync({
            id: moderating.id,
            status: moderating.action === 'approve' ? 'approved' : 'hidden',
            notes,
          });
        }}
      />
    </div>
  );
};

interface ModerateDialogProps {
  open: boolean;
  action: 'approve' | 'hide' | null;
  onClose: () => void;
  onSubmit: (notes: string | undefined) => Promise<unknown>;
}

const ModerateDialog = ({ open, action, onClose, onSubmit }: ModerateDialogProps) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!action) return null;

  const submit = async () => {
    if (action === 'hide' && !notes.trim()) {
      setError('Reason is required when hiding a review.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(notes.trim() || undefined);
      setNotes('');
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
      title={action === 'approve' ? 'Approve / restore review' : 'Hide review'}
      description={
        action === 'approve'
          ? 'The review will be visible to buyers.'
          : 'The review will be hidden from buyers but remains in the database. Reason is recorded on the audit log.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={action === 'hide' ? 'destructive' : 'primary'}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Working…' : action === 'approve' ? 'Approve' : 'Hide'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="rv-notes">
          Notes {action === 'hide' ? <span className="text-destructive">*</span> : '(optional)'}
        </Label>
        <Textarea
          id="rv-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
