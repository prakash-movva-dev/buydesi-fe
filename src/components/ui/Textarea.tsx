import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { styled } from '@mui/material/styles';

import { varAlpha } from 'src/theme/styles';

const StyledTextarea = styled('textarea')(({ theme }) => ({
  display: 'flex',
  minHeight: 80,
  width: '100%',
  borderRadius: 8,
  border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.32)}`,
  backgroundColor: 'transparent',
  padding: '8px 12px',
  fontSize: 14,
  lineHeight: 1.5,
  fontFamily: theme.typography.fontFamily,
  color: theme.vars.palette.text.primary,
  resize: 'vertical',
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  '&::placeholder': { color: theme.vars.palette.text.disabled, opacity: 1 },
  '&:hover': { borderColor: theme.vars.palette.text.primary },
  '&:focus': {
    outline: 'none',
    borderColor: theme.vars.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.vars.palette.primary.main}`,
  },
  '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
}));

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => <StyledTextarea ref={ref} {...props} />,
);
Textarea.displayName = 'Textarea';
