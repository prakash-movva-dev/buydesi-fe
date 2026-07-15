import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { styled } from '@mui/material/styles';

import { varAlpha } from 'src/theme/styles';

// Native <table> elements re-themed to the Minimal look. DOM shape is unchanged
// so colSpan, className, and event handlers on rows/cells keep working.

const Root = styled('table')(({ theme }) => ({
  width: '100%',
  captionSide: 'bottom',
  borderCollapse: 'collapse',
  fontSize: 14,
  fontFamily: theme.typography.fontFamily,
  color: theme.vars.palette.text.primary,
}));

const StyledThead = styled('thead')(({ theme }) => ({
  backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
}));

const StyledTbody = styled('tbody')(({ theme }) => ({
  '& tr:not(:last-of-type)': {
    borderBottom: `1px dashed ${varAlpha(theme.vars.palette.grey['500Channel'], 0.24)}`,
  },
}));

const StyledTr = styled('tr')(({ theme }) => ({
  transition: theme.transitions.create('background-color'),
  '&:hover': { backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.06) },
}));

const StyledTh = styled('th')(({ theme }) => ({
  height: 44,
  padding: '0 16px',
  textAlign: 'left',
  verticalAlign: 'middle',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
  color: theme.vars.palette.text.secondary,
}));

const StyledTd = styled('td')({
  padding: '12px 16px',
  verticalAlign: 'middle',
});

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ children, ...rest }, ref) => (
    <div
      style={{ width: '100%', overflow: 'auto', borderRadius: 16 }}
      className="mui-table-wrap"
    >
      <Root ref={ref} {...rest}>
        {children}
      </Root>
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  (props, ref) => <StyledThead ref={ref} {...props} />,
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  (props, ref) => <StyledTbody ref={ref} {...props} />,
);
TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  (props, ref) => <StyledTr ref={ref} {...props} />,
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  (props, ref) => <StyledTh ref={ref} {...props} />,
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  (props, ref) => <StyledTd ref={ref} {...props} />,
);
TableCell.displayName = 'TableCell';
