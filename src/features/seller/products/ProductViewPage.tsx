import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import AlertTitle from '@mui/material/AlertTitle';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';

import { useTabs } from '@/hooks/use-tabs';

import { varAlpha } from '@/theme/styles';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyContent } from '@/components/empty-content';
import { LoadingScreen } from '@/components/loading-screen';

import { fDate, fDateTime } from '@/utils/format-time';
import { displayPrice } from '@/features/products/price';
import { useProduct } from '@/features/products/api';
import { useCategoriesList } from '@/features/categories/api';
import { KIND_LABELS, type ProductStatus, type SafeProduct } from '@/features/products/types';

import { StockAdjustDialog } from './StockAdjustDialog';
import { ProductDetailsGallery } from './product-details-gallery';
import { ProductDetailsVariants } from './product-details-variants';

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

const ATTRIBUTES: Array<{ key: keyof SafeProduct; label: string; icon: string }> = [
  { key: 'organicCertified', label: 'Organic certified', icon: 'solar:leaf-bold' },
  { key: 'womenEntrepreneur', label: 'Women entrepreneur', icon: 'solar:heart-bold' },
  { key: 'youthEmpowerment', label: 'Youth empowerment', icon: 'solar:star-bold' },
  { key: 'codAvailable', label: 'Cash on delivery', icon: 'solar:wallet-bold' },
  { key: 'returnEligible', label: 'Returns accepted', icon: 'solar:restart-bold' },
];

// ----------------------------------------------------------------------

/** One label/value line in the details list. */
const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
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
};

// ----------------------------------------------------------------------

/**
 * Read-only view of one of the seller's products — the listing as the platform
 * holds it, with its photos, options, review status and every attribute that
 * feeds the storefront. Editing happens on the form page next door.
 */
export const SellerProductViewPage = () => {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const tabs = useTabs('description');

  const [stockOpen, setStockOpen] = useState(false);

  const { data: product, isLoading, isError } = useProduct(id);

  // Unfiltered — a product's category still needs a name after it is retired.
  const { data: categories } = useCategoriesList({});

  const categoryName = useMemo(
    () => (categories ?? []).find((c) => c.id === product?.categoryId)?.name,
    [categories, product?.categoryId],
  );

  if (isLoading) {
    return <LoadingScreen sx={{ py: 20 }} />;
  }

  if (isError || !product) {
    return (
      <>
        <PageHeader title="Product" />
        <EmptyContent
          filled
          title="Product not found"
          description="It may have been deleted, or it belongs to another seller."
          action={
            <Button
              variant="contained"
              onClick={() => navigate('/seller/products')}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to my products
            </Button>
          }
          sx={{ py: 10, mt: 3 }}
        />
      </>
    );
  }

  const variants = product.variants ?? [];
  const activeVariants = variants.filter((v) => v.active);
  const hasVariants = variants.length > 0;

  const quantity = product.variantSummary?.hasVariants
    ? product.variantSummary.totalStock
    : product.stock.quantity;
  const isOut = quantity <= 0;
  const isLow = !isOut && quantity <= product.stock.threshold;

  return (
    <>
      <PageHeader
        title={product.name}
        links={[
          { name: 'Dashboard', href: '/seller' },
          { name: 'Products', href: '/seller/products' },
          { name: product.name },
        ]}
        action={
          <>
            <Button
              variant="outlined"
              onClick={() => navigate('/seller/products')}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back to list
            </Button>
            <Button
              variant="outlined"
              onClick={() => setStockOpen(true)}
              startIcon={<Iconify icon="solar:box-bold" />}
            >
              Add stock
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/seller/products/${product.id}/edit`)}
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Edit product
            </Button>
          </>
        }
      />

      {product.status === 'REJECTED' && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <AlertTitle>Rejected by the category admin</AlertTitle>
          {product.approvalNotes || 'No reason was recorded. Edit the listing and resubmit.'}
        </Alert>
      )}

      {product.status === 'SUSPENDED' && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <AlertTitle>Suspended — not visible to buyers</AlertTitle>
          {product.approvalNotes || 'Contact support if you think this was a mistake.'}
        </Alert>
      )}

      {product.status === 'PENDING' && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Waiting for a category admin to review this listing. It goes live once approved.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid xs={12} md={6} lg={5}>
          <ProductDetailsGallery images={product.images} alt={product.name} />
        </Grid>

        <Grid xs={12} md={6} lg={7}>
          <Stack spacing={2} sx={{ pt: { md: 1 } }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Label variant="soft" color={STATUS_COLOR[product.status]}>
                {STATUS_LABEL[product.status]}
              </Label>
              <Chip
                size="small"
                variant="soft"
                color={product.kind === 'organic' ? 'success' : product.kind === 'premium' ? 'warning' : 'default'}
                label={KIND_LABELS[product.kind]}
              />
              {categoryName && (
                <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                  {categoryName}
                </Typography>
              )}
            </Stack>

            <Typography variant="h4">{product.name}</Typography>

            <Typography variant="h4" sx={{ color: 'primary.main' }}>
              {displayPrice(product)}
              <Box component="span" sx={{ typography: 'body2', color: 'text.disabled', ml: 1 }}>
                per {product.unit}
              </Box>
            </Typography>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify
                  width={16}
                  icon={isOut ? 'solar:close-circle-bold' : 'solar:check-circle-bold'}
                  sx={{ color: isOut ? 'error.main' : isLow ? 'warning.main' : 'success.main' }}
                />
                <Box
                  component="span"
                  sx={{
                    typography: 'subtitle2',
                    color: isOut ? 'error.main' : isLow ? 'warning.main' : 'success.main',
                  }}
                >
                  {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                </Box>
                <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
                  · {quantity} {product.unit} available
                </Box>
              </Stack>

              {/* How close the stock is to the level that triggers a restock alert. */}
              <LinearProgress
                variant="determinate"
                color={isOut ? 'error' : isLow ? 'warning' : 'success'}
                value={Math.min(
                  100,
                  product.stock.threshold > 0 ? (quantity / (product.stock.threshold * 4)) * 100 : 100,
                )}
                sx={{ height: 6, borderRadius: 1 }}
              />
              <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                Restock alert at {product.stock.threshold} {product.unit}
              </Box>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack spacing={1}>
              <Field label="Options" value={hasVariants ? `${activeVariants.length} on sale of ${variants.length}` : 'Sold as a single item'} />
              <Field label="Brand" value={product.brand} />
              <Field label="SKU" value={product.sku} />
              <Field
                label="Weight"
                value={product.weightGrams ? `${product.weightGrams} g` : undefined}
              />
              <Field label="Last updated" value={fDateTime(product.updatedAt)} />
            </Stack>

            {ATTRIBUTES.some((a) => product[a.key]) && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ATTRIBUTES.filter((a) => product[a.key]).map((attribute) => (
                  <Chip
                    key={attribute.key as string}
                    size="small"
                    variant="soft"
                    color="primary"
                    icon={<Iconify icon={attribute.icon} width={16} />}
                    label={attribute.label}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Grid>

        <Grid xs={12}>
          <Card>
            <Tabs
              value={tabs.value}
              onChange={tabs.onChange}
              sx={{
                px: 3,
                boxShadow: (theme) =>
                  `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
              }}
            >
              <Tab value="description" label="Description" />
              <Tab
                value="options"
                label={hasVariants ? `Options (${variants.length})` : 'Options'}
              />
              <Tab value="details" label="Details" />
            </Tabs>

            {tabs.value === 'description' && (
              <Stack spacing={3} sx={{ p: 3 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {product.description || 'No description was added.'}
                </Typography>

                {!!product.highlights?.length && (
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Highlights</Typography>
                    {product.highlights.map((highlight, index) => (
                      <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
                        <Iconify
                          icon="eva:checkmark-circle-2-fill"
                          width={16}
                          sx={{ mt: 0.25, color: 'primary.main', flexShrink: 0 }}
                        />
                        <Typography variant="body2">{highlight}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}

                {!!product.tags?.length && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {product.tags.map((tag) => (
                      <Chip key={tag} size="small" variant="soft" label={tag} />
                    ))}
                  </Stack>
                )}

                {product.videoUrl && (
                  <Link href={product.videoUrl} target="_blank" rel="noopener" variant="body2">
                    Watch the product video
                  </Link>
                )}
              </Stack>
            )}

            {tabs.value === 'options' &&
              (hasVariants ? (
                <ProductDetailsVariants variants={variants} />
              ) : (
                <EmptyContent
                  filled
                  title="Sold as a single item"
                  description="Add options — pack sizes, colours — from the edit page to price each one separately."
                  sx={{ py: 8, m: 3 }}
                />
              ))}

            {tabs.value === 'details' && (
              <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid xs={12} md={6}>
                  <CardHeader title="Listing" sx={{ p: 0, mb: 2 }} />
                  <Stack spacing={1.5}>
                    <Field label="Kind" value={KIND_LABELS[product.kind]} />
                    <Field label="Category" value={categoryName} />
                    <Field label="Unit" value={product.unit} />
                    <Field label="Packaging" value={product.packagingType} />
                    <Field
                      label="Weight"
                      value={product.weightGrams ? `${product.weightGrams} g` : undefined}
                    />
                    <Field label="HSN code" value={product.hsnCode} />
                    <Field label="Minimum order" value={product.minOrderQty} />
                    <Field label="Maximum order" value={product.maxOrderQty} />
                    <Field
                      label="Shelf life"
                      value={product.shelfLifeDays ? `${product.shelfLifeDays} days` : undefined}
                    />
                    <Field
                      label="Harvested"
                      value={product.harvestDate ? fDate(product.harvestDate) : undefined}
                    />
                    <Field label="Certification" value={product.organicCertification} />
                  </Stack>
                </Grid>

                <Grid xs={12} md={6}>
                  <CardHeader title="Review" sx={{ p: 0, mb: 2 }} />
                  <Stack spacing={1.5}>
                    <Field
                      label="Status"
                      value={
                        <Label variant="soft" color={STATUS_COLOR[product.status]}>
                          {STATUS_LABEL[product.status]}
                        </Label>
                      }
                    />
                    <Field
                      label="Approved"
                      value={product.approvedAt ? fDateTime(product.approvedAt) : 'Not yet'}
                    />
                    <Field label="Admin notes" value={product.approvalNotes} />
                    <Field label="Created" value={fDateTime(product.createdAt)} />
                    <Field label="Last updated" value={fDateTime(product.updatedAt)} />
                  </Stack>
                </Grid>
              </Grid>
            )}
          </Card>
        </Grid>
      </Grid>

      <StockAdjustDialog
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        product={product}
      />
    </>
  );
};
