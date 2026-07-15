import { forwardRef, type HTMLAttributes } from 'react';
import MuiCard from '@mui/material/Card';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Card shim — same subcomponent API (Card/Header/Title/Description/Content/
 * Footer) but rendered on MUI so it picks up the Minimal theme's radius +
 * soft shadow. `className` is still forwarded for Tailwind layout utilities.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <MuiCard ref={ref} className={className} {...rest}>
      {children}
    </MuiCard>
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <Box
      ref={ref}
      className={className}
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, p: 3 }}
      {...rest}
    >
      {children}
    </Box>
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...rest }, ref) => (
    <Typography
      ref={ref as never}
      className={className}
      variant="h6"
      component="h3"
      {...(rest as object)}
    >
      {children}
    </Typography>
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...rest }, ref) => (
  <Typography
    ref={ref as never}
    className={className}
    variant="body2"
    sx={{ color: 'text.secondary' }}
    {...(rest as object)}
  >
    {children}
  </Typography>
));
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <Box ref={ref} className={className} sx={{ p: 3, pt: 0 }} {...rest}>
      {children}
    </Box>
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <Box
      ref={ref}
      className={className}
      sx={{ display: 'flex', alignItems: 'center', p: 3, pt: 0 }}
      {...rest}
    >
      {children}
    </Box>
  ),
);
CardFooter.displayName = 'CardFooter';
