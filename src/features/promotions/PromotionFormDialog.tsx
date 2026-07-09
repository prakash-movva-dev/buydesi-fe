import { useEffect, useState } from 'react';
import { ImageUploadField } from '@/components/ImageUploadField';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { ApiError, UserRole } from '@/types/api';
import { useCreatePromotion } from './api';
import type { PromotionScope, PromotionType } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select the type when opening from a type-specific tab. */
  defaultType?: PromotionType;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : '');

export const PromotionFormDialog = ({ open, onClose, defaultType }: Props) => {
  const createMut = useCreatePromotion();
  const [type, setType] = useState<PromotionType>(defaultType ?? 'banner');
  const [name, setName] = useState('');
  const [scope, setScope] = useState<PromotionScope>('platform');
  const [clusterId, setClusterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Banner
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  // Coupon
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxDiscountInr, setMaxDiscountInr] = useState('');
  const [minOrderInr, setMinOrderInr] = useState('0');
  const [maxUses, setMaxUses] = useState('0');

  // Featured
  const [productIds, setProductIds] = useState<string[]>([]);
  const [storefrontUserIds, setStorefrontUserIds] = useState<string[]>([]);
  const [slotPosition, setSlotPosition] = useState('0');

  // Sale event
  const [eligibleCategoryIds, setEligibleCategoryIds] = useState<string[]>([]);
  const [discountMinPercent, setDiscountMinPercent] = useState('5');
  const [discountMaxPercent, setDiscountMaxPercent] = useState('20');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setType(defaultType ?? 'banner');
    setName('');
    setScope('platform');
    setClusterId('');
    setCategoryId('');
    setStartsAt('');
    setEndsAt('');
    setImageUrl('');
    setTargetUrl('');
    setCode('');
    setDiscountType('percent');
    setDiscountValue('10');
    setMaxDiscountInr('');
    setMinOrderInr('0');
    setMaxUses('0');
    setProductIds([]);
    setStorefrontUserIds([]);
    setSlotPosition('0');
    setEligibleCategoryIds([]);
    setDiscountMinPercent('5');
    setDiscountMaxPercent('20');
  }, [open, defaultType]);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Name is required');
      return;
    }
    if (!startsAt || !endsAt) {
      setError('Start and end dates are required');
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('End must be after start');
      return;
    }
    const base = {
      type,
      name: name.trim(),
      scope,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
      ...(scope === 'cluster' && clusterId ? { clusterId } : {}),
      ...(scope === 'category' && categoryId ? { categoryId } : {}),
    };

    let payload: Record<string, unknown>;
    try {
      switch (type) {
        case 'banner':
          if (!imageUrl || !targetUrl) throw new Error('Banner needs imageUrl and targetUrl');
          payload = { ...base, banner: { imageUrl, targetUrl } };
          break;
        case 'coupon': {
          const dv = Number(discountValue);
          if (!Number.isFinite(dv) || dv <= 0) throw new Error('Discount value must be positive');
          if (discountType === 'percent' && dv > 100) throw new Error('Percent must be ≤ 100');
          payload = {
            ...base,
            coupon: {
              code: code.trim().toUpperCase(),
              discountType,
              discountValue: dv,
              maxDiscountInr: maxDiscountInr ? Number(maxDiscountInr) : null,
              minOrderInr: Number(minOrderInr) || 0,
              maxUses: Number(maxUses) || 0,
            },
          };
          break;
        }
        case 'featured': {
          if (productIds.length === 0 && storefrontUserIds.length === 0)
            throw new Error('At least one product or storefront required');
          payload = {
            ...base,
            featured: {
              productIds,
              storefrontUserIds,
              slotPosition: Number(slotPosition) || 0,
            },
          };
          break;
        }
        case 'sale_event': {
          if (eligibleCategoryIds.length === 0)
            throw new Error('At least one eligible category required');
          const min = Number(discountMinPercent);
          const max = Number(discountMaxPercent);
          if (max < min) throw new Error('Max % must be ≥ min %');
          payload = {
            ...base,
            saleEvent: {
              eligibleCategoryIds,
              discountMinPercent: min,
              discountMaxPercent: max,
            },
          };
          break;
        }
      }
      await createMut.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New promotion"
      description="Pick a type, set scope and validity window, then fill in the type-specific payload."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createMut.isPending}>
            {createMut.isPending ? 'Creating…' : 'Create promotion'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-type">Type</Label>
            <Select id="p-type" value={type} onChange={(e) => setType(e.target.value as PromotionType)}>
              <option value="banner">Banner</option>
              <option value="coupon">Coupon</option>
              <option value="featured">Featured slot</option>
              <option value="sale_event">Sale event</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name *</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-scope">Scope</Label>
            <Select
              id="p-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as PromotionScope)}
            >
              <option value="platform">Platform-wide</option>
              <option value="cluster">Cluster</option>
              <option value="category">Category</option>
            </Select>
          </div>
          {scope === 'cluster' && (
            <div className="space-y-1.5">
              <Label>Cluster *</Label>
              <ClusterPicker value={clusterId || null} onChange={(id) => setClusterId(id ?? '')} />
            </div>
          )}
          {scope === 'category' && (
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <CategoryPicker
                value={categoryId || null}
                onChange={(id) => setCategoryId(id ?? '')}
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-start">Starts at *</Label>
            <Input
              id="p-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-end">Ends at *</Label>
            <Input
              id="p-end"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <hr className="border-border" />

        {type === 'banner' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Banner image</Label>
              <ImageUploadField
                value={imageUrl}
                onChange={setImageUrl}
                kind="promotion"
                variant="wide"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-target">Target URL</Label>
              <Input
                id="p-target"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://… (where the banner click goes)"
              />
            </div>
          </div>
        )}

        {type === 'coupon' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-code">Coupon code</Label>
                <Input
                  id="p-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-dt">Discount type</Label>
                <Select
                  id="p-dt"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
                >
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat (₹)</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-dv">Discount value</Label>
                <Input
                  id="p-dv"
                  type="number"
                  min={1}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-max">Max discount cap ₹ (optional)</Label>
                <Input
                  id="p-max"
                  type="number"
                  min={0}
                  value={maxDiscountInr}
                  onChange={(e) => setMaxDiscountInr(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-min">Min order ₹</Label>
                <Input
                  id="p-min"
                  type="number"
                  min={0}
                  value={minOrderInr}
                  onChange={(e) => setMinOrderInr(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-uses">Max uses (0 = unlimited)</Label>
                <Input
                  id="p-uses"
                  type="number"
                  min={0}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {type === 'featured' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Products</Label>
              <ProductPicker
                multi
                status="LIVE"
                values={productIds}
                onChange={setProductIds}
                placeholder="Pick products to feature…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Storefronts (sellers)</Label>
              <UserPicker
                multi
                role={UserRole.SELLER}
                values={storefrontUserIds}
                onChange={setStorefrontUserIds}
                placeholder="Pick sellers whose storefronts to feature…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-slot">Slot position</Label>
              <Input
                id="p-slot"
                type="number"
                min={0}
                value={slotPosition}
                onChange={(e) => setSlotPosition(e.target.value)}
              />
            </div>
          </div>
        )}

        {type === 'sale_event' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Eligible categories</Label>
              <CategoryPicker
                multi
                values={eligibleCategoryIds}
                onChange={setEligibleCategoryIds}
                placeholder="Pick categories included in the sale…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-min%">Min discount %</Label>
                <Input
                  id="p-min%"
                  type="number"
                  min={0}
                  max={100}
                  value={discountMinPercent}
                  onChange={(e) => setDiscountMinPercent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-max%">Max discount %</Label>
                <Input
                  id="p-max%"
                  type="number"
                  min={0}
                  max={100}
                  value={discountMaxPercent}
                  onChange={(e) => setDiscountMaxPercent(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
