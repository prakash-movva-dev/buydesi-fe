import { forwardRef, type LabelHTMLAttributes } from 'react';
import { styled } from '@mui/material/styles';

const StyledLabel = styled('label')(({ theme }) => ({
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.2,
  fontFamily: theme.typography.fontFamily,
  color: theme.vars.palette.text.primary,
}));

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  (props, ref) => <StyledLabel ref={ref} {...props} />,
);
Label.displayName = 'Label';
