import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  PauseCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom } from '@/components/table';
import { useCategoriesList } from '@/features/categories/api';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import {
  useProduct,
  useProductDuplicates,
  useProductQualityCheck,
  useSetProductStatus,
} from './api';
import { ProductStatusBadge } from './status-badge';
import { StatusReviewDialog, type StatusAction } from './StatusReviewDialog';
import type { DuplicateCandidate, ProductStatus } from './types';

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
  const [dupCandidate, setDupCandidate] = useState<DuplicateCandidate | null>(null);
  const [tab, setTab] = useState<'details' | 'reviews' | 'quality' | 'duplicates'>('details');

  const categoryName = useMemo(
    () => categories?.find((c) => c.id === product?.categoryId)?.name ?? product?.categoryId,
    [categories, product?.categoryId],
  );

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </Stack>
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
    <Stack spacing={3}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/products')}>
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Button>

      {product.duplicateOfId && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Copy className="h-4 w-4 shrink-0" />
          <span>
            This product was marked as a duplicate of another listing.
          </span>
          <Link
            to={`/admin/products/${product.duplicateOfId}`}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
          >
            View original
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {product.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            ID {product.id} · category {categoryName} · seller {product.sellerId}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mt: 1 }}>
            <ProductStatusBadge status={product.status} />
            {product.stock.quantity <= product.stock.threshold && (
              <Badge variant="warning">Low stock</Badge>
            )}
          </Stack>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="details" label="Details" />
        <Tab value="reviews" label="Reviews" />
        <Tab value="quality" label="Quality" />
        <Tab value="duplicates" label="Duplicates" />
      </Tabs>

      {tab === 'details' && (
      <Stack spacing={3}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' } }}>
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
      </Box>

      <ListingDetails product={product} />

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
                    onError={(e) => {
                      // Legacy bare-key images won't resolve — hide the broken
                      // glyph and show a neutral placeholder background instead.
                      const img = e.currentTarget;
                      img.style.visibility = 'hidden';
                      img.parentElement?.classList.add(
                        'flex',
                        'items-center',
                        'justify-center',
                      );
                    }}
                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </Stack>
      )}

      {tab === 'quality' && (
      <Stack spacing={3}>
      <QualityChecklist productId={product.id} />
      </Stack>
      )}

      {tab === 'duplicates' && (
      <Stack spacing={3}>
      <DuplicateCheck
        productId={product.id}
        categoryName={categoryName}
        onMarkDuplicate={setDupCandidate}
      />
      </Stack>
      )}

      {tab === 'reviews' && (
      <Stack spacing={3}>
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
      </Stack>
      )}

      <StatusReviewDialog
        open={action !== null}
        action={action}
        count={1}
        onClose={() => setAction(null)}
        onSubmit={submitAction}
      />

      <MarkDuplicateDialog
        candidate={dupCandidate}
        onClose={() => setDupCandidate(null)}
        onSubmit={async (notes) => {
          if (!dupCandidate) return;
          await setStatusMut.mutateAsync({
            id: product.id,
            status: 'REJECTED',
            duplicateOfId: dupCandidate.id,
            notes,
          });
        }}
      />
    </Stack>
  );
};

const ListingDetails = ({ product }: { product: import('./types').SafeProduct }) => {
  const badges = [
    product.womenEntrepreneur && { label: 'Women entrepreneur', variant: 'info' as const },
    product.youthEmpowerment && { label: 'Youth empowerment', variant: 'info' as const },
    product.organicCertified && { label: 'Organic certified', variant: 'success' as const },
  ].filter(Boolean) as Array<{ label: string; variant: 'info' | 'success' }>;

  const rows: Array<[string, React.ReactNode]> = [
    ['Cash on Delivery', product.codAvailable === false ? 'Not available' : 'Available'],
    ['Returns', product.returnEligible === false ? 'Not eligible' : 'Eligible'],
    [
      'Order quantity',
      `min ${product.minOrderQty ?? 1}${product.maxOrderQty ? ` · max ${product.maxOrderQty}` : ''}`,
    ],
    ['Brand', product.brand || '—'],
    ['SKU', product.sku || '—'],
    ['HSN code', product.hsnCode || '—'],
    ['Packaging', product.packagingType || '—'],
    ['Harvest / packed', product.harvestDate ? formatDate(product.harvestDate) : '—'],
    ['Shelf life', product.shelfLifeDays ? `${product.shelfLifeDays} days` : '—'],
    [
      'Organic cert.',
      product.organicCertified ? product.organicCertification || 'Yes' : '—',
    ],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listing details</CardTitle>
        <CardDescription>Seller-provided attributes buyers see on the storefront.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <Badge key={b.label} variant={b.variant}>
                {b.label}
              </Badge>
            ))}
          </div>
        )}
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {product.highlights && product.highlights.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Highlights
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              {product.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </span>
            {product.tags.map((t) => (
              <span key={t} className="rounded bg-secondary px-2 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        )}
        {product.videoUrl && (
          <a
            href={product.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Product video
          </a>
        )}
      </CardContent>
    </Card>
  );
};

const checklistLabels: Record<string, string> = {
  hasImage: 'At least one product image',
  descriptionOk: 'Description is detailed (30+ characters)',
  pricingOk: 'A standard or organic price is set',
  nameOk: 'Name length is valid (3–120 characters)',
  inStock: 'Product is in stock',
};

const checklistOrder = ['nameOk', 'descriptionOk', 'pricingOk', 'hasImage', 'inStock'] as const;

const QualityChecklist = ({ productId }: { productId: string }) => {
  const { data, isLoading, isError, error } = useProductQualityCheck(productId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality checklist</CardTitle>
        <CardDescription>
          Listing-completeness checks and restricted-item screening to run before approving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to run quality check'}
          </p>
        )}
        {!isLoading && !isError && data && (
          <>
            {data.restrictedTermsFound.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Restricted terms detected: {data.restrictedTermsFound.join(', ')}. Review this
                  listing carefully before approving.
                </span>
              </div>
            )}
            <ul className="space-y-2 text-sm">
              {checklistOrder.map((key) => {
                const ok = data.checklist[key];
                return (
                  <li key={key} className="flex items-center gap-2">
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className={ok ? '' : 'text-muted-foreground'}>
                      {checklistLabels[key]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const DuplicateCheck = ({
  productId,
  categoryName,
  onMarkDuplicate,
}: {
  productId: string;
  categoryName: React.ReactNode;
  onMarkDuplicate: (candidate: DuplicateCandidate) => void;
}) => {
  const { data, isLoading, isError, error } = useProductDuplicates(productId);

  const dupHead = [
    { id: 'thumb', label: '' },
    { id: 'name', label: 'Name' },
    { id: 'seller', label: 'Seller' },
    { id: 'status', label: 'Status' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'actions', label: '' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicate check</CardTitle>
        <CardDescription>
          Other PENDING or LIVE listings in {categoryName} with similar names. If this product is a
          copy, mark it as a duplicate of the original.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load duplicate candidates'}
          </p>
        )}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            No likely duplicates found.
          </div>
        )}
        {!isLoading && !isError && (data?.length ?? 0) > 0 && (
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={dupHead} />
              <TableBody>
                {(data ?? []).map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          className="h-10 w-10 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/products/${c.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {c.sellerId.slice(-6)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => onMarkDuplicate(c)}>
                        <Copy className="h-3.5 w-3.5" />
                        Mark as duplicate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        )}
      </CardContent>
    </Card>
  );
};

const MarkDuplicateDialog = ({
  candidate,
  onClose,
  onSubmit,
}: {
  candidate: DuplicateCandidate | null;
  onClose: () => void;
  onSubmit: (notes: string | undefined) => Promise<unknown>;
}) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = candidate !== null;

  const handleSubmit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      await onSubmit(notes.trim() || undefined);
      setNotes('');
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Action failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setNotes('');
        setErr(null);
        onClose();
      }}
      title="Mark as duplicate"
      description={
        candidate
          ? `This product will be REJECTED and linked to "${candidate.name}" as the original.`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Working…' : 'Reject as duplicate'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The seller will see your note explaining why their listing was rejected.
        </div>
        <TextField
          fullWidth
          label="Notes (optional)"
          multiline
          minRows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Visible to the seller."
          InputLabelProps={{ shrink: true }}
        />
        {err && <Alert severity="error">{err}</Alert>}
      </div>
    </Dialog>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="mt-1 whitespace-pre-wrap">{value}</div>
  </div>
);
