import { useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from '@/components/snackbar';
import { DateTimeField } from '@/components/ui/DateTimeField';

import { ApiError } from '@/types/api';

import { useGrantCoupon } from './api';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  affiliateId: string;
  affiliateName: string;
};

/**
 * Gives an affiliate a discount code to hand out.
 *
 * Separate from their share links: a link tracks a click, a coupon gives the
 * buyer money off — and attributes the sale even when nobody clicked anything,
 * which is what makes it work for sharing in person.
 */
export function GrantCouponDialog({ open, onClose, affiliateId, affiliateName }: Props) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('0');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const grant = useGrantCoupon();

  useEffect(() => {
    if (open) {
      setCode('');
      setDiscountType('percent');
      setDiscountValue('10');
      setMaxDiscount('');
      setMinSubtotal('0');
      setExpiresAt('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    const value = Number(discountValue);
    if (!value || value <= 0) {
      setError('Set how much the coupon takes off');
      return;
    }
    if (discountType === 'percent' && value > 100) {
      setError('A percentage cannot be more than 100');
      return;
    }
    setError(null);
    try {
      const coupon = await grant.mutateAsync({
        id: affiliateId,
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        discountType,
        discountValue: value,
        maxDiscountInr: maxDiscount ? Number(maxDiscount) : undefined,
        minSubtotalInr: minSubtotal ? Number(minSubtotal) : 0,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      toast.success(`${coupon.code} is ready for ${affiliateName} to hand out`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the coupon');
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={grant.isPending ? undefined : onClose}>
      <DialogTitle sx={{ pb: 2 }}>Grant a coupon</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {affiliateName} can give this code to buyers. It discounts their order and still
            credits the sale, so it works where a link cannot — spoken aloud, or printed.
          </Typography>

          <TextField
            fullWidth
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Leave empty to generate one"
            helperText="Letters, digits and dashes. It has to be unique across every code."
          />

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              select
              fullWidth
              label="Discount"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
            >
              <MenuItem value="percent">Percentage off</MenuItem>
              <MenuItem value="flat">Flat rupees off</MenuItem>
            </TextField>
            <TextField
              fullWidth
              required
              type="number"
              label={discountType === 'percent' ? 'Percent off' : 'Rupees off'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {discountType === 'percent' ? '%' : '₹'}
                  </InputAdornment>
                ),
              }}
              inputProps={{ min: 1, step: discountType === 'percent' ? 1 : 10 }}
            />
          </Stack>

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            {discountType === 'percent' && (
              <TextField
                fullWidth
                type="number"
                label="Cap the discount at"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="No cap"
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0 }}
              />
            )}
            <TextField
              fullWidth
              type="number"
              label="Minimum order"
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              inputProps={{ min: 0 }}
              helperText="Below this the code will not apply"
            />
          </Stack>

          <DateTimeField
            label="Expires (optional)"
            value={expiresAt}
            onChange={setExpiresAt}
            helperText="Leave empty and it never expires"
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={grant.isPending}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={grant.isPending} onClick={submit}>
          Grant coupon
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
