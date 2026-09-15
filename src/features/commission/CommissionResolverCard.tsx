import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { varAlpha } from '@/theme/styles';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { EmptyContent } from '@/components/empty-content';
import { ProductPicker } from '@/components/pickers/ProductPicker';

import { useProduct } from '@/features/products/api';
import { useCategoriesList } from '@/features/categories/api';

import { useResolveCommission } from './api';
import { rateState, SCOPE_COLOR, SCOPE_ICON } from './commission-table-row';
import type { CommissionRate, CommissionScope, ResolvedSource } from './types';

// ----------------------------------------------------------------------

/** The ladder, in the order the payout pipeline walks it. */
const TIERS: Array<{
  source: ResolvedSource;
  scope: CommissionScope | null;
  title: string;
  blurb: string;
}> = [
  {
    source: 'seller',
    scope: 'seller',
    title: 'Seller override',
    blurb: 'A deal struck with this seller. Beats everything below.',
  },
  {
    source: 'product',
    scope: 'product',
    title: 'Product override',
    blurb: 'Set on this product alone, whoever sells it.',
  },
  {
    source: 'category',
    scope: 'category',
    title: 'Category rule',
    blurb: 'Set on the category this product sits in.',
  },
  {
    source: 'category_default',
    scope: null,
    title: 'Category default',
    blurb: 'The rate on the category itself. Always there, so the ladder never runs out.',
  },
];

const SOURCE_LABEL: Record<ResolvedSource, string> = {
  seller: 'Seller override',
  product: 'Product override',
  category: 'Category rule',
  category_default: 'Category default',
};

type Props = {
  /** Every rule already loaded by the page, used to show what exists per tier. */
  rules: CommissionRate[];
};

/**
 * "What will this product actually be charged?"
 *
 * The resolver endpoint wants a seller, a product and a category, which used to
 * mean three separate pickers — and nothing stopped you pairing a seller with a
 * product they do not sell, which would answer a question nobody could ask. A
 * product already knows its seller and its category, so picking one is enough.
 *
 * The answer is the API's; the ladder beside it is context, showing which tiers
 * had a rule to offer and which one won.
 */
export function CommissionResolverCard({ rules }: Props) {
  const [productId, setProductId] = useState('');
  const product = useProduct(productId || undefined);
  const categories = useCategoriesList();

  const sellerId = product.data?.sellerId ?? '';
  const categoryId = product.data?.categoryId ?? '';

  // The bottom of the ladder is never empty: every category carries a default
  // rate, and it is what gets charged when no rule matches.
  const category = categories.data?.find((c) => c.id === categoryId);

  const resolved = useResolveCommission({ sellerId, productId, categoryId });

  /** What each tier has on file for this particular product. */
  const tierRule = useMemo(() => {
    const now = Date.now();
    const pick = (scope: CommissionScope, matches: (r: CommissionRate) => boolean) =>
      rules
        .filter((r) => r.scope === scope && matches(r))
        .sort((a, b) => Number(rateState(b, now) === 'live') - Number(rateState(a, now) === 'live'))
        .at(0) ?? null;

    return {
      seller: sellerId ? pick('seller', (r) => r.sellerId === sellerId) : null,
      product: productId ? pick('product', (r) => r.productId === productId) : null,
      category: categoryId ? pick('category', (r) => r.categoryId === categoryId) : null,
      // Not a rule — the category record's own field. Rendered separately.
      category_default: null,
    } as Record<ResolvedSource, CommissionRate | null>;
  }, [rules, sellerId, productId, categoryId]);

  const winner = resolved.data?.source;
  const loading = product.isLoading || resolved.isLoading;

  return (
    <Card>
      <CardHeader
        title="Check a rate"
        subheader="Pick a product and see exactly what its sales are charged, and which rule decided it."
      />

      <CardContent>
        <Box sx={{ maxWidth: 420 }}>
          <ProductPicker
            label="Product"
            value={productId || null}
            onChange={(id) => setProductId(id ?? '')}
            placeholder="Search your catalogue…"
          />
        </Box>

        {!productId && (
          <EmptyContent
            filled
            title="Nothing to check yet"
            description="Pick a product above. Its seller and category come from the product itself, so the answer always matches a sale that could really happen."
            sx={{ mt: 3, py: 6 }}
          />
        )}

        {productId && product.isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            Could not load that product.
          </Alert>
        )}

        {productId && resolved.isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {resolved.error instanceof Error ? resolved.error.message : 'Lookup failed'}
          </Alert>
        )}

        {productId && !product.isError && (
          <Stack spacing={3} sx={{ mt: 3 }}>
            {/* The answer, stated once and large. */}
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
              }}
            >
              <Box sx={{ typography: 'subtitle2', color: 'text.secondary' }}>
                Commission charged on {product.data?.name ?? 'this product'}
              </Box>
              <Box sx={{ mt: 1, typography: 'h2', color: 'primary.main' }}>
                {loading ? (
                  <Skeleton width={120} sx={{ mx: 'auto' }} />
                ) : (
                  `${resolved.data?.ratePercent ?? 0}%`
                )}
              </Box>
              {winner && (
                <Label variant="soft" color="primary" sx={{ mt: 1 }}>
                  decided by the {SOURCE_LABEL[winner].toLowerCase()}
                </Label>
              )}
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }}>
              <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
                how it was decided
              </Box>
            </Divider>

            <Stack spacing={1.5}>
              {TIERS.map((tier) => {
                const won = winner === tier.source;
                // Tiers above the winner were checked and had nothing to say.
                const skipped = Boolean(winner) && !won;
                const rule = tierRule[tier.source];

                return (
                  <Stack
                    key={tier.source}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: (theme) =>
                        `solid 1px ${varAlpha(
                          won ? theme.vars.palette.primary.mainChannel : theme.vars.palette.grey['500Channel'],
                          won ? 0.48 : 0.16,
                        )}`,
                      bgcolor: (theme) =>
                        won
                          ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08)
                          : 'transparent',
                      opacity: skipped ? 0.6 : 1,
                    }}
                  >
                    <Iconify
                      width={22}
                      icon={
                        won
                          ? 'solar:check-circle-bold'
                          : tier.scope
                            ? SCOPE_ICON[tier.scope]
                            : 'solar:widget-4-bold'
                      }
                      sx={{
                        flexShrink: 0,
                        color: won
                          ? 'primary.main'
                          : tier.scope
                            ? `${SCOPE_COLOR[tier.scope]}.main`
                            : 'text.disabled',
                      }}
                    />

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ typography: 'subtitle2' }}>{tier.title}</Box>
                      <Box sx={{ typography: 'caption', color: 'text.secondary' }}>
                        {tier.blurb}
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      {won ? (
                        <>
                          <Box sx={{ typography: 'h6', color: 'primary.main' }}>
                            {resolved.data?.ratePercent}%
                          </Box>
                          <Box sx={{ typography: 'caption', color: 'primary.main' }}>
                            applied
                          </Box>
                        </>
                      ) : rule ? (
                        <>
                          <Box sx={{ typography: 'subtitle1', color: 'text.disabled' }}>
                            {rule.ratePercent}%
                          </Box>
                          {/* A rule exists but did not win — say why, or it
                              looks like the resolver ignored it. */}
                          <Box sx={{ typography: 'caption', color: 'warning.main' }}>
                            {rateState(rule) === 'live' ? 'outranked' : 'not in effect'}
                          </Box>
                        </>
                      ) : tier.source === 'category_default' && category ? (
                        <>
                          <Box sx={{ typography: 'subtitle1', color: 'text.disabled' }}>
                            {category.defaultCommissionRate}%
                          </Box>
                          <Box sx={{ typography: 'caption', color: 'warning.main' }}>
                            outranked
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
                          no rule
                        </Box>
                      )}
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
