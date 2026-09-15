import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { fDate } from '@/utils/format-time';
import { formatInr } from '@/lib/format';
import type { Promotion, PromotionScope, PromotionType } from './types';

// ----------------------------------------------------------------------

export const idOf = (p: Promotion): string => p.id ?? p._id;

export const TYPE_LABEL: Record<PromotionType, string> = {
  banner: 'Banner',
  coupon: 'Coupon',
  featured: 'Featured',
};

export const TYPE_COLOR: Record<PromotionType, 'info' | 'success' | 'warning'> = {
  banner: 'info',
  coupon: 'success',
  featured: 'warning',
};

export const TYPE_ICON: Record<PromotionType, string> = {
  banner: 'solar:gallery-wide-bold',
  coupon: 'solar:ticket-sale-bold',
  featured: 'solar:star-bold',
};

const SCOPE_LABEL: Record<PromotionScope, string> = {
  platform: 'Everywhere',
  cluster: 'One cluster',
  category: 'One category',
};

/**
 * Whether the promotion is doing anything right now.
 *
 * `active` on its own is not the answer: a promotion can be flagged active and
 * still sit outside its window, in which case no shopper ever sees it. Calling
 * that "Active" would be a lie.
 */
export type PromotionState = 'live' | 'scheduled' | 'ended' | 'off';

export const promotionState = (p: Promotion, now = Date.now()): PromotionState => {
  if (!p.active) return 'off';
  if (new Date(p.startsAt).getTime() > now) return 'scheduled';
  if (new Date(p.endsAt).getTime() <= now) return 'ended';
  return 'live';
};

export const STATE_LABEL: Record<PromotionState, string> = {
  live: 'Running',
  scheduled: 'Starts later',
  ended: 'Finished',
  off: 'Switched off',
};

export const STATE_COLOR: Record<PromotionState, 'success' | 'info' | 'default'> = {
  live: 'success',
  scheduled: 'info',
  ended: 'default',
  off: 'default',
};

const STATE_HINT: Record<PromotionState, string> = {
  live: 'Shoppers are seeing this now.',
  scheduled: 'Nothing shows until its start date.',
  ended: 'Its end date has passed.',
  off: 'Switched off by hand — kept for the record.',
};

// ----------------------------------------------------------------------

/** How much of a coupon's cap has been spent. */
const CouponUsage = ({ used, cap }: { used: number; cap: number }) => {
  if (cap === 0) {
    return (
      <Box sx={{ typography: 'caption', color: 'text.secondary' }}>
        {used} used · no limit
      </Box>
    );
  }
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const color = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';

  return (
    <Stack spacing={0.5} sx={{ minWidth: 120 }}>
      <Box sx={{ typography: 'caption', color: `${color}.main` }}>
        {used} of {cap} used
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 6, borderRadius: 1 }}
      />
    </Stack>
  );
};

/** The part of a row that only makes sense for one type of promotion. */
const Detail = ({ row }: { row: Promotion }) => {
  if (row.coupon) {
    const off =
      row.coupon.discountType === 'percent'
        ? `${row.coupon.discountValue}% off`
        : `${formatInr(row.coupon.discountValue)} off`;

    return (
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 0.75,
              typography: 'caption',
              fontFamily: 'monospace',
              fontWeight: 'fontWeightBold',
              bgcolor: 'background.neutral',
            }}
          >
            {row.coupon.code}
          </Box>
          <Box sx={{ typography: 'subtitle2' }}>{off}</Box>
        </Stack>

        <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
          {row.coupon.minOrderInr > 0
            ? `on orders over ${formatInr(row.coupon.minOrderInr)}`
            : 'no minimum order'}
          {row.coupon.maxDiscountInr
            ? ` · capped at ${formatInr(row.coupon.maxDiscountInr)}`
            : ''}
        </Box>

        <CouponUsage used={row.coupon.currentUses} cap={row.coupon.maxUses} />
      </Stack>
    );
  }

  if (row.banner) {
    return (
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Label variant="soft" color="info">
            {row.banner.placement === 'promo' ? 'Side card' : 'Main carousel'}
          </Label>
          {typeof row.banner.displayOrder === 'number' && (
            <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
              position {row.banner.displayOrder}
            </Box>
          )}
        </Stack>
        {row.banner.headline && (
          <Box sx={{ typography: 'body2' }}>{row.banner.headline}</Box>
        )}
        <Link
          href={row.banner.targetUrl}
          target="_blank"
          rel="noopener"
          sx={{
            typography: 'caption',
            maxWidth: 260,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {row.banner.targetUrl}
        </Link>
      </Stack>
    );
  }

  if (row.featured) {
    const { productIds, storefrontUserIds, slotPosition } = row.featured;
    return (
      <Stack spacing={0.5}>
        <Box sx={{ typography: 'subtitle2' }}>
          {productIds.length} product{productIds.length === 1 ? '' : 's'} pinned
        </Box>
        <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
          slot {slotPosition}
          {storefrontUserIds.length > 0
            ? ` · ${storefrontUserIds.length} storefront${storefrontUserIds.length === 1 ? '' : 's'}`
            : ''}
        </Box>
      </Stack>
    );
  }

  return (
    <Box component="span" sx={{ color: 'text.disabled' }}>
      —
    </Box>
  );
};

// ----------------------------------------------------------------------

type Props = {
  row: Promotion;
  canEdit: boolean;
  busy?: boolean;
  onToggleActive: () => void;
  onEndNow: () => void;
};

export function PromotionTableRow({ row, canEdit, busy, onToggleActive, onEndNow }: Props) {
  const popover = usePopover();
  const state = promotionState(row);

  return (
    <>
      <TableRow hover sx={state !== 'live' ? { opacity: 0.72 } : undefined}>
        <TableCell>
          <Stack direction="row" spacing={2} alignItems="center">
            {/* A banner's own image says more than any label could. */}
            {row.banner?.imageUrl ? (
              <Avatar
                variant="rounded"
                src={row.banner.imageUrl}
                alt={row.name}
                sx={{ width: 64, height: 40 }}
              />
            ) : (
              <Avatar
                variant="rounded"
                sx={{
                  width: 64,
                  height: 40,
                  color: `${TYPE_COLOR[row.type]}.main`,
                  bgcolor: 'background.neutral',
                }}
              >
                <Iconify width={20} icon={TYPE_ICON[row.type]} />
              </Avatar>
            )}

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ typography: 'subtitle2' }}>{row.name}</Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                <Label variant="soft" color={TYPE_COLOR[row.type]}>
                  {TYPE_LABEL[row.type]}
                </Label>
                {row.isOverride && (
                  <Tooltip
                    title="Set platform-wide by a super admin — it wins over cluster promotions"
                    placement="top"
                    arrow
                  >
                    <Label variant="soft" color="error">
                      Override
                    </Label>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <Detail row={row} />
        </TableCell>

        <TableCell>
          <Box sx={{ typography: 'body2' }}>{SCOPE_LABEL[row.scope]}</Box>
        </TableCell>

        <TableCell>
          <Stack sx={{ typography: 'body2' }}>
            <Box>{fDate(row.startsAt)}</Box>
            <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
              until {fDate(row.endsAt)}
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <Tooltip title={STATE_HINT[state]} placement="top" arrow>
            <Label variant="soft" color={STATE_COLOR[state]}>
              {STATE_LABEL[state]}
            </Label>
          </Tooltip>
        </TableCell>

        <TableCell align="right" sx={{ px: 1 }}>
          {canEdit && (
            <IconButton
              color={popover.open ? 'inherit' : 'default'}
              disabled={busy}
              onClick={popover.onOpen}
            >
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          )}
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              onToggleActive();
              popover.onClose();
            }}
            sx={row.active ? { color: 'error.main' } : undefined}
          >
            <Iconify icon={row.active ? 'solar:pause-bold' : 'solar:play-bold'} />
            {row.active ? 'Switch off' : 'Switch back on'}
          </MenuItem>

          {state === 'live' && (
            <MenuItem
              onClick={() => {
                onEndNow();
                popover.onClose();
              }}
            >
              <Iconify icon="solar:clock-circle-bold" />
              End it now
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>
    </>
  );
}
