import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';

// ----------------------------------------------------------------------

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SUB_SUPER_ADMIN: 'Sub-Super Admin',
  REGIONAL_ADMIN: 'Regional Admin',
  CLUSTER_ADMIN: 'Cluster Admin',
  CATEGORY_ADMIN: 'Category Admin',
  SUPPORT_ADMIN: 'Support Admin',
  SELLER: 'Seller',
  PROMOTER: 'Promoter',
};

export function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase();

  // Sellers and promoters already have a profile page of their own, with their
  // storefront and earnings on it. Everyone else goes to the generic one.
  const profilePath =
    user?.role === UserRole.SELLER
      ? '/seller/profile'
      : user?.role === UserRole.PROMOTER
        ? '/promoter/profile'
        : '/profile';

  const onSignOut = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ p: 0, width: 40, height: 40 }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {initial}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 240, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {user?.name ?? 'Signed in'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {user?.email ?? (user?.role ? ROLE_LABEL[user.role] ?? user.role : '')}
          </Typography>
        </Box>

        {user?.email && user?.role && (
          <Typography variant="caption" sx={{ px: 2, color: 'text.disabled' }}>
            {ROLE_LABEL[user.role] ?? user.role}
          </Typography>
        )}

        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

        {/* Sellers and promoters keep their own richer pages; every other role
            had nowhere at all to change their own details until now. */}
        <MenuItem component={RouterLink} to={profilePath} onClick={() => setAnchorEl(null)}>
          My profile
        </MenuItem>

        <MenuItem onClick={onSignOut} sx={{ color: 'error.main', fontWeight: 600 }}>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
