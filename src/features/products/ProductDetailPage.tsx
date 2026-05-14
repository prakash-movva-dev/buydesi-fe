import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  PauseCircle,
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
import { formatDateTime, formatInr } from '@/lib/format';
import { useProduct, useSetProductStatus } from './api';
import { ProductStatusBadge } from './status-badge';
import { StatusReviewDialog, type StatusAction } from './StatusReviewDialog';
import type { ProductStatus } from './types';

const tierLabels: Record<'standard' | 'organic' | 'premium', string> = {
  standard: 'Standard',
  organic: 'Organic',
  premium: 'Premium',
};

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, error } = useProduct(id);
  const { data: categories } = useCategoriesList();
  const setStatusMut = useSetProductStatus();
  const [action, setAction] = useState<StatusAction | null>(null);

  const categoryName = useMemo(
    () => categories?.find((c) => c.id === product?.categoryId)?.name ?? product?.categoryId,
    [categories, product?.categoryId],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Product not found'}
      </div>
    );
  }

  const isPending = product.status === 'PENDING';
  const isLive = product.status === 'LIVE';
  const isSuspended = product.status === 'SUSPENDED';
  const isRejected = product.status === 'REJECTED';

  const submitAction = async (notes: string | undefined) => {
    if (!action) return;
    const target: ProductStatus =
      action === 'approve' ? 'LIVE' : action === 'reject' ? 'REJECTED' : 'SUSPENDED';
    await setStatusMut.mutateAsync({ id: product.id, status: target, notes });
  };

  const restore = async () => {
    await setStatusMut.mutateAsync({ id: product.id, status: 'PENDING' });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/products')}>
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground">
            ID {product.id} · category {categoryName} · seller {product.sellerId}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProductStatusBadge status={product.status} />
            {product.stock.quantity <= product.stock.threshold && (
              <Badge variant="warning">Low stock</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPending && (
            <>
              <Button onClick={() => setAction('approve')}>
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setAction('reject')}>
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {isLive && (
            <Button variant="outline" onClick={() => setAction('suspend')}>
              <PauseCircle className="h-4 w-4" />
              Suspend
            </Button>
          )}
          {(isSuspended || isRejected) && (
            <Button variant="outline" onClick={restore} disabled={setStatusMut.isPending}>
              <RotateCcw className="h-4 w-4" />
              Move to pending
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{product.description}</p>
            {product.descriptionI18n && Object.keys(product.descriptionI18n).length > 0 && (
              <details className="mt-4 rounded-md border border-border bg-secondary/30 p-3 text-sm">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Translations ({Object.keys(product.descriptionI18n).length})
                </summary>
                <dl className="mt-2 space-y-2">
                  {Object.entries(product.descriptionI18n).map(([locale, value]) => (
                    <div key={locale}>
                      <dt className="text-xs font-medium uppercase">{locale}</dt>
                      <dd className="whitespace-pre-wrap text-sm">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & stock</CardTitle>
            <CardDescription>3-tier pricing per SOW. Premium hidden from public.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(['standard', 'organic', 'premium'] as const).map((tier) => (
              <div key={tier} className="flex items-center justify-between">
                <span className="text-muted-foreground">{tierLabels[tier]}</span>
                <span className="font-medium">
                  {typeof product.pricing[tier] === 'number'
                    ? `${formatInr(product.pricing[tier])} / ${product.unit}`
                    : '—'}
                </span>
              </div>
            ))}
            <hr className="my-2 border-border" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stock on hand</span>
              <span className="font-medium">
                {product.stock.quantity} {product.unit}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Low-stock threshold</span>
              <span>{product.stock.threshold}</span>
            </div>
            {product.weightGrams !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span>{product.weightGrams} g</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>{product.images.length} image(s) uploaded.</CardDescription>
        </CardHeader>
        <CardContent>
          {product.images.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
              No images. Sellers should upload at least one before approval.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {product.images.map((src, i) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-md border border-border bg-secondary"
                >
                  <img
                    src={src}
                    alt={`${product.name} image ${i + 1}`}
                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Submitted" value={formatDateTime(product.createdAt)} />
            <Field label="Last updated" value={formatDateTime(product.updatedAt)} />
            <Field
              label="Approved at"
              value={product.approvedAt ? formatDateTime(product.approvedAt) : '—'}
            />
            <Field
              label="Notes"
              value={
                product.approvalNotes ?? (
                  <span className="text-muted-foreground">No notes recorded</span>
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <StatusReviewDialog
        open={action !== null}
        action={action}
        count={1}
        onClose={() => setAction(null)}
        onSubmit={submitAction}
      />
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="mt-1 whitespace-pre-wrap">{value}</div>
  </div>
);
