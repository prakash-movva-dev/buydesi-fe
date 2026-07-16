import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { ApiError, type SafeUser } from '@/types/api';

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

export const ProfilePage = () => {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['users', 'me'], queryFn: () => api.get<SafeUser>('/users/me') });
  const update = useMutation({
    mutationFn: (patch: { name?: string; preferredLanguage?: string; zone?: string }) =>
      api.put<SafeUser>('/users/me', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'me'] }),
  });

  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [zone, setZone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (me.data) {
      setName(me.data.name);
      setLanguage(me.data.preferredLanguage);
      setZone(me.data.zone ?? '');
    }
  }, [me.data]);

  const submit = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        preferredLanguage: language,
        zone: zone.trim() || undefined,
      });
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  if (me.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!me.data) return null;

  return (
    <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 672, width: '100%' }}>
      <PageHeader
        title="Profile"
        description="Your account basics. Storefront and bank details live on the Storefront page."
      />

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>
            Email is {me.data.email ?? '—'} · Mobile is {me.data.mobile ?? '—'}. Contact
            support to change either.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label="Preferred language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 224 }}
          >
            {LANG_OPTIONS.map((l) => (
              <MenuItem key={l.value} value={l.value}>
                {l.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Zone (optional)"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={submit} disabled={update.isPending}>
              <Save className="h-4 w-4" />
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
            {savedAt && (
              <span className="text-sm text-emerald-700">
                Saved {savedAt.toLocaleTimeString('en-IN')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Stack>
  );
};
