import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
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

  const items = data?.items ?? [];

  const head = [
    { id: 'ticket', label: 'Ticket' },
    { id: 'status', label: 'Status' },
    { id: 'category', label: 'Category' },
    { id: 'order', label: 'Order' },
    { id: 'raised', label: 'Raised' },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My support tickets"
        description="Raise issues — payouts, returns, account problems — and track resolution."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New ticket
          </Button>
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
            sx={{ width: 200 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isLoading && <Skeleton className="mx-4 mb-4 h-40" />}

        {!isLoading && (
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={head} />
              <TableBody>
                {items.map((t) => (
                  <TableRow
                    key={t.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/seller/support/${t.id}`)}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t.ticketNumber}
                      <Box
                        sx={{
                          color: 'text.secondary',
                          typography: 'caption',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {t.subject}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      <TicketCategoryBadge category={t.category} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                      {t.orderId ? t.orderId.slice(-8) : '—'}
                    </TableCell>
                    <TableCell sx={{ typography: 'caption' }}>{formatDate(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!isLoading && items.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        )}
      </Card>

      <NewTicketDialog open={open} onClose={() => setOpen(false)} />
    </Stack>
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
