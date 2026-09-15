import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';

import { Iconify } from '@/components/iconify';
import { ImageUploadField } from '@/components/ImageUploadField';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { UserPicker } from '@/components/pickers/UserPicker';
import { ProductPicker } from '@/components/pickers/ProductPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';

import { useCreatePromotion } from './api';
import { TYPE_COLOR, TYPE_ICON } from './promotion-table-row';
import type { PromotionScope, PromotionType } from './types';

// ----------------------------------------------------------------------

/** What each type is, in a sentence, so the form explains itself. */
const TYPE_COPY: Record<PromotionType, { label: string; help: string }> = {
  banner: {
    label: 'Banner on the home page',
    help: 'An image shoppers see when they open the storefront.',
  },
  coupon: {
    label: 'Coupon code',
    help: 'A code shoppers type at checkout for money off their order.',
  },
  featured: {
    label: 'Featured products',
    help: 'Pins chosen products to the top of the first page of a listing.',
  },
};

/** Mirrors the API rule, so a bad code is caught before the round trip. */
const CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select the type when opening from a type-specific tab. */
  defaultType?: PromotionType;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : '');

export const PromotionFormDialog = ({ open, onClose, defaultType }: Props) => {
  const createMut = useCreatePromotion();
  const { user } = useAuth();
  // Platform-wide promotions are a Super/Sub-Super privilege. Cluster admins are
  // locked to their own cluster (no platform-wide option).
  const canPlatform =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;
  const [type, setType] = useState<PromotionType>(defaultType ?? 'banner');
  const [name, setName] = useState('');
  const [scope, setScope] = useState<PromotionScope>(canPlatform ? 'platform' : 'cluster');
  const [clusterId, setClusterId] = useState(canPlatform ? '' : user?.clusterId ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Banner
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [placement, setPlacement] = useState<'hero' | 'promo'>('hero');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [bannerOrder, setBannerOrder] = useState('0');

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

  useEffect(() => {
    if (!open) return;
    setError(null);
    setType(defaultType ?? 'banner');
    setName('');
    setScope(canPlatform ? 'platform' : 'cluster');
    setClusterId(canPlatform ? '' : user?.clusterId ?? '');
    setCategoryId('');
    setStartsAt('');
    setEndsAt('');
    setImageUrl('');
    setTargetUrl('');
    setPlacement('hero');
    setHeadline('');
    setSubheadline('');
    setCtaLabel('');
    setBannerOrder('0');
    setCode('');
    setDiscountType('percent');
    setDiscountValue('10');
    setMaxDiscountInr('');
    setMinOrderInr('0');
    setMaxUses('0');
    setProductIds([]);
    setStorefrontUserIds([]);
    setSlotPosition('0');
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
          payload = {
            ...base,
            banner: {
              imageUrl,
              targetUrl,
              placement,
              ...(headline.trim() ? { headline: headline.trim() } : {}),
              ...(subheadline.trim() ? { subheadline: subheadline.trim() } : {}),
              ...(ctaLabel.trim() ? { ctaLabel: ctaLabel.trim() } : {}),
              displayOrder: Number(bannerOrder) || 0,
            },
          };
          break;
        case 'coupon': {
          const trimmedCode = code.trim().toUpperCase();
          if (!CODE_PATTERN.test(trimmedCode)) {
            throw new Error(
              'A code is 3–40 characters of A–Z, 0–9, _ and - . No spaces.',
            );
          }
          const dv = Number(discountValue);
          if (!Number.isFinite(dv) || dv <= 0) throw new Error('Discount value must be positive');
          if (discountType === 'percent' && dv > 100) throw new Error('Percent must be ≤ 100');
          payload = {
            ...base,
            coupon: {
              code: trimmedCode,
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
      onClose={createMut.isPending ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify
            width={24}
            icon={TYPE_ICON[type]}
            sx={{ color: `${TYPE_COLOR[type]}.main` }}
          />
          New promotion
        </Stack>
      </DialogTitle>

      <DialogContent>
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
          {TYPE_COPY[type].help} It shows only between its start and end dates, and only where
          its scope says.
        </Box>

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
            {(Object.keys(TYPE_COPY) as PromotionType[]).map((t) => (
              <MenuItem key={t} value={t}>
                {TYPE_COPY[t].label}
              </MenuItem>
            ))}
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
            {canPlatform && <MenuItem value="platform">Platform-wide</MenuItem>}
            <MenuItem value="cluster">Cluster</MenuItem>
            <MenuItem value="category">Category</MenuItem>
          </TextField>
          {scope === 'cluster' && (
            <ClusterPicker
              label="Cluster"
              required
              value={clusterId || null}
              onChange={(id) => setClusterId(id ?? '')}
              placeholder="Pick a cluster…"
            />
          )}
          {scope === 'category' && (
            <CategoryPicker
              label="Category"
              required
              value={categoryId || null}
              onChange={(id) => setCategoryId(id ?? '')}
              placeholder="Pick a category…"
            />
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

        <Divider sx={{ borderStyle: 'dashed' }} />

        {type === 'banner' && (
          <Stack spacing={2.5}>
            <Box>
              <Box sx={{ mb: 1, typography: 'subtitle2' }}>Banner image</Box>
              <ImageUploadField
                value={imageUrl}
                onChange={setImageUrl}
                kind="promotion"
                variant="wide"
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
                id="p-placement"
                select
                fullWidth
                label="Placement"
                value={placement}
                onChange={(e) => setPlacement(e.target.value as 'hero' | 'promo')}
                helperText="Where it shows on the storefront home page"
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="hero">Hero carousel (large, main slider)</MenuItem>
                <MenuItem value="promo">Promo card (small, beside the hero)</MenuItem>
              </TextField>
              <TextField
                id="p-border"
                fullWidth
                type="number"
                label="Display order"
                value={bannerOrder}
                onChange={(e) => setBannerOrder(e.target.value)}
                helperText="Lower shows first"
                inputProps={{ min: 0 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              id="p-target"
              fullWidth
              label="Target URL"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://… (where the banner click goes)"
              InputLabelProps={{ shrink: true }}
            />

            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                id="p-headline"
                fullWidth
                label="Headline (optional)"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="From Our Farms To Your Family"
                helperText="Overlaid on the banner. Leave empty for image-only."
                inputProps={{ maxLength: 120 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                id="p-subheadline"
                fullWidth
                label="Subheadline (optional)"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Pure. Natural. Chemical-Free."
                inputProps={{ maxLength: 160 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              id="p-cta"
              fullWidth
              label="Button label (optional)"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Shop Now"
              inputProps={{ maxLength: 40 }}
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
                helperText="What shoppers type at checkout"
                inputProps={{ maxLength: 40 }}
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
                InputProps={
                  discountType === 'percent'
                    ? { endAdornment: <InputAdornment position="end">%</InputAdornment> }
                    : { startAdornment: <InputAdornment position="start">₹</InputAdornment> }
                }
                inputProps={{ min: 1 }}
              />
              <TextField
                id="p-max"
                fullWidth
                type="number"
                label="Most it can take off"
                value={maxDiscountInr}
                onChange={(e) => setMaxDiscountInr(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                helperText="Leave blank for no cap"
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
                label="Minimum order"
                value={minOrderInr}
                onChange={(e) => setMinOrderInr(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                helperText="0 means any order"
                inputProps={{ min: 0 }}
              />
              <TextField
                id="p-uses"
                fullWidth
                type="number"
                label="How many times it can be used"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Shared across everyone. 0 means no limit."
                inputProps={{ min: 0 }}
              />
            </Box>
          </Stack>
        )}

        {type === 'featured' && (
          <Stack spacing={2.5}>
            <ProductPicker
              multi
              status="LIVE"
              label="Products to pin"
              values={productIds}
              onChange={setProductIds}
              placeholder="Pick products to feature…"
            />
            <UserPicker
              multi
              role={UserRole.SELLER}
              label="Sellers to feature"
              values={storefrontUserIds}
              onChange={setStorefrontUserIds}
              placeholder="Pick sellers whose storefronts to feature…"
            />
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

      </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={createMut.isPending}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={createMut.isPending} onClick={submit}>
          Create promotion
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
