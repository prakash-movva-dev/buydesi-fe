import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Gift,
  RefreshCw,
  Share2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
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
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import { useMyPromoterDashboard, useMyPromoterUsage } from '../api';
import { buildShareLink } from '../share/helpers';

export const PromoterDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: d, isLoading, isError, error, refetch, isFetching } = useMyPromoterDashboard();
  const usage = useMyPromoterUsage(1, 10);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copy = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // clipboard not available — UI will look like nothing happened
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !d) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : 'No promoter record found for your account. Contact support if you think this is wrong.'}
      </div>
    );
  }

  const shareLink = buildShareLink(d.couponCode);
  const usageItems = usage.data?.items ?? [];

  // Derived metrics
  const avgDiscountPerOrder =
    d.totalUses > 0 ? d.totalDiscountInr / d.totalUses : 0;
  const avgOrderValue = d.totalUses > 0 ? d.totalOrderValueInr / d.totalUses : 0;
  const gmvPerRupeeDiscount =
    d.totalDiscountInr > 0 ? d.totalOrderValueInr / d.totalDiscountInr : null;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`Hi, ${user?.name.split(' ')[0] ?? d.name}`}
        description="Your referral performance at a glance. Share your code to drive sign-ups and checkouts on Buy Desi."
        action={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate('/promoter/share')}>
              <Share2 className="h-4 w-4" />
              Share kit
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" />
            Your referral code
          </CardTitle>
          <CardDescription>
            Buyers can apply it at checkout for a discount, and new signups citing it are
            attributed to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 p-4">
            <div>
              <p className="font-mono text-3xl font-bold tracking-wider">{d.couponCode}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Active since {formatDate(d.since)}
              </p>
            </div>
            <Badge variant={d.active ? 'success' : 'destructive'}>
              {d.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => copy(d.couponCode, 'code')}>
              {copiedCode ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copiedCode ? 'Copied' : 'Copy code'}
            </Button>
            <Button variant="outline" onClick={() => copy(shareLink, 'link')}>
              {copiedLink ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copiedLink ? 'Copied' : 'Copy share link'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/promoter/share')}>
              <Share2 className="h-4 w-4" />
              QR code & templates
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Total uses" value={String(d.totalUses)} icon={Sparkles} />
        <Metric label="Discount given" value={formatInr(d.totalDiscountInr)} icon={Gift} muted />
        <Metric label="GMV driven" value={formatInr(d.totalOrderValueInr)} icon={ShoppingBag} highlight />
        <Metric label="Unique buyers" value={String(d.uniqueBuyers)} icon={Users} />
        <Metric label="Buyers referred" value={String(d.buyersReferred)} icon={Users} />
        <Metric label="Sellers referred" value={String(d.sellersReferred)} icon={Users} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Computed signals
          </CardTitle>
          <CardDescription>
            Quick ratios from the numbers above — useful for sharing your impact.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <SubMetric
            label="Avg. discount per order"
            value={d.totalUses > 0 ? formatInr(avgDiscountPerOrder) : '—'}
          />
          <SubMetric
            label="Avg. order value"
            value={d.totalUses > 0 ? formatInr(avgOrderValue) : '—'}
          />
          <SubMetric
            label="GMV per ₹1 discount"
            value={
              gmvPerRupeeDiscount === null
                ? '—'
                : `₹${gmvPerRupeeDiscount.toFixed(1)}`
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Recent uses</CardTitle>
            <CardDescription>
              Latest checkouts that applied your code (most recent first).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usage.isLoading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {usage.isError && (
            <Typography variant="body2" sx={{ p: 2, color: 'error.main' }}>
              Couldn't load usage feed.
            </Typography>
          )}
          {!usage.isLoading && !usage.isError && (
            <Scrollbar>
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom
                  headLabel={[
                    { id: 'when', label: 'When' },
                    { id: 'buyer', label: 'Buyer' },
                    { id: 'order', label: 'Order' },
                    { id: 'total', label: 'Order total', align: 'right' as const },
                    { id: 'discount', label: 'Discount', align: 'right' as const },
                  ]}
                />
                <TableBody>
                  {usageItems.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ typography: 'caption' }}>{formatDateTime(u.usedAt)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                        {u.buyerId.slice(-8)}
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {u.orderNumber ?? (
                          <Box component="span" sx={{ color: 'text.secondary' }}>
                            validate-only
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {u.orderTotalInr !== null ? formatInr(u.orderTotalInr) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>
                        {u.discountInr !== null ? formatInr(u.discountInr) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableNoData
                    notFound={!usage.isLoading && !usage.isError && usageItems.length === 0}
                  />
                </TableBody>
              </Table>
            </Scrollbar>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <NavTile
            label="Share kit"
            hint="QR code, message templates, WhatsApp"
            onClick={() => navigate('/promoter/share')}
          />
          <NavTile
            label="My support tickets"
            hint="Raise an issue"
            onClick={() => navigate('/promoter/support')}
          />
          <NavTile
            label="My profile"
            hint="Name, language"
            onClick={() => navigate('/promoter/profile')}
          />
        </CardContent>
      </Card>
    </Stack>
  );
};

interface MetricProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  muted?: boolean;
}

const Metric = ({ label, value, icon: Icon, highlight, muted }: MetricProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </CardDescription>
      <CardTitle
        className={`text-2xl ${highlight ? 'text-emerald-700' : muted ? 'text-muted-foreground' : ''}`}
      >
        {value}
      </CardTitle>
    </CardHeader>
  </Card>
);

const SubMetric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
);

const NavTile = ({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/20 px-3 py-3 text-left transition-colors hover:bg-secondary/40"
  >
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </button>
);
