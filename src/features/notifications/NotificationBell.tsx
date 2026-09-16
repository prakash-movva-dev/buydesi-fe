
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';

import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { fToNow } from '@/utils/format-time';
import { useMarkAllRead, useMarkRead, useNotifications } from './api';
import type { AdminNotification } from './types';

const idOf = (n: AdminNotification): string => n.id ?? n._id ?? '';

/**
 * Maps a notification to an in-app admin route. We prefer a `type`-prefix
 * lookup (the dotted template key, e.g. `support.escalated`) over the raw
 * `deepLink`, which is a mobile-app scheme (buydesi://) that the admin SPA
 * can't follow. Anything we can't sensibly route to returns null (no-op).
 */
const resolveTarget = (n: AdminNotification): string | null => {
  const data = n.data ?? {};
  const ticketId = (data.ticketId ?? data.ticketID ?? data.supportTicketId) as string | undefined;
  const orderId = (data.orderId ?? data.orderID) as string | undefined;

  const type = n.type ?? '';
  if (type.startsWith('support') || type.startsWith('ticket')) {
    return ticketId ? `/admin/support/${ticketId}` : '/admin/support';
  }
  if (type.startsWith('order')) {
    return orderId ? `/admin/orders/${orderId}` : '/admin/orders';
  }
  if (type.startsWith('payout')) return '/admin/payouts';
  if (type.startsWith('seller')) return '/admin/sellers';
  if (type.startsWith('escalation')) return '/admin/escalation';
  return null;
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const popover = usePopover();

  const { data } = useNotifications({ limit: 10 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = data?.items ?? [];
  const unread = data?.meta.unread ?? 0;

  const onItemClick = (n: AdminNotification) => {
    const id = idOf(n);
    if (id && !n.readAt) markRead.mutate(id);
    const target = resolveTarget(n);
    popover.onClose();
    if (target) navigate(target);
  };

  return (
    <>
      <Tooltip title={unread > 0 ? `${unread} unread` : 'Notifications'}>
        <IconButton color={popover.open ? 'primary' : 'default'} onClick={popover.onOpen}>
          <Badge badgeContent={unread} color="error" max={99}>
            <Iconify icon="solar:bell-bing-bold-duotone" width={24} />
          </Badge>
        </IconButton>
      </Tooltip>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'top-right' } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ py: 1.5, pl: 2.5, pr: 1, minWidth: 320 }}
        >
          <Typography variant="subtitle1">Notifications</Typography>
          {unread > 0 && (
            <Button
              size="small"
              color="inherit"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              startIcon={<Iconify icon="solar:check-read-outline" width={16} />}
            >
              Mark all read
            </Button>
          )}
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Scrollbar sx={{ maxHeight: 400, width: 360 }}>
          {items.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ px: 2.5, py: 5, textAlign: 'center', color: 'text.secondary' }}
            >
              Nothing to catch up on.
            </Typography>
          ) : (
            items.map((n) => {
              const id = idOf(n);
              const isUnread = !n.readAt;
              return (
                <ListItemButton
                  key={id}
                  onClick={() => onItemClick(n)}
                  sx={{
                    py: 1.5,
                    px: 2.5,
                    alignItems: 'flex-start',
                    borderBottom: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
                    ...(isUnread && { bgcolor: 'action.selected' }),
                  }}
                >
                  <Stack spacing={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {isUnread && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'info.main',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Typography variant="subtitle2" noWrap sx={{ flexGrow: 1 }}>
                        {n.title}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {n.body}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {fToNow(n.createdAt)}
                    </Typography>
                  </Stack>
                </ListItemButton>
              );
            })
          )}
        </Scrollbar>
      </CustomPopover>
    </>
  );
};
