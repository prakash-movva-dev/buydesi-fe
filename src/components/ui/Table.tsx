import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...rest }, ref) => (
    <div className="w-full overflow-auto rounded-lg border border-border bg-card">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...rest} />
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...rest }, ref) => (
    <thead ref={ref} className={cn('bg-secondary/40', className)} {...rest} />
  ),
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...rest }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-border', className)} {...rest} />
  ),
);
TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...rest }, ref) => (
    <tr ref={ref} className={cn('transition-colors hover:bg-secondary/30', className)} {...rest} />
  ),
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...rest }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...rest}
    />
  ),
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...rest }, ref) => (
    <td ref={ref} className={cn('px-4 py-3 align-middle', className)} {...rest} />
  ),
);
TableCell.displayName = 'TableCell';
