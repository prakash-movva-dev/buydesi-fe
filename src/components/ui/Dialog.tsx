import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import MuiDialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

// Rough map from the old Tailwind max-w-* utilities to MUI breakpoints, so
// callers that pass className="max-w-2xl" still get a sensible width.
const widthFromClass = (className?: string): 'xs' | 'sm' | 'md' | 'lg' => {
  if (!className) return 'sm';
  if (className.includes('max-w-4xl') || className.includes('max-w-5xl')) return 'lg';
  if (className.includes('max-w-2xl') || className.includes('max-w-3xl')) return 'md';
  if (className.includes('max-w-lg') || className.includes('max-w-xl')) return 'sm';
  return 'sm';
};

/**
 * Dialog shim — same props API (open/onClose/title/description/footer), now on
 * MUI Dialog. The scrollable content region means tall forms no longer overflow
 * the viewport (the footer stays pinned and visible).
 */
export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) => (
  <MuiDialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth={widthFromClass(className)}
    scroll="paper"
  >
    {(title || description) && (
      <DialogTitle sx={{ pb: description ? 1 : 2, pr: 6 }}>
        {title && (
          <Typography variant="h6" component="span" sx={{ display: 'block' }}>
            {title}
          </Typography>
        )}
        {description && (
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 400 }}>
            {description}
          </Typography>
        )}
      </DialogTitle>
    )}

    <IconButton
      onClick={onClose}
      aria-label="Close dialog"
      sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}
    >
      <X size={18} />
    </IconButton>

    <DialogContent dividers={Boolean(title || description)}>
      <Box sx={{ pt: 1 }}>{children}</Box>
    </DialogContent>

    {footer && <DialogActions sx={{ px: 3, py: 2 }}>{footer}</DialogActions>}
  </MuiDialog>
);
