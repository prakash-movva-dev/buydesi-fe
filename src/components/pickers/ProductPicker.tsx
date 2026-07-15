import { useMemo, useState } from 'react';
import { useProductsList } from '@/features/products/api';
import type { ProductStatus } from '@/features/products/types';
import { AutocompleteField } from './AutocompleteField';
import type { PickerOption } from './PickerDialog';

interface CommonProps {
  /** Defaults to LIVE (the most common case — pick something users can buy). */
  status?: ProductStatus;
  /** Optional category scope. */
  categoryId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface SingleProps extends CommonProps {
  multi?: false;
  value: string | null;
  onChange: (id: string | null) => void;
}

interface MultiProps extends CommonProps {
  multi: true;
  values: string[];
  onChange: (ids: string[]) => void;
}

type ProductPickerProps = SingleProps | MultiProps;

const PAGE_LIMIT = 100;

export const ProductPicker = (props: ProductPickerProps) => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProductsList({
    status: props.status ?? 'LIVE',
    category: props.categoryId,
    q: search || undefined,
    page: 1,
    limit: PAGE_LIMIT,
  });

  const options = useMemo<PickerOption[]>(
    () =>
      (data?.items ?? []).map((p) => ({
        id: p.id,
        label: p.name,
        detail: `${p.unit} · ${p.status}`,
      })),
    [data],
  );

  if (props.multi) {
    return (
      <AutocompleteField
        multi
        options={options}
        values={props.values}
        onChange={props.onChange}
        loading={isLoading}
        disabled={props.disabled}
        placeholder={props.placeholder ?? 'Pick products…'}
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
      placeholder={props.placeholder ?? 'Pick a product…'}
      onSearch={setSearch}
    />
  );
};
