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
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Package,
  Sprout,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/auth';
import { useProduct } from '@/features/products/api';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { ApiError } from '@/types/api';
import {
  useCreateProduct,
  useProductImageUploadUrl,
  useUpdateProduct,
  type CreateProductInput,
} from './api';

const STEPS = [
  { label: 'Basic information', icon: Sprout },
  { label: 'Pricing & availability', icon: Wallet },
  { label: 'Produce & logistics', icon: Truck },
  { label: 'Images & media', icon: Package },
  { label: 'Review', icon: CheckCircle2 },
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
    if (
      payload.pricing.standard === undefined &&
      payload.pricing.organic === undefined &&
      payload.pricing.premium === undefined
    ) {
      setError('At least one of standard / organic / premium price is required.');
      setStep(1);
      return;
    }
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, patch: payload });
      } else {
        await create.mutateAsync(payload);
        localStorage.removeItem(storageKey);
      }
      navigate('/seller/products');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  if (isEdit && isLoading) return <Skeleton className="h-96 w-full" />;

  const saving = create.isPending || update.isPending;

  return (
    <div className="w-full space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/seller/products')}>
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? `Edit — ${existing?.name}` : 'New product'}
        </h1>
        <p className="text-muted-foreground">
          {isEdit
            ? 'Editing a LIVE product sends it back to PENDING for re-approval.'
            : 'Add a rich listing across a few quick steps. Your draft is saved automatically.'}
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                  i < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : i === step
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    i < step
                      ? 'bg-emerald-600 text-white'
                      : i === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                  }`}
                >
                  {i < step ? '✓' : <Icon className="h-3 w-3" />}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="hidden h-px w-4 bg-border sm:block" />}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* ── Step 1: Basic information ── */}
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold">Basic information</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Product name *">
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} />
                </Field>
                <Field label="Category *">
                  <CategoryPicker value={form.categoryId} onChange={(v) => set('categoryId', v)} />
                </Field>
              </div>
              <Field label="Description *">
                <Textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  maxLength={5000}
                  placeholder="Describe the product, origin, quality, how it's grown / made…"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Unit *">
                  <Input
                    list="pf-unit-list"
                    value={form.unit}
                    onChange={(e) => set('unit', e.target.value)}
                    placeholder="kg / piece / litre"
                  />
                  <datalist id="pf-unit-list">
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Brand">
                  <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} maxLength={120} />
                </Field>
                <Field label="SKU / product code">
                  <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} maxLength={60} />
                </Field>
              </div>
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
              <div className="grid gap-3 sm:grid-cols-3">
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
              </div>
              {form.organicCertified && (
                <Field label="Organic certification (body / number)">
                  <Input
                    value={form.organicCertification}
                    onChange={(e) => set('organicCertification', e.target.value)}
                    maxLength={200}
                    placeholder="e.g. India Organic / NPOP — Cert #12345"
                  />
                </Field>
              )}
            </>
          )}

          {/* ── Step 2: Pricing & availability ── */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">Pricing & availability</h2>
              <p className="text-sm text-muted-foreground">
                Set at least one price tier. Premium is hidden from public buyers; only verified
                premium accounts see it.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={`Standard ₹ / ${form.unit || 'unit'}`}>
                  <Input type="number" min={0} step="0.5" value={form.standard} onChange={(e) => set('standard', e.target.value)} />
                </Field>
                <Field label={`Organic ₹ / ${form.unit || 'unit'}`}>
                  <Input type="number" min={0} step="0.5" value={form.organic} onChange={(e) => set('organic', e.target.value)} />
                </Field>
                <Field label={`Premium ₹ / ${form.unit || 'unit'}`}>
                  <Input type="number" min={0} step="0.5" value={form.premium} onChange={(e) => set('premium', e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="On-hand quantity">
                  <Input type="number" min={0} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
                </Field>
                <Field label="Low-stock threshold">
                  <Input type="number" min={0} value={form.threshold} onChange={(e) => set('threshold', e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    You and your Category Admin get an alert when stock drops here.
                  </p>
                </Field>
                <Field label="Minimum order quantity">
                  <Input type="number" min={1} value={form.minOrderQty} onChange={(e) => set('minOrderQty', e.target.value)} />
                </Field>
                <Field label="Maximum order quantity (per order)">
                  <Input
                    type="number"
                    min={1}
                    value={form.maxOrderQty}
                    onChange={(e) => set('maxOrderQty', e.target.value)}
                    placeholder="Leave blank for no cap"
                  />
                </Field>
              </div>
              {form.minOrderQty &&
                form.maxOrderQty &&
                Number(form.maxOrderQty) < Number(form.minOrderQty) && (
                  <p className="text-sm text-destructive">
                    Maximum order quantity must be greater than or equal to the minimum.
                  </p>
                )}

              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
              <Field label="HSN code (tax)">
                <Input value={form.hsnCode} onChange={(e) => set('hsnCode', e.target.value)} maxLength={20} placeholder="Optional — for GST invoicing" />
              </Field>
            </>
          )}

          {/* ── Step 3: Produce & logistics ── */}
          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold">Produce & logistics</h2>
              <p className="text-sm text-muted-foreground">
                Optional details that help buyers and shipping. Useful for fresh / perishable goods.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Harvest / packed date">
                  <Input type="date" value={form.harvestDate} onChange={(e) => set('harvestDate', e.target.value)} />
                </Field>
                <Field label="Shelf life (days)">
                  <Input type="number" min={0} value={form.shelfLifeDays} onChange={(e) => set('shelfLifeDays', e.target.value)} />
                </Field>
                <Field label="Weight per unit (grams)">
                  <Input type="number" min={0} value={form.weightGrams} onChange={(e) => set('weightGrams', e.target.value)} />
                  <p className="text-xs text-muted-foreground">Used to compute delivery charges.</p>
                </Field>
                <Field label="Packaging type">
                  <Select value={form.packagingType} onChange={(e) => set('packagingType', e.target.value)}>
                    <option value="">Select…</option>
                    {PACKAGING_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </>
          )}

          {/* ── Step 4: Images & media ── */}
          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">Images & media</h2>
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
              <Field label="Product video (YouTube link or MP4 URL)">
                <Input
                  value={form.videoUrl}
                  onChange={(e) => set('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=… or https://…/clip.mp4"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Shown on the product page. A short clip of the produce or process builds trust.
                </p>
              </Field>
            </>
          )}

          {/* ── Step 5: Review ── */}
          {step === 4 && (
            <>
              <h2 className="text-lg font-semibold">Review & submit</h2>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

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
        </CardContent>
      </Card>
    </div>
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
  <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 hover:bg-accent/50">
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>
      <span className="block text-sm font-medium">{label}</span>
      <span className="block text-xs text-muted-foreground">{hint}</span>
    </span>
  </label>
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
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-1.5">
      {value.map((chip) => (
        <span key={chip} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs">
          {chip}
          <button type="button" onClick={() => onChange(value.filter((c) => c !== chip))} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
};
