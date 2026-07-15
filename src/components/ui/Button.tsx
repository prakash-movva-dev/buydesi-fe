import { forwardRef, type ButtonHTMLAttributes } from 'react';
import MuiButton from '@mui/material/Button';
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const MUI_VARIANT: Record<Variant, MuiButtonProps['variant']> = {
  primary: 'contained',
  secondary: 'contained',
  outline: 'outlined',
  ghost: 'text',
  destructive: 'contained',
};

const MUI_COLOR: Record<Variant, MuiButtonProps['color']> = {
  primary: 'primary',
  secondary: 'inherit',
  outline: 'inherit',
  ghost: 'inherit',
  destructive: 'error',
};

const MUI_SIZE: Record<Size, MuiButtonProps['size']> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

/**
 * Back-office button shim — same API as before (variant/size + native button
 * props), now rendered with MUI so it inherits the Minimal theme (colors,
 * radius, shadows, hover/disabled states). Icon-as-child spacing is preserved.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', children, ...rest }, ref) => (
    <MuiButton
      ref={ref}
      type={type}
      className={className}
      variant={MUI_VARIANT[variant]}
      color={MUI_COLOR[variant]}
      size={MUI_SIZE[size]}
      disableElevation
      sx={{ gap: 0.75, '& svg': { width: '1.15em', height: '1.15em' } }}
      {...(rest as Omit<MuiButtonProps, 'children'>)}
    >
      {children}
    </MuiButton>
  ),
);
Button.displayName = 'Button';
