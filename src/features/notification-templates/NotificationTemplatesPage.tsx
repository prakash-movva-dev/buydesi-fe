import { useMemo, useState } from 'react';
import { Bell, Languages, Search } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useNotificationTemplates } from './api';

const localeLabel: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  pa: 'Punjabi',
};

export const NotificationTemplatesPage = () => {
  const { data, isLoading, isError, error } = useNotificationTemplates();
  const [q, setQ] = useState('');

  const keys = useMemo(() => Object.keys(data ?? {}).sort(), [data]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return keys;
    return keys.filter((k) => {
      if (k.toLowerCase().includes(s)) return true;
      const locales = data?.[k] ?? {};
      return Object.values(locales).some(
        (t) =>
          t.title.toLowerCase().includes(s) || t.body.toLowerCase().includes(s),
      );
    });
  }, [keys, q, data]);

  const totalLocaleCoverage = useMemo(() => {
    if (!data) return 0;
    const supported = Object.keys(localeLabel).length;
    const sum = Object.values(data).reduce(
      (acc, locales) => acc + Object.keys(locales).length,
      0,
    );
    return Math.round((sum / (keys.length * supported)) * 100);
  }, [data, keys.length]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Notification templates"
        description={
          <>
            Read-only catalogue of in-app, email and push notification templates by locale.
            Variables in the body (e.g.{' '}
            <code className="font-mono text-xs">{'{{orderNumber}}'}</code>) are substituted at
            dispatch time.
          </>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' },
        }}
      >
        <MetricCard
          icon={Bell}
          label="Template keys"
          value={isLoading ? null : keys.length}
        />
        <MetricCard
          icon={Languages}
          label="Supported locales"
          value={Object.keys(localeLabel).length}
        />
        <MetricCard
          icon={Languages}
          label="Locale coverage"
          value={isLoading ? null : `${totalLocaleCoverage}%`}
        />
      </Box>

      <div className="relative w-96 max-w-full">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search keys, titles or bodies…"
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}
      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load templates'}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-4">
          {filtered.map((key) => {
            const locales = data?.[key] ?? {};
            const localeKeys = Object.keys(locales).sort();
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-base">{key}</CardTitle>
                  <CardDescription>
                    {localeKeys.length} locale{localeKeys.length === 1 ? '' : 's'}
                    {' · '}
                    {localeKeys.map((l) => (
                      <Badge key={l} variant="muted" className="ml-1">
                        {l}
                      </Badge>
                    ))}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {localeKeys.map((l) => {
                      const t = locales[l];
                      return (
                        <li key={l} className="rounded-md border border-border bg-secondary/20 p-3 text-sm">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="info">{localeLabel[l] ?? l}</Badge>
                            <span className="text-xs font-mono text-muted-foreground">{l}</span>
                          </div>
                          <p className="font-medium">{t.title}</p>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{t.body}</p>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No templates match the search.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Stack>
  );
};

interface MetricProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null;
}

const MetricCard = ({ icon: Icon, label, value }: MetricProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </CardDescription>
      {value === null ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <CardTitle className="text-3xl">{value}</CardTitle>
      )}
    </CardHeader>
  </Card>
);
