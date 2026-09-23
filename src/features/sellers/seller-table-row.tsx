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
import ListItemText from '@mui/material/ListItemText';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { fDate, fTime } from '@/utils/format-time';
import type { SafeSellerProfile, SellerStatus } from './types';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<SellerStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
  INFO_REQUESTED: 'info',
  SUSPENDED: 'default',
};

const STATUS_LABEL: Record<SellerStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  INFO_REQUESTED: 'Info requested',
  SUSPENDED: 'Suspended',
};

type Props = {
  row: SafeSellerProfile;
  clusterName?: string;
  onViewRow: () => void;
  onApprove: () => void;
};

export function SellerTableRow({ row, clusterName, onViewRow, onApprove }: Props) {
  const popover = usePopover();

  const photo = row.storefront?.profilePhoto;

  return (
    <>
      <TableRow hover tabIndex={-1}>
        <TableCell>
          <Stack spacing={2} direction="row" alignItems="center">
            <Avatar alt={row.farmName} src={photo} variant="rounded" sx={{ width: 48, height: 48 }}>
              <Iconify icon="solar:shop-bold" width={20} />
            </Avatar>

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Link color="inherit" onClick={onViewRow} sx={{ cursor: 'pointer' }} noWrap>
                  {row.farmName}
                </Link>
                {row.verifiedBadge && (
                  <Tooltip title="Verified seller">
                    <Iconify
                      icon="solar:verified-check-bold"
                      width={16}
                      sx={{ color: 'primary.main', flexShrink: 0 }}
                    />
                  </Tooltip>
                )}
              </Stack>

              {/* The readable code, never the Mongo id — this is what people
                  quote in a support call. */}
              <Box
                component="span"
                sx={{ color: 'text.disabled', typography: 'caption', fontFamily: 'monospace' }}
              >
                {row.sellerCode ?? '—'}
              </Box>
            </Stack>
          </Stack>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{clusterName ?? '—'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.pincode}</TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.createdAt)}
            secondary={fTime(row.createdAt)}
            primaryTypographyProps={{ typography: 'body2', noWrap: true }}
            secondaryTypographyProps={{ mt: 0.5, component: 'span', typography: 'caption' }}
          />
        </TableCell>

        <TableCell>
          <Label variant="soft" color={STATUS_COLOR[row.status]}>
            {STATUS_LABEL[row.status]}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <Tooltip title="Open" placement="top" arrow>
            <IconButton color="default" onClick={onViewRow}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
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
              onViewRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>

          {row.status !== 'APPROVED' && (
            <MenuItem
              onClick={() => {
                onApprove();
                popover.onClose();
              }}
              sx={{ color: 'success.main' }}
            >
              <Iconify icon="solar:check-circle-bold" />
              Review
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>
    </>
  );
}
