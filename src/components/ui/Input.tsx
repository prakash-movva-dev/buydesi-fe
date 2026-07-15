import { forwardRef, type InputHTMLAttributes } from 'react';
import { styled } from '@mui/material/styles';

import { varAlpha } from 'src/theme/styles';

/**
 * Native <input>, themed to match MUI's outlined field. Kept as a real input
 * (not TextField) so every native prop — type, inputMode, maxLength, onKeyDown,
 * ref — keeps working exactly as before across the back-office.
 */
const StyledInput = styled('input')(({ theme }) => ({
  display: 'flex',
  height: 40,
  width: '100%',
  borderRadius: 8,
  border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.32)}`,
  backgroundColor: 'transparent',
  padding: '0 12px',
  fontSize: 14,
  fontFamily: theme.typography.fontFamily,
  color: theme.vars.palette.text.primary,
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  '&::placeholder': { color: theme.vars.palette.text.disabled, opacity: 1 },
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

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ type = 'text', ...rest }, ref) => <StyledInput ref={ref} type={type} {...rest} />,
);
Input.displayName = 'Input';
