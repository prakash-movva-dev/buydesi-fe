import { useMemo, useState } from 'react';
import { useCategoriesList } from '@/features/categories/api';
import type { SafeCategory } from '@/features/categories/types';
import { AutocompleteField } from './AutocompleteField';
import type { PickerOption } from './PickerDialog';

interface SingleProps {
  multi?: false;
  value: string | null;
  onChange: (id: string | null) => void;
}

interface MultiProps {
  multi: true;
  values: string[];
  onChange: (ids: string[]) => void;
}

type CategoryPickerProps = (SingleProps | MultiProps) & {
  placeholder?: string;
  /** Floating label — use it on forms so the field matches the TextFields around it. */
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  /** Filter to one of these (defaults to all active). */
  activeOnly?: boolean;
  /** When true, hides slug and commission rate for cleaner seller-facing UI */
  sellerMode?: boolean;
  /** Restricts selectable categories to only these IDs */
  allowedCategoryIds?: string[];
};

export const CategoryPicker = (props: CategoryPickerProps) => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCategoriesList({
    status: props.activeOnly === false ? undefined : 'active',
    q: search || undefined,
  });

  const options = useMemo<PickerOption[]>(() => {
    let items = data ?? [];
    if (props.allowedCategoryIds !== undefined) {
      const allowedSet = new Set(props.allowedCategoryIds);
      items = items.filter((c: SafeCategory) => allowedSet.has(c.id));
    }
    return items
      .map((c: SafeCategory) => ({
        id: c.id,
        label: c.name,
        detail: props.sellerMode ? undefined : `slug ${c.slug} · ${c.defaultCommissionRate}% default`,
        disabled: c.status !== 'active',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data, props.allowedCategoryIds, props.sellerMode]);

  if (props.multi) {
    return (
      <AutocompleteField
        multi
        options={options}
        values={props.values}
        onChange={props.onChange}
        loading={isLoading}
        disabled={props.disabled}
        label={props.label}
        required={props.required}
        error={props.error}
        helperText={props.helperText}
        placeholder={props.placeholder ?? 'Pick one or more categories…'}
        onSearch={setSearch}
      />
    );
  }

  return (
    <AutocompleteField
      options={options}
      value={props.value}
      onChange={props.onChange}
      loading={isLoading}
      disabled={props.disabled}
      label={props.label}
      required={props.required}
      error={props.error}
      helperText={props.helperText}
      placeholder={props.placeholder ?? 'Pick a category…'}
      onSearch={setSearch}
    />
  );
};
