import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';

import { Label } from '@/components/label';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom } from '@/components/table';

import { formatInr } from '@/lib/format';
import type { ProductVariant } from '@/features/products/types';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'type', label: 'Option type', width: 140 },
  { id: 'value', label: 'Value' },
  { id: 'sku', label: 'SKU', width: 140 },
  { id: 'price', label: 'Price', width: 120, align: 'right' as const },
  { id: 'stock', label: 'Quantity', width: 120, align: 'right' as const },
  { id: 'state', label: '', width: 160 },
];

type Props = {
  variants: ProductVariant[];
};

/** Every buyable option with its own prices and stock, in display order. */
export function ProductDetailsVariants({ variants }: Props) {
  return (
    <Scrollbar>
      <Table sx={{ minWidth: 780 }}>
        <TableHeadCustom headLabel={TABLE_HEAD} />

        <TableBody>
          {variants.map((variant) => {
            const isLow = variant.stock.quantity <= variant.stock.threshold;

            return (
              <TableRow key={variant.id} hover sx={{ ...(variant.active ? {} : { opacity: 0.6 }) }}>
                <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                  {variant.optionType}
                </TableCell>

                <TableCell sx={{ fontWeight: 'fontWeightSemiBold' }}>
                  {variant.optionValue}
                </TableCell>

                <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                  {variant.sku || '—'}
                </TableCell>

                <TableCell align="right">{formatInr(variant.price)}</TableCell>

                <TableCell align="right">
                  <Stack spacing={0.25} alignItems="flex-end">
                    <Box component="span">{variant.stock.quantity}</Box>
                    {isLow && (
                      <Box component="span" sx={{ typography: 'caption', color: 'warning.dark' }}>
                        {variant.stock.quantity <= 0 ? 'out of stock' : 'low stock'}
                      </Box>
                    )}
                  </Stack>
                </TableCell>

                <TableCell>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap">
                    {variant.isDefault && (
                      <Label variant="soft" color="primary">
                        Shown first
                      </Label>
                    )}
                    {!variant.active && <Label variant="soft">Not for sale</Label>}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Scrollbar>
  );
}
