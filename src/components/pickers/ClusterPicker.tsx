import { useMemo, useState } from 'react';
import { useClustersList } from '@/features/clusters/api';
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

type ClusterPickerProps = (SingleProps | MultiProps) & {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const PAGE_SIZE = 100;

export const ClusterPicker = (props: ClusterPickerProps) => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useClustersList({
    page: 1,
    limit: PAGE_SIZE,
    q: search || undefined,
  });

  const options = useMemo<PickerOption[]>(
    () =>
      (data?.items ?? []).map((c) => ({
        id: c.id,
        label: c.name,
        detail: `${c.district}, ${c.state} · ${c.status}`,
        disabled: c.status === 'inactive',
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
        placeholder={props.placeholder ?? 'Pick one or more clusters…'}
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
      placeholder={props.placeholder ?? 'Select a cluster…'}
      onSearch={setSearch}
    />
  );
};
