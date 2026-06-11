import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/format';
import { UserRole } from '@/types/api';
import {
  useApproveSeller,
  useReactivateSeller,
  useRejectSeller,
  useRequestSellerInfo,
  useSeller,
  useSuspendSeller,
  useToggleVerifiedBadge,
  useWarnSeller,
} from './api';
import { DisciplinaryDialog, type DisciplinaryAction } from './DisciplinaryDialog';
import { ReviewDialog, type ReviewAction } from './ReviewDialog';
import { SellerStatusBadge } from './status-badge';
import type { DisciplinaryActionType } from './types';

const docLabel: Record<string, string> = {
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  fssai: 'FSSAI',
  gst: 'GST',
  other: 'Other',
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
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
    user?.role === UserRole.REGIONAL_ADMIN;
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/sellers')}>
          <ArrowLeft className="h-4 w-4" />
          Back to sellers
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{seller.farmName}</h1>
          <p className="text-sm text-muted-foreground">
            ID {seller.id} · submitted {formatDate(seller.createdAt)}
          </p>
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
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Farm & address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pincode" value={seller.pincode} />
              <Field
                label="Cluster"
                value={seller.clusterId ?? <span className="text-muted-foreground">Unassigned</span>}
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
                    {cid}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KYC documents</CardTitle>
          <CardDescription>
            {seller.kycDocuments.length} document(s) uploaded. Open the S3 key in the bucket
            console to view the file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seller.kycDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <ul className="divide-y divide-border">
              {seller.kycDocuments.map((doc) => (
                <li
                  key={`${doc.type}-${doc.s3Key}`}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{docLabel[doc.type] ?? doc.type}</p>
                      <p className="text-xs text-muted-foreground">{doc.s3Key}</p>
                      {doc.notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">{doc.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={docStatusVariant[doc.status]}>{doc.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storefront</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
