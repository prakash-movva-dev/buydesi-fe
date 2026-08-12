import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha } from '@mui/material/styles';

import { Iconify } from '@/components/iconify';
import { ImageUploadField } from '@/components/ImageUploadField';
import type { VariantInput } from './variants.api';

// ----------------------------------------------------------------------

/** Editable row — numbers are held as strings so fields can be cleared. */
export interface VariantRow {
  id?: string;
  label: string;
  sku: string;
  size: string;
  colour: string;
  standard: string;
  organic: string;
  mrp: string;
  costPrice: string;
  quantity: string;
  threshold: string;
  weightGrams: string;
  dimensions: string;
  image: string;
  isDefault: boolean;
  active: boolean;
}

export const emptyVariantRow = (): VariantRow => ({
  label: '',
  sku: '',
  size: '',
  colour: '',
  standard: '',
  organic: '',
  mrp: '',
  costPrice: '',
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
    label: r.label.trim(),
    sku: r.sku.trim() || null,
    size: r.size.trim() || null,
    colour: r.colour.trim() || null,
    pricing: {
      ...(num(r.standard) !== undefined ? { standard: num(r.standard) } : {}),
      ...(num(r.organic) !== undefined ? { organic: num(r.organic) } : {}),
    },
    mrp: num(r.mrp) ?? null,
    costPrice: num(r.costPrice) ?? null,
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
    const where = `Option ${i + 1}${r.label ? ` (${r.label})` : ''}`;
    if (!r.label.trim()) return `${where}: name is required, e.g. "500g"`;
    if (num(r.standard) === undefined && num(r.organic) === undefined) {
      return `${where}: needs a sale price`;
    }
    const mrp = num(r.mrp);
    const std = num(r.standard);
    if (mrp !== undefined && std !== undefined && mrp < std) {
      return `${where}: MRP cannot be below the sale price`;
    }
  }
  const skus = rows.map((r) => r.sku.trim()).filter(Boolean);
  if (new Set(skus).size !== skus.length) return 'Each option needs a unique SKU';
  return null;
};

interface Props {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  disabled?: boolean;
}

/**
 * Repeatable table of buyable options. When empty, the product is sold as a
 * single item using the pricing/stock on the main form; once a row is added,
 * every option carries its own price, MRP, cost, stock and image.
 */
export const VariantEditor = ({ rows, onChange, disabled }: Props) => {
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

  const add = () => onChange([...rows, emptyVariantRow()]);
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle1">Options (sizes, colours…)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {rows.length === 0
              ? 'Leave empty if this product is sold as a single item.'
              : `${rows.filter((r) => r.active).length} option${
                  rows.filter((r) => r.active).length === 1 ? '' : 's'
                } · buyers pick one before adding to the cart`}
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
                  {row.label.trim() || `Option ${index + 1}`}
                </Typography>
                {row.standard.trim() && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ₹{row.standard}
                    {row.mrp.trim() ? ` · MRP ₹${row.mrp}` : ''} · stock {row.quantity || 0}
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
                required
                label="Name"
                placeholder="500g"
                value={row.label}
                onChange={(e) => patch(index, { label: e.target.value })}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
              />
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
                label="Size"
                value={row.size}
                onChange={(e) => patch(index, { size: e.target.value })}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Colour"
                value={row.colour}
                onChange={(e) => patch(index, { colour: e.target.value })}
                disabled={disabled}
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
                required
                type="number"
                label="Sale price ₹"
                value={row.standard}
                onChange={(e) => patch(index, { standard: e.target.value })}
                disabled={disabled}
                inputProps={{ min: 0 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="number"
                label="Organic price ₹"
                value={row.organic}
                onChange={(e) => patch(index, { organic: e.target.value })}
                disabled={disabled}
                inputProps={{ min: 0 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="number"
                label="MRP ₹"
                value={row.mrp}
                onChange={(e) => patch(index, { mrp: e.target.value })}
                disabled={disabled}
                helperText="Struck through"
                inputProps={{ min: 0 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="number"
                label="Cost price ₹"
                value={row.costPrice}
                onChange={(e) => patch(index, { costPrice: e.target.value })}
                disabled={disabled}
                helperText="Internal only"
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
                type="number"
                label="Stock"
                value={row.quantity}
                onChange={(e) => patch(index, { quantity: e.target.value })}
                disabled={disabled}
                inputProps={{ min: 0 }}
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
          No options — this product is sold as a single item.
        </Typography>
      )}
    </Stack>
  );
};
