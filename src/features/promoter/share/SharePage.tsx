import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Copy, MessageCircle, Sparkles } from 'lucide-react';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMyPromoterDashboard } from '../api';
import {
  buildShareLink,
  buildWhatsAppLink,
  MESSAGE_TEMPLATES,
  renderTemplate,
} from './helpers';

export const PromoterSharePage = () => {
  const { data: d, isLoading, isError, error } = useMyPromoterDashboard();
  const [locale, setLocale] = useState('en');
  const [copied, setCopied] = useState<'code' | 'link' | 'message' | null>(null);

  const link = useMemo(() => (d ? buildShareLink(d.couponCode) : ''), [d]);
  const template = MESSAGE_TEMPLATES.find((t) => t.locale === locale) ?? MESSAGE_TEMPLATES[0];
  const message = useMemo(
    () => (d ? renderTemplate(template.template, d.couponCode, link) : ''),
    [d, template, link],
  );

  const copy = async (text: string, kind: typeof copied) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // best-effort
    }
  };

  const downloadQr = () => {
    const svg = document.getElementById('promoter-qr-svg');
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d?.couponCode ?? 'promoter'}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !d) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Failed to load your promoter profile.'}
      </div>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Share kit"
        description="Everything you need to spread your code — a QR for posters, message templates for WhatsApp, and shortcuts to copy the link."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Your code at a glance
            </CardTitle>
            <CardDescription>
              {d.active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border bg-secondary/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider">
                {d.couponCode}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Share link
              </p>
              <p className="mt-1 break-all font-mono text-sm">{link}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => copy(d.couponCode, 'code')}>
                {copied === 'code' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied === 'code' ? 'Copied' : 'Copy code'}
              </Button>
              <Button variant="outline" onClick={() => copy(link, 'link')}>
                {copied === 'link' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied === 'link' ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">QR code</CardTitle>
            <CardDescription>Print or paste anywhere — it points to your share link.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="rounded-md border border-border bg-white p-3">
              <QRCodeSVG
                id="promoter-qr-svg"
                value={link}
                size={192}
                level="M"
                includeMargin={false}
              />
            </div>
            <Button variant="outline" size="sm" onClick={downloadQr}>
              Download SVG
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Pre-formatted message
          </CardTitle>
          <CardDescription>
            Pick a language — the message uses your code and share link automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TextField
            select
            label="Language"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 224 }}
          >
            {MESSAGE_TEMPLATES.map((t) => (
              <MenuItem key={t.locale} value={t.locale}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={message}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            InputProps={{ readOnly: true }}
            inputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => copy(message, 'message')}>
              {copied === 'message' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied === 'message' ? 'Copied' : 'Copy message'}
            </Button>
            <a
              href={buildWhatsAppLink(message)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4" />
              Share on WhatsApp
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tips for promoters</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Stick the QR poster at vegetable shops, mandis, kirana stores.</li>
            <li>Share the message in your community WhatsApp groups before festival weekends — that's when fresh-produce demand peaks.</li>
            <li>Your code stays the same forever, even if Buy Desi changes the discount value. Update the message text only if needed.</li>
            <li>The platform sees every signup that used your code — your "Buyers referred" and "Sellers referred" numbers grow over time, even if those people don't shop right away.</li>
          </ul>
        </CardContent>
      </Card>
    </Stack>
  );
};
