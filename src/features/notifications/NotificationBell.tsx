import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
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
  if (type.startsWith('trade')) return '/admin/trade';
  if (type.startsWith('payout')) return '/admin/payouts';
  if (type.startsWith('seller')) return '/admin/sellers';
  if (type.startsWith('escalation')) return '/admin/escalation';
  return null;
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data } = useNotifications({ limit: 10 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = data?.items ?? [];
  const unread = data?.meta.unread ?? 0;

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onItemClick = (n: AdminNotification) => {
    const id = idOf(n);
    if (id && !n.readAt) markRead.mutate(id);
    const target = resolveTarget(n);
    setOpen(false);
    if (target) navigate(target);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={unread === 0 || markAllRead.isPending}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No notifications.
              </p>
            )}
            {items.map((n) => {
              const id = idOf(n);
              const isUnread = !n.readAt;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-secondary/60 ${
                    isUnread ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isUnread && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <span className="flex-1 text-sm font-medium leading-snug">{n.title}</span>
                  </div>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
