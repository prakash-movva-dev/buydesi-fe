import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';

import { varAlpha } from '@/theme/styles';
import { formatInr } from '@/lib/format';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { EmptyContent } from '@/components/empty-content';

import { fDateTime } from '@/utils/format-time';
import { EscrowStatusBadge, OrderStatusBadge } from './status-badge';
import type { OrderItemView, SubOrderView } from './types';

// ----------------------------------------------------------------------

/** The steps a package walks, in order, for the little progress line. */
const STEPS: Array<{ status: SubOrderView['status']; label: string; at: keyof SubOrderView }> = [
  { status: 'PACKED', label: 'Packed', at: 'packedAt' },
  { status: 'DISPATCHED', label: 'Dispatched', at: 'dispatchedAt' },
  { status: 'DELIVERED', label: 'Delivered', at: 'deliveredAt' },
];

const Figure = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Box sx={{ typography: 'caption', color: 'text.disabled' }}>{label}</Box>
    <Box sx={{ typography: 'subtitle2' }}>{value}</Box>
  </Box>
);

type Props = {
  packages: SubOrderView[];
  items: OrderItemView[];
  /** Resolved seller names by user id, when the caller has them. */
  sellerNames?: Record<string, string>;
};

/**
 * Every package on an order, one card each.
 *
 * A multi-seller order is not one parcel: each seller packs, ships and is paid
 * separately, so the order's own status is only a rollup. This is where an
 * admin sees who is actually holding things up.
 */
export function OrderPackages({ packages, items, sellerNames }: Props) {
  if (packages.length === 0) {
    return (
      <EmptyContent
        filled
        title="No packages"
        description="This order has nothing to ship."
        sx={{ py: 8 }}
      />
    );
  }

  const delivered = packages.filter((p) => p.status === 'DELIVERED').length;

  return (
    <Stack spacing={2.5}>
      {packages.length > 1 && (
        <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
          {delivered} of {packages.length} packages delivered. Each seller ships and is paid on
          their own clock — the order&rsquo;s status is the least advanced of these.
        </Box>
      )}

      {packages.map((pkg, index) => {
        const mine = items.filter((it) => pkg.itemIds.includes(it.id ?? ''));
        const cancelled = pkg.status === 'CANCELLED';

        return (
          <Card
            key={pkg.id}
            sx={{
              p: 2.5,
              boxShadow: 'none',
              border: (theme) =>
                `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
              ...(cancelled && { opacity: 0.72 }),
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Iconify
                  width={24}
                  icon="solar:box-bold-duotone"
                  sx={{ color: 'text.disabled' }}
                />
                <Box>
                  <Box sx={{ typography: 'subtitle2' }}>
                    Package {index + 1} of {packages.length}
                    <Box
                      component="span"
                      sx={{ ml: 1, typography: 'caption', color: 'text.disabled' }}
                    >
                      {pkg.subOrderNumber}
                    </Box>
                  </Box>
                  <Box sx={{ typography: 'caption', color: 'text.secondary' }}>
                    {pkg.sellerName ?? sellerNames?.[pkg.sellerId] ?? 'Seller'}
                  </Box>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <OrderStatusBadge status={pkg.status} />
                <EscrowStatusBadge status={pkg.escrowStatus} />
              </Stack>
            </Stack>

            {cancelled && pkg.cancelReason && (
              <Box sx={{ mt: 1.5, typography: 'body2', color: 'error.main' }}>
                Cancelled — {pkg.cancelReason}
              </Box>
            )}

            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(4, minmax(0, 1fr))',
                },
              }}
            >
              <Figure label="Items" value={`${mine.length}`} />
              <Figure label="Subtotal" value={formatInr(pkg.subtotalInr)} />
              <Figure
                label="Discount"
                value={pkg.discountInr > 0 ? `−${formatInr(pkg.discountInr)}` : '—'}
              />
              <Figure label="Total" value={formatInr(pkg.totalInr)} />
            </Box>

            {mine.length > 0 && (
              <Box sx={{ mt: 2, typography: 'body2', color: 'text.secondary' }}>
                {mine.map((it) => `${it.name} × ${it.quantity}`).join(', ')}
              </Box>
            )}

            {!cancelled && (
              <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                {STEPS.map((step) => {
                  const at = pkg[step.at] as string | null;
                  return (
                    <Tooltip
                      key={step.status}
                      title={at ? fDateTime(at) : 'Not yet'}
                      placement="top"
                      arrow
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify
                          width={16}
                          icon={at ? 'solar:check-circle-bold' : 'solar:clock-circle-outline'}
                          sx={{ color: at ? 'success.main' : 'text.disabled' }}
                        />
                        <Box
                          sx={{
                            typography: 'caption',
                            color: at ? 'text.primary' : 'text.disabled',
                          }}
                        >
                          {step.label}
                        </Box>
                      </Stack>
                    </Tooltip>
                  );
                })}
              </Stack>
            )}

            {(pkg.shipmentId || pkg.trackingUrl) && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                <Label variant="soft">{pkg.deliveryProvider ?? 'courier'}</Label>
                {pkg.trackingUrl ? (
                  <Link
                    href={pkg.trackingUrl}
                    target="_blank"
                    rel="noopener"
                    sx={{ typography: 'caption' }}
                  >
                    Track {pkg.shipmentId}
                  </Link>
                ) : (
                  <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
                    {pkg.shipmentId}
                  </Box>
                )}
              </Stack>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}
