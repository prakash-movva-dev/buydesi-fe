import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { useAuth } from '@/lib/auth';
import { varAlpha } from '@/theme/styles';
import { formatInr } from '@/lib/format';
import { fDateTime } from '@/utils/format-time';
import { ADMIN_ROLES, ApiError, UserRole } from '@/types/api';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { LoadingScreen } from '@/components/loading-screen';

import { useOrder } from '@/features/orders/api';
import { useUser } from '@/features/users/api';
import { readBoolean, useExposedSettingMap } from '@/features/platform-settings/exposed';

import {
  useOverrideTicket,
  usePostTicketMessage,
  useScheduleReversePickup,
  useTicket,
} from './api';
import {
  ClaimDialog,
  EscalateDialog,
  ForceRefundDialog,
  ResolveDialog,
} from './TicketActionDialogs';
import {
  CATEGORY_LABEL,
  LEVEL_COLOR,
  LEVEL_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from './status-badge';
import type { SupportMessageChannel, SupportTicket, SupportTicketMessage } from './types';

// ----------------------------------------------------------------------

const REFUND_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
]);

/** How an SLA window is doing, as one label. */
const SlaPill = ({ dueAt, fulfilledAt }: { dueAt: string; fulfilledAt: string | null }) => {
  if (fulfilledAt) {
    return (
      <Label variant="soft" color="success">
        Met
      </Label>
    );
  }
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms < 0) {
    return (
      <Label variant="soft" color="error">
        Breached
      </Label>
    );
  }
  const hours = Math.round(ms / 3_600_000);
  return (
    <Label variant="soft" color={hours < 6 ? 'warning' : 'info'}>
      {hours}h left
    </Label>
  );
};

/** One label/value line. */
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Stack
    direction="row"
    spacing={2}
    sx={{ typography: 'body2', justifyContent: 'space-between', alignItems: 'baseline' }}
  >
    <Box component="span" sx={{ color: 'text.secondary', flexShrink: 0 }}>
      {label}
    </Box>
    <Box component="span" sx={{ textAlign: 'right', fontWeight: 'fontWeightMedium' }}>
      {value}
    </Box>
  </Stack>
);

// ----------------------------------------------------------------------

export const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useTicket(id);
  const reversePickup = useScheduleReversePickup();
  const override = useOverrideTicket();

  const isSuperTier =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;

  const [claimOpen, setClaimOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [ovrStatus, setOvrStatus] = useState('OPEN');
  const [ovrReason, setOvrReason] = useState('');
  const [ovrErr, setOvrErr] = useState<string | null>(null);

  // This page is mounted under /admin, /seller and /promoter. Going "back" has
  // to stay inside the caller's own section — sending a seller to /admin/support
  // lands them on a 403.
  const section = location.pathname.startsWith('/seller')
    ? '/seller'
    : location.pathname.startsWith('/promoter')
      ? '/promoter'
      : '/admin';
  const ticketsPath = `${section}/support`;

  if (isLoading) return <LoadingScreen sx={{ py: 20 }} />;

  if (isError || !data) {
    return (
      <>
        <PageHeader title="Ticket" />
        <EmptyContent
          filled
          title="Ticket not found"
          description={error instanceof Error ? error.message : 'It may have been removed.'}
          action={
            <Button
              variant="contained"
              onClick={() => navigate(ticketsPath)}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to tickets
            </Button>
          }
          sx={{ py: 10, mt: 3 }}
        />
      </>
    );
  }

  const ticket = data.ticket;
  const isStaff = user ? ADMIN_ROLES.has(user.role) : false;
  const isAssignedToMe = Boolean(user && ticket.assignedTo === user.id);
  const isActive = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
  const canRefund = Boolean(user && REFUND_ROLES.has(user.role));
  const canSchedulePickup = isActive && Boolean(ticket.orderId);

  const applyOverride = async () => {
    if (ovrReason.trim().length < 3) {
      setOvrErr('A reason is required.');
      return;
    }
    setOvrErr(null);
    try {
      await override.mutateAsync({
        id: ticket.id,
        status: ovrStatus,
        reason: ovrReason.trim(),
      });
      setOverrideOpen(false);
    } catch (err) {
      setOvrErr(err instanceof ApiError ? err.message : 'Override failed');
    }
  };

  return (
    <>
      <PageHeader
        title={ticket.ticketNumber}
        links={[
          { name: 'Dashboard', href: section },
          { name: 'Support', href: ticketsPath },
          { name: ticket.ticketNumber },
        ]}
        action={
          <Button
            variant="outlined"
            onClick={() => navigate(ticketsPath)}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back to tickets
          </Button>
        }
      />

      {/* Hero — what the ticket is, how it is doing, and what can be done. */}
      <Card
        sx={{
          mt: 3,
          p: 3,
          backgroundImage: (theme) =>
            `linear-gradient(135deg, ${varAlpha(
              theme.vars.palette.primary.lighterChannel,
              0.48,
            )}, ${varAlpha(theme.vars.palette.primary.lightChannel, 0.32)})`,
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'flex-start' }}
          >
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <Typography variant="h4">{ticket.subject}</Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Label variant="soft" color={STATUS_COLOR[ticket.status]}>
                  {STATUS_LABEL[ticket.status]}
                </Label>
                <Label variant="soft" color={LEVEL_COLOR[ticket.escalationLevel]}>
                  {LEVEL_LABEL[ticket.escalationLevel]}
                </Label>
                <Label variant="soft">{CATEGORY_LABEL[ticket.category] ?? ticket.category}</Label>
                {isAssignedToMe && (
                  <Label variant="soft" color="info">
                    Assigned to me
                  </Label>
                )}
                {data.sla.responseBreached && (
                  <Label variant="filled" color="error">
                    Response SLA breached
                  </Label>
                )}
                {data.sla.resolutionBreached && (
                  <Label variant="filled" color="error">
                    Resolution SLA breached
                  </Label>
                )}
              </Stack>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Raised {fDateTime(ticket.createdAt)} by a {ticket.raiserRole.toLowerCase()}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
              {/* An unclaimed ticket is nobody's job until someone takes it. */}
              {isStaff && isActive && !ticket.assignedTo && (
                <Button
                  variant="contained"
                  onClick={() => setClaimOpen(true)}
                  startIcon={<Iconify icon="solar:hand-shake-bold" />}
                >
                  Claim
                </Button>
              )}

              {isActive && ticket.assignedTo && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => setResolveOpen(true)}
                  startIcon={<Iconify icon="solar:check-circle-bold" />}
                >
                  Resolve
                </Button>
              )}

              {isStaff && isActive && ticket.escalationLevel !== 'super' && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => setEscalateOpen(true)}
                  startIcon={<Iconify icon="solar:arrow-up-bold" />}
                >
                  Escalate
                </Button>
              )}

              {canRefund && ticket.orderId && (
                <Button
                  variant="outlined"
                  onClick={() => setRefundOpen(true)}
                  startIcon={<Iconify icon="solar:wallet-money-bold" />}
                >
                  Force refund
                </Button>
              )}

              {canSchedulePickup && (
                <LoadingButton
                  variant="outlined"
                  loading={reversePickup.isPending}
                  onClick={() => reversePickup.mutate({ id: ticket.id })}
                  startIcon={<Iconify icon="solar:delivery-bold" />}
                >
                  Reverse pickup
                </LoadingButton>
              )}

              {isSuperTier && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setOvrStatus(ticket.status);
                    setOvrReason('');
                    setOvrErr(null);
                    setOverrideOpen(true);
                  }}
                  startIcon={<Iconify icon="solar:lock-password-bold" />}
                >
                  Override
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Card>

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid xs={12} lg={8}>
          <Stack spacing={3}>
            <Card>
              <CardHeader title="Description" />
              <CardContent>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </Typography>
              </CardContent>
            </Card>

            <ConversationCard ticket={ticket} active={isActive} isStaff={isStaff} />
          </Stack>
        </Grid>

        <Grid xs={12} lg={4}>
          <Stack spacing={3}>
            <Card>
              <CardHeader title="SLA" subheader="Windows come from platform settings." />
              <CardContent>
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Row
                      label="First response"
                      value={
                        <SlaPill
                          dueAt={ticket.sla.responseDueAt}
                          fulfilledAt={ticket.sla.firstResponseAt}
                        />
                      }
                    />
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      due {fDateTime(ticket.sla.responseDueAt)}
                    </Typography>
                  </Stack>

                  <Stack spacing={0.5}>
                    <Row
                      label="Resolution"
                      value={
                        <SlaPill
                          dueAt={ticket.sla.resolutionDueAt}
                          fulfilledAt={ticket.sla.resolvedAt}
                        />
                      }
                    />
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      due {fDateTime(ticket.sla.resolutionDueAt)}
                    </Typography>
                  </Stack>

                  {ticket.sla.firstResponseAt === null && (
                    <Alert severity="warning" sx={{ typography: 'caption' }}>
                      No first response yet — posting a customer reply below stamps it.
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <OrderContextCard
              orderId={ticket.orderId}
              raisedBy={ticket.raisedBy}
              section={section}
            />

            <Card>
              <CardHeader title="Resolution" />
              <CardContent>
                <Stack spacing={1.5}>
                  <Row label="Action" value={ticket.resolution.action ?? '—'} />
                  <Row label="By" value={ticket.resolution.by ?? '—'} />
                  <Row
                    label="At"
                    value={ticket.resolution.at ? fDateTime(ticket.resolution.at) : '—'}
                  />

                  {ticket.resolution.notes && (
                    <>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          Notes
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                          {ticket.resolution.notes}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {ticket.refundIssued && (
                    <Alert severity="success" sx={{ typography: 'caption' }}>
                      Refund of {formatInr(ticket.refundIssued.amountInr)} issued{' '}
                      {fDateTime(ticket.refundIssued.at)}
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title="Attachments"
                subheader={`${ticket.attachments.length} file${
                  ticket.attachments.length === 1 ? '' : 's'
                }`}
              />
              <CardContent>
                {ticket.attachments.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    No attachments uploaded.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {ticket.attachments.map((key, i) => (
                      <Stack
                        key={`${key}-${i}`}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ minWidth: 0 }}
                      >
                        <Iconify
                          icon="solar:document-text-bold"
                          width={18}
                          sx={{ color: 'text.disabled', flexShrink: 0 }}
                        />
                        <Box
                          component="span"
                          sx={{
                            typography: 'caption',
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {key}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid xs={12}>
          <Card>
            <CardHeader title="History" subheader="Everything that has happened to this ticket." />
            {ticket.history.length === 0 ? (
              <CardContent>
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  Nothing recorded yet.
                </Typography>
              </CardContent>
            ) : (
              <Timeline
                sx={{
                  m: 0,
                  p: 3,
                  [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 },
                }}
              >
                {ticket.history.map((event, i) => (
                  <TimelineItem key={i}>
                    <TimelineSeparator>
                      <TimelineDot
                        color={
                          /escalat/i.test(event.event)
                            ? 'warning'
                            : /resolv|close/i.test(event.event)
                              ? 'success'
                              : /overrid|reject/i.test(event.event)
                                ? 'error'
                                : 'primary'
                        }
                      />
                      {i !== ticket.history.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>

                    <TimelineContent>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography variant="subtitle2">{event.event}</Typography>
                        {event.fromStatus && event.toStatus && (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            {event.fromStatus} → {event.toStatus}
                          </Typography>
                        )}
                        {event.fromLevel && event.toLevel && (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            {event.fromLevel} → {event.toLevel}
                          </Typography>
                        )}
                      </Stack>

                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {fDateTime(event.at)}
                      </Typography>

                      {event.notes && (
                        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                          {event.notes}
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Override — super tier only, and always with a reason on record. */}
      <Dialog open={overrideOpen} onClose={() => setOverrideOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Override ticket decision</DialogTitle>

        <DialogContent>
          <Stack spacing={2.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Force a new status with a mandatory reason. The previous handler and the customer
              are notified, and the change is logged.
            </Typography>

            <TextField
              select
              fullWidth
              label="New status"
              value={ovrStatus}
              onChange={(e) => setOvrStatus(e.target.value)}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="OPEN">Open (reopen)</MenuItem>
              <MenuItem value="IN_PROGRESS">In progress</MenuItem>
              <MenuItem value="ESCALATED">Escalated</MenuItem>
              <MenuItem value="RESOLVED">Resolved</MenuItem>
              <MenuItem value="CLOSED">Closed</MenuItem>
            </TextField>

            <TextField
              fullWidth
              multiline
              minRows={3}
              required
              label="Reason"
              value={ovrReason}
              onChange={(e) => setOvrReason(e.target.value)}
              placeholder="Why is this decision being overridden?"
              InputLabelProps={{ shrink: true }}
            />

            {ovrErr && <Alert severity="error">{ovrErr}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setOverrideOpen(false)}
            disabled={override.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={override.isPending}
            onClick={applyOverride}
          >
            Apply override
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <ClaimDialog open={claimOpen} ticketId={ticket.id} onClose={() => setClaimOpen(false)} />
      <ResolveDialog open={resolveOpen} ticketId={ticket.id} onClose={() => setResolveOpen(false)} />
      <EscalateDialog
        open={escalateOpen}
        ticketId={ticket.id}
        onClose={() => setEscalateOpen(false)}
      />
      <ForceRefundDialog open={refundOpen} ticketId={ticket.id} onClose={() => setRefundOpen(false)} />
    </>
  );
};

// ----------------------------------------------------------------------

const ConversationCard = ({
  ticket,
  active,
  isStaff,
}: {
  ticket: SupportTicket;
  active: boolean;
  isStaff: boolean;
}) => {
  // The exposed-settings endpoint is admin-only — skip it for raiser views.
  const { map: settings } = useExposedSettingMap(isStaff);
  const internalAllowed = isStaff && readBoolean(settings, 'support.allowInternalNotes', true);
  const post = usePostTicketMessage();

  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [channel, setChannel] = useState<SupportMessageChannel>('in_app');
  const [error, setError] = useState<string | null>(null);

  const messages = useMemo(
    () =>
      [...(ticket.messages ?? [])].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
    [ticket.messages],
  );

  const isInternal = internalAllowed && internal;
  // Internal notes never email the customer — force the in-app channel.
  const effectiveChannel: SupportMessageChannel = isInternal ? 'in_app' : channel;

  const submit = async () => {
    if (!body.trim()) return;
    setError(null);
    try {
      await post.mutateAsync({
        id: ticket.id,
        body: body.trim(),
        internal: isInternal,
        channel: effectiveChannel,
      });
      setBody('');
      setInternal(false);
      setChannel('in_app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post message');
    }
  };

  const sendIcon =
    effectiveChannel === 'email'
      ? 'solar:letter-bold'
      : effectiveChannel === 'call'
        ? 'solar:phone-bold'
        : 'solar:plain-bold';

  const sendLabel = isInternal
    ? 'Post internal note'
    : effectiveChannel === 'email'
      ? 'Send as email'
      : effectiveChannel === 'call'
        ? 'Log call'
        : 'Send reply';

  return (
    <Card>
      <CardHeader
        title="Conversation"
        subheader="Customer replies are visible to the raiser. Internal notes stay staff-only."
      />

      <CardContent>
        <Stack spacing={2}>
          {messages.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              No messages yet. Post a reply to start the thread.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {messages.map((m, i) => (
                <MessageBubble key={m._id ?? i} message={m} />
              ))}
            </Stack>
          )}

          <Divider sx={{ borderStyle: 'dashed' }} />

          {active ? (
            <Stack spacing={2}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  isInternal
                    ? 'Internal note — visible to staff only…'
                    : effectiveChannel === 'email'
                      ? 'Reply — also emailed to the customer…'
                      : effectiveChannel === 'call'
                        ? 'Call-log note — what was discussed on the call…'
                        : 'Reply to the customer…'
                }
                // A tinted box is a standing reminder that this one is not
                // going to the customer.
                sx={
                  isInternal
                    ? {
                        '& .MuiInputBase-root': {
                          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                        },
                      }
                    : undefined
                }
              />

              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                {internalAllowed && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={internal}
                        onChange={(e) => setInternal(e.target.checked)}
                      />
                    }
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify icon="solar:lock-password-bold" width={16} />
                        <Box component="span" sx={{ typography: 'body2' }}>
                          Internal note (staff-only)
                        </Box>
                      </Stack>
                    }
                  />
                )}

                {!isInternal && (
                  <TextField
                    select
                    size="small"
                    label="Channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as SupportMessageChannel)}
                    sx={{ width: 180 }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="in_app">In-app reply</MenuItem>
                    <MenuItem value="email">Send as email</MenuItem>
                    <MenuItem value="call">Log a call</MenuItem>
                  </TextField>
                )}

                <LoadingButton
                  variant="contained"
                  loading={post.isPending}
                  disabled={!body.trim()}
                  onClick={submit}
                  startIcon={<Iconify icon={sendIcon} />}
                  sx={{ ml: 'auto' }}
                >
                  {sendLabel}
                </LoadingButton>
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              This ticket is {ticket.status.toLowerCase()} — the thread is closed to new messages.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

// ----------------------------------------------------------------------

const MessageBubble = ({ message }: { message: SupportTicketMessage }) => {
  const isStaff = message.authorRole === 'STAFF';

  const authorLabel = isStaff
    ? 'Support'
    : message.authorRole === 'SELLER'
      ? 'Seller'
      : 'Buyer';

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2,
        ...(message.internal
          ? {
              borderColor: (theme) => alpha(theme.palette.warning.main, 0.32),
              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
            }
          : isStaff
            ? { bgcolor: (theme) => alpha(theme.palette.info.main, 0.06) }
            : { bgcolor: 'background.neutral' }),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {message.internal ? (
          <Label
            variant="soft"
            color="warning"
            startIcon={<Iconify icon="solar:lock-password-bold" />}
          >
            Internal note
          </Label>
        ) : (
          <Label variant="soft" color={isStaff ? 'info' : 'default'}>
            {authorLabel}
          </Label>
        )}

        {message.channel === 'email' && (
          <Label variant="soft" startIcon={<Iconify icon="solar:letter-bold" />}>
            Email
          </Label>
        )}
        {message.channel === 'call' && (
          <Label variant="soft" startIcon={<Iconify icon="solar:phone-bold" />}>
            Call
          </Label>
        )}

        <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
          {fDateTime(message.at)}
        </Typography>
      </Stack>

      <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
        {message.body}
      </Typography>
    </Card>
  );
};

// ----------------------------------------------------------------------

const OrderContextCard = ({
  orderId,
  raisedBy,
  section,
}: {
  orderId: string | null;
  raisedBy: string;
  section: string;
}) => {
  const navigate = useNavigate();
  const order = useOrder(orderId ?? undefined);
  const buyer = useUser(order.data?.buyerId);

  if (!orderId) {
    return (
      <Card>
        <CardHeader title="Context" />
        <CardContent>
          <Stack spacing={1.5}>
            <Row
              label="Raiser"
              value={
                <Box component="span" sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                  {raisedBy.slice(-8)}
                </Box>
              }
            />
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              No order linked to this ticket.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Linked order"
        subheader="Context for resolving this ticket."
        action={
          <Button
            size="small"
            color="inherit"
            onClick={() => navigate(`${section}/orders/${orderId}`)}
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} sx={{ ml: -0.5 }} />}
          >
            Open
          </Button>
        }
      />

      <CardContent>
        {order.isLoading && <Skeleton height={96} />}

        {order.isError && (
          <Alert severity="error" sx={{ typography: 'caption' }}>
            {order.error instanceof Error ? order.error.message : 'Failed to load order'}
          </Alert>
        )}

        {order.data && (
          <Stack spacing={1.5}>
            <Row label="Order" value={order.data.orderNumber} />
            <Row label="Status" value={<Label variant="soft">{order.data.status}</Label>} />
            <Row
              label="Payment"
              value={`${order.data.payment.mode} · ${order.data.payment.status}`}
            />
            <Row label="Escrow" value={<Label variant="soft">{order.data.escrowStatus}</Label>} />
            <Row label="Total" value={formatInr(order.data.totalInr)} />
            <Row label="Buyer" value={buyer.data?.name ?? '—'} />

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Items
            </Typography>
            <Stack spacing={0.75}>
              {order.data.items.slice(0, 5).map((it, i) => (
                <Stack
                  key={it.id ?? i}
                  direction="row"
                  spacing={1}
                  justifyContent="space-between"
                  sx={{ typography: 'caption' }}
                >
                  <Box
                    component="span"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {it.name} ×{it.quantity}
                  </Box>
                  <Box component="span" sx={{ color: 'text.disabled', flexShrink: 0 }}>
                    {formatInr(it.subtotalInr)}
                  </Box>
                </Stack>
              ))}
              {order.data.items.length > 5 && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  +{order.data.items.length - 5} more
                </Typography>
              )}
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};
