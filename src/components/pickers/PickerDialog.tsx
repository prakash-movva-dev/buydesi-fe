import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface PickerOption {
  id: string;
  label: string;
  /** Optional secondary detail shown beneath the label (status, region, etc.). */
  detail?: ReactNode;
  /** Disabled options can't be selected — shown greyed out. */
  disabled?: boolean;
}

interface BasePickerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  options: PickerOption[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  searchPlaceholder?: string;
  /** Custom client-side filter; defaults to label contains query (case-insensitive). */
  filterFn?: (opt: PickerOption, query: string) => boolean;
  /**
   * If set, the picker calls this with the debounced search value so the
   * parent can refetch options from the server. When provided, the local
   * client-side filter is bypassed and the server's results are shown as-is.
   */
  onSearchChange?: (q: string) => void;
}

interface SinglePickerProps extends BasePickerProps {
  mode: 'single';
  value: string | null;
  onSelect: (id: string | null) => void;
}

interface MultiPickerProps extends BasePickerProps {
  mode: 'multi';
  values: string[];
  onCommit: (ids: string[]) => void;
}

type PickerDialogProps = SinglePickerProps | MultiPickerProps;

const defaultFilter = (opt: PickerOption, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    opt.label.toLowerCase().includes(q) ||
    opt.id.toLowerCase().includes(q) ||
    (typeof opt.detail === 'string' && opt.detail.toLowerCase().includes(q))
  );
};

export const PickerDialog = (props: PickerDialogProps) => {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    if (!props.open) return;
    setQuery('');
    if (props.mode === 'multi') {
      setDraft(props.values);
    }
    // We deliberately depend on `open` only; resetting draft from props.values
    // on every parent re-render would discard in-progress selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  // Debounced search relay — only fires when the parent wires onSearchChange,
  // so single-fetch pickers keep their cheap client-side filter.
  const onSearchChange = props.onSearchChange;
  useEffect(() => {
    if (!onSearchChange) return;
    const t = setTimeout(() => onSearchChange(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query, onSearchChange]);

  const filterFn = props.filterFn ?? defaultFilter;
  const filtered = useMemo(() => {
    // When the parent owns the search (server-side), don't double-filter.
    if (onSearchChange) return props.options;
    return props.options.filter((o) => filterFn(o, query));
  }, [props.options, filterFn, query, onSearchChange]);

  const isSelected = (id: string): boolean =>
    props.mode === 'single' ? props.value === id : draft.includes(id);

  const handleRowClick = (opt: PickerOption) => {
    if (opt.disabled) return;
    if (props.mode === 'single') {
      props.onSelect(opt.id);
      props.onClose();
      return;
    }
    setDraft((prev) =>
      prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id],
    );
  };

  const footer =
    props.mode === 'multi' ? (
      <>
        <span className="mr-auto text-xs text-muted-foreground">
          {draft.length} selected
        </span>
        <Button variant="outline" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            props.onCommit(draft);
            props.onClose();
          }}
        >
          Use selection
        </Button>
      </>
    ) : props.value ? (
      <Button
        variant="outline"
        onClick={() => {
          props.onSelect(null);
          props.onClose();
        }}
      >
        <X className="h-4 w-4" />
        Clear selection
      </Button>
    ) : undefined;

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
      footer={footer}
      className="max-w-xl"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={props.searchPlaceholder ?? 'Search by name or id…'}
            className="pl-9"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
          {props.isLoading && (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {props.isError && (
            <p className="p-4 text-sm text-destructive">
              {props.errorMessage ?? 'Failed to load options'}
            </p>
          )}
          {!props.isLoading && !props.isError && filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {query ? 'No matches.' : 'No options available.'}
            </p>
          )}
          {!props.isLoading && !props.isError && filtered.length > 0 && (
            <ul className="divide-y divide-border">
              {filtered.map((opt) => {
                const selected = isSelected(opt.id);
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(opt)}
                      disabled={opt.disabled}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors',
                        opt.disabled
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-secondary/40',
                        selected && 'bg-secondary/50',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.detail && (
                          <div className="truncate text-xs text-muted-foreground">
                            {opt.detail}
                          </div>
                        )}
                      </div>
                      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
};
