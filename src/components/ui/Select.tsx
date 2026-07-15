import { forwardRef, type SelectHTMLAttributes } from 'react';
import { styled } from '@mui/material/styles';

import { varAlpha } from 'src/theme/styles';

/**
 * Native <select>, themed to match MUI's outlined field. Kept native so pages
 * can keep passing <option> children and native props unchanged.
 */
const StyledSelect = styled('select')(({ theme }) => ({
  display: 'flex',
  height: 40,
  width: '100%',
  borderRadius: 8,
  border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.32)}`,
  backgroundColor: theme.vars.palette.background.paper,
  padding: '0 12px',
  fontSize: 14,
  fontFamily: theme.typography.fontFamily,
  color: theme.vars.palette.text.primary,
  cursor: 'pointer',
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  '&:hover': { borderColor: theme.vars.palette.text.primary },
  '&:focus': {
    outline: 'none',
    borderColor: theme.vars.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.vars.palette.primary.main}`,
  },
  '&:disabled': {
    cursor: 'not-allowed',
    opacity: 0.5,
    backgroundColor: theme.vars.palette.action.disabledBackground,
  },
}));

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, ...rest }, ref) => (
    <StyledSelect ref={ref} {...rest}>
      {children}
    </StyledSelect>
  ),
);
Select.displayName = 'Select';
