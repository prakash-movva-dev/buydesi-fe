import Box from '@mui/material/Box';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { usePopover, CustomPopover } from '@/components/custom-popover';

import { UserRole } from '@/types/api';
import { fDate, fToNow } from '@/utils/format-time';

import type { SafeUser, UserStatus } from './types';

// ----------------------------------------------------------------------

export const USER_STATUS_COLOR: Record<UserStatus, 'success' | 'warning' | 'error'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'error',
};

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  SUB_SUPER_ADMIN: 'Sub-super admin',
  REGIONAL_ADMIN: 'Regional admin',
  CLUSTER_ADMIN: 'Cluster admin',
  CATEGORY_ADMIN: 'Category admin',
  SUPPORT_ADMIN: 'Support admin',
  SELLER: 'Seller',
  BUYER: 'Buyer',
  PROMOTER: 'Affiliate',
};

/** Seniority reads through colour, so the powerful accounts stand out. */
export const roleColor = (
  role: UserRole,
): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  if (role === UserRole.SUPER_ADMIN) return 'error';
  if (role === UserRole.SUB_SUPER_ADMIN) return 'warning';
  if (
    role === UserRole.REGIONAL_ADMIN ||
    role === UserRole.CLUSTER_ADMIN ||
    role === UserRole.CATEGORY_ADMIN ||
    role === UserRole.SUPPORT_ADMIN
  ) {
    return 'info';
  }
  if (role === UserRole.SELLER) return 'success';
  return 'default';
};

/** Roles that must carry a scope to be able to do anything at all. */
const NEEDS_SCOPE = new Set<string>([
  UserRole.CLUSTER_ADMIN,
  UserRole.SUPPORT_ADMIN,
  UserRole.REGIONAL_ADMIN,
  UserRole.CATEGORY_ADMIN,
]);

type Props = {
  row: SafeUser;
  clusterName?: string;
  regionName?: string;
  categoryName?: string;
  onEditStatus: () => void;
  onEditContact: () => void;
  /** Only the super tier may change what someone signs in with. */
  canEditContact?: boolean;
};

/**
 * One account. The scope column is the one worth reading: a cluster or support
 * admin with nothing assigned can sign in and see nothing at all, which looks
 * like a broken account rather than an unfinished one.
 */
export function UserTableRow({
  row,
  clusterName,
  regionName,
  categoryName,
  onEditStatus,
  onEditContact,
  canEditContact,
}: Props) {
  const popover = usePopover();
  const scope =
    (row.role === UserRole.CATEGORY_ADMIN && (categoryName ?? (row.category ? 'A category' : null))) ||
    (row.role === UserRole.REGIONAL_ADMIN && (regionName ?? (row.regionId ? 'A region' : null))) ||
    clusterName ||
    null;

  const unscoped = NEEDS_SCOPE.has(row.role) && !scope;

  return (
    <TableRow hover tabIndex={-1}>
      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'background.neutral', color: 'text.secondary' }}>
            {row.name.charAt(0).toUpperCase()}
          </Avatar>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Box component="span" sx={{ typography: 'subtitle2' }}>
              {row.name}
            </Box>
            <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
              {row.email ?? row.mobile ?? 'No contact'}
            </Box>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Label variant="soft" color={roleColor(row.role)}>
          {ROLE_LABEL[row.role] ?? row.role}
        </Label>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {unscoped ? (
          <Tooltip title="This account can sign in but has no scope, so it sees nothing">
            <Box component="span">
              <Label variant="soft" color="warning">
                Not assigned
              </Label>
            </Box>
          </Tooltip>
        ) : scope ? (
          <Box component="span" sx={{ typography: 'body2' }}>
            {scope}
          </Box>
        ) : (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            —
          </Box>
        )}
      </TableCell>

      <TableCell>
        {row.lastLoginAt ? (
          <ListItemText
            primary={fToNow(row.lastLoginAt)}
            secondary={fDate(row.lastLoginAt)}
            primaryTypographyProps={{ typography: 'body2', noWrap: true }}
            secondaryTypographyProps={{ mt: 0.5, component: 'span', typography: 'caption' }}
          />
        ) : (
          <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
            Never signed in
          </Box>
        )}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap', typography: 'caption' }}>
        {fDate(row.createdAt)}
      </TableCell>

      <TableCell>
        <Label variant="soft" color={USER_STATUS_COLOR[row.status] ?? 'default'}>
          {row.status}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ px: 1 }}>
        <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      </TableCell>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {canEditContact && (
            <MenuItem
              onClick={() => {
                popover.onClose();
                onEditContact();
              }}
            >
              <Iconify icon="solar:pen-bold" />
              Edit email or mobile
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              popover.onClose();
              onEditStatus();
            }}
          >
            <Iconify icon="solar:shield-user-bold" />
            Change status
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </TableRow>
  );
}
