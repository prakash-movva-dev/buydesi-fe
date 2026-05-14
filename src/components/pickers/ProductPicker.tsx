import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useProductsList } from '@/features/products/api';
import type { ProductStatus } from '@/features/products/types';
import { PickerDialog, type PickerOption } from './PickerDialog';
import { PickerTrigger } from './PickerTrigger';

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useProductsList({
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
              {props.placeholder ?? 'Pick products…'}
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
          title="Pick products"
          options={options}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          searchPlaceholder="Search by name…"
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
        placeholder={props.placeholder ?? 'Pick a product…'}
        onClick={() => setOpen(true)}
        onClear={() => props.onChange(null)}
        disabled={props.disabled}
        className={props.className}
      />
      <PickerDialog
        mode="single"
        open={open}
        onClose={() => setOpen(false)}
        title="Pick a product"
        options={options}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
        searchPlaceholder="Search by name…"
        onSearchChange={setSearch}
        value={props.value}
        onSelect={props.onChange}
      />
    </>
  );
};
