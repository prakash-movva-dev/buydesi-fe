import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';

import { useTabs } from '@/hooks/use-tabs';

import { api } from '@/lib/api';
import { ApiError, type SafeUser } from '@/types/api';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';

import { useSellerMe } from './api';
import { AccountAvatarCard } from './AccountAvatarCard';
import { AccountChangePassword } from './AccountChangePassword';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'general', label: 'General', icon: <Iconify icon="solar:user-id-bold" width={24} /> },
  { value: 'security', label: 'Security', icon: <Iconify icon="ic:round-vpn-key" width={24} /> },
];

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' },
];

// ----------------------------------------------------------------------

export const ProfilePage = () => {
  const tabs = useTabs('general');

  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['users', 'me'], queryFn: () => api.get<SafeUser>('/users/me') });
  const seller = useSellerMe();

  const update = useMutation({
    mutationFn: (patch: { name?: string; preferredLanguage?: string; zone?: string }) =>
      api.put<SafeUser>('/users/me', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'me'] }),
  });

  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [zone, setZone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me.data) return;
    setName(me.data.name);
    setLanguage(me.data.preferredLanguage);
    setZone(me.data.zone ?? '');
  }, [me.data]);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    try {
      await update.mutateAsync({
        name: name.trim(),
        preferredLanguage: language,
        zone: zone.trim() || undefined,
      });
      toast.success('Profile updated');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  if (me.isLoading) return <LoadingScreen sx={{ py: 20 }} />;
  if (!me.data) return null;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your details and how you sign in. Storefront and bank details live on the Storefront page."
      />

      <Tabs value={tabs.value} onChange={tabs.onChange} sx={{ mt: 3, mb: { xs: 3, md: 5 } }}>
        {TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} icon={tab.icon} />
        ))}
      </Tabs>

      {tabs.value === 'general' && (
        <Grid container spacing={3}>
          <Grid xs={12} md={4}>
            <AccountAvatarCard
              sellerId={seller.data?.id}
              photoUrl={seller.data?.storefront?.profilePhoto}
              name={me.data.name}
            />
          </Grid>

          <Grid xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Box
                rowGap={3}
                columnGap={2}
                display="grid"
                gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}
              >
                <TextField
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                {/* Email and mobile are the sign-in identifiers — changing one
                    is a support action, not a self-service edit. */}
                <TextField
                  disabled
                  label="Email address"
                  value={me.data.email ?? '—'}
                  helperText="Contact support to change this"
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  disabled
                  label="Mobile number"
                  value={me.data.mobile ?? '—'}
                  helperText="Contact support to change this"
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  select
                  label="Preferred language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                >
                  {LANG_OPTIONS.map((l) => (
                    <MenuItem key={l.value} value={l.value}>
                      {l.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Zone"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="e.g. South"
                  helperText="Optional — the region you operate in"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              )}

              <Stack spacing={3} alignItems="flex-end" sx={{ mt: 3 }}>
                <LoadingButton variant="contained" loading={update.isPending} onClick={submit}>
                  Save changes
                </LoadingButton>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabs.value === 'security' && <AccountChangePassword />}
    </>
  );
};
