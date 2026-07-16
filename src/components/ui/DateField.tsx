import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { TextFieldProps } from '@mui/material/TextField';

interface DateFieldProps {
  label?: string;
  /** ISO date string 'YYYY-MM-DD' (empty string = no value). */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  minDate?: string;
  maxDate?: string;
  helperText?: React.ReactNode;
  sx?: TextFieldProps['sx'];
}

/**
 * Minimal (MUI X) date picker that speaks plain 'YYYY-MM-DD' strings, so it is a
 * drop-in for the old `<Input type="date">` fields without touching their state.
 * Requires a <LocalizationProvider dateAdapter={AdapterDayjs}> ancestor (set in main).
 */
export const DateField = ({
  label,
  value,
  onChange,
  disabled,
  required,
  fullWidth = true,
  minDate,
  maxDate,
  helperText,
  sx,
}: DateFieldProps) => (
  <DatePicker
    label={label}
    value={value ? dayjs(value) : null}
    onChange={(d) => onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : '')}
    disabled={disabled}
    minDate={minDate ? dayjs(minDate) : undefined}
    maxDate={maxDate ? dayjs(maxDate) : undefined}
    format="DD/MM/YYYY"
    slotProps={{
      textField: {
        fullWidth,
        required,
        helperText,
        sx,
        InputLabelProps: { shrink: true },
      },
    }}
  />
);
