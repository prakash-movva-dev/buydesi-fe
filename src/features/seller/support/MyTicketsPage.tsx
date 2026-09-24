import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import LoadingButton from '@mui/lab/LoadingButton';

import { varAlpha } from '@/theme/styles';
import { ApiError } from '@/types/api';
import { useDebounce } from '@/hooks/use-debounce';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';
import { TableHeadCustom, TablePaginationCustom } from '@/components/table';

import { fDate, fTime } from '@/utils/format-time';

import {
  useAppendTicketAttachment,
  useCreateTicket,
  useTicketAttachmentUploadUrl,
  useTicketsList,
} from '@/features/support/api';
import { TicketCategoryBadge, TicketStatusBadge } from '@/features/support/status-badge';
import {
  TicketAttachmentPicker,
  iconForFile,
  uploadPendingFiles,
  type PendingFile,
} from '@/features/support/TicketAttachmentUpload';
import type {
  SupportCategory,
  SupportStatus,
  TicketsListQuery,
} from '@/features/support/types';

// ----------------------------------------------------------------------

type TicketView = 'open' | 'resolved' | 'all';

const TAB_OPTIONS: Array<{
  value: TicketView;
  label: string;
  color: 'warning' | 'success' | 'info';
}> = [
  { value: 'open', label: 'Still open', color: 'warning' },
  { value: 'resolved', label: 'Resolved', color: 'success' },
  { value: 'all', label: 'Everything', color: 'info' },
];

/** Each tab is the same list query with a status pinned. */
const sliceFor = (view: TicketView): Partial<TicketsListQuery> => {
  switch (view) {
    case 'open':
      return { status: 'OPEN' };
    case 'resolved':
      return { status: 'RESOLVED' };
    default:
      return {};
  }
};

const CATEGORY_OPTIONS: Array<{ value: SupportCategory; label: string; help: string }> = [
  { value: 'return', label: 'A return', help: 'A buyer wants to send something back.' },
  { value: 'refund', label: 'A refund', help: 'Money needs to go back to a buyer.' },
  {
    value: 'product_quality',
    label: 'Product quality',
    help: 'Something arrived damaged, stale or not as described.',
  },
  { value: 'delivery', label: 'Delivery', help: 'A shipment is late, lost or stuck.' },
  {
    value: 'grievance',
    label: 'A complaint',
    help: 'Something went wrong that needs a person to look at it.',
  },
  { value: 'other', label: 'Something else', help: 'Payouts, your account, anything else.' },
];

const STATUS_FILTER_OPTIONS: Array<{ value: '' | SupportStatus; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'Being looked at' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const TABLE_HEAD = [
  { id: 'ticket', label: 'Ticket' },
  { id: 'category', label: 'About', width: 150 },
  { id: 'files', label: 'Files', width: 90, align: 'center' as const },
  { id: 'order', label: 'Order', width: 130 },
  { id: 'raised', label: 'Raised', width: 140 },
  { id: 'status', label: 'Status', width: 140 },
];

const DEFAULT_LIMIT = 25;

const EMPTY_FOR: Record<TicketView, { title: string; description: string }> = {
  open: {
    title: 'Nothing open',
    description: 'No ticket of yours is waiting on support. Raise one if something needs looking at.',
  },
  resolved: {
    title: 'Nothing resolved yet',
    description: 'Tickets appear here once support has closed them out.',
  },
  all: {
    title: 'No tickets yet',
    description:
      'Raise one when something needs a person — a payout that has not arrived, a return, a delivery gone wrong.',
  },
};

// ----------------------------------------------------------------------

export const MyTicketsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const view = (searchParams.get('view') as TicketView | null) ?? 'open';
  const status = (searchParams.get('status') as SupportStatus | null) ?? '';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT));

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      if (!('page' in next)) params.delete('page');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search, 400);
  useEffect(() => {
    if (debounced !== q) setParams({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  useEffect(() => {
    if (q !== search) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const common = useMemo(
    () => ({ q: q || undefined }),
    [q],
  );

  const query = useMemo<TicketsListQuery>(
    () => ({
      ...common,
      // An explicit status filter beats the tab's own slice.
      ...(status ? { status } : sliceFor(view)),
      page,
      limit,
    }),
    [common, status, view, page, limit],
  );

  const { data, isLoading, isFetching, isError, error } = useTicketsList(query);

  const openCount = useTicketsList({ ...common, ...sliceFor('open'), page: 1, limit: 1 });
  const resolvedCount = useTicketsList({ ...common, ...sliceFor('resolved'), page: 1, limit: 1 });
  const allCount = useTicketsList({ ...common, page: 1, limit: 1 });

  const countFor = (v: TicketView) =>
    ({ open: openCount, resolved: resolvedCount, all: allCount })[v].data?.meta.total ?? 0;

  const [formOpen, setFormOpen] = useState(false);

  const rows = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const canReset = Boolean(q || status);
  const notFound = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Support"
        description="Raise anything that needs a person — a payout that has not landed, a return, a delivery gone wrong — and follow it until it is answered."
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setFormOpen(true)}
          >
            Raise a ticket
          </Button>
        }
      />

      {isError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load your tickets'}
        </Alert>
      )}

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={view}
          onChange={(_e, value) => setParams({ view: value, status: null })}
          sx={{
            px: 2.5,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {TAB_OPTIONS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              iconPosition="end"
              icon={
                <Label variant={view === tab.value ? 'filled' : 'soft'} color={tab.color}>
                  {countFor(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Stack
          spacing={2}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <TextField
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket number or subject…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setParams({ status: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: 1, md: 200 }, flexShrink: 0 }}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {canReset && (
          <FiltersResult
            totalResults={total}
            onReset={() => setParams({ q: null, status: null })}
            sx={{ px: 2.5, pb: 2.5 }}
          >
            <FiltersBlock label="Search:" isShow={!!q}>
              <Chip {...chipProps} label={q} onDelete={() => setParams({ q: null })} />
            </FiltersBlock>
            <FiltersBlock label="Status:" isShow={!!status}>
              <Chip
                {...chipProps}
                label={STATUS_FILTER_OPTIONS.find((o) => o.value === status)?.label ?? status}
                onDelete={() => setParams({ status: null })}
              />
            </FiltersBlock>
          </FiltersResult>
        )}

        <Box sx={{ position: 'relative' }}>
          {isFetching && !isLoading && (
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} />
          )}

          {notFound && !isError ? (
            <EmptyContent
              filled
              title={EMPTY_FOR[view].title}
              description={EMPTY_FOR[view].description}
              sx={{ py: 10 }}
            />
          ) : (
            <Scrollbar>
              <Table sx={{ minWidth: 880 }}>
                <TableHeadCustom headLabel={TABLE_HEAD} />

                <TableBody>
                  {rows.map((t) => (
                    <TableRow
                      key={t.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/seller/support/${t.id}`)}
                    >
                      <TableCell>
                        <ListItemText
                          primary={t.subject}
                          secondary={t.ticketNumber}
                          primaryTypographyProps={{ typography: 'subtitle2', noWrap: true }}
                          secondaryTypographyProps={{
                            mt: 0.25,
                            component: 'span',
                            typography: 'caption',
                            sx: { fontFamily: 'monospace' },
                          }}
                          sx={{ maxWidth: 380 }}
                        />
                      </TableCell>

                      <TableCell>
                        <TicketCategoryBadge category={t.category} />
                      </TableCell>

                      <TableCell align="center">
                        {t.attachments.length > 0 ? (
                          <Tooltip
                            title={`${t.attachments.length} file${t.attachments.length === 1 ? '' : 's'} attached`}
                            placement="top"
                            arrow
                          >
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                              justifyContent="center"
                              sx={{ color: 'text.secondary' }}
                            >
                              <Iconify
                                width={16}
                                icon={iconForFile(t.attachments[0])}
                              />
                              <Box component="span" sx={{ typography: 'caption' }}>
                                {t.attachments.length}
                              </Box>
                            </Stack>
                          </Tooltip>
                        ) : (
                          <Box component="span" sx={{ color: 'text.disabled' }}>
                            —
                          </Box>
                        )}
                      </TableCell>

                      <TableCell
                        sx={{ fontFamily: 'monospace', typography: 'caption', color: 'text.secondary' }}
                      >
                        {t.orderId ? t.orderId.slice(-8) : '—'}
                      </TableCell>

                      <TableCell>
                        <ListItemText
                          primary={fDate(t.createdAt)}
                          secondary={fTime(t.createdAt)}
                          primaryTypographyProps={{ typography: 'body2', noWrap: true }}
                          secondaryTypographyProps={{
                            mt: 0.5,
                            component: 'span',
                            typography: 'caption',
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <TicketStatusBadge status={t.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
          )}
        </Box>

        <TablePaginationCustom
          count={total}
          page={page - 1}
          rowsPerPage={limit}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_e, next) => setParams({ page: String(next + 1) })}
          onRowsPerPageChange={(e) => setParams({ limit: e.target.value })}
        />
      </Card>

      <NewTicketDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onRaised={(id) => navigate(`/seller/support/${id}`)}
      />
    </>
  );
};

// ----------------------------------------------------------------------

type DialogProps = {
  open: boolean;
  onClose: () => void;
  onRaised: (ticketId: string) => void;
};

function NewTicketDialog({ open, onClose, onRaised }: DialogProps) {
  const create = useCreateTicket();
  const presign = useTicketAttachmentUploadUrl();
  const append = useAppendTicketAttachment();

  const [category, setCategory] = useState<SupportCategory>('other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'creating' | 'uploading'>('idle');

  useEffect(() => {
    if (!open) return;
    setCategory('other');
    setSubject('');
    setDescription('');
    setOrderId('');
    setFiles([]);
    setError(null);
    setStage('idle');
  }, [open]);

  const busy = stage !== 'idle';

  const submit = async () => {
    setError(null);
    if (subject.trim().length < 2) {
      setError('Give it a short subject so support knows what it is about.');
      return;
    }
    if (description.trim().length < 2) {
      setError('Describe what happened — the more detail, the faster it gets answered.');
      return;
    }

    setStage('creating');
    let ticketId: string;
    try {
      const ticket = await create.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
        orderId: orderId.trim() || undefined,
      });
      ticketId = ticket.id;
    } catch (err) {
      setStage('idle');
      setError(err instanceof ApiError ? err.message : 'Could not raise the ticket');
      return;
    }

    // The ticket exists from here on. An upload that fails must not read as a
    // failed ticket — it is one file to retry, not a lost report.
    if (files.length > 0) {
      setStage('uploading');
      const { failed } = await uploadPendingFiles(
        ticketId,
        files,
        presign.mutateAsync,
        append.mutateAsync,
      );
      if (failed.length) {
        toast.error(
          `Ticket raised, but ${failed.join(', ')} did not attach. Add ${failed.length === 1 ? 'it' : 'them'} from the ticket.`,
        );
      } else {
        toast.success(`Ticket raised with ${files.length} file${files.length === 1 ? '' : 's'}`);
      }
    } else {
      toast.success('Ticket raised');
    }

    setStage('idle');
    onClose();
    onRaised(ticketId);
  };

  const chosen = CATEGORY_OPTIONS.find((c) => c.value === category);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify width={24} icon="solar:chat-round-dots-bold" sx={{ color: 'primary.main' }} />
          Raise a ticket
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
            Support sees everything you write here, along with anything you attach.
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            select
            fullWidth
            required
            label="What is it about?"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            InputLabelProps={{ shrink: true }}
            helperText={chosen?.help}
            disabled={busy}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            required
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Payout for September has not arrived"
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 200 }}
            disabled={busy}
          />

          <TextField
            fullWidth
            required
            multiline
            minRows={5}
            label="What happened?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dates, order numbers, what you expected and what happened instead."
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 5000 }}
            helperText={`${description.length}/5000`}
            disabled={busy}
          />

          <TextField
            fullWidth
            label="Order id"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Optional — paste it from the order if this is about one."
            disabled={busy}
          />

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Box>
            <Box sx={{ mb: 1.5, typography: 'subtitle2' }}>Attach anything that helps</Box>
            <TicketAttachmentPicker pending={files} onChange={setFiles} disabled={busy} />
          </Box>

          {stage === 'uploading' && (
            <Alert severity="info" icon={<Iconify icon="solar:cloud-upload-bold" />}>
              Ticket raised — sending your files now.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={busy} onClick={submit}>
          {files.length > 0 ? `Raise with ${files.length} file${files.length === 1 ? '' : 's'}` : 'Raise ticket'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
