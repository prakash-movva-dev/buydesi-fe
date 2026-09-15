import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

import { ApiError } from '@/types/api';
import { useCreateTicketOnBehalf } from '@/features/support/api';
import { useSetReviewHandled } from '@/features/reviews/api';
import type { Review } from '@/features/reviews/types';

// ----------------------------------------------------------------------

const buildSubject = (review: Review) =>
  `Quality issue: ${review.targetName ?? 'product'}`;

const buildDescription = (review: Review) =>
  [
    `${review.raterName ?? 'A buyer'} left a ${review.rating}-star review on ${
      review.targetName ?? 'this product'
    }.`,
    review.orderNumber ? `Order: ${review.orderNumber}.` : null,
    review.text ? `\nReview: "${review.text}"` : null,
  ]
    .filter(Boolean)
    .join('\n');

type Props = {
  review: Review | null;
  onClose: () => void;
};

/**
 * Turns a flagged review into a product-quality ticket.
 *
 * On success the review is marked as dealt with and stamped with the new
 * ticket id, so the queue drains and the row can link to the work that came
 * out of it — the two records stay tied together rather than drifting apart.
 */
export function QualityTicketDialog({ review, onClose }: Props) {
  const create = useCreateTicketOnBehalf();
  const setHandled = useSetReviewHandled();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [markHandled, setMarkHandled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; number: string } | null>(null);

  const reviewId = review ? (review.id ?? review._id) : null;

  // Each review that opens the dialog starts from its own draft.
  useEffect(() => {
    if (!review) return;
    setSubject(buildSubject(review));
    setDescription(buildDescription(review));
    setMarkHandled(true);
    setError(null);
    setCreated(null);
  }, [reviewId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!review || !reviewId) return;
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are both needed.');
      return;
    }
    setError(null);
    try {
      const ticket = await create.mutateAsync({
        // The complaint is the buyer's, so the ticket is filed under them —
        // they can follow it, and support sees who they are answering.
        raisedBy: review.raterId,
        category: 'product_quality',
        subject: subject.trim(),
        description: description.trim(),
        orderId: review.orderId || undefined,
      });
      if (markHandled) {
        await setHandled.mutateAsync({
          id: reviewId,
          handled: true,
          ticketId: ticket.id,
          notes: `Raised ticket ${ticket.ticketNumber}`,
        });
      }
      setCreated({ id: ticket.id, number: ticket.ticketNumber });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the ticket');
    }
  };

  const busy = create.isPending || setHandled.isPending;

  return (
    <Dialog fullWidth maxWidth="sm" open={Boolean(review)} onClose={busy ? undefined : onClose}>
      <DialogTitle sx={{ pb: 2 }}>
        {created ? 'Ticket raised' : 'Raise a quality ticket'}
      </DialogTitle>

      <DialogContent sx={{ typography: 'body2' }}>
        {created ? (
          <Stack spacing={2} alignItems="flex-start" sx={{ pt: 1 }}>
            <Alert severity="success" sx={{ width: 1 }}>
              Ticket <strong>{created.number}</strong> is open with the support team
              {markHandled ? ', and this review has left the queue.' : '.'}
            </Alert>
            <Link
              component={RouterLink}
              to={`/admin/support/${created.id}`}
              onClick={onClose}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              Open the ticket
              <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
            </Link>
          </Stack>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {review && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: 'background.neutral',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="subtitle2">{review.targetName ?? '—'}</Typography>
                  <Rating value={review.rating} readOnly size="small" />
                  {review.orderNumber && (
                    <Label variant="soft">Order {review.orderNumber}</Label>
                  )}
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Reviewed by {review.raterName ?? 'Anonymous'}
                </Typography>
              </Box>
            )}

            <TextField
              fullWidth
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <TextField
              fullWidth
              multiline
              minRows={5}
              label="What support needs to know"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={markHandled}
                  onChange={(e) => setMarkHandled(e.target.checked)}
                />
              }
              label="Take this review out of the queue once the ticket exists"
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {created ? (
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button color="inherit" variant="outlined" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <LoadingButton variant="contained" loading={busy} onClick={submit}>
              Create ticket
            </LoadingButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
