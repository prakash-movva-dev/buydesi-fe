import { useRef, type ReactNode, type SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import type { PickerOption } from './PickerDialog';

// ----------------------------------------------------------------------

type Common = {
  options: PickerOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  helperText?: ReactNode;
  /** Notify the parent's data hook of the typed query for server-side search. */
  onSearch?: (q: string) => void;
};

type SingleProps = Common & {
  multi?: false;
  value: string | null;
  onChange: (id: string | null) => void;
};

type MultiProps = Common & {
  multi: true;
  values: string[];
  onChange: (ids: string[]) => void;
};

export type AutocompleteFieldProps = SingleProps | MultiProps;

/**
 * Minimal (MUI) Autocomplete for the back-office entity pickers. Single + multi.
 * Caches every option it has seen by id, so a selected value keeps its label even
 * after the async search list no longer contains it.
 */
export function AutocompleteField(props: AutocompleteFieldProps) {
  const { options, loading, disabled, placeholder, error, helperText, onSearch } = props;

  const cache = useRef(new Map<string, PickerOption>());
  options.forEach((o) => cache.current.set(o.id, o));
  const byId = (id: string): PickerOption => cache.current.get(id) ?? { id, label: id };

  // Ensure any selected id that isn't in the current search page is still listed.
  const selectedIds = props.multi ? props.values : props.value ? [props.value] : [];
  const present = new Set(options.map((o) => o.id));
  const merged = [...options, ...selectedIds.filter((id) => !present.has(id)).map(byId)];

  const onInput = (_e: SyntheticEvent, v: string, reason: string) => {
    if (reason === 'input') onSearch?.(v);
  };

  const renderInput = (params: React.ComponentProps<typeof TextField>) => (
    <TextField
      {...params}
      placeholder={placeholder}
      error={error}
      helperText={helperText}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {loading ? <CircularProgress color="inherit" size={16} /> : null}
            {params.InputProps?.endAdornment}
          </>
        ),
      }}
    />
  );

  const renderOption = (liProps: React.HTMLAttributes<HTMLLIElement>, option: PickerOption) => (
    <Box component="li" {...liProps} key={option.id}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {option.label}
        </Typography>
        {option.detail && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
            {option.detail}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const shared = {
    options: merged,
    loading,
    disabled,
    onInputChange: onInput,
    getOptionLabel: (o: PickerOption) => o.label,
    getOptionDisabled: (o: PickerOption) => Boolean(o.disabled),
    isOptionEqualToValue: (o: PickerOption, v: PickerOption) => o.id === v.id,
    filterOptions: (x: PickerOption[]) => x, // server-side filtering via onSearch
    renderOption,
    renderInput,
  } as const;

  if (props.multi) {
    return (
      <Autocomplete
        {...shared}
        multiple
        disableCloseOnSelect
        value={props.values.map(byId)}
        onChange={(_e, v) => props.onChange(v.map((o) => o.id))}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return <Chip {...tagProps} key={option.id} size="small" label={option.label} />;
          })
        }
      />
    );
  }

  return (
    <Autocomplete
      {...shared}
      value={props.value ? byId(props.value) : null}
      onChange={(_e, v) => props.onChange(v ? v.id : null)}
    />
  );
}
