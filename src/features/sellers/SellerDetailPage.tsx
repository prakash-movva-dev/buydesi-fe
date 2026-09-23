import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { varAlpha } from '@/theme/styles';
import { formatInr } from '@/lib/format';
import { fDate, fDateTime } from '@/utils/format-time';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { LoadingScreen } from '@/components/loading-screen';

import { useCategoriesList } from '@/features/categories/api';
import { useClustersList } from '@/features/clusters/api';

import {
  useApproveSeller,
  useKycViewUrl,
  useReactivateSeller,
  useRejectSeller,
  useRequestSellerInfo,
  useSeller,
  useSuspendSeller,
  useToggleVerifiedBadge,
  useWarnSeller,
} from './api';
import { ReviewDialog, type ReviewAction } from './ReviewDialog';
import { DisciplinaryDialog, type DisciplinaryAction } from './DisciplinaryDialog';
import type { DisciplinaryActionType, KycDocument, SellerStatus } from './types';

// ----------------------------------------------------------------------

const businessTypeLabel: Record<string, string> = {
  individual: 'Individual / Farmer',
  proprietorship: 'Sole proprietorship',
  partnership: 'Partnership',
  pvt_ltd: 'Private Limited',
  llp: 'LLP',
  fpo_cooperative: 'FPO / Cooperative',
  other: 'Other',
};

const fulfilmentLabel: Record<string, string> = {
  delhivery_pickup: 'Delhivery pickup',
  self_drop: 'Self-drop at centre',
};

const payoutLabel: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  on_demand: 'On demand',
};

const STATUS_COLOR: Record<SellerStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
  INFO_REQUESTED: 'info',
  SUSPENDED: 'error',
};

const STATUS_LABEL: Record<SellerStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending review',
  REJECTED: 'Rejected',
  INFO_REQUESTED: 'Info requested',
  SUSPENDED: 'Suspended',
};

const docLabel: Record<string, string> = {
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  gst: 'GST certificate',
  bank_proof: 'Bank proof',
  fssai: 'FSSAI licence',
  other: 'Other',
};

const docStatusColor: Record<string, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const disciplinaryLabel: Record<DisciplinaryActionType, string> = {
  warning: 'Warning',
  suspension: 'Suspension',
  reactivation: 'Reactivation',
};

const disciplinaryColor: Record<DisciplinaryActionType, 'warning' | 'error' | 'success'> = {
  warning: 'warning',
  suspension: 'error',
  reactivation: 'success',
};

// ----------------------------------------------------------------------

/** One label/value line. Renders nothing when there is no value to show. */
const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box>
    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
      {label}
    </Typography>
    <Box sx={{ mt: 0.25, typography: 'body2' }}>
      {value === null || value === undefined || value === '' ? (
        <Box component="span" sx={{ color: 'text.disabled' }}>
          —
        </Box>
      ) : (
        value
      )}
    </Box>
  </Box>
);

const ChipList = ({ values, empty }: { values: string[]; empty: string }) =>
  values.length ? (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {values.map((v) => (
        <Chip key={v} size="small" variant="soft" label={v} />
      ))}
    </Stack>
  ) : (
    <Box component="span" sx={{ color: 'text.disabled' }}>
      {empty}
    </Box>
  );

// ----------------------------------------------------------------------

export const SellerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: seller, isLoading, isError, error } = useSeller(id);

  const approve = useApproveSeller();
  const reject = useRejectSeller();
  const requestInfo = useRequestSellerInfo();
  const toggleBadge = useToggleVerifiedBadge();
  const warn = useWarnSeller();
  const suspend = useSuspendSeller();
  const reactivate = useReactivateSeller();

  const [dialogAction, setDialogAction] = useState<ReviewAction | null>(null);
  const [disciplinaryAction, setDisciplinaryAction] = useState<DisciplinaryAction | null>(null);
  const [tab, setTab] = useState<'profile' | 'kyc' | 'reviews' | 'disciplinary'>('profile');

  // Resolve category + cluster ids to readable names.
  const { data: categories } = useCategoriesList();
  const { data: clustersData } = useClustersList({ page: 1, limit: 100 });
  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const clusterName = new Map((clustersData?.items ?? []).map((c) => [c.id, c.name]));

  if (isLoading) return <LoadingScreen sx={{ py: 20 }} />;

  if (isError || !seller) {
    return (
      <>
        <PageHeader title="Seller" />
        <EmptyContent
          filled
          title="Seller not found"
          description={error instanceof Error ? error.message : 'It may have been removed.'}
          action={
            <Button
              variant="contained"
              onClick={() => navigate('/admin/sellers')}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to sellers
            </Button>
          }
          sx={{ py: 10, mt: 3 }}
        />
      </>
    );
  }

  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  const canDiscipline =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;
  const reviewable =
    seller.status === 'PENDING' ||
    seller.status === 'INFO_REQUESTED' ||
    seller.status === 'REJECTED';

  const submitReview = async (notes: string | undefined) => {
    if (!dialogAction || !id) return;
    if (dialogAction === 'approve') await approve.mutateAsync({ id, notes });
    if (dialogAction === 'reject') await reject.mutateAsync({ id, notes });
    if (dialogAction === 'request-info') await requestInfo.mutateAsync({ id, notes });
  };

  const submitDisciplinary = async (reason: string) => {
    if (!disciplinaryAction || !id) return;
    if (disciplinaryAction === 'warn') await warn.mutateAsync({ id, reason });
    if (disciplinaryAction === 'suspend') await suspend.mutateAsync({ id, reason });
    if (disciplinaryAction === 'reactivate') await reactivate.mutateAsync({ id, reason });
  };

  return (
    <>
      <PageHeader
        title={seller.farmName}
        links={[
          { name: 'Dashboard', href: '/admin' },
          { name: 'Sellers', href: '/admin/sellers' },
          { name: seller.farmName },
        ]}
        action={
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/sellers')}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back to sellers
          </Button>
        }
      />

      {/* Hero — who this is, at a glance, with every action that applies. */}
      <Card
        sx={{
          mt: 3,
          p: 3,
          backgroundImage: (theme) =>
            seller.status === 'SUSPENDED'
              ? `linear-gradient(135deg, ${varAlpha(
                  theme.vars.palette.error.lighterChannel,
                  0.28,
                )}, ${varAlpha(theme.vars.palette.error.lightChannel, 0.18)})`
              : `linear-gradient(135deg, ${varAlpha(
                  theme.vars.palette.primary.lighterChannel,
                  0.48,
                )}, ${varAlpha(theme.vars.palette.primary.lightChannel, 0.32)})`,
        }}
      >
        {seller.status === 'SUSPENDED' && (
          <Alert
            severity="error"
            icon={<Iconify icon="solar:forbidden-circle-bold" />}
            sx={{ mb: 3, fontWeight: 600, fontSize: 14 }}
          >
            This seller is <strong>suspended</strong> — they cannot list products or accept orders
            until reactivated.
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Avatar
            alt={seller.farmName}
            src={seller.storefront?.profilePhoto}
            variant="rounded"
            sx={{ width: 80, height: 80, flexShrink: 0 }}
          >
            <Iconify icon="solar:shop-bold" width={36} />
          </Avatar>

          <Stack spacing={1} sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h4">{seller.farmName}</Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Label variant="soft" color={STATUS_COLOR[seller.status]}>
                {STATUS_LABEL[seller.status]}
              </Label>
              {seller.verifiedBadge && (
                <Label
                  variant="soft"
                  color="primary"
                  startIcon={<Iconify icon="solar:verified-check-bold" />}
                >
                  Verified
                </Label>
              )}
              {seller.isLive && (
                <Label variant="soft" color="success">
                  Live
                </Label>
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              useFlexGap
              sx={{ typography: 'body2', color: 'text.secondary' }}
            >
              {/* The readable code — the Mongo id is never shown. */}
              <Box component="span" sx={{ fontFamily: 'monospace' }}>
                {seller.sellerCode ?? '—'}
              </Box>
              <Box component="span">
                {seller.clusterId ? (clusterName.get(seller.clusterId) ?? 'Cluster') : 'Unassigned'}
              </Box>
              <Box component="span">Registered {fDate(seller.createdAt)}</Box>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {reviewable && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => setDialogAction('approve')}
                  startIcon={<Iconify icon="solar:check-circle-bold" />}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDialogAction('request-info')}
                  startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                >
                  Request info
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDialogAction('reject')}
                  startIcon={<Iconify icon="solar:close-circle-bold" />}
                >
                  Reject
                </Button>
              </>
            )}

            {isSuper && (
              <Button
                variant={seller.verifiedBadge ? 'outlined' : 'contained'}
                onClick={() =>
                  toggleBadge.mutate({ id: seller.id, verifiedBadge: !seller.verifiedBadge })
                }
                disabled={toggleBadge.isPending}
                startIcon={<Iconify icon="solar:verified-check-bold" />}
              >
                {seller.verifiedBadge ? 'Revoke verified' : 'Grant verified'}
              </Button>
            )}
          </Stack>
        </Stack>

        {canDiscipline && (
          <>
            <Divider sx={{ my: 3, borderStyle: 'dashed' }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {/* Warn is always available for approved sellers */}
              {seller.status !== 'SUSPENDED' && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => setDisciplinaryAction('warn')}
                  startIcon={<Iconify icon="solar:danger-triangle-bold" />}
                >
                  Issue warning
                </Button>
              )}

              {/* Suspend only when NOT already suspended */}
              {seller.status !== 'SUSPENDED' && (
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => setDisciplinaryAction('suspend')}
                  startIcon={<Iconify icon="solar:forbidden-circle-bold" />}
                >
                  Suspend
                </Button>
              )}

              {/* Reactivate only when suspended */}
              {seller.status === 'SUSPENDED' && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => setDisciplinaryAction('reactivate')}
                  startIcon={<Iconify icon="solar:restart-bold" />}
                >
                  Reactivate seller
                </Button>
              )}
            </Stack>
          </>
        )}
      </Card>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          sx={{
            px: 3,
            boxShadow: (theme) =>
              `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          <Tab value="profile" label="Profile" />
          <Tab value="kyc" label={`KYC (${seller.kycDocuments.length})`} />
          <Tab value="reviews" label="Review history" />
          {canDiscipline && (
            <Tab
              value="disciplinary"
              label={`Disciplinary (${seller.disciplinaryActions?.length ?? 0})`}
            />
          )}
        </Tabs>

        {tab === 'profile' && (
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid xs={12} md={6}>
              <CardHeader title="Farm & business" sx={{ p: 0, mb: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <Field
                    label="Business type"
                    value={
                      seller.businessType
                        ? (businessTypeLabel[seller.businessType] ?? seller.businessType)
                        : undefined
                    }
                  />
                  <Field label="GST number" value={seller.gstNumber} />
                  <Field label="Pincode" value={seller.pincode} />
                  <Field
                    label="Cluster"
                    value={
                      seller.clusterId ? (clusterName.get(seller.clusterId) ?? 'Unknown') : undefined
                    }
                  />
                  <Field
                    label="Payout preference"
                    value={payoutLabel[seller.payoutPreference] ?? seller.payoutPreference}
                  />
                  <Field
                    label="Bank details"
                    value={
                      seller.hasBankDetails
                        ? `•••• ${seller.bankAccountLast4 ?? '----'}`
                        : undefined
                    }
                  />
                </Box>

                <Field
                  label="Address"
                  value={
                    <>
                      {seller.address.line1}
                      {seller.address.line2 ? `, ${seller.address.line2}` : ''}
                      <br />
                      {seller.address.city}, {seller.address.state} — {seller.address.pincode}
                    </>
                  }
                />

                <Field
                  label="Categories"
                  value={
                    <ChipList
                      values={seller.categoryIds.map((cid) => categoryName.get(cid) ?? cid)}
                      empty="No categories selected"
                    />
                  }
                />

                {seller.businessProfile && (
                  <>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <Field
                        label="Owns a brand"
                        value={
                          seller.businessProfile.ownsBrand === undefined
                            ? undefined
                            : seller.businessProfile.ownsBrand
                              ? 'Yes'
                              : 'No'
                        }
                      />
                      <Field
                        label="Expected listings / mo"
                        value={seller.businessProfile.expectedMonthlyListings}
                      />
                      <Field
                        label="Avg product price"
                        value={
                          seller.businessProfile.averagePriceInr != null
                            ? formatInr(seller.businessProfile.averagePriceInr)
                            : undefined
                        }
                      />
                      <Field
                        label="Fulfilment"
                        value={
                          seller.businessProfile.fulfillmentPreference
                            ? fulfilmentLabel[seller.businessProfile.fulfillmentPreference]
                            : undefined
                        }
                      />
                    </Box>
                  </>
                )}
              </Stack>
            </Grid>

            <Grid xs={12} md={6}>
              <CardHeader title="Storefront" sx={{ p: 0, mb: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <Field label="Display name" value={seller.storefront.displayName} />
                  <Field label="Store language" value={seller.storefront.language} />
                  <Field label="Support email" value={seller.storefront.supportEmail} />
                  <Field
                    label="Returns address"
                    value={
                      seller.storefront.returnsAddress
                        ? `${seller.storefront.returnsAddress.line} — ${seller.storefront.returnsAddress.pincode}`
                        : undefined
                    }
                  />
                </Box>

                <Field label="Description" value={seller.storefront.description} />

                <Field
                  label="Practices"
                  value={
                    <ChipList values={seller.storefront.practices} empty="None listed" />
                  }
                />

                <Field
                  label="Certifications"
                  value={
                    <ChipList values={seller.storefront.certifications} empty="None listed" />
                  }
                />
              </Stack>
            </Grid>
          </Grid>
        )}

        {tab === 'kyc' && (
          <CardContent>
            {seller.kycDocuments.length === 0 ? (
              <EmptyContent
                filled
                title="No documents uploaded"
                description="The seller has not submitted KYC yet."
                sx={{ py: 8 }}
              />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                }}
              >
                {seller.kycDocuments.map((doc) => (
                  <KycDocCard key={`${doc.type}-${doc.s3Key}`} sellerId={seller.id} doc={doc} />
                ))}
              </Box>
            )}
          </CardContent>
        )}

        {tab === 'reviews' && (
          <CardContent>
            <Stack spacing={2} sx={{ maxWidth: 600 }}>
              <Field label="Last reviewed" value={fDateTime(seller.reviewedAt)} />
              <Field label="Live since" value={fDateTime(seller.liveAt)} />
              <Field
                label="Notes"
                value={
                  seller.reviewNotes ? (
                    <Box sx={{ whiteSpace: 'pre-wrap' }}>{seller.reviewNotes}</Box>
                  ) : undefined
                }
              />
            </Stack>
          </CardContent>
        )}

        {tab === 'disciplinary' && canDiscipline && (
          <CardContent>
            {!seller.disciplinaryActions || seller.disciplinaryActions.length === 0 ? (
              <EmptyContent
                filled
                title="Nothing on record"
                description="No warnings, suspensions or reactivations against this seller."
                sx={{ py: 8 }}
              />
            ) : (
              <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} spacing={2}>
                {[...seller.disciplinaryActions]
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .map((action, i) => (
                    <Stack
                      key={`${action.type}-${action.at}-${i}`}
                      direction="row"
                      spacing={2}
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Stack spacing={1}>
                        <Box>
                          <Label variant="soft" color={disciplinaryColor[action.type]}>
                            {disciplinaryLabel[action.type]}
                          </Label>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {action.reason}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        {fDateTime(action.at)}
                      </Typography>
                    </Stack>
                  ))}
              </Stack>
            )}
          </CardContent>
        )}
      </Card>

      <ReviewDialog
        open={dialogAction !== null}
        action={dialogAction}
        onClose={() => setDialogAction(null)}
        onSubmit={submitReview}
      />

      <DisciplinaryDialog
        open={disciplinaryAction !== null}
        action={disciplinaryAction}
        onClose={() => setDisciplinaryAction(null)}
        onSubmit={submitDisciplinary}
      />
    </>
  );
};

// ----------------------------------------------------------------------

const KycDocCard = ({ sellerId, doc }: { sellerId: string; doc: KycDocument }) => {
  const { data, isLoading, isError } = useKycViewUrl(sellerId, doc.s3Key);

  const url = data?.url;
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(doc.s3Key);

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, bgcolor: 'background.neutral' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Iconify icon="solar:document-text-bold" width={18} sx={{ color: 'text.disabled' }} />
          <Typography variant="subtitle2" noWrap>
            {docLabel[doc.type] ?? doc.type}
          </Typography>
        </Stack>
        <Label variant="soft" color={docStatusColor[doc.status] ?? 'default'}>
          {doc.status}
        </Label>
      </Stack>

      <Link
        href={url}
        target="_blank"
        rel="noreferrer"
        underline="none"
        onClick={(e) => {
          if (!url) e.preventDefault();
        }}
        sx={{
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'common.white',
        }}
      >
        {isImage && url ? (
          <Box
            component="img"
            src={url}
            alt={doc.type}
            sx={{ width: 1, height: 1, objectFit: 'contain' }}
          />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            {isLoading ? 'Loading…' : isError ? 'Preview unavailable' : 'Open document ↗'}
          </Typography>
        )}
      </Link>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5 }}
      >
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {fDate(doc.uploadedAt)}
        </Typography>
        {url && (
          <Link href={url} target="_blank" rel="noreferrer" variant="caption">
            Open full ↗
          </Link>
        )}
      </Stack>
    </Card>
  );
};
