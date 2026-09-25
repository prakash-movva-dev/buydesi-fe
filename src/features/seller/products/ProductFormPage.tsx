import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stepper from '@mui/material/Stepper';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import StepButton from '@mui/material/StepButton';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { Label } from '@/components/label';
import { KIND_LABELS, PRODUCT_KINDS, type ProductKind } from '@/features/products/types';
import { Iconify } from '@/components/iconify';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateField } from '@/components/ui/DateField';
import { LoadingScreen } from '@/components/loading-screen';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';

import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';
import { formatInr } from '@/lib/format';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { useProduct } from '@/features/products/api';
import { useSellerMe } from '@/features/seller/profile/api';
import { EarningsPreviewCard } from './EarningsPreviewCard';

import {
  VariantEditor,
  rowsToPayload,
  validateVariantRows,
  type VariantRow,
} from './VariantEditor';
import { useReplaceVariants, useVariants } from './variants.api';
import {
  useCreateProduct,
  useProductImageUploadUrl,
  useUpdateProduct,
  type CreateProductInput,
} from './api';

// ----------------------------------------------------------------------

/** One-line hint shown under each step's card title. */
const STEP_HINTS = [
  'Name, category and how buyers find this product.',
  'Which kind of produce this is, what it sells for, and how much there is.',
  'Harvest, shelf life, weight and packaging.',
  'Photos buyers see on the listing, plus an optional video.',
  'Check everything before submitting for approval.',
];

const STEPS = [
  { label: 'Basic information' },
  { label: 'Pricing & availability' },
  { label: 'Produce & logistics' },
  { label: 'Images & media' },
  { label: 'Review' },
] as const;

const UNIT_OPTIONS = ['kg', 'gram', 'litre', 'ml', 'piece', 'dozen', 'pack', 'bundle', 'box'];

const PACKAGING_OPTIONS = [
  'Loose',
  'Pouch',
  'Box',
  'Jar / Bottle',
  'Vacuum sealed',
  'Gunny bag',
  'Basket',
  'Other',
];

/**
 * Keeps the label's asterisk and the accessible semantics, without handing the
 * browser a reason to pop its own "Please fill in this field" bubble over the
 * form — the wizard reports missing fields itself, in the theme's own style.
 */
const softRequired = { required: false, 'aria-required': true } as const;

/** Two- and three-column field rows, collapsing to one column on a phone. */
const rowSx = (columns: number) => ({
  display: 'grid',
  gap: 2.5,
  alignItems: 'start',
  gridTemplateColumns: { xs: '1fr', sm: `repeat(${columns}, 1fr)` },
});

interface WizardForm {
  name: string;
  description: string;
  categoryId: string | null;
  unit: string;
  brand: string;
  sku: string;
  tags: string[];
  highlights: string[];
  womenEntrepreneur: boolean;
  youthEmpowerment: boolean;
  organicCertified: boolean;
  organicCertification: string;
  kind: ProductKind;
  price: string;
  mrp: string;
  quantity: string;
  threshold: string;
  minOrderQty: string;
  maxOrderQty: string;
  codAvailable: boolean;
  returnEligible: boolean;
  hsnCode: string;
  harvestDate: string;
  shelfLifeDays: string;
  weightGrams: string;
  packagingType: string;
  images: string[];
  videoUrl: string;
}

const emptyForm = (): WizardForm => ({
  name: '',
  description: '',
  categoryId: null,
  unit: 'kg',
  brand: '',
  sku: '',
  tags: [],
  highlights: [],
  womenEntrepreneur: false,
  youthEmpowerment: false,
  organicCertified: false,
  organicCertification: '',
  kind: 'standard',
  price: '',
  mrp: '',
  quantity: '0',
  threshold: '5',
  minOrderQty: '1',
  maxOrderQty: '',
  codAvailable: true,
  returnEligible: true,
  hsnCode: '',
  harvestDate: '',
  shelfLifeDays: '',
  weightGrams: '',
  packagingType: '',
  images: [],
  videoUrl: '',
});

// ----------------------------------------------------------------------

export const SellerProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existing, isLoading } = useProduct(id);
  const { data: sellerProfile, isLoading: isSellerLoading } = useSellerMe();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const imageUrl = useProductImageUploadUrl();

  const allowedCategoryIds = useMemo(() => {
    if (isSellerLoading) return [];
    if (!sellerProfile) return undefined;
    const ids = new Set(sellerProfile.categoryIds ?? []);
    if (isEdit && existing?.categoryId) {
      ids.add(existing.categoryId);
    }
    return Array.from(ids);
  }, [sellerProfile, isSellerLoading, isEdit, existing?.categoryId]);

  // Draft persistence only for new products; edits always prefill from server.
  const storageKey = `buydesi.product-draft.${user?.id ?? 'anon'}`;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(() => {
    if (isEdit) return emptyForm();
    try {
      const raw = localStorage.getItem(`buydesi.product-draft.${user?.id ?? 'anon'}`);
      if (raw) return { ...emptyForm(), ...(JSON.parse(raw) as Partial<WizardForm>) };
    } catch {
      /* ignore corrupt cache */
    }
    return emptyForm();
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Missing fields stay quiet until the seller actually tries to move on.
  const [showErrors, setShowErrors] = useState(false);

  // A "saving" that is not a saving is the kind of claim that gets a
  // marketplace in trouble, so an MRP at or below the price is rejected here.
  const mrpBelowPrice = Boolean(form.mrp.trim()) && Number(form.mrp) <= Number(form.price);
  // Instant local previews (objectURL) keyed by the stored image URL, so the
  // grid renders immediately without waiting on S3 read propagation.
  const [previews, setPreviews] = useState<Record<string, string>>({});
  // Buyable options. Empty = product sold as a single item.
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const { data: existingVariants } = useVariants(id);
  const [variantsSavedAt, setVariantsSavedAt] = useState<number | null>(null);
  const replaceVariants = useReplaceVariants();

  // Prefill the option table on edit.
  useEffect(() => {
    if (!existingVariants) return;
    setVariantRows(
      existingVariants.map((v) => ({
        id: v.id,
        optionType: v.optionType,
        optionValue: v.optionValue,
        sku: v.sku ?? '',
        price: String(v.price),
        quantity: String(v.stock.quantity),
        threshold: String(v.stock.threshold),
        weightGrams: v.weightGrams !== null ? String(v.weightGrams) : '',
        dimensions: v.dimensions ?? '',
        image: v.images[0] ?? '',
        isDefault: v.isDefault,
        active: v.active,
      })),
    );
  }, [existingVariants]);

  // Prefill from server on edit.
  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name,
      description: existing.description,
      categoryId: existing.categoryId,
      unit: existing.unit,
      brand: existing.brand ?? '',
      sku: existing.sku ?? '',
      tags: existing.tags ?? [],
      highlights: existing.highlights ?? [],
      womenEntrepreneur: Boolean(existing.womenEntrepreneur),
      youthEmpowerment: Boolean(existing.youthEmpowerment),
      organicCertified: Boolean(existing.organicCertified),
      organicCertification: existing.organicCertification ?? '',
      kind: existing.kind ?? 'standard',
      price: existing.price ? String(existing.price) : '',
      mrp: existing.mrp ? String(existing.mrp) : '',
      quantity: String(existing.stock.quantity),
      threshold: String(existing.stock.threshold),
      minOrderQty: existing.minOrderQty !== undefined ? String(existing.minOrderQty) : '1',
      maxOrderQty:
        existing.maxOrderQty !== undefined && existing.maxOrderQty !== null
          ? String(existing.maxOrderQty)
          : '',
      codAvailable: existing.codAvailable ?? true,
      returnEligible: existing.returnEligible ?? true,
      hsnCode: existing.hsnCode ?? '',
      harvestDate: existing.harvestDate ? existing.harvestDate.slice(0, 10) : '',
      shelfLifeDays:
        existing.shelfLifeDays !== undefined && existing.shelfLifeDays !== null
          ? String(existing.shelfLifeDays)
          : '',
      weightGrams: existing.weightGrams !== null ? String(existing.weightGrams) : '',
      packagingType: existing.packagingType ?? '',
      images: existing.images,
      videoUrl: existing.videoUrl ?? '',
    });
  }, [existing]);

  // Persist new-product drafts to localStorage.
  useEffect(() => {
    if (isEdit) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(form));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [form, storageKey, isEdit]);

  const set = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploadingImage(true);
    setError(null);
    try {
      const presigned = await imageUrl.mutateAsync({
        contentType: f.type || 'image/jpeg',
        ext: f.name.split('.').pop(),
      });
      const key = await uploadToPresignedUrl(presigned, f);
      // Store the public HTTPS URL (renders directly on the storefront/admin);
      // fall back to the key for older backends.
      const stored = presigned.publicUrl ?? presigned.s3Key ?? key;
      const local = URL.createObjectURL(f);
      setPreviews((p) => ({ ...p, [stored]: local }));
      setForm((prev) => ({ ...prev, images: [...prev.images, stored] }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Per-step validation ───
  const stepValid = useMemo(() => {
    const hasPrice = Number(form.price) > 0;
    const min = form.minOrderQty ? Number(form.minOrderQty) : 1;
    const max = form.maxOrderQty ? Number(form.maxOrderQty) : null;
    const qtyOk = min >= 1 && (max === null || max >= min);
    return [
      form.name.trim().length >= 2 &&
      !!form.categoryId &&
      form.description.trim().length >= 2 &&
      form.unit.trim().length >= 1, // Basic
      hasPrice && !mrpBelowPrice && Number(form.quantity) >= 0 && qtyOk, // Pricing & availability
      true, // Produce & logistics (all optional)
      true, // Images & media (images recommended, not required)
      hasPrice && form.name.trim().length >= 2 && !!form.categoryId, // Review
    ];
  }, [form, mrpBelowPrice]);

  const buildPayload = (): CreateProductInput => {
    const payload: CreateProductInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId as string,
      unit: form.unit.trim(),
      weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
      images: form.images,
      kind: form.kind,
      price: Number(form.price) || 0,
      // Blank means "no printed MRP" — sending 0 would advertise a 100% saving.
      mrp: form.mrp.trim() ? Number(form.mrp) : undefined,
      stock: {
        quantity: Number(form.quantity) || 0,
        threshold: Number(form.threshold) || 5,
      },
      highlights: form.highlights.length ? form.highlights : undefined,
      brand: form.brand.trim() || undefined,
      sku: form.sku.trim() || undefined,
      tags: form.tags.length ? form.tags : undefined,
      womenEntrepreneur: form.womenEntrepreneur || undefined,
      youthEmpowerment: form.youthEmpowerment || undefined,
      organicCertified: form.organicCertified || undefined,
      organicCertification: form.organicCertification.trim() || undefined,
      minOrderQty: form.minOrderQty ? Number(form.minOrderQty) : undefined,
      maxOrderQty: form.maxOrderQty ? Number(form.maxOrderQty) : undefined,
      codAvailable: form.codAvailable,
      returnEligible: form.returnEligible,
      hsnCode: form.hsnCode.trim() || undefined,
      harvestDate: form.harvestDate ? new Date(form.harvestDate).toISOString() : undefined,
      shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : undefined,
      packagingType: form.packagingType.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
    };
    return payload;
  };

  const goNext = () => {
    if (!stepValid[step]) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setError(null);
    const payload = buildPayload();
    const variantProblem = validateVariantRows(variantRows);
    if (variantProblem) {
      setError(variantProblem);
      setStep(1);
      return;
    }
    // Options carry their own prices, so the product-level tiers are only
    // required when the product is sold as a single item.
    if (variantRows.length === 0 && !(payload.price > 0)) {
      setError('Set a price — or add options, which carry their own.');
      setStep(1);
      return;
    }
    try {
      let productId = id;
      if (isEdit && id) {
        await update.mutateAsync({ id, patch: payload });
      } else {
        const created = await create.mutateAsync(payload);
        productId = created.id;
        localStorage.removeItem(storageKey);
      }
      // Save the option table against the product (create or edit alike).
      if (productId && (variantRows.length > 0 || (existingVariants?.length ?? 0) > 0)) {
        await replaceVariants.mutateAsync({
          productId,
          variants: rowsToPayload(variantRows),
        });
      }
      navigate('/seller/products');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  if (isEdit && isLoading) return <LoadingScreen sx={{ py: 20 }} />;

  const saving = create.isPending || update.isPending || replaceVariants.isPending;
  // Once a product has options, every price and stock figure lives on the
  // option, so the product-level fields would be dead inputs.
  const hasOptions = variantRows.length > 0;
  const isLastStep = step === STEPS.length - 1;

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        description={
          isEdit
            ? 'Editing a LIVE product sends it back to PENDING for re-approval.'
            : 'Add a rich listing across a few quick steps. Your draft is saved automatically.'
        }
        links={[
          { name: 'Dashboard', href: '/seller' },
          { name: 'Products', href: '/seller/products' },
          { name: isEdit ? existing?.name ?? 'Edit' : 'New product' },
        ]}
        action={
          <Button
            variant="outlined"
            onClick={() => navigate('/seller/products')}
            startIcon={<Iconify icon="eva:close-fill" />}
          >
            Cancel
          </Button>
        }
      />

      <Card sx={{ mt: 3, p: 3 }}>
        <Stepper activeStep={step} alternativeLabel nonLinear>
          {STEPS.map((s, i) => (
            <Step key={s.label} completed={i < step && stepValid[i]}>
              <StepButton onClick={() => setStep(i)}>{s.label}</StepButton>
            </Step>
          ))}
        </Stepper>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardHeader title={STEPS[step].label} subheader={STEP_HINTS[step]} />

        <CardContent>
          <Stack spacing={3}>
            {/* ── Step 1: Basic information ── */}
            {step === 0 && (
              <>
                <Box sx={rowSx(2)}>
                  <TextField
                    fullWidth
                    required
                    label="Product name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    error={showErrors && form.name.trim().length < 2}
                    helperText={
                      showErrors && form.name.trim().length < 2 ? 'Give the product a name' : ' '
                    }
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ ...softRequired, maxLength: 200 }}
                  />
                  <CategoryPicker
                    label="Category"
                    required
                    sellerMode
                    allowedCategoryIds={allowedCategoryIds}
                    value={form.categoryId}
                    onChange={(v) => set('categoryId', v)}
                    error={showErrors && !form.categoryId}
                    helperText={
                      showErrors && !form.categoryId
                        ? 'Pick a category'
                        : sellerProfile && sellerProfile.categoryIds?.length === 0
                          ? 'No categories assigned to your seller profile'
                          : ' '
                    }
                  />
                </Box>

                <TextField
                  fullWidth
                  required
                  multiline
                  minRows={5}
                  label="Description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Describe the product, origin, quality, how it's grown / made…"
                  error={showErrors && form.description.trim().length < 2}
                  helperText={
                    showErrors && form.description.trim().length < 2
                      ? 'Buyers rely on this — a line or two is enough'
                      : undefined
                  }
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ ...softRequired, maxLength: 5000 }}
                />

                <Box sx={rowSx(3)}>
                  <Autocomplete
                    freeSolo
                    options={UNIT_OPTIONS}
                    inputValue={form.unit}
                    onInputChange={(_e, v) => set('unit', v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Unit"
                        placeholder="kg / piece / litre"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ ...params.inputProps, ...softRequired }}
                      />
                    )}
                  />
                  <TextField
                    fullWidth
                    label="Brand"
                    value={form.brand}
                    onChange={(e) => set('brand', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 120 }}
                  />
                  <TextField
                    fullWidth
                    label="SKU / product code"
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 60 }}
                  />
                </Box>

                <ChipInput
                  label="Key highlights"
                  value={form.highlights}
                  onChange={(v) => set('highlights', v)}
                  placeholder="Type a highlight and press Enter (e.g. Cold-pressed)"
                  helperText="Short selling points shown as bullets on the product page."
                />

                <ChipInput
                  label="Search tags"
                  value={form.tags}
                  onChange={(v) => set('tags', v)}
                  placeholder="Type a tag and press Enter (e.g. millet, gluten-free)"
                  helperText="Helps buyers find this product in search."
                />

                <Box sx={rowSx(3)}>
                  <CheckboxCard
                    label="Women entrepreneur"
                    hint="Show a badge highlighting a women-led business."
                    checked={form.womenEntrepreneur}
                    onChange={(v) => set('womenEntrepreneur', v)}
                  />
                  <CheckboxCard
                    label="Youth empowerment"
                    hint="Show a badge for a youth-led enterprise."
                    checked={form.youthEmpowerment}
                    onChange={(v) => set('youthEmpowerment', v)}
                  />
                  <CheckboxCard
                    label="Organic certified"
                    hint="Product carries an organic certification."
                    checked={form.organicCertified}
                    onChange={(v) => set('organicCertified', v)}
                  />
                </Box>

                {form.organicCertified && (
                  <TextField
                    fullWidth
                    label="Organic certification (body / number)"
                    value={form.organicCertification}
                    onChange={(e) => set('organicCertification', e.target.value)}
                    placeholder="e.g. India Organic / NPOP — Cert #12345"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 200 }}
                  />
                )}
              </>
            )}

            {/* ── Step 2: Pricing & availability ── */}
            {step === 1 && (
              <>
                {/* Which of the three kinds this listing is. A seller who sells
                    both standard and organic mangoes lists them separately. */}
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Kind of product</Typography>
                  <Box sx={rowSx(3)}>
                    {PRODUCT_KINDS.map((k) => (
                      <KindCard
                        key={k}
                        kind={k}
                        selected={form.kind === k}
                        onSelect={() => set('kind', k)}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Standard, organic and premium are three different products. List each one
                    separately — this listing is one of them.
                  </Typography>
                </Stack>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {hasOptions ? (
                  <Alert severity="info">
                    This product is sold in options, so the price and quantity are set per option
                    below. The product-level fields are not used.
                  </Alert>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    One price for this product. Add options below if it sells in more than one pack
                    size or colour — each option then carries its own price and quantity.
                  </Typography>
                )}

                {!hasOptions && (
                  <>
                    <Box sx={rowSx(2)}>
                      <TextField
                        fullWidth
                        required
                        type="number"
                        label="Selling price"
                        value={form.price}
                        onChange={(e) => set('price', e.target.value)}
                        error={showErrors && !(Number(form.price) > 0)}
                        helperText={
                          showErrors && !(Number(form.price) > 0)
                            ? 'Set a price above ₹0'
                            : `What the buyer pays, per ${form.unit || 'unit'}`
                        }
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ ...softRequired, min: 0, step: '0.5' }}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="MRP (optional)"
                        value={form.mrp}
                        onChange={(e) => set('mrp', e.target.value)}
                        error={showErrors && mrpBelowPrice}
                        helperText={
                          showErrors && mrpBelowPrice
                            ? 'MRP has to be above the selling price'
                            : 'Printed price. Buyers see it struck through with the saving.'
                        }
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 0, step: '0.5' }}
                      />
                    </Box>

                    <EarningsPreviewCard
                      categoryId={form.categoryId ?? ''}
                      price={Number(form.price) || 0}
                      productId={id}
                    />

                    <Box sx={rowSx(2)}>
                      <TextField
                        fullWidth
                        type="number"
                        label="On-hand quantity"
                        value={form.quantity}
                        onChange={(e) => set('quantity', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 0 }}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="Low-stock threshold"
                        value={form.threshold}
                        onChange={(e) => set('threshold', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 0 }}
                        helperText="You and your Category Admin get an alert when stock drops here."
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="Minimum order quantity"
                        value={form.minOrderQty}
                        onChange={(e) => set('minOrderQty', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 1 }}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="Maximum order quantity (per order)"
                        value={form.maxOrderQty}
                        onChange={(e) => set('maxOrderQty', e.target.value)}
                        placeholder="Leave blank for no cap"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 1 }}
                      />
                    </Box>

                    {form.minOrderQty &&
                      form.maxOrderQty &&
                      Number(form.maxOrderQty) < Number(form.minOrderQty) && (
                        <Alert severity="error">
                          Maximum order quantity must be greater than or equal to the minimum.
                        </Alert>
                      )}

                    <Box sx={rowSx(2)}>
                      <CheckboxCard
                        label="Cash on Delivery available"
                        hint="Buyers can pay cash for this item. If off, COD is blocked at checkout when this item is in the cart."
                        checked={form.codAvailable}
                        onChange={(v) => set('codAvailable', v)}
                      />
                      <CheckboxCard
                        label="Returns eligible"
                        hint="This product can be returned within the platform return window."
                        checked={form.returnEligible}
                        onChange={(v) => set('returnEligible', v)}
                      />
                    </Box>

                    <TextField
                      fullWidth
                      label="HSN code (tax)"
                      value={form.hsnCode}
                      onChange={(e) => set('hsnCode', e.target.value)}
                      placeholder="Optional — for GST invoicing"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ maxLength: 20 }}
                    />
                  </>
                )}

                <Divider sx={{ borderStyle: 'dashed' }} />

                <VariantEditor rows={variantRows} onChange={setVariantRows} unit={form.unit} />

                {isEdit && id && variantRows.length > 0 && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <LoadingButton
                      variant="outlined"
                      loading={replaceVariants.isPending}
                      startIcon={<Iconify icon="solar:diskette-bold" />}
                      onClick={async () => {
                        const problem = validateVariantRows(variantRows);
                        if (problem) {
                          setError(problem);
                          return;
                        }
                        setError(null);
                        try {
                          const saved = await replaceVariants.mutateAsync({
                            productId: id,
                            variants: rowsToPayload(variantRows),
                          });
                          // Adopt the server's ids so a second save updates the
                          // same rows instead of creating duplicates.
                          setVariantRows((rows) =>
                            rows.map((r, i) => ({ ...r, id: saved[i]?.id ?? r.id })),
                          );
                          setVariantsSavedAt(Date.now());
                        } catch (err) {
                          setError(
                            err instanceof ApiError ? err.message : 'Could not save options',
                          );
                        }
                      }}
                    >
                      Save options
                    </LoadingButton>
                    {variantsSavedAt !== null && !replaceVariants.isPending && (
                      <Typography variant="caption" sx={{ color: 'success.main' }}>
                        Options saved
                      </Typography>
                    )}
                  </Stack>
                )}

                {variantRows.length > 0 && (
                  <Alert severity="info">
                    Buyers pick an option before adding to the cart. The prices and stock above are
                    ignored while options exist — each option carries its own.
                  </Alert>
                )}
              </>
            )}

            {/* ── Step 3: Produce & logistics ── */}
            {step === 2 && (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Optional details that help buyers and shipping. Useful for fresh / perishable
                  goods.
                </Typography>

                <Box sx={rowSx(2)}>
                  <DateField
                    fullWidth
                    label="Harvest / packed date"
                    value={form.harvestDate}
                    onChange={(v) => set('harvestDate', v)}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Shelf life (days)"
                    value={form.shelfLifeDays}
                    onChange={(e) => set('shelfLifeDays', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Weight per unit (grams)"
                    value={form.weightGrams}
                    onChange={(e) => set('weightGrams', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0 }}
                    helperText="Used to compute delivery charges."
                  />
                  <TextField
                    select
                    fullWidth
                    label="Packaging type"
                    value={form.packagingType}
                    onChange={(e) => set('packagingType', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {PACKAGING_OPTIONS.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </>
            )}

            {/* ── Step 4: Images & media ── */}
            {step === 3 && (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  First image is the primary thumbnail. Clear photos improve approval and sales.
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: {
                      xs: 'repeat(2, 1fr)',
                      sm: 'repeat(4, 1fr)',
                      md: 'repeat(6, 1fr)',
                    },
                  }}
                >
                  {form.images.map((src, i) => (
                    <Box
                      key={`${src}-${i}`}
                      sx={{
                        position: 'relative',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        aspectRatio: '1 / 1',
                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                      }}
                    >
                      <Box
                        component="img"
                        src={previews[src] ?? src}
                        alt=""
                        sx={{ width: 1, height: 1, objectFit: 'cover' }}
                      />

                      {i === 0 && (
                        <Label
                          color="primary"
                          variant="filled"
                          sx={{ position: 'absolute', top: 6, left: 6 }}
                        >
                          Primary
                        </Label>
                      )}

                      <IconButton
                        size="small"
                        onClick={() =>
                          set(
                            'images',
                            form.images.filter((_, idx) => idx !== i),
                          )
                        }
                        sx={{
                          top: 4,
                          right: 4,
                          position: 'absolute',
                          color: 'common.white',
                          bgcolor: (theme) => alpha(theme.palette.grey[900], 0.48),
                          '&:hover': { bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72) },
                        }}
                      >
                        <Iconify icon="mingcute:close-line" width={16} />
                      </IconButton>
                    </Box>
                  ))}

                  {/* Upload tile — the whole square is the file picker. */}
                  <Box
                    component="label"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      aspectRatio: '1 / 1',
                      borderRadius: 1.5,
                      cursor: uploadingImage ? 'default' : 'pointer',
                      color: 'text.disabled',
                      transition: (theme) => theme.transitions.create(['border-color', 'opacity']),
                      border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.24)}`,
                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                      '&:hover': { opacity: 0.72, borderColor: 'primary.main' },
                    }}
                  >
                    {uploadingImage ? (
                      <CircularProgress size={24} />
                    ) : (
                      <Stack spacing={0.5} alignItems="center">
                        <Iconify icon="eva:cloud-upload-fill" width={24} />
                        <Box component="span" sx={{ typography: 'caption' }}>
                          Add image
                        </Box>
                      </Stack>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingImage}
                      onChange={onFile}
                    />
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  label="Product video (YouTube link or MP4 URL)"
                  value={form.videoUrl}
                  onChange={(e) => set('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=… or https://…/clip.mp4"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 500 }}
                  helperText="Shown on the product page. A short clip of the produce or process builds trust."
                />
              </>
            )}

            {/* ── Step 5: Review ── */}
            {step === 4 && (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Check the details below. Submitting sends the listing to a Category Admin for
                  approval.
                </Typography>

                <Box sx={rowSx(2)}>
                  <ReviewRow label="Name" value={form.name || '—'} />
                  <ReviewRow label="Kind" value={KIND_LABELS[form.kind]} />
                  <ReviewRow label="Unit" value={form.unit || '—'} />
                  <ReviewRow
                    label="Selling price"
                    value={
                      hasOptions
                        ? `${variantRows.length} option${variantRows.length === 1 ? '' : 's'
                        }, priced individually`
                        : Number(form.price) > 0
                          ? formatInr(Number(form.price))
                          : '—'
                    }
                  />
                  {!hasOptions && Number(form.mrp) > 0 && (
                    <ReviewRow label="MRP" value={formatInr(Number(form.mrp))} />
                  )}
                  <ReviewRow
                    label="Stock"
                    value={
                      hasOptions
                        ? `${variantRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)} across options`
                        : `${form.quantity || 0} ${form.unit}`
                    }
                  />
                  <ReviewRow
                    label="Order qty"
                    value={`min ${form.minOrderQty || 1}${form.maxOrderQty ? ` · max ${form.maxOrderQty}` : ''
                      }`}
                  />
                  <ReviewRow
                    label="Cash on Delivery"
                    value={form.codAvailable ? 'Available' : 'Not available'}
                  />
                  <ReviewRow
                    label="Returns"
                    value={form.returnEligible ? 'Eligible' : 'Not eligible'}
                  />
                  <ReviewRow label="Images" value={`${form.images.length} uploaded`} />
                </Box>

                {(form.womenEntrepreneur || form.youthEmpowerment || form.organicCertified) && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {form.womenEntrepreneur && (
                      <Chip size="small" variant="soft" color="info" label="Women entrepreneur" />
                    )}
                    {form.youthEmpowerment && (
                      <Chip size="small" variant="soft" color="info" label="Youth empowerment" />
                    )}
                    {form.organicCertified && (
                      <Chip size="small" variant="soft" color="success" label="Organic certified" />
                    )}
                  </Stack>
                )}
              </>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>

        <Divider />

        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 3 }}
        >
          <Button
            variant="outlined"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back
          </Button>

          {showErrors && !stepValid[step] && (
            <Typography variant="caption" sx={{ color: 'error.main', textAlign: 'center' }}>
              Complete the required fields (*) to continue.
            </Typography>
          )}

          {!isLastStep ? (
            <Button
              variant="contained"
              onClick={goNext}
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
            >
              Save and continue
            </Button>
          ) : (
            <LoadingButton
              variant="contained"
              loading={saving}
              disabled={!stepValid[step]}
              onClick={submit}
              startIcon={<Iconify icon="solar:check-circle-bold" />}
            >
              {isEdit ? 'Save changes' : 'Submit for approval'}
            </LoadingButton>
          )}
        </Stack>
      </Card>
    </>
  );
};

// ----------------------------------------------------------------------

const KIND_HINTS: Record<ProductKind, string> = {
  standard: 'Conventionally grown or made.',
  organic: 'Grown without synthetic inputs.',
  premium: 'Top grade — the pick of the crop.',
};

const KIND_ICONS: Record<ProductKind, string> = {
  standard: 'solar:box-bold',
  organic: 'solar:leaf-bold',
  premium: 'solar:crown-bold',
};

/** One of the three kinds, picked like a radio card. */
const KindCard = ({
  kind,
  selected,
  onSelect,
}: {
  kind: ProductKind;
  selected: boolean;
  onSelect: () => void;
}) => (
  <Box
    role="radio"
    aria-checked={selected}
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    }}
    sx={{
      p: 2,
      cursor: 'pointer',
      borderRadius: 1.5,
      transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
      border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
      ...(selected
        ? {
          borderColor: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        }
        : { '&:hover': { borderColor: 'text.primary' } }),
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Iconify
        icon={KIND_ICONS[kind]}
        width={22}
        sx={{ mt: 0.25, color: selected ? 'primary.main' : 'text.disabled' }}
      />
      <Stack spacing={0.25}>
        <Typography variant="subtitle2">{KIND_LABELS[kind]}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {KIND_HINTS[kind]}
        </Typography>
      </Stack>
    </Stack>
  </Box>
);

/** A boxed checkbox with a one-line explanation under its label. */
const CheckboxCard = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <FormControlLabel
    sx={{
      m: 0,
      p: 2,
      borderRadius: 1.5,
      alignItems: 'flex-start',
      transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
      border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
      ...(checked && {
        borderColor: 'primary.main',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
      }),
    }}
    control={
      <Checkbox sx={{ py: 0 }} checked={checked} onChange={(e) => onChange(e.target.checked)} />
    }
    label={
      <Stack spacing={0.25}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
      </Stack>
    }
  />
);

/** One boxed label/value pair on the review step. */
const ReviewRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 1.5,
      border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
    }}
  >
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant="subtitle2">{value}</Typography>
  </Box>
);

/** Free-text chips — type a value, press Enter, it becomes a chip. */
const ChipInput = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  helperText?: string;
}) => (
  <Autocomplete
    multiple
    freeSolo
    options={[] as string[]}
    value={value}
    onChange={(_e, next) =>
      onChange([...new Set(next.map((v) => v.trim()).filter(Boolean))])
    }
    renderTags={(tags, getTagProps) =>
      tags.map((option, index) => {
        const { key, ...tagProps } = getTagProps({ index });
        return <Chip {...tagProps} key={`${option}-${key}`} size="small" variant="soft" label={option} />;
      })
    }
    renderInput={(params) => (
      <TextField
        {...params}
        label={label}
        placeholder={value.length ? '' : placeholder}
        helperText={helperText}
        InputLabelProps={{ shrink: true }}
      />
    )}
  />
);
