import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useClustersList } from '@/features/clusters/api';
import { PickerDialog, type PickerOption } from './PickerDialog';
import { PickerTrigger } from './PickerTrigger';

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

  if (props.multi) {
    const selected = options.filter((o) => props.values.includes(o.id));
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={props.disabled}
          className={`flex w-full min-h-10 items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm ${props.disabled ? 'cursor-not-allowed opacity-50' : ''} ${props.className ?? ''}`}
        >
          {selected.length === 0 ? (
            <span className="flex-1 text-muted-foreground">
              {props.placeholder ?? 'Pick one or more clusters…'}
            </span>
          ) : (
            <div className="flex flex-1 flex-wrap gap-1.5">
              {selected.map((s) => (
                <Badge key={s.id} variant="muted">
                  {s.label}
                  <span
                    role="button"
                    aria-label={`Remove ${s.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onChange(props.values.filter((v) => v !== s.id));
                    }}
                    className="ml-1 inline-flex cursor-pointer items-center"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </button>
        <PickerDialog
          mode="multi"
          open={open}
          onClose={() => setOpen(false)}
          title="Pick clusters"
          description="Inactive clusters are shown but can't be selected."
          options={options}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          searchPlaceholder="Search by name, district, or state…"
          onSearchChange={setSearch}
          values={props.values}
          onCommit={props.onChange}
        />
      </>
    );
  }

  const selected = options.find((o) => o.id === props.value);
  return (
    <>
      <PickerTrigger
        label={selected?.label ?? null}
        detail={selected ? (selected.detail as string) : null}
        placeholder={props.placeholder ?? 'Select a cluster…'}
        onClick={() => setOpen(true)}
        onClear={() => props.onChange(null)}
        disabled={props.disabled}
        className={props.className}
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
        value={props.value}
        onSelect={props.onChange}
      />
    </>
  );
};
