import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';

import { varAlpha } from '@/theme/styles';

import { Label } from '@/components/label';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyContent } from '@/components/empty-content';
import { TableHeadCustom } from '@/components/table';

import { ApiError } from '@/types/api';
import { fDate } from '@/utils/format-time';
import { fCurrency, fNumber } from '@/utils/format-number';
import { useClustersList } from '@/features/clusters/api';

import {
  useAffiliate,
  useAffiliateCoupons,
  useAffiliateLinks,
  useConversionsList,
  useSetCouponActive,
  useUpdateAffiliate,
} from './api';
import { GrantCouponDialog } from './GrantCouponDialog';
import {
  AFFILIATE_STATUS_LABEL,
  AffiliateStatusBadge,
  ConversionStatusBadge,
  TARGET_ICON,
  TARGET_LABEL,
  VIA_LABEL,
} from './status-badge';

// ----------------------------------------------------------------------

const LINK_HEAD = [
  { id: 'code', label: 'Code' },
  { id: 'target', label: 'Points at', width: 200 },
  { id: 'clicks', label: 'Clicks', align: 'right' as const, width: 100 },
  { id: 'orders', label: 'Orders', align: 'right' as const, width: 100 },
  { id: 'created', label: 'Created', width: 130 },
  { id: 'state', label: '', width: 100 },
];

const COUPON_HEAD = [
  { id: 'code', label: 'Code' },
  { id: 'discount', label: 'Takes off', width: 160 },
  { id: 'min', label: 'Minimum order', align: 'right' as const, width: 150 },
  { id: 'expires', label: 'Expires', width: 130 },
  { id: 'state', label: '', width: 120 },
];

const SALE_HEAD = [
  { id: 'order', label: 'Order' },
  { id: 'via', label: 'Attributed by', width: 150 },
  { id: 'value', label: 'Order value', align: 'right' as const, width: 130 },
  { id: 'rate', label: 'Rate', align: 'right' as const, width: 80 },
  { id: 'commission', label: 'Commission', align: 'right' as const, width: 130 },
  { id: 'when', label: 'Placed', width: 130 },
  { id: 'status', label: 'Status', width: 140 },
];

type TabValue = 'links' | 'coupons' | 'sales' | 'settings';

// ----------------------------------------------------------------------

/**
 * One affiliate: what they have shared, what you have given them, what it
 * earned, and the two levers you hold — their rate and their standing.
 */
export const AffiliateDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabValue>('links');
  const [couponOpen, setCouponOpen] = useState(false);

  const { data: affiliate, isLoading, isError, error } = useAffiliate(id);
  const { data: links } = useAffiliateLinks(id);
  const { data: coupons } = useAffiliateCoupons(id);
  const { data: sales } = useConversionsList({ affiliateId: id, page: 1, limit: 50 });
  const { data: clusters } = useClustersList({ page: 1, limit: 100 });

  const update = useUpdateAffiliate();
  const setCouponActive = useSetCouponActive();

  const [rate, setRate] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (isLoading) return <LoadingScreen />;
  if (isError || !affiliate) {
    return (
      <>
        <PageHeader title="Affiliate" />
        <Alert severity="error" sx={{ mt: 3 }}>
          {error instanceof Error ? error.message : 'Could not load this affiliate'}
        </Alert>
      </>
    );
  }

  const clusterName = (clusters?.items ?? []).find((c) => c.id === affiliate.clusterId)?.name;
  const rateValue = rate ?? String(affiliate.commissionRatePercent ?? '');
  const statusValue = (status ?? affiliate.status) as typeof affiliate.status;

  const save = async () => {
    try {
      await update.mutateAsync({
        id,
        status: statusValue,
        commissionRatePercent: rateValue === '' ? null : Number(rateValue),
        suspendedReason: statusValue === 'suspended' ? reason || undefined : undefined,
      });
      toast.success('Affiliate updated');
      setRate(null);
      setStatus(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save');
    }
  };

  const METRICS = [
    { label: 'Links shared', value: fNumber(affiliate.linkCount), icon: 'solar:link-round-bold' },
    { label: 'Clicks', value: fNumber(affiliate.clicks), icon: 'solar:cursor-bold' },
    { label: 'Orders brought', value: fNumber(affiliate.orders), icon: 'solar:bag-check-bold' },
    { label: 'Paid so far', value: fCurrency(affiliate.earnedInr), icon: 'solar:wallet-money-bold' },
    { label: 'Still to come', value: fCurrency(affiliate.pendingInr), icon: 'solar:clock-circle-bold' },
  ];

  return (
    <>
      <PageHeader
        title={affiliate.name}
        links={[
          { name: 'Dashboard', href: '/admin' },
          { name: 'Affiliates', href: '/admin/affiliates' },
          { name: affiliate.name },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/admin/affiliates/conversions?affiliateId=${id}`)}
              startIcon={<Iconify icon="solar:hand-money-bold" />}
            >
              Their sales
            </Button>
            <Button
              variant="contained"
              onClick={() => setCouponOpen(true)}
              startIcon={<Iconify icon="solar:ticket-bold" />}
            >
              Grant a coupon
            </Button>
          </Stack>
        }
      />

      <Card sx={{ mt: 3, p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 260 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.lighter', color: 'primary.dark' }}>
              <Iconify icon="solar:user-speak-rounded-bold" width={28} />
            </Avatar>
            <Stack spacing={0.5}>
              <Typography variant="h6">{affiliate.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {affiliate.mobile ?? affiliate.email ?? 'No contact on file'}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <AffiliateStatusBadge status={affiliate.status} />
                <Label variant="soft" color="info">
                  {affiliate.effectiveCommissionPercent}%
                </Label>
              </Stack>
            </Stack>
          </Stack>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />

          <Grid container spacing={2} sx={{ flexGrow: 1, width: 1 }}>
            {METRICS.map((m) => (
              <Grid key={m.label} xs={6} sm={4} md>
                <Stack spacing={0.25}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon={m.icon} width={16} sx={{ color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {m.label}
                    </Typography>
                  </Stack>
                  <Typography variant="h6">{m.value}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>

        {affiliate.status === 'suspended' && affiliate.suspendedReason && (
          <Alert severity="warning" variant="outlined" sx={{ mt: 2.5 }}>
            Suspended — {affiliate.suspendedReason}
          </Alert>
        )}
      </Card>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setTab(value as TabValue)}
          sx={{
            px: 3,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          <Tab value="links" label={`Their links (${links?.length ?? 0})`} />
          <Tab value="coupons" label={`Coupons you gave (${coupons?.length ?? 0})`} />
          <Tab value="sales" label={`Sales (${sales?.meta.total ?? 0})`} />
          <Tab value="settings" label="Rate and standing" />
        </Tabs>

        {tab === 'links' && (
          <Scrollbar>
            {(links?.length ?? 0) === 0 ? (
              <EmptyContent
                filled
                sx={{ m: 3, py: 8 }}
                title="No links yet"
                description="They create these themselves from their own dashboard."
              />
            ) : (
              <Table sx={{ minWidth: 800 }}>
                <TableHeadCustom headLabel={LINK_HEAD} />
                <TableBody>
                  {(links ?? []).map((link) => (
                    <TableRow key={link._id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', typography: 'subtitle2' }}>
                        {link.code}
                        {link.label && (
                          <Box
                            component="span"
                            sx={{
                              display: 'block',
                              fontFamily: 'body1.fontFamily',
                              color: 'text.disabled',
                              typography: 'caption',
                            }}
                          >
                            {link.label}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Iconify
                            icon={TARGET_ICON[link.targetType]}
                            width={16}
                            sx={{ color: 'text.disabled' }}
                          />
                          <Box component="span" sx={{ typography: 'body2' }}>
                            {TARGET_LABEL[link.targetType]}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{fNumber(link.clickCount)}</TableCell>
                      <TableCell align="right">{fNumber(link.conversionCount)}</TableCell>
                      <TableCell sx={{ typography: 'caption' }}>{fDate(link.createdAt)}</TableCell>
                      <TableCell>
                        <Label variant="soft" color={link.active ? 'success' : 'default'}>
                          {link.active ? 'Live' : 'Off'}
                        </Label>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Scrollbar>
        )}

        {tab === 'coupons' && (
          <Scrollbar>
            {(coupons?.length ?? 0) === 0 ? (
              <EmptyContent
                filled
                sx={{ m: 3, py: 8 }}
                title="No coupons granted"
                description="A coupon lets them attribute a sale without a click — useful for sharing in person."
              />
            ) : (
              <Table sx={{ minWidth: 760 }}>
                <TableHeadCustom headLabel={COUPON_HEAD} />
                <TableBody>
                  {(coupons ?? []).map((coupon) => (
                    <TableRow key={coupon._id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', typography: 'subtitle2' }}>
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        {coupon.discountType === 'percent'
                          ? `${coupon.discountValue}%${
                              coupon.maxDiscountInr
                                ? ` (max ${fCurrency(coupon.maxDiscountInr)})`
                                : ''
                            }`
                          : fCurrency(coupon.discountValue)}
                      </TableCell>
                      <TableCell align="right">
                        {coupon.minSubtotalInr > 0 ? fCurrency(coupon.minSubtotalInr) : '—'}
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>
                        {coupon.expiresAt ? fDate(coupon.expiresAt) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Label variant="soft" color={coupon.active ? 'success' : 'default'}>
                            {coupon.active ? 'Live' : 'Off'}
                          </Label>
                          <Tooltip title={coupon.active ? 'Switch off' : 'Switch on'}>
                            <IconButton
                              size="small"
                              disabled={setCouponActive.isPending}
                              onClick={() =>
                                setCouponActive.mutate({
                                  couponId: coupon._id,
                                  active: !coupon.active,
                                })
                              }
                            >
                              <Iconify
                                icon={coupon.active ? 'solar:pause-bold' : 'solar:play-bold'}
                                width={16}
                              />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Scrollbar>
        )}

        {tab === 'sales' && (
          <Scrollbar>
            {(sales?.items.length ?? 0) === 0 ? (
              <EmptyContent
                filled
                sx={{ m: 3, py: 8 }}
                title="No sales attributed yet"
                description="A sale lands here when someone buys after using one of their links or codes."
              />
            ) : (
              <Table sx={{ minWidth: 900 }}>
                <TableHeadCustom headLabel={SALE_HEAD} />
                <TableBody>
                  {(sales?.items ?? []).map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', typography: 'caption' }}>
                        {sale.orderNumber ?? '—'}
                      </TableCell>
                      <TableCell sx={{ typography: 'body2' }}>
                        {VIA_LABEL[sale.via]}
                        {sale.code && (
                          <Box
                            component="span"
                            sx={{ display: 'block', color: 'text.disabled', typography: 'caption' }}
                          >
                            {sale.code}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">{fCurrency(sale.orderSubtotalInr)}</TableCell>
                      <TableCell align="right">{sale.commissionRatePercent}%</TableCell>
                      <TableCell align="right" sx={{ typography: 'subtitle2' }}>
                        {fCurrency(sale.commissionInr)}
                      </TableCell>
                      <TableCell sx={{ typography: 'caption' }}>{fDate(sale.createdAt)}</TableCell>
                      <TableCell>
                        <ConversionStatusBadge status={sale.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Scrollbar>
        )}

        {tab === 'settings' && (
          <Stack spacing={3} sx={{ p: 3, maxWidth: 560 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Commission rate</Typography>
              <TextField
                fullWidth
                type="number"
                value={rateValue}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Empty = the platform default"
                inputProps={{ min: 0, max: 100, step: 0.5 }}
                helperText={`Currently earning ${affiliate.effectiveCommissionPercent}% of each order subtotal${
                  affiliate.commissionRatePercent === null ? ' (platform default)' : ''
                }. Changing this only affects sales from now on — what has already been earned is fixed.`}
              />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Standing</Typography>
              <TextField
                select
                fullWidth
                value={statusValue}
                onChange={(e) => setStatus(e.target.value)}
                helperText="Suspending switches off every link they have. Sales already attributed are untouched."
              >
                {(['pending', 'active', 'suspended'] as const).map((s) => (
                  <MenuItem key={s} value={s}>
                    {AFFILIATE_STATUS_LABEL[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {statusValue === 'suspended' && (
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Why"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Recorded on their account and shown here"
              />
            )}

            {clusterName && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Works the {clusterName} cluster
              </Typography>
            )}

            <Box>
              <LoadingButton variant="contained" loading={update.isPending} onClick={save}>
                Save changes
              </LoadingButton>
            </Box>
          </Stack>
        )}
      </Card>

      <GrantCouponDialog
        open={couponOpen}
        onClose={() => setCouponOpen(false)}
        affiliateId={id}
        affiliateName={affiliate.name}
      />
    </>
  );
};
