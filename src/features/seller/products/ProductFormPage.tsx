import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileUp, Trash2 } from 'lucide-react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useProduct } from '@/features/products/api';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { ApiError } from '@/types/api';
import {
  useCreateProduct,
  useProductImageUploadUrl,
  useUpdateProduct,
  type CreateProductInput,
} from './api';

export const SellerProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { data: existing, isLoading } = useProduct(id);
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const imageUrl = useProductImageUploadUrl();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState('kg');
  const [weightGrams, setWeightGrams] = useState('');
  const [standard, setStandard] = useState('');
  const [organic, setOrganic] = useState('');
  const [premium, setPremium] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [threshold, setThreshold] = useState('5');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description);
    setCategoryId(existing.categoryId);
    setUnit(existing.unit);
    setWeightGrams(existing.weightGrams !== null ? String(existing.weightGrams) : '');
    setStandard(existing.pricing.standard !== undefined ? String(existing.pricing.standard) : '');
    setOrganic(existing.pricing.organic !== undefined ? String(existing.pricing.organic) : '');
    setPremium(existing.pricing.premium !== undefined ? String(existing.pricing.premium) : '');
    setQuantity(String(existing.stock.quantity));
    setThreshold(String(existing.stock.threshold));
    setImages(existing.images);
  }, [existing]);

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
      setImages((prev) => [...prev, key]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Name is required (min 2 chars).');
      return;
    }
    if (description.trim().length < 2) {
      setError('Description is required.');
      return;
    }
    if (!categoryId) {
      setError('Pick a category.');
      return;
    }
    const pricing: { standard?: number; organic?: number; premium?: number } = {};
    if (standard) pricing.standard = Number(standard);
    if (organic) pricing.organic = Number(organic);
    if (premium) pricing.premium = Number(premium);
    if (
      pricing.standard === undefined &&
      pricing.organic === undefined &&
      pricing.premium === undefined
    ) {
      setError('At least one of standard / organic / premium price is required.');
      return;
    }
    const payload: CreateProductInput = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      unit: unit.trim(),
      weightGrams: weightGrams ? Number(weightGrams) : undefined,
      images,
      pricing,
      stock: {
        quantity: Number(quantity) || 0,
        threshold: Number(threshold) || 5,
      },
    };
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, patch: payload });
      } else {
        await create.mutateAsync(payload);
      }
      navigate('/seller/products');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  if (isEdit && isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/seller/products')}>
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">
        {isEdit ? `Edit — ${existing?.name}` : 'New product'}
      </h1>
      {isEdit && (
        <p className="text-sm text-muted-foreground">
          Editing a LIVE product sends it back to PENDING for re-approval.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Name *</Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-desc">Description *</Label>
            <Textarea
              id="pf-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <CategoryPicker value={categoryId} onChange={setCategoryId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-unit">Unit *</Label>
              <Input
                id="pf-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg / piece / litre"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-weight">Weight per unit (g)</Label>
              <Input
                id="pf-weight"
                type="number"
                min={0}
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Set at least one of the three tiers. Premium is hidden from public buyers; only
            verified premium accounts see it (SOW 4.9).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pf-std">Standard ₹ / {unit}</Label>
              <Input
                id="pf-std"
                type="number"
                min={0}
                step="0.5"
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-org">Organic ₹ / {unit}</Label>
              <Input
                id="pf-org"
                type="number"
                min={0}
                step="0.5"
                value={organic}
                onChange={(e) => setOrganic(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-prem">Premium ₹ / {unit}</Label>
              <Input
                id="pf-prem"
                type="number"
                min={0}
                step="0.5"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-qty">On-hand quantity</Label>
              <Input
                id="pf-qty"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-thr">Low-stock threshold</Label>
              <Input
                id="pf-thr"
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You and your Category Admin get an alert when stock drops here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            First image is the primary thumbnail. Drag to reorder (coming soon).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
            <FileUp className="h-4 w-4" />
            {uploadingImage ? 'Uploading…' : 'Add image'}
            <input
              type="file"
              accept="image/*"
              onChange={onFile}
              disabled={uploadingImage}
              className="hidden"
            />
          </label>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative overflow-hidden rounded-md border border-border bg-secondary"
                >
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/seller/products')}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={create.isPending || update.isPending}>
          {create.isPending || update.isPending
            ? 'Saving…'
            : isEdit
              ? 'Save changes'
              : 'Submit for approval'}
        </Button>
      </div>
    </div>
  );
};
