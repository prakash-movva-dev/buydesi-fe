import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ImageUploadField } from '@/components/ImageUploadField';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Dialog } from '@/components/ui/Dialog';
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
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <TextField
            id="p-type"
            select
            fullWidth
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as PromotionType)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="banner">Banner</MenuItem>
            <MenuItem value="coupon">Coupon</MenuItem>
            <MenuItem value="featured">Featured slot</MenuItem>
            <MenuItem value="sale_event">Sale event</MenuItem>
          </TextField>
          <TextField
            id="p-name"
            fullWidth
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          <TextField
            id="p-scope"
            select
            fullWidth
            label="Scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as PromotionScope)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="platform">Platform-wide</MenuItem>
            <MenuItem value="cluster">Cluster</MenuItem>
            <MenuItem value="category">Category</MenuItem>
          </TextField>
          {scope === 'cluster' && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Cluster *</Typography>
              <ClusterPicker value={clusterId || null} onChange={(id) => setClusterId(id ?? '')} />
            </Stack>
          )}
          {scope === 'category' && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Category *</Typography>
              <CategoryPicker
                value={categoryId || null}
                onChange={(id) => setCategoryId(id ?? '')}
              />
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <DateTimeField label="Starts at" required value={startsAt} onChange={setStartsAt} />
          <DateTimeField label="Ends at" required value={endsAt} onChange={setEndsAt} />
        </Box>

        <hr className="border-border" />

        {type === 'banner' && (
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Banner image</Typography>
              <ImageUploadField
                value={imageUrl}
                onChange={setImageUrl}
                kind="promotion"
                variant="wide"
              />
            </Stack>
            <TextField
              id="p-target"
              fullWidth
              label="Target URL"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://… (where the banner click goes)"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        )}

        {type === 'coupon' && (
          <Stack spacing={2.5}>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                id="p-code"
                fullWidth
                label="Coupon code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                id="p-dt"
                select
                fullWidth
                label="Discount type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="percent">Percent (%)</MenuItem>
                <MenuItem value="flat">Flat (₹)</MenuItem>
              </TextField>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                id="p-dv"
                fullWidth
                type="number"
                label="Discount value"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 1 }}
              />
              <TextField
                id="p-max"
                fullWidth
                type="number"
                label="Max discount cap ₹ (optional)"
                value={maxDiscountInr}
                onChange={(e) => setMaxDiscountInr(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0 }}
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                id="p-min"
                fullWidth
                type="number"
                label="Min order ₹"
                value={minOrderInr}
                onChange={(e) => setMinOrderInr(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0 }}
              />
              <TextField
                id="p-uses"
                fullWidth
                type="number"
                label="Max uses (0 = unlimited)"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0 }}
              />
            </Box>
          </Stack>
        )}

        {type === 'featured' && (
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Products</Typography>
              <ProductPicker
                multi
                status="LIVE"
                values={productIds}
                onChange={setProductIds}
                placeholder="Pick products to feature…"
              />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Storefronts (sellers)</Typography>
              <UserPicker
                multi
                role={UserRole.SELLER}
                values={storefrontUserIds}
                onChange={setStorefrontUserIds}
                placeholder="Pick sellers whose storefronts to feature…"
              />
            </Stack>
            <TextField
              id="p-slot"
              fullWidth
              type="number"
              label="Slot position"
              value={slotPosition}
              onChange={(e) => setSlotPosition(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 0 }}
            />
          </Stack>
        )}

        {type === 'sale_event' && (
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Eligible categories</Typography>
              <CategoryPicker
                multi
                values={eligibleCategoryIds}
                onChange={setEligibleCategoryIds}
                placeholder="Pick categories included in the sale…"
              />
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                id="p-min%"
                fullWidth
                type="number"
                label="Min discount %"
                value={discountMinPercent}
                onChange={(e) => setDiscountMinPercent(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, max: 100 }}
              />
              <TextField
                id="p-max%"
                fullWidth
                type="number"
                label="Max discount %"
                value={discountMaxPercent}
                onChange={(e) => setDiscountMaxPercent(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, max: 100 }}
              />
            </Box>
          </Stack>
        )}
      </Stack>
    </Dialog>
  );
};
