import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha } from '@mui/material/styles';

import { Iconify } from '@/components/iconify';
import { ImageUploadField } from '@/components/ImageUploadField';
import type { VariantInput } from './variants.api';

// ----------------------------------------------------------------------

/** The axes sellers reach for most — the field still takes anything typed. */
const OPTION_TYPES = ['Weight', 'Size', 'Colour', 'Pack', 'Grade', 'Flavour', 'Length'];

/** Editable row — numbers are held as strings so fields can be cleared. */
export interface VariantRow {
  id?: string;
  optionType: string;
  optionValue: string;
  sku: string;
  price: string;
  quantity: string;
  threshold: string;
  weightGrams: string;
  dimensions: string;
  image: string;
  isDefault: boolean;
  active: boolean;
}

export const emptyVariantRow = (): VariantRow => ({
  optionType: 'Weight',
  optionValue: '',
  sku: '',
  price: '',
  quantity: '0',
  threshold: '5',
  weightGrams: '',
  dimensions: '',
  image: '',
  isDefault: false,
  active: true,
});

const num = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? undefined : n;
};

/** Converts editor rows into the API payload. */
export const rowsToPayload = (rows: VariantRow[]): VariantInput[] =>
  rows.map((r, i) => ({
    ...(r.id ? { id: r.id } : {}),
    optionType: r.optionType.trim(),
    optionValue: r.optionValue.trim(),
    sku: r.sku.trim() || null,
    price: num(r.price) ?? 0,
    stock: { quantity: num(r.quantity) ?? 0, threshold: num(r.threshold) ?? 5 },
    weightGrams: num(r.weightGrams) ?? null,
    dimensions: r.dimensions.trim() || null,
    images: r.image ? [r.image] : [],
    isDefault: r.isDefault,
    active: r.active,
    displayOrder: i,
  }));

/** Validates the table, returning a human-readable problem or null. */
export const validateVariantRows = (rows: VariantRow[]): string | null => {
  if (rows.length === 0) return null;
  for (const [i, r] of rows.entries()) {
    const where = `Option ${i + 1}${r.optionValue ? ` (${r.optionValue})` : ''}`;
    if (!r.optionType.trim()) return `${where}: needs a type, e.g. "Weight"`;
    if (!r.optionValue.trim()) return `${where}: needs a value, e.g. "500 g"`;
    const price = num(r.price);
    if (price === undefined || price <= 0) return `${where}: needs a price above ₹0`;
  }
  const skus = rows.map((r) => r.sku.trim()).filter(Boolean);
  if (new Set(skus).size !== skus.length) return 'Each option needs a unique SKU';
  const keys = rows.map((r) => `${r.optionType.trim()}|${r.optionValue.trim()}`.toLowerCase());
  if (new Set(keys).size !== keys.length) return 'Two options have the same type and value';
  return null;
};

interface Props {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  disabled?: boolean;
  /** Unit the product is sold in, shown against each option's price. */
  unit?: string;
}

/**
 * Repeatable table of buyable options. When empty, the product is sold as a
 * single item at its own price and stock; once a row is added, every option
 * carries its own price and its own quantity.
 */
export const VariantEditor = ({ rows, onChange, disabled, unit }: Props) => {
  const problem = useMemo(() => validateVariantRows(rows), [rows]);

  const patch = (index: number, next: Partial<VariantRow>) => {
    onChange(
      rows.map((r, i) => {
        if (i !== index) {
          // Only one row may be the default.
          return next.isDefault ? { ...r, isDefault: false } : r;
        }
        return { ...r, ...next };
      }),
    );
  };

  const add = () =>
    onChange([
      ...rows,
      // A new row inherits the axis already in use — most products vary on one.
      { ...emptyVariantRow(), optionType: rows[rows.length - 1]?.optionType ?? 'Weight' },
    ]);

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  const totalStock = rows
    .filter((r) => r.active)
    .reduce((sum, r) => sum + (num(r.quantity) ?? 0), 0);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle1">Options</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {rows.length === 0
              ? 'Leave empty if this product is sold as a single item.'
              : `${rows.filter((r) => r.active).length} on sale · ${totalStock} in stock across options`}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={add}
          disabled={disabled}
          startIcon={<Iconify icon="mingcute:add-line" width={16} />}
        >
          Add option
        </Button>
      </Stack>

      {problem && <Alert severity="warning">{problem}</Alert>}

      {rows.map((row, index) => (
        <Box
          key={row.id ?? index}
          sx={{
            p: 2,
            borderRadius: 1.5,
            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
            ...(row.active ? {} : { opacity: 0.6 }),
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                <Typography variant="subtitle2">
                  {row.optionValue.trim() || `Option ${index + 1}`}
                </Typography>
                {row.price.trim() && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ₹{row.price} · {row.quantity || 0} available
                  </Typography>
                )}
                {row.isDefault && (
                  <Chip size="small" variant="soft" color="primary" label="Shown first" />
                )}
                {!row.active && <Chip size="small" variant="soft" label="Not for sale" />}
              </Stack>
              <IconButton
                size="small"
                color="error"
                onClick={() => remove(index)}
                disabled={disabled}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Stack>

            {/* The four fields that define an option: type, value, price, quantity. */}
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
              }}
            >
              <Autocomplete
                freeSolo
                options={OPTION_TYPES}
                inputValue={row.optionType}
                onInputChange={(_e, v) => patch(index, { optionType: v })}
                disabled={disabled}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Option type"
                    placeholder="Weight"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ ...params.inputProps, required: false }}
                  />
                )}
              />
              <TextField
                fullWidth
                required
                label="Value"
                placeholder="500 g"
                value={row.optionValue}
                onChange={(e) => patch(index, { optionValue: e.target.value })}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
                inputProps={{ required: false }}
              />
              <TextField
                fullWidth
                required
                type="number"
                label="Price"
                value={row.price}
                onChange={(e) => patch(index, { price: e.target.value })}
                disabled={disabled}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, step: '0.5', required: false }}
                InputLabelProps={{ shrink: true }}
                helperText={unit ? `per ${unit}` : undefined}
              />
              <TextField
                fullWidth
                type="number"
                label="Quantity available"
                value={row.quantity}
                onChange={(e) => patch(index, { quantity: e.target.value })}
                disabled={disabled}
                inputProps={{ min: 0 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
              }}
            >
              <TextField
                fullWidth
                label="SKU"
                value={row.sku}
                onChange={(e) => patch(index, { sku: e.target.value })}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="number"
                label="Low-stock alert at"
                value={row.threshold}
                onChange={(e) => patch(index, { threshold: e.target.value })}
                disabled={disabled}
                inputProps={{ min: 0 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="number"
                label="Weight (g)"
                value={row.weightGrams}
                onChange={(e) => patch(index, { weightGrams: e.target.value })}
                disabled={disabled}
                helperText="Delivery charge"
                inputProps={{ min: 0 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Dimensions"
                placeholder="24 x 36 in"
                value={row.dimensions}
                onChange={(e) => patch(index, { dimensions: e.target.value })}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Option photo
                </Typography>
                <ImageUploadField
                  value={row.image}
                  onChange={(url) => patch(index, { image: url })}
                  kind="product"
                  variant="square"
                  disabled={disabled}
                  uploadVia="product"
                />
              </Stack>
              <Stack sx={{ pt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={row.isDefault}
                      onChange={(e) => patch(index, { isDefault: e.target.checked })}
                      disabled={disabled}
                    />
                  }
                  label="Show this option first"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={row.active}
                      onChange={(e) => patch(index, { active: e.target.checked })}
                      disabled={disabled}
                    />
                  }
                  label="Available to buy"
                />
              </Stack>
            </Stack>
          </Stack>
        </Box>
      ))}

      {rows.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No options — this product is sold as a single item at the price above.
        </Typography>
      )}
    </Stack>
  );
};
