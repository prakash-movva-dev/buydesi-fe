import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-100 text-blue-700',
  muted: 'bg-secondary text-secondary-foreground',
};

export const Badge = ({ className, variant = 'default', ...rest }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variantClasses[variant],
      className,
    )}
    {...rest}
  />
);
