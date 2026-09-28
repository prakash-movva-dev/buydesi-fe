import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';
import { toast } from '@/components/snackbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { AccountChangePassword } from '@/components/account/AccountChangePassword';
import { AccountSignInDetails } from '@/components/account/AccountSignInDetails';

import { useUpdateMe } from './api';

// ----------------------------------------------------------------------

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'kn', label: 'ಕನ್ನಡ' },
];

/**
 * Your own account, whoever you are.
 *
 * Sellers and promoters have had a profile page all along; every admin role —
 * support, cluster, category, regional and super — had none, so the only way
 * to correct a name or an email was to ask somebody with the Users screen to
 * do it for you.
 *
 * Deliberately not role-specific: the scope that comes with a role (which
 * cluster, which categories) is somebody else's decision and is not editable
 * here. This page is only the things that are yours.
 */
export function MyProfilePage() {
  const { user, applyUser } = useAuth();
  const updateMut = useUpdateMe();

  const [name, setName] = useState(user?.name ?? '');
  const [language, setLanguage] = useState(user?.preferredLanguage ?? 'en');

  useEffect(() => {
    setName(user?.name ?? '');
    setLanguage(user?.preferredLanguage ?? 'en');
  }, [user]);

  const dirty = name.trim() !== (user?.name ?? '') || language !== (user?.preferredLanguage ?? 'en');

  const save = async () => {
    try {
      const updated = await updateMut.mutateAsync({
        name: name.trim(),
        preferredLanguage: language,
      });
      applyUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save your profile');
    }
  };

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your name, the language we write to you in, how you sign in, and your password."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          alignItems: 'start',
        }}
      >
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Your details
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
            Your role and the area it covers are set by an administrator and are not editable
            here.
          </Typography>

          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Shown on the tickets, approvals and notes you leave"
            />
            <TextField
              select
              fullWidth
              label="Preferred language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Used for the emails and messages we send you"
            >
              {LANGUAGES.map((l) => (
                <MenuItem key={l.value} value={l.value}>
                  {l.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" justifyContent="flex-end">
              <LoadingButton
                variant="contained"
                loading={updateMut.isPending}
                disabled={!dirty || name.trim().length < 2}
                onClick={save}
              >
                Save changes
              </LoadingButton>
            </Stack>
          </Stack>
        </Card>

        <AccountSignInDetails />

        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <AccountChangePassword />
        </Box>
      </Box>
    </>
  );
}
