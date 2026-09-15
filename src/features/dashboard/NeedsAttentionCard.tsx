import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import ButtonBase from '@mui/material/ButtonBase';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';
import { alpha } from '@mui/material/styles';

import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';

// ----------------------------------------------------------------------

export interface AttentionItem {
  key: string;
  icon: string;
  label: string;
  /** Live count; `undefined` when the queue has no number to show. */
  count?: number;
  /** Shown under the label when there is no count to lead with. */
  hint?: string;
  onClick: () => void;
}

type Props = {
  items: AttentionItem[];
  loading?: boolean;
  title?: string;
  subheader?: string;
  /** Tiles per row on a wide screen. */
  columns?: 2 | 3 | 4;
};

/**
 * The work queues, each a direct link into its filtered list. A queue with
 * something waiting wears a warning label, so a full column of zeroes reads
 * as "nothing to do" at a glance.
 */
export function NeedsAttentionCard({
  items,
  loading,
  title = 'Needs attention',
  subheader = 'Direct links into filtered work queues — the number is the live count.',
  columns = 3,
}: Props) {
  return (
    <Card>
      <CardHeader title={title} subheader={subheader} />

      <Box
        sx={{
          p: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: `repeat(${columns}, 1fr)`,
          },
        }}
      >
        {items.map((item) => (
          <ButtonBase
            key={item.key}
            onClick={item.onClick}
            sx={{
              p: 2,
              width: 1,
              borderRadius: 1.5,
              typography: 'body2',
              justifyContent: 'space-between',
              transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
              border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
              <Iconify icon={item.icon} width={22} sx={{ flexShrink: 0, color: 'text.disabled' }} />
              <ListItemText
                primary={item.label}
                secondary={item.hint}
                primaryTypographyProps={{ typography: 'subtitle2', noWrap: true }}
                secondaryTypographyProps={{ typography: 'caption', noWrap: true }}
                sx={{ textAlign: 'left' }}
              />
            </Stack>

            {loading ? (
              <Skeleton width={28} height={22} />
            ) : item.count !== undefined ? (
              <Label color={item.count > 0 ? 'warning' : 'default'}>{item.count}</Label>
            ) : (
              <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ color: 'text.disabled' }} />
            )}
          </ButtonBase>
        ))}
      </Box>
    </Card>
  );
}
