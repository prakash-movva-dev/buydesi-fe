import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your account basics. Storefront and bank details live on the Storefront page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>
            Email is {me.data.email ?? '—'} · Mobile is {me.data.mobile ?? '—'}. Contact
            support to change either.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Name</Label>
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-lang">Preferred language</Label>
            <Select
              id="pf-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-56"
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-zone">Zone (optional)</Label>
            <Input id="pf-zone" value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
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
    </div>
  );
};
