import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { varAlpha } from '@/theme/styles';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyContent } from '@/components/empty-content';
import { TableHeadCustom } from '@/components/table';

import { fCurrency } from '@/utils/format-number';
import { fDate, fDateTime, fTime } from '@/utils/format-time';
import { useUser } from '@/features/users/api';

import { useEscrowAudit, useOrder } from './api';
import { CancelOrderDialog, RefundOrderDialog } from './OrderActionDialogs';
import {
  ESCROW_LABEL,
  EscrowStatusBadge,
  ORDER_DOT_COLOR,
  ORDER_ICON,
  ORDER_LABEL,
  OrderStatusBadge,
  PaymentStatusBadge,
} from './status-badge';

// ----------------------------------------------------------------------

const ESCROW_VIEWER_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
]);

const REFUND_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SUB_SUPER_ADMIN,
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
]);

const ITEM_HEAD = [
  { id: 'product', label: 'Product' },
  { id: 'kind', label: 'Kind', width: 110 },
  { id: 'price', label: 'Unit price', align: 'right' as const, width: 130 },
  { id: 'qty', label: 'Qty', align: 'right' as const, width: 90 },
  { id: 'subtotal', label: 'Subtotal', align: 'right' as const, width: 140 },
];

type TabValue = 'summary' | 'timeline' | 'escrow';

// ----------------------------------------------------------------------

/**
 * One order, end to end.
 *
 * The header answers the three things anyone opening an order needs at once —
 * where it is, whether it is paid, and whose money is being held — because those
 * decide what can be done about it.
 */
export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabValue>('summary');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const { data: order, isLoading, isError, error } = useOrder(id);

  const canSeeEscrow = user ? ESCROW_VIEWER_ROLES.has(user.role) : false;
  const escrowAudit = useEscrowAudit(canSeeEscrow ? id : undefined);
  const buyer = useUser(order?.buyerId);

  if (isLoading) return <LoadingScreen />;

  if (isError || !order) {
    return (
      <>
        <PageHeader title="Order" />
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Order not found'}
        </Alert>
      </>
    );
  }

  const items = order.items ?? [];
  const statusHistory = order.statusHistory ?? [];
  const buyerName = buyer.data?.name ?? order.buyerName ?? 'Buyer';

  const canRefund =
    user && REFUND_ROLES.has(user.role) && order.payment?.status === 'CAPTURED';
  // Cancelling is not routine admin work — it flows from the buyer, the seller
  // or a support resolution. Only the super admin keeps an override.
  const canCancel =
    user &&
    user.role === UserRole.SUPER_ADMIN &&
    order.status !== 'CANCELLED' &&
    order.status !== 'DELIVERED' &&
    order.status !== 'RETURNED';

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        links={[
          { name: 'Dashboard', href: '/admin' },
          { name: 'Orders', href: '/admin/orders' },
          { name: order.orderNumber },
        ]}
        description={`Placed ${fDateTime(order.createdAt)} by ${buyerName}`}
        action={
          <Stack direction="row" spacing={1.5}>
            {order.delhiveryShipmentId && (
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/delivery')}
                startIcon={<Iconify icon="solar:delivery-bold" />}
              >
                Track parcel
              </Button>
            )}
            {canRefund && (
              <Button
                variant="contained"
                color="warning"
                onClick={() => setRefundOpen(true)}
                startIcon={<Iconify icon="solar:hand-money-bold" />}
              >
                Refund
              </Button>
            )}
            {canCancel && (
              <Button
                variant="contained"
                color="error"
                onClick={() => setCancelOpen(true)}
                startIcon={<Iconify icon="solar:close-circle-bold" />}
              >
                Cancel order
              </Button>
            )}
          </Stack>
        }
      />

      <Card sx={{ mt: 3, p: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          divider={
            <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />
          }
        >
          <Stack spacing={1} sx={{ minWidth: 220 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Where it is
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                variant="rounded"
                sx={{ width: 40, height: 40, bgcolor: 'background.neutral', color: 'text.secondary' }}
              >
                <Iconify icon={ORDER_ICON[order.status] ?? 'solar:bag-4-bold'} width={20} />
              </Avatar>
              <OrderStatusBadge status={order.status} />
            </Stack>
          </Stack>

          <Stack spacing={1} sx={{ minWidth: 220 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Payment
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              {order.payment?.status && <PaymentStatusBadge status={order.payment.status} />}
              <Label variant="soft" color="default">
                {order.payment?.mode === 'COD' ? 'Cash on delivery' : 'Prepaid'}
              </Label>
            </Stack>
          </Stack>

          <Stack spacing={1} sx={{ minWidth: 240 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Seller&apos;s money
            </Typography>
            <EscrowStatusBadge status={order.escrowStatus} />
            {order.returnWindowEndsAt && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Return window closes {fDate(order.returnWindowEndsAt)}
              </Typography>
            )}
          </Stack>

          <Stack spacing={1} sx={{ flexGrow: 1, alignItems: { md: 'flex-end' } }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Order total
            </Typography>
            <Typography variant="h4">{fCurrency(order.totalInr)}</Typography>
          </Stack>
        </Stack>

        {order.cancellation && (
          <Alert severity="error" variant="outlined" sx={{ mt: 2.5 }}>
            Cancelled {fDateTime(order.cancellation.at)} — {order.cancellation.reason}
            {order.cancellation.refundedAt
              ? ` · refunded ${fDate(order.cancellation.refundedAt)}`
              : ''}
          </Alert>
        )}
      </Card>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setTab(value as TabValue)}
          sx={{
            px: 3,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          <Tab value="summary" label={`What was bought (${items.length})`} />
          <Tab value="timeline" label={`History (${statusHistory.length})`} />
          {canSeeEscrow && <Tab value="escrow" label="Money trail" />}
        </Tabs>

        {tab === 'summary' && (
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid xs={12} lg={8}>
              <Scrollbar>
                <Table sx={{ minWidth: 700 }}>
                  <TableHeadCustom headLabel={ITEM_HEAD} />
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={`${item.productId}-${index}`} hover>
                        <TableCell>
                          <Typography variant="subtitle2">{item.name}</Typography>
                          {item.variantLabel && (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              {item.variantLabel}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          <Label variant="soft">{item.kind ?? 'standard'}</Label>
                        </TableCell>
                        <TableCell align="right">{fCurrency(item.unitPriceInr)}</TableCell>
                        <TableCell align="right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                          {fCurrency(item.subtotalInr)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Scrollbar>
            </Grid>

            <Grid xs={12} lg={4}>
              <Stack spacing={3}>
                <Card sx={{ p: 2.5, bgcolor: 'background.neutral', boxShadow: 'none' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    What it came to
                  </Typography>
                  <Stack spacing={1}>
                    <Money label="Items" value={order.subtotalInr} />
                    {order.discountInr > 0 && (
                      <Money
                        label={order.coupon ? `Discount (${order.coupon.code})` : 'Discount'}
                        value={-order.discountInr}
                        tone="success"
                      />
                    )}
                    <Money label="Delivery" value={order.deliveryFeeInr} />
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Money label="Total" value={order.totalInr} strong />
                  </Stack>
                </Card>

                <Stack spacing={1}>
                  <Typography variant="subtitle2">Going to</Typography>
                  <Typography variant="body2">{order.shippingAddress.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {[
                      order.shippingAddress.line1,
                      order.shippingAddress.line2,
                      order.shippingAddress.city,
                      order.shippingAddress.state,
                      order.shippingAddress.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {order.shippingAddress.phone}
                  </Typography>
                </Stack>

                {order.delhiveryShipmentId && (
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Parcel</Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                    >
                      {order.delhiveryShipmentId}
                    </Typography>
                    {order.trackingUrl && (
                      <Link href={order.trackingUrl} target="_blank" rel="noreferrer" variant="caption">
                        Carrier tracking page
                      </Link>
                    )}
                  </Stack>
                )}

                {order.affiliate && (
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Brought in by an affiliate</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Label variant="soft" color="info">
                        {order.affiliate.code ?? 'affiliate link'}
                      </Label>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {order.affiliate.via === 'coupon' ? 'code typed' : 'link clicked'}
                      </Typography>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}

        {tab === 'timeline' && (
          <Box sx={{ p: 3 }}>
            {statusHistory.length === 0 ? (
              <EmptyContent filled sx={{ py: 8 }} title="No history recorded" />
            ) : (
              <Timeline
                sx={{ p: 0, m: 0, [`& .${timelineItemClasses.root}:before`]: { flex: 0, p: 0 } }}
              >
                {statusHistory.map((entry, index) => (
                  <TimelineItem key={index}>
                    <TimelineSeparator>
                      <TimelineDot color={ORDER_DOT_COLOR[entry.status] ?? 'grey'}>
                        <Iconify icon={ORDER_ICON[entry.status] ?? 'solar:bag-4-bold'} width={16} />
                      </TimelineDot>
                      {index !== statusHistory.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ pb: 3 }}>
                      <Typography variant="subtitle2">
                        {ORDER_LABEL[entry.status] ?? entry.status}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {fDate(entry.at)} · {fTime(entry.at)}
                      </Typography>
                      {entry.notes && (
                        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                          {entry.notes}
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </Box>
        )}

        {tab === 'escrow' && canSeeEscrow && (
          <Box sx={{ p: 3 }}>
            <CardHeader
              title="Who holds the money"
              subheader="Every escrow move on this order, and what triggered it."
              sx={{ p: 0, mb: 2 }}
            />
            {(escrowAudit.data?.length ?? 0) === 0 ? (
              <EmptyContent
                filled
                sx={{ py: 8 }}
                title="No escrow moves yet"
                description="Money is held when the order is placed and released once the return window closes."
              />
            ) : (
              <Stack spacing={1.5}>
                {(escrowAudit.data ?? []).map((entry) => (
                  <Stack
                    key={entry.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ sm: 'center' }}
                    sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 300 }}>
                      <Label variant="soft" color="default">
                        {ESCROW_LABEL[entry.fromStatus] ?? entry.fromStatus}
                      </Label>
                      <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
                      <Label variant="soft" color="info">
                        {ESCROW_LABEL[entry.toStatus] ?? entry.toStatus}
                      </Label>
                    </Stack>
                    <Stack spacing={0.25} sx={{ flexGrow: 1 }}>
                      <Typography variant="body2">
                        {entry.reason ?? entry.trigger.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {fDateTime(entry.createdAt)} · by {entry.actor}
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Card>

      <CancelOrderDialog
        open={cancelOpen}
        orderId={order.id}
        onClose={() => setCancelOpen(false)}
      />
      <RefundOrderDialog
        open={refundOpen}
        orderId={order.id}
        maxAmount={order.totalInr}
        onClose={() => setRefundOpen(false)}
      />
    </>
  );
};

// ----------------------------------------------------------------------

function Money({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: 'success';
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography
        variant={strong ? 'subtitle2' : 'body2'}
        sx={{ color: strong ? 'text.primary' : 'text.secondary' }}
      >
        {label}
      </Typography>
      <Typography
        variant={strong ? 'subtitle1' : 'body2'}
        sx={{ color: tone === 'success' ? 'success.dark' : 'text.primary' }}
      >
        {value < 0 ? `−${fCurrency(Math.abs(value))}` : fCurrency(value)}
      </Typography>
    </Stack>
  );
}
