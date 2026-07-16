import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  FileText,
  MessageSquare,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCategoriesList } from '@/features/categories/api';
import { useClustersList } from '@/features/clusters/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import { UserRole } from '@/types/api';
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
import type { KycDocument } from './types';
import { DisciplinaryDialog, type DisciplinaryAction } from './DisciplinaryDialog';
import { ReviewDialog, type ReviewAction } from './ReviewDialog';
import { SellerStatusBadge } from './status-badge';
import type { DisciplinaryActionType } from './types';

const docLabel: Record<string, string> = {
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  passport: 'Passport',
  fssai: 'FSSAI',
  gst: 'GST',
  bank_proof: 'Bank proof',
  other: 'Other',
};

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

const docStatusVariant = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
} as const;

const payoutLabel: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  on_demand: 'On demand',
};

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

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </Stack>
    );
  }

  if (isError || !seller) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Seller not found'}
      </div>
    );
  }

  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  const canDiscipline =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CLUSTER_ADMIN;
  const reviewable =
    seller.status === 'PENDING' || seller.status === 'INFO_REQUESTED' || seller.status === 'REJECTED';

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
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/sellers')}>
          <ArrowLeft className="h-4 w-4" />
          Back to sellers
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <div>
          <Typography variant="h4" component="h1">{seller.farmName}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            ID {seller.id} · submitted {formatDate(seller.createdAt)}
          </Typography>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SellerStatusBadge status={seller.status} />
            {seller.verifiedBadge && (
              <Badge variant="info">
                <BadgeCheck className="mr-1 inline h-3 w-3" />
                Verified by Buy Desi
              </Badge>
            )}
            {seller.isLive && <Badge variant="success">Live</Badge>}
          </div>
        </div>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {reviewable && (
            <>
              <Button onClick={() => setDialogAction('approve')}>
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => setDialogAction('request-info')}>
                <MessageSquare className="h-4 w-4" />
                Request info
              </Button>
              <Button variant="destructive" onClick={() => setDialogAction('reject')}>
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {isSuper && (
            <Button
              variant={seller.verifiedBadge ? 'outline' : 'secondary'}
              onClick={() =>
                toggleBadge.mutate({ id: seller.id, verifiedBadge: !seller.verifiedBadge })
              }
              disabled={toggleBadge.isPending}
            >
              <BadgeCheck className="h-4 w-4" />
              {seller.verifiedBadge ? 'Revoke verified' : 'Grant verified'}
            </Button>
          )}
          {canDiscipline && (
            <>
              <Button variant="outline" onClick={() => setDisciplinaryAction('warn')}>
                <AlertTriangle className="h-4 w-4" />
                Issue warning
              </Button>
              <Button variant="destructive" onClick={() => setDisciplinaryAction('suspend')}>
                <Ban className="h-4 w-4" />
                Suspend
              </Button>
              <Button variant="outline" onClick={() => setDisciplinaryAction('reactivate')}>
                <RotateCcw className="h-4 w-4" />
                Reactivate
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="profile" label="Profile" />
        <Tab value="kyc" label="KYC" />
        <Tab value="reviews" label="Reviews" />
        <Tab value="disciplinary" label="Disciplinary" />
      </Tabs>

      {tab === 'profile' && (
      <Stack spacing={3}>
        <Card>
          <CardHeader>
            <CardTitle>Farm & business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Business type"
                value={
                  seller.businessType ? (
                    businessTypeLabel[seller.businessType] ?? seller.businessType
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                }
              />
              <Field
                label="GST number"
                value={seller.gstNumber ?? <span className="text-muted-foreground">Not provided</span>}
              />
              <Field label="Pincode" value={seller.pincode} />
              <Field
                label="Cluster"
                value={
                  seller.clusterId ? (
                    clusterName.get(seller.clusterId) ?? seller.clusterId
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )
                }
              />
              <Field label="Payout preference" value={payoutLabel[seller.payoutPreference]} />
              <Field
                label="Bank details"
                value={
                  seller.hasBankDetails
                    ? `•••• ${seller.bankAccountLast4 ?? '----'}`
                    : <span className="text-muted-foreground">Not provided</span>
                }
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Address
              </p>
              <p className="mt-1">
                {seller.address.line1}
                {seller.address.line2 ? `, ${seller.address.line2}` : ''}
                <br />
                {seller.address.city}, {seller.address.state} — {seller.address.pincode}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categories
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {seller.categoryIds.length === 0 && (
                  <span className="text-muted-foreground">No categories selected</span>
                )}
                {seller.categoryIds.map((cid) => (
                  <Badge key={cid} variant="muted">
                    {categoryName.get(cid) ?? cid}
                  </Badge>
                ))}
              </div>
            </div>
            {seller.businessProfile && (
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                <Field
                  label="Owns a brand"
                  value={
                    seller.businessProfile.ownsBrand === undefined
                      ? '—'
                      : seller.businessProfile.ownsBrand
                        ? 'Yes'
                        : 'No'
                  }
                />
                <Field
                  label="Expected listings / mo"
                  value={seller.businessProfile.expectedMonthlyListings ?? '—'}
                />
                <Field
                  label="Avg product price"
                  value={
                    seller.businessProfile.averagePriceInr != null
                      ? formatInr(seller.businessProfile.averagePriceInr)
                      : '—'
                  }
                />
                <Field
                  label="Fulfilment"
                  value={
                    seller.businessProfile.fulfillmentPreference
                      ? fulfilmentLabel[seller.businessProfile.fulfillmentPreference]
                      : '—'
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storefront</CardTitle>
          </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Display name"
              value={seller.storefront.displayName ?? <span className="text-muted-foreground">—</span>}
            />
            <Field
              label="Store language"
              value={seller.storefront.language ?? <span className="text-muted-foreground">—</span>}
            />
            <Field
              label="Support email"
              value={seller.storefront.supportEmail ?? <span className="text-muted-foreground">—</span>}
            />
            <Field
              label="Returns address"
              value={
                seller.storefront.returnsAddress
                  ? `${seller.storefront.returnsAddress.line} — ${seller.storefront.returnsAddress.pincode}`
                  : <span className="text-muted-foreground">—</span>
              }
            />
          </div>
          <Field
            label="Description"
            value={
              seller.storefront.description ?? (
                <span className="text-muted-foreground">Not provided</span>
              )
            }
          />
          <Field
            label="Practices"
            value={
              seller.storefront.practices.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {seller.storefront.practices.map((p) => (
                    <Badge key={p} variant="muted">
                      {p}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">None listed</span>
              )
            }
          />
          <Field
            label="Certifications"
            value={
              seller.storefront.certifications.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {seller.storefront.certifications.map((c) => (
                    <Badge key={c} variant="muted">
                      {c}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">None listed</span>
              )
            }
          />
        </CardContent>
      </Card>
      </Stack>
      )}

      {tab === 'kyc' && (
      <Stack spacing={3}>
        <Card>
          <CardHeader>
            <CardTitle>KYC documents</CardTitle>
            <CardDescription>{seller.kycDocuments.length} document(s) uploaded.</CardDescription>
          </CardHeader>
          <CardContent>
            {seller.kycDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
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
        </Card>
      </Stack>
      )}

      {tab === 'reviews' && (
      <Stack spacing={3}>
        <Card>
          <CardHeader>
            <CardTitle>Review history</CardTitle>
            <CardDescription>Latest admin action on this profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Last reviewed" value={formatDateTime(seller.reviewedAt)} />
            <Field label="Live since" value={formatDateTime(seller.liveAt)} />
            <Field
              label="Notes"
              value={
                seller.reviewNotes ? (
                  <span className="whitespace-pre-wrap">{seller.reviewNotes}</span>
                ) : (
                  <span className="text-muted-foreground">No notes recorded</span>
                )
              }
            />
          </CardContent>
        </Card>
      </Stack>
      )}

      {tab === 'disciplinary' && (
      <Stack spacing={3}>
      {canDiscipline && (
        <Card>
          <CardHeader>
            <CardTitle>Disciplinary history</CardTitle>
            <CardDescription>
              Warnings, suspensions and reactivations recorded against this seller.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!seller.disciplinaryActions || seller.disciplinaryActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No disciplinary actions recorded.</p>
            ) : (
              <ul className="divide-y divide-border">
                {[...seller.disciplinaryActions]
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .map((action, i) => (
                    <li
                      key={`${action.type}-${action.at}-${i}`}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <div className="space-y-1">
                        <Badge variant={disciplinaryVariant[action.type]}>
                          {disciplinaryLabel[action.type]}
                        </Badge>
                        <p className="whitespace-pre-wrap text-sm">{action.reason}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(action.at)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
      </Stack>
      )}

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
    </Stack>
  );
};

const KycDocCard = ({ sellerId, doc }: { sellerId: string; doc: KycDocument }) => {
  const { data, isLoading, isError } = useKycViewUrl(sellerId, doc.s3Key);
  const url = data?.url;
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(doc.s3Key);
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/30 px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {docLabel[doc.type] ?? doc.type}
        </span>
        <Badge variant={docStatusVariant[doc.status]}>{doc.status}</Badge>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block bg-white"
        onClick={(e) => !url && e.preventDefault()}
      >
        {isImage && url ? (
          <img src={url} alt={doc.type} className="h-40 w-full bg-white object-contain" />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : isError ? 'Preview unavailable' : 'Open document ↗'}
          </div>
        )}
      </a>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
        <span>{formatDate(doc.uploadedAt)}</span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Open full ↗
          </a>
        )}
      </div>
    </div>
  );
};

const disciplinaryLabel: Record<DisciplinaryActionType, string> = {
  warning: 'Warning',
  suspension: 'Suspension',
  reactivation: 'Reactivation',
};

const disciplinaryVariant: Record<DisciplinaryActionType, 'warning' | 'destructive' | 'success'> = {
  warning: 'warning',
  suspension: 'destructive',
  reactivation: 'success',
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="mt-1">{value}</div>
  </div>
);
