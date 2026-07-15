import type { HTMLAttributes } from 'react';
import MuiSkeleton from '@mui/material/Skeleton';

// Keep the className API (pages size it with Tailwind, e.g. "h-40 w-full").
export const Skeleton = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <MuiSkeleton
    variant="rounded"
    animation="wave"
    className={className}
    sx={{ bgcolor: 'action.hover' }}
    {...(rest as object)}
  />
);
