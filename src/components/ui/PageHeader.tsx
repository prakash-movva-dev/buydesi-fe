import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned action area (buttons, etc.). */
  action?: ReactNode;
}

/**
 * Standard back-office page header — title + optional description on the left,
 * an action slot on the right. Wraps responsively.
 */
export const PageHeader = ({ title, description, action }: PageHeaderProps) => (
  <Box
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 2,
    }}
  >
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720 }}>
          {description}
        </Typography>
      )}
    </Stack>
    {action && <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>{action}</Box>}
  </Box>
);
