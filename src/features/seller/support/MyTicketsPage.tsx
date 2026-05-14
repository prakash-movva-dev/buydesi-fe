import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
import { useTicketsList, ticketKeys } from '@/features/support/api';
import {
  TicketCategoryBadge,
  TicketStatusBadge,
} from '@/features/support/status-badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ApiError } from '@/types/api';
import type {
  SupportCategory,
  SupportStatus,
  SupportTicket,
  TicketsListQuery,
} from '@/features/support/types';

const STATUS_OPTIONS: Array<{ value: '' | SupportStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const CATEGORY_OPTIONS: Array<{ value: SupportCategory; label: string }> = [
  { value: 'return', label: 'Return' },
  { value: 'refund', label: 'Refund' },
  { value: 'grievance', label: 'Grievance' },
  { value: 'product_quality', label: 'Product quality' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' },
];

export const MyTicketsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as SupportStatus | null) ?? '';

  const query = useMemo<TicketsListQuery>(
    () => ({ status: status || undefined, page: 1, limit: 50 }),
    [status],
  );
  const { data, isLoading } = useTicketsList(query);

  const setParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    setSearchParams(params);
  };

  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My support tickets</h1>
          <p className="text-muted-foreground">
            Raise issues — payouts, returns, account problems — and track resolution.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New ticket
        </Button>
      </div>

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

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Raised</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => navigate(`/seller/support/${t.id}`)}
              >
                <TableCell className="font-medium">
                  {t.ticketNumber}
                  <div className="text-xs text-muted-foreground line-clamp-1">{t.subject}</div>
                </TableCell>
                <TableCell>
                  <TicketStatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  <TicketCategoryBadge category={t.category} />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {t.orderId ? t.orderId.slice(-8) : '—'}
                </TableCell>
                <TableCell className="text-xs">{formatDate(t.createdAt)}</TableCell>
              </TableRow>
            ))}
            {(data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No tickets yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <NewTicketDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

const NewTicketDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (input: {
      category: SupportCategory;
      subject: string;
      description: string;
      orderId?: string;
    }) => api.post<SupportTicket>('/support/tickets', { ...input, attachments: [] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  });
  const [category, setCategory] = useState<SupportCategory>('other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory('other');
      setSubject('');
      setDescription('');
      setOrderId('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    if (subject.trim().length < 2) {
      setError('Subject is required.');
      return;
    }
    if (description.trim().length < 2) {
      setError('Description is required.');
      return;
    }
    try {
      await create.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
        orderId: orderId.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New support ticket"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Submitting…' : 'Submit'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tk-cat">Category *</Label>
            <Select
              id="tk-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tk-order">Linked order id (optional)</Label>
            <Input id="tk-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tk-subj">Subject *</Label>
          <Input
            id="tk-subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tk-desc">Description *</Label>
          <Textarea
            id="tk-desc"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};

// Inline use to silence unused-import in some builds
void Badge;
