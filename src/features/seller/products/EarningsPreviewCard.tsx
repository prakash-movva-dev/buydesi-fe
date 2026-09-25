import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { fCurrency } from '@/utils/format-number';
import { useEarningsPreview } from '@/features/commission/api';

// ----------------------------------------------------------------------

const SOURCE_LABEL: Record<string, string> = {
  seller: 'a rate agreed with you',
  product: 'a rate set on this product',
  category: 'this category’s rate',
  category_default: 'this category’s default rate',
};

interface Props {
  categoryId: string;
  price: number;
  /** Absent while creating — a new listing has no id to match a rate on. */
  productId?: string;
}

/**
 * What the seller actually keeps at the price they are typing.
 *
 * A seller used to set a price with no idea what came off it, and only found
 * out at the first payout. The figures come from the same resolver the payout
 * run uses, so this is a preview of the real number, not an estimate.
 */
export const EarningsPreviewCard = ({ categoryId, price, productId }: Props) => {
  const theme = useTheme();
  const { data, isLoading } = useEarningsPreview({ categoryId, price, productId });

  if (!categoryId || !(price > 0)) return null;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.success.main, 0.08),
        border: (t) => `1px solid ${alpha(t.palette.success.main, 0.24)}`,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        What you earn on this price
      </Typography>

      {isLoading || !data ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Working it out…
        </Typography>
      ) : (
        <Stack spacing={1}>
          <Row label="Selling price" value={fCurrency(data.price)} />
          <Row
            label={`Commission (${data.ratePercent}%)`}
            value={`− ${fCurrency(data.commissionInr)}`}
          />
          <Divider sx={{ borderStyle: 'dashed' }} />
          <Row
            label="You receive"
            value={fCurrency(data.netInr)}
            sx={{ color: theme.palette.success.dark, fontWeight: 700 }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Based on {SOURCE_LABEL[data.source] ?? 'the applicable rate'}. A flat{' '}
            {fCurrency(data.platformFeePerOrderInr)} platform fee applies once per order, not
            per item.
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

const Row = ({
  label,
  value,
  sx,
}: {
  label: string;
  value: string;
  sx?: Record<string, unknown>;
}) => (
  <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={sx}>
      {value}
    </Typography>
  </Stack>
);
