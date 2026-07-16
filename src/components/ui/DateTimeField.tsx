import dayjs from 'dayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { TextFieldProps } from '@mui/material/TextField';

interface DateTimeFieldProps {
  label?: string;
  /** Local datetime string 'YYYY-MM-DDTHH:mm' (empty = no value). */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  helperText?: React.ReactNode;
  sx?: TextFieldProps['sx'];
}

/**
 * Minimal (MUI X) date-time picker that speaks the same 'YYYY-MM-DDTHH:mm' strings
 * the old `<Input type="datetime-local">` used, so it drops in without touching state.
 * Requires a <LocalizationProvider dateAdapter={AdapterDayjs}> ancestor (set in main).
 */
export const DateTimeField = ({
  label,
  value,
  onChange,
  disabled,
  required,
  fullWidth = true,
  helperText,
  sx,
}: DateTimeFieldProps) => (
  <DateTimePicker
    label={label}
    value={value ? dayjs(value) : null}
    onChange={(d) => onChange(d && d.isValid() ? d.format('YYYY-MM-DDTHH:mm') : '')}
    disabled={disabled}
    format="DD/MM/YYYY hh:mm A"
    slotProps={{
      textField: { fullWidth, required, helperText, sx, InputLabelProps: { shrink: true } },
    }}
  />
);
