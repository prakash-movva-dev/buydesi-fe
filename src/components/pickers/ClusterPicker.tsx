import { useMemo, useState } from 'react';
import { useClustersList } from '@/features/clusters/api';
import { PickerDialog, type PickerOption } from './PickerDialog';
import { PickerTrigger } from './PickerTrigger';

interface ClusterPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const PAGE_SIZE = 100;

export const ClusterPicker = ({
  value,
  onChange,
  placeholder = 'Select a cluster…',
  disabled,
  className,
}: ClusterPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useClustersList({
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

  const selected = options.find((o) => o.id === value);

  return (
    <>
      <PickerTrigger
        label={selected?.label ?? null}
        detail={selected ? (selected.detail as string) : null}
        placeholder={placeholder}
        onClick={() => setOpen(true)}
        onClear={() => onChange(null)}
        disabled={disabled}
        className={className}
      />
      <PickerDialog
        mode="single"
        open={open}
        onClose={() => setOpen(false)}
        title="Pick a cluster"
        description="Inactive clusters are shown but can't be selected."
        options={options}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
        searchPlaceholder="Search by name, district, or state…"
        onSearchChange={setSearch}
        value={value}
        onSelect={onChange}
      />
    </>
  );
};
