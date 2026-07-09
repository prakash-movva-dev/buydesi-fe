import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldAlert, Star, TicketPlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
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
import { useCreateTicket } from '@/features/support/api';
import type { Review } from '@/features/reviews/types';
import { useReviewsList } from '@/features/reviews/api';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/types/api';

const PAGE_SIZE = 25;

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
        }`}
      />
    ))}
  </div>
);

export const QualityMonitorPage = () => {
  // Only reviews rated 2 stars or below — the backend admin list returns
  // newest-first, so no client sort is needed.
  const query = useMemo(
    () => ({ maxRating: 2 as const, page: 1, limit: PAGE_SIZE }),
    [],
  );
  const { data, isLoading, isError, error } = useReviewsList(query);

  const [ticketFor, setTicketFor] = useState<Review | null>(null);

  const reviews = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          Quality Monitor
        </h1>
        <p className="text-muted-foreground">
          Recent low-rated reviews (2 stars or below) on products and sellers. Raise a
          product-quality support ticket directly from a flagged review.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Low ratings</h2>

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product / seller</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r) => {
                const id = r.id ?? r._id;
                return (
                  <TableRow key={id}>
                    <TableCell className="text-xs">
                      <Badge variant="muted">{r.targetType}</Badge>
                      <div className="mt-0.5 font-medium">
                        {r.targetName ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {r.raterName ?? 'Anonymous'}
                    </TableCell>
                    <TableCell>
                      <StarRating rating={r.rating} />
                    </TableCell>
                    <TableCell
                      className="max-w-md truncate text-xs"
                      title={r.text ?? ''}
                    >
                      {r.text ?? (
                        <span className="text-muted-foreground">— rating only —</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.orderNumber ? (
                        <span className="font-mono">{r.orderNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTicketFor(r)}
                      >
                        <TicketPlus className="h-4 w-4" />
                        Create ticket
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {reviews.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No low-rated reviews. Quality is looking good.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>

      <CreateTicketDialog
        review={ticketFor}
        onClose={() => setTicketFor(null)}
      />
    </div>
  );
};

interface CreateTicketDialogProps {
  review: Review | null;
  onClose: () => void;
}

const CreateTicketDialog = ({ review, onClose }: CreateTicketDialogProps) => {
  const create = useCreateTicket();

  const targetName = review?.targetName ?? 'product';
  const defaultSubject = review ? `Quality issue: ${targetName}` : '';
  const defaultDescription = review
    ? [
        `${review.raterName ?? 'A buyer'} left a ${review.rating}-star review on ${targetName}.`,
        review.orderNumber ? `Order: ${review.orderNumber}.` : null,
        review.text ? `\nReview: "${review.text}"` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const [subject, setSubject] = useState(defaultSubject);
  const [description, setDescription] = useState(defaultDescription);
  const [error, setError] = useState<string | null>(null);
  // The id of the ticket created in this dialog session, used for the
  // confirmation link.
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  // Track which review the form was last initialised for so we reset fields
  // when a different row opens the dialog.
  const [initialisedFor, setInitialisedFor] = useState<string | null>(null);

  const reviewKey = review ? review.id ?? review._id : null;
  if (review && reviewKey !== initialisedFor) {
    setInitialisedFor(reviewKey);
    setSubject(defaultSubject);
    setDescription(defaultDescription);
    setError(null);
    setCreatedTicketId(null);
  }

  if (!review) return null;

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }
    setError(null);
    try {
      const ticket = await create.mutateAsync({
        category: 'product_quality',
        subject: subject.trim(),
        description: description.trim(),
        orderId: review.orderId || undefined,
      });
      setCreatedTicketId(ticket.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create ticket');
    }
  };

  return (
    <Dialog
      open={review !== null}
      onClose={onClose}
      title="Create quality ticket"
      description={
        createdTicketId
          ? undefined
          : 'Raises a product-quality support ticket linked to this review.'
      }
      footer={
        createdTicketId ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create ticket'}
            </Button>
          </>
        )
      }
    >
      {createdTicketId ? (
        <div className="space-y-3 text-sm">
          <p className="text-emerald-600">Ticket created successfully.</p>
          <Link
            to={`/admin/support/${createdTicketId}`}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            onClick={onClose}
          >
            View ticket
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qm-subject">Subject</Label>
            <Textarea
              id="qm-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qm-description">Description</Label>
            <Textarea
              id="qm-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="muted">category: product_quality</Badge>
            {review.raterName && (
              <Badge variant="muted">reviewer: {review.raterName}</Badge>
            )}
            {review.orderNumber && (
              <Badge variant="muted">
                order: <span className="font-mono">{review.orderNumber}</span>
              </Badge>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </Dialog>
  );
};
