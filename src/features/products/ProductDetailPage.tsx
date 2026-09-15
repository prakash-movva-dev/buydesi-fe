import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { varAlpha } from '@/theme/styles';
import { ApiError } from '@/types/api';
import { formatInr } from '@/lib/format';
import { fDate, fDateTime } from '@/utils/format-time';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom } from '@/components/table';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { LoadingScreen } from '@/components/loading-screen';

import { useCategoriesList } from '@/features/categories/api';
import { useUser } from '@/features/users/api';

import { displayPrice } from './price';
import {
  useProduct,
  useProductDuplicates,
  useProductQualityCheck,
  useSetProductStatus,
} from './api';
import { StatusReviewDialog, type StatusAction } from './StatusReviewDialog';
import {
  KIND_LABELS,
  type DuplicateCandidate,
  type ProductStatus,
  type SafeProduct,
} from './types';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<ProductStatus, 'success' | 'warning' | 'error' | 'default'> = {
  LIVE: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
  SUSPENDED: 'default',
};

const STATUS_LABEL: Record<ProductStatus, string> = {
  LIVE: 'Live',
  PENDING: 'Pending review',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

/** One label/value line. */
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Stack
    direction="row"
    spacing={2}
    sx={{ typography: 'body2', justifyContent: 'space-between', alignItems: 'baseline' }}
  >
    <Box component="span" sx={{ color: 'text.secondary', flexShrink: 0 }}>
      {label}
    </Box>
    <Box component="span" sx={{ textAlign: 'right', fontWeight: 'fontWeightMedium' }}>
      {value}
    </Box>
  </Stack>
);

// ----------------------------------------------------------------------

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading, isError, error } = useProduct(id);
  const setStatusMut = useSetProductStatus();

  const [action, setAction] = useState<StatusAction | null>(null);
  const [dupCandidate, setDupCandidate] = useState<DuplicateCandidate | null>(null);
  const [tab, setTab] = useState<'details' | 'reviews' | 'quality' | 'duplicates'>('details');
  const [activeImage, setActiveImage] = useState(0);

  const { data: categories } = useCategoriesList();
  const { data: seller } = useUser(product?.sellerId);

  const categoryName = useMemo(
    () => (categories ?? []).find((c) => c.id === product?.categoryId)?.name ?? '—',
    [categories, product?.categoryId],
  );
  const sellerName = product?.sellerName ?? seller?.name ?? '—';

  if (isLoading) return <LoadingScreen sx={{ py: 20 }} />;

  if (isError || !product) {
    return (
      <>
        <PageHeader title="Product" />
        <EmptyContent
          filled
          title="Product not found"
          description={error instanceof Error ? error.message : 'It may have been deleted.'}
          action={
            <Button
              variant="contained"
              onClick={() => navigate('/admin/products')}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to products
            </Button>
          }
          sx={{ py: 10, mt: 3 }}
        />
      </>
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

  const stock = product.variantSummary?.hasVariants
    ? product.variantSummary.totalStock
    : product.stock.quantity;

  return (
    <>
      <PageHeader
        title={product.name}
        links={[
          { name: 'Dashboard', href: '/admin' },
          { name: 'Products', href: '/admin/products' },
          { name: product.name },
        ]}
        action={
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/products')}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back to products
          </Button>
        }
      />

      {product.duplicateOfId && (
        <Alert
          severity="warning"
          sx={{ mt: 3 }}
          action={
            <Button
              size="small"
              color="inherit"
              component={RouterLink}
              to={`/admin/products/${product.duplicateOfId}`}
            >
              View original
            </Button>
          }
        >
          This product was marked as a duplicate of another listing.
        </Alert>
      )}

      {/* Hero — what this is, and every action that applies to it. */}
      <Card
        sx={{
          mt: 3,
          p: 3,
          backgroundImage: (theme) =>
            `linear-gradient(135deg, ${varAlpha(
              theme.vars.palette.primary.lighterChannel,
              0.48,
            )}, ${varAlpha(theme.vars.palette.primary.lightChannel, 0.32)})`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              flexShrink: 0,
              borderRadius: 1.5,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.neutral',
              color: 'text.disabled',
            }}
          >
            {product.images[0] ? (
              <Box
                component="img"
                src={product.images[0]}
                alt={product.name}
                sx={{ width: 1, height: 1, objectFit: 'cover' }}
              />
            ) : (
              <Iconify icon="solar:gallery-wide-bold" width={32} />
            )}
          </Box>

          <Stack spacing={1} sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h4">{product.name}</Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Label variant="soft" color={STATUS_COLOR[product.status]}>
                {STATUS_LABEL[product.status]}
              </Label>
              <Label
                variant="soft"
                color={
                  product.kind === 'organic'
                    ? 'success'
                    : product.kind === 'premium'
                      ? 'warning'
                      : 'default'
                }
              >
                {KIND_LABELS[product.kind]}
              </Label>
              {stock <= product.stock.threshold && (
                <Label variant="soft" color={stock <= 0 ? 'error' : 'warning'}>
                  {stock <= 0 ? 'Out of stock' : 'Low stock'}
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
              <Box component="span">{categoryName}</Box>
              <Box component="span">{sellerName}</Box>
              <Box component="span">
                {displayPrice(product)} / {product.unit}
              </Box>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {isPending && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => setAction('approve')}
                  startIcon={<Iconify icon="solar:check-circle-bold" />}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setAction('reject')}
                  startIcon={<Iconify icon="solar:close-circle-bold" />}
                >
                  Reject
                </Button>
              </>
            )}
            {isLive && (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setAction('suspend')}
                startIcon={<Iconify icon="solar:pause-circle-bold" />}
              >
                Suspend
              </Button>
            )}
            {(isSuspended || isRejected) && (
              <LoadingButton
                variant="outlined"
                loading={setStatusMut.isPending}
                onClick={restore}
                startIcon={<Iconify icon="solar:restart-bold" />}
              >
                Move to pending
              </LoadingButton>
            )}
          </Stack>
        </Stack>
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
          <Tab value="details" label="Details" />
          <Tab value="quality" label="Quality" />
          <Tab value="duplicates" label="Duplicates" />
          <Tab value="reviews" label="Review history" />
        </Tabs>

        {tab === 'details' && (
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid xs={12} md={5}>
              {product.images.length === 0 ? (
                <EmptyContent
                  filled
                  title="No images"
                  description="Sellers should upload at least one before approval."
                  sx={{ py: 8 }}
                />
              ) : (
                <Stack spacing={1.5}>
                  <Box
                    component="a"
                    href={product.images[activeImage] ?? product.images[0]}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: 'block',
                      aspectRatio: '1 / 1',
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'background.neutral',
                    }}
                  >
                    <Box
                      component="img"
                      src={product.images[activeImage] ?? product.images[0]}
                      alt={product.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                      }}
                      sx={{ width: 1, height: 1, objectFit: 'cover' }}
                    />
                  </Box>

                  {product.images.length > 1 && (
                    <Box
                      sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}
                    >
                      {product.images.map((src, i) => (
                        <Box
                          key={src}
                          component="button"
                          type="button"
                          onClick={() => setActiveImage(i)}
                          sx={{
                            p: 0,
                            border: 'none',
                            aspectRatio: '1 / 1',
                            borderRadius: 1,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            bgcolor: 'background.neutral',
                            ...(i === activeImage
                              ? { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` }
                              : { opacity: 0.64, '&:hover': { opacity: 1 } }),
                          }}
                        >
                          <Box
                            component="img"
                            src={src}
                            alt={`${product.name} ${i + 1}`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                            }}
                            sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Stack>
              )}
            </Grid>

            <Grid xs={12} md={7}>
              <Stack spacing={2}>
                <CardHeader
                  title="Pricing & stock"
                  subheader="What this listing is, and what it sells for."
                  sx={{ p: 0, mb: 1 }}
                />

                <Row label="Kind" value={KIND_LABELS[product.kind]} />
                <Row label="Price" value={`${displayPrice(product)} / ${product.unit}`} />

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Row label="Stock on hand" value={`${stock} ${product.unit}`} />
                <Row label="Low-stock threshold" value={product.stock.threshold} />
                {product.weightGrams !== null && (
                  <Row label="Weight" value={`${product.weightGrams} g`} />
                )}

                {product.variants && product.variants.length > 0 && (
                  <>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Row
                      label="Options"
                      value={`${product.variantSummary?.variantCount ?? product.variants.length} · ${
                        product.variantSummary?.totalStock ?? 0
                      } in stock`}
                    />
                    <Stack spacing={1}>
                      {product.variants.map((v) => (
                        <Card key={v.id} variant="outlined" sx={{ p: 1.5 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            spacing={1}
                          >
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Typography variant="subtitle2">{v.label}</Typography>
                              {v.isDefault && (
                                <Label variant="soft" color="primary">
                                  Default
                                </Label>
                              )}
                              {!v.active && <Label variant="soft">Disabled</Label>}
                            </Stack>
                            <Typography variant="subtitle2">{formatInr(v.price)}</Typography>
                          </Stack>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            sx={{ mt: 0.5, typography: 'caption', color: 'text.disabled' }}
                          >
                            <Box component="span">{v.sku ?? 'no SKU'}</Box>
                            <Box component="span">stock {v.stock.quantity}</Box>
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  </>
                )}

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Row label="Category" value={categoryName} />
                <Row label="Seller" value={sellerName} />
              </Stack>
            </Grid>

            <Grid xs={12}>
              <Divider sx={{ borderStyle: 'dashed', mb: 3 }} />
              <CardHeader title="Description" sx={{ p: 0, mb: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {product.description || 'No description was added.'}
              </Typography>
            </Grid>

            <Grid xs={12}>
              <ListingDetails product={product} />
            </Grid>
          </Grid>
        )}

        {tab === 'quality' && (
          <CardContent>
            <QualityChecklist productId={product.id} />
          </CardContent>
        )}

        {tab === 'duplicates' && (
          <CardContent>
            <DuplicateCheck
              productId={product.id}
              categoryName={categoryName}
              onMarkDuplicate={setDupCandidate}
            />
          </CardContent>
        )}

        {tab === 'reviews' && (
          <CardContent>
            <Stack spacing={2} sx={{ maxWidth: 600 }}>
              <Row label="Submitted" value={fDateTime(product.createdAt)} />
              <Row label="Last updated" value={fDateTime(product.updatedAt)} />
              <Row
                label="Approved at"
                value={product.approvedAt ? fDateTime(product.approvedAt) : '—'}
              />
              <Row label="Notes" value={product.approvalNotes ?? '—'} />
            </Stack>
          </CardContent>
        )}
      </Card>

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
    </>
  );
};

// ----------------------------------------------------------------------

const ListingDetails = ({ product }: { product: SafeProduct }) => {
  const badges = [
    product.womenEntrepreneur && { label: 'Women entrepreneur', color: 'info' as const },
    product.youthEmpowerment && { label: 'Youth empowerment', color: 'info' as const },
    product.organicCertified && { label: 'Organic certified', color: 'success' as const },
  ].filter(Boolean) as Array<{ label: string; color: 'info' | 'success' }>;

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
    ['Harvest / packed', product.harvestDate ? fDate(product.harvestDate) : '—'],
    ['Shelf life', product.shelfLifeDays ? `${product.shelfLifeDays} days` : '—'],
    ['Organic cert.', product.organicCertified ? product.organicCertification || 'Yes' : '—'],
  ];

  return (
    <>
      <Divider sx={{ borderStyle: 'dashed', mb: 3 }} />
      <CardHeader
        title="Listing details"
        subheader="Seller-provided attributes buyers see on the storefront."
        sx={{ p: 0, mb: 2 }}
      />

      <Stack spacing={3}>
        {badges.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {badges.map((b) => (
              <Label key={b.label} variant="soft" color={b.color}>
                {b.label}
              </Label>
            ))}
          </Stack>
        )}

        <Box
          sx={{
            display: 'grid',
            columnGap: 4,
            rowGap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {rows.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
        </Box>

        {product.highlights && product.highlights.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Highlights
            </Typography>
            <Stack spacing={0.5}>
              {product.highlights.map((h) => (
                <Stack key={h} direction="row" spacing={1} alignItems="flex-start">
                  <Iconify
                    icon="eva:checkmark-circle-2-fill"
                    width={16}
                    sx={{ mt: 0.25, color: 'primary.main', flexShrink: 0 }}
                  />
                  <Typography variant="body2">{h}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {product.tags && product.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {product.tags.map((t) => (
              <Chip key={t} size="small" variant="soft" label={t} />
            ))}
          </Stack>
        )}

        {product.videoUrl && (
          <Link href={product.videoUrl} target="_blank" rel="noreferrer" variant="body2">
            Product video ↗
          </Link>
        )}
      </Stack>
    </>
  );
};

// ----------------------------------------------------------------------

const checklistLabels: Record<string, string> = {
  hasImage: 'At least one product image',
  descriptionOk: 'Description is detailed (30+ characters)',
  pricingOk: 'A price is set',
  nameOk: 'Name length is valid (3–120 characters)',
  inStock: 'Product is in stock',
};

const checklistOrder = ['nameOk', 'descriptionOk', 'pricingOk', 'hasImage', 'inStock'] as const;

const QualityChecklist = ({ productId }: { productId: string }) => {
  const { data, isLoading, isError, error } = useProductQualityCheck(productId);

  return (
    <Stack spacing={3}>
      <CardHeader
        title="Quality checklist"
        subheader="Completeness checks and restricted-item screening to run before approving."
        sx={{ p: 0 }}
      />

      {isLoading && <Skeleton height={160} />}

      {isError && (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Failed to run quality check'}
        </Alert>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.restrictedTermsFound.length > 0 && (
            <Alert severity="error">
              Restricted terms detected: {data.restrictedTermsFound.join(', ')}. Review this
              listing carefully before approving.
            </Alert>
          )}

          <Stack spacing={1.5}>
            {checklistOrder.map((key) => {
              const ok = data.checklist[key];
              return (
                <Stack key={key} direction="row" spacing={1.5} alignItems="center">
                  <Iconify
                    width={20}
                    icon={ok ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
                    sx={{ flexShrink: 0, color: ok ? 'success.main' : 'error.main' }}
                  />
                  <Typography variant="body2" sx={{ color: ok ? 'text.primary' : 'text.secondary' }}>
                    {checklistLabels[key]}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </>
      )}
    </Stack>
  );
};

// ----------------------------------------------------------------------

const DUP_HEAD = [
  { id: 'thumb', label: '', width: 72 },
  { id: 'name', label: 'Name' },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'submitted', label: 'Submitted', width: 140 },
  { id: 'actions', label: '', width: 180 },
];

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

  return (
    <Stack spacing={3}>
      <CardHeader
        title="Duplicate check"
        subheader={
          <>
            Other pending or live listings in {categoryName} with similar names. If this is a copy,
            mark it as a duplicate of the original.
          </>
        }
        sx={{ p: 0 }}
      />

      {isLoading && <Skeleton height={96} />}

      {isError && (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Failed to load duplicate candidates'}
        </Alert>
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <Alert severity="success">No likely duplicates found.</Alert>
      )}

      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <Scrollbar>
          <Table sx={{ minWidth: 720 }}>
            <TableHeadCustom headLabel={DUP_HEAD} />
            <TableBody>
              {(data ?? []).map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.neutral',
                        color: 'text.disabled',
                      }}
                    >
                      {c.image ? (
                        <Box
                          component="img"
                          src={c.image}
                          alt={c.name}
                          sx={{ width: 1, height: 1, objectFit: 'cover' }}
                        />
                      ) : (
                        <Iconify icon="solar:gallery-wide-bold" width={18} />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Link
                      component={RouterLink}
                      to={`/admin/products/${c.id}`}
                      variant="subtitle2"
                      color="inherit"
                    >
                      {c.name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Label variant="soft" color={STATUS_COLOR[c.status]}>
                      {STATUS_LABEL[c.status]}
                    </Label>
                  </TableCell>

                  <TableCell sx={{ typography: 'caption', color: 'text.disabled' }}>
                    {fDate(c.createdAt)}
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => onMarkDuplicate(c)}
                      startIcon={<Iconify icon="solar:copy-bold" width={16} />}
                    >
                      Mark duplicate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      )}
    </Stack>
  );
};

// ----------------------------------------------------------------------

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

  const handleClose = () => {
    setNotes('');
    setErr(null);
    onClose();
  };

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
    <Dialog open={candidate !== null} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Mark as duplicate</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {candidate
              ? `This product will be rejected and linked to "${candidate.name}" as the original.`
              : ''}
          </Typography>

          <Alert severity="warning">
            The seller will see your note explaining why their listing was rejected.
          </Alert>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Note to the seller"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          color="error"
          loading={submitting}
          onClick={handleSubmit}
        >
          Reject as duplicate
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
