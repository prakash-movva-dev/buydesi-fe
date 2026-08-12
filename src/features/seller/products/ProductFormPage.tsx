import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Trash2,
} from 'lucide-react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import TextField from '@mui/material/TextField';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputBase from '@mui/material/InputBase';
import { alpha } from '@mui/material/styles';
import MuiCard from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import MuiCardContent from '@mui/material/CardContent';
import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import { DateField } from '@/components/ui/DateField';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/auth';
import { useProduct } from '@/features/products/api';
import {
  VariantEditor,
  rowsToPayload,
  validateVariantRows,
  type VariantRow,
} from './VariantEditor';
import { useReplaceVariants, useVariants } from './variants.api';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { ApiError } from '@/types/api';
import {
  useCreateProduct,
  useProductImageUploadUrl,
  useUpdateProduct,
  type CreateProductInput,
} from './api';

/** One-line hint shown under each step's card title. */
const STEP_HINTS = [
  'Name, category and how buyers find this product.',
  'What it sells for, how much stock there is, and any options.',
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
  standard: string;
  organic: string;
  premium: string;
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
  standard: '',
  organic: '',
  premium: '',
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

export const SellerProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existing, isLoading } = useProduct(id);
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const imageUrl = useProductImageUploadUrl();

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
        label: v.label,
        sku: v.sku ?? '',
        size: v.size ?? '',
        colour: v.colour ?? '',
        standard: v.pricing.standard !== undefined ? String(v.pricing.standard) : '',
        organic: v.pricing.organic !== undefined ? String(v.pricing.organic) : '',
        premium: v.pricing.premium !== undefined ? String(v.pricing.premium) : '',
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
      standard: existing.pricing.standard !== undefined ? String(existing.pricing.standard) : '',
      organic: existing.pricing.organic !== undefined ? String(existing.pricing.organic) : '',
      premium: existing.pricing.premium !== undefined ? String(existing.pricing.premium) : '',
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
    const hasPrice = Boolean(form.standard || form.organic || form.premium);
    const min = form.minOrderQty ? Number(form.minOrderQty) : 1;
    const max = form.maxOrderQty ? Number(form.maxOrderQty) : null;
    const qtyOk = min >= 1 && (max === null || max >= min);
    return [
      form.name.trim().length >= 2 &&
        !!form.categoryId &&
        form.description.trim().length >= 2 &&
        form.unit.trim().length >= 1, // Basic
      hasPrice && Number(form.quantity) >= 0 && qtyOk, // Pricing & availability
      true, // Produce & logistics (all optional)
      true, // Images & media (images recommended, not required)
      hasPrice && form.name.trim().length >= 2 && !!form.categoryId, // Review
    ];
  }, [form]);

  const buildPayload = (): CreateProductInput => {
    const pricing: { standard?: number; organic?: number; premium?: number } = {};
    if (form.standard) pricing.standard = Number(form.standard);
    if (form.organic) pricing.organic = Number(form.organic);
    if (form.premium) pricing.premium = Number(form.premium);

    const payload: CreateProductInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId as string,
      unit: form.unit.trim(),
      weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
      images: form.images,
      pricing,
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
    if (
      variantRows.length === 0 &&
      payload.pricing.standard === undefined &&
      payload.pricing.organic === undefined &&
      payload.pricing.premium === undefined
    ) {
      setError('At least one of standard / organic / premium price is required.');
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

  if (isEdit && isLoading) return <Skeleton className="h-96 w-full" />;

  const saving = create.isPending || update.isPending;
  // Once a product has options, every price and stock figure lives on the
  // option, so the product-level fields would be dead inputs.
  const hasOptions = variantRows.length > 0;

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <CustomBreadcrumbs
        heading={isEdit ? 'Edit product' : 'New product'}
        links={[
          { name: 'Dashboard', href: '/seller' },
          { name: 'Products', href: '/seller/products' },
          { name: isEdit ? existing?.name ?? 'Edit' : 'New product' },
        ]}
        sx={{ mb: 0 }}
      />

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: -2 }}>
        {isEdit
          ? 'Editing a LIVE product sends it back to PENDING for re-approval.'
          : 'Add a rich listing across a few quick steps. Your draft is saved automatically.'}
      </Typography>

      <MuiCard sx={{ p: 3 }}>
        <Stepper activeStep={step} alternativeLabel nonLinear>
          {STEPS.map((s, i) => (
            <Step key={s.label}>
              <StepButton onClick={() => setStep(i)}>{s.label}</StepButton>
            </Step>
          ))}
        </Stepper>
      </MuiCard>

      <MuiCard>
        <CardHeader title={STEPS[step].label} subheader={STEP_HINTS[step]} />
        <MuiCardContent className="space-y-4">
          {/* ── Step 1: Basic information ── */}
          {step === 0 && (
            <>
              <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'end', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
                <TextField
                  fullWidth
                  label="Product name"
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 200 }}
                />
                <div>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Category *
                  </Typography>
                  <CategoryPicker value={form.categoryId} onChange={(v) => set('categoryId', v)} />
                </div>
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={5}
                label="Description"
                required
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Describe the product, origin, quality, how it's grown / made…"
                InputLabelProps={{ shrink: true }}
                inputProps={{ maxLength: 5000 }}
              />
              <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
                <div>
                  <TextField
                    fullWidth
                    label="Unit"
                    required
                    value={form.unit}
                    onChange={(e) => set('unit', e.target.value)}
                    placeholder="kg / piece / litre"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ list: 'pf-unit-list' }}
                  />
                  <datalist id="pf-unit-list">
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
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
              <Field label="Key highlights">
                <ChipInput
                  value={form.highlights}
                  onChange={(v) => set('highlights', v)}
                  placeholder="Type a highlight and press Enter (e.g. Cold-pressed)"
                />
                <p className="text-xs text-muted-foreground">
                  Short selling points shown as bullets on the product page.
                </p>
              </Field>
              <Field label="Search tags">
                <ChipInput
                  value={form.tags}
                  onChange={(v) => set('tags', v)}
                  placeholder="Type a tag and press Enter (e.g. millet, gluten-free)"
                />
                <p className="text-xs text-muted-foreground">Helps buyers find this product in search.</p>
              </Field>
              <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
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
              {hasOptions ? (
                <Alert severity="info">
                  This product is sold in options, so pricing and stock are set per option below.
                  The product-level fields are not used.
                </Alert>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Set at least one price tier. Premium is hidden from public buyers; only verified
                  premium accounts see it.
                </Typography>
              )}
              {!hasOptions && (
                <>
                <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={`Standard ₹ / ${form.unit || 'unit'}`}
                    value={form.standard}
                    onChange={(e) => set('standard', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0, step: '0.5' }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label={`Organic ₹ / ${form.unit || 'unit'}`}
                    value={form.organic}
                    onChange={(e) => set('organic', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0, step: '0.5' }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label={`Premium ₹ / ${form.unit || 'unit'}`}
                    value={form.premium}
                    onChange={(e) => set('premium', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0, step: '0.5' }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
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

                <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
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

              <hr className="border-border" />

              <VariantEditor rows={variantRows} onChange={setVariantRows} />
              {isEdit && id && variantRows.length > 0 && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={replaceVariants.isPending}
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
                        setError(err instanceof ApiError ? err.message : 'Could not save options');
                      }
                    }}
                  >
                    {replaceVariants.isPending ? 'Saving options…' : 'Save options'}
                  </Button>
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
              <p className="text-sm text-muted-foreground">
                Optional details that help buyers and shipping. Useful for fresh / perishable goods.
              </p>
              <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
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
              <p className="text-sm text-muted-foreground">
                First image is the primary thumbnail. Clear photos improve approval and sales.
              </p>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                <FileUp className="h-4 w-4" />
                {uploadingImage ? 'Uploading…' : 'Add image'}
                <input type="file" accept="image/*" onChange={onFile} disabled={uploadingImage} className="hidden" />
              </label>
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {form.images.map((src, i) => (
                    <div key={`${src}-${i}`} className="relative overflow-hidden rounded-md border border-border bg-secondary">
                      <img src={previews[src] ?? src} alt="" className="aspect-square w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => set('images', form.images.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              <p className="text-sm text-muted-foreground">
                Check the details below. Submitting sends the listing to a Category Admin for
                approval.
              </p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <ReviewRow label="Name" value={form.name || '—'} />
                <ReviewRow label="Unit" value={form.unit || '—'} />
                <ReviewRow
                  label="Pricing"
                  value={
                    [
                      form.standard && `Std ₹${form.standard}`,
                      form.organic && `Org ₹${form.organic}`,
                      form.premium && `Prm ₹${form.premium}`,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'
                  }
                />
                <ReviewRow label="Stock" value={`${form.quantity || 0} ${form.unit}`} />
                <ReviewRow
                  label="Order qty"
                  value={`min ${form.minOrderQty || 1}${form.maxOrderQty ? ` · max ${form.maxOrderQty}` : ''}`}
                />
                <ReviewRow label="Cash on Delivery" value={form.codAvailable ? 'Available' : 'Not available'} />
                <ReviewRow label="Returns" value={form.returnEligible ? 'Eligible' : 'Not eligible'} />
                <ReviewRow label="Images" value={`${form.images.length} uploaded`} />
              </dl>
              {(form.womenEntrepreneur || form.youthEmpowerment || form.organicCertified) && (
                <div className="flex flex-wrap gap-2">
                  {form.womenEntrepreneur && <Badge variant="info">Women entrepreneur</Badge>}
                  {form.youthEmpowerment && <Badge variant="info">Youth empowerment</Badge>}
                  {form.organicCertified && <Badge variant="success">Organic certified</Badge>}
                </div>
              )}
            </>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {/* Nav */}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {!stepValid[step] && step < STEPS.length - 1 && (
              <span className="text-xs text-muted-foreground">
                Complete the required fields (*) to continue.
              </span>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid[step]}>
                Save and continue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={!stepValid[step] || saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Submit for approval'}
              </Button>
            )}
          </div>
        </MuiCardContent>
      </MuiCard>
    </Stack>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border p-3">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium">{value}</dd>
  </div>
);

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
    className="rounded-md border border-border p-3 hover:bg-accent/50"
    sx={{ alignItems: 'flex-start', display: 'flex', m: 0 }}
    control={
      <Checkbox
        sx={{ py: 0 }}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    }
    label={
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    }
  />
);

const ChipInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        p: 1,
        minHeight: 56,
        borderRadius: 1,
        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
        transition: (theme) => theme.transitions.create('border-color'),
        '&:focus-within': { borderColor: 'text.primary' },
      }}
    >
      {value.map((chip) => (
        <Chip
          key={chip}
          size="small"
          variant="soft"
          label={chip}
          onDelete={() => onChange(value.filter((c) => c !== chip))}
        />
      ))}
      <InputBase
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        sx={{ flex: 1, minWidth: 160, px: 0.5, typography: 'body2' }}
      />
    </Box>
  );
};
