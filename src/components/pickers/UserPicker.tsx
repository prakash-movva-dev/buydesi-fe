import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useUsersList } from '@/features/users/api';
import type { UserRole } from '@/types/api';
import { PickerDialog, type PickerOption } from './PickerDialog';
import { PickerTrigger } from './PickerTrigger';

interface CommonProps {
  /** Pre-filter results by role (e.g. SELLER, PROMOTER, CATEGORY_ADMIN). Omit for any. */
  role?: UserRole;
  /** Status filter — defaults to 'active'. */
  status?: 'active' | 'pending' | 'suspended';
  /** Limit to a specific cluster (useful for picking a regional admin). */
  clusterId?: string;
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

type UserPickerProps = SingleProps | MultiProps;

const PAGE_LIMIT = 100;

export const UserPicker = (props: UserPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useUsersList({
    role: props.role,
    status: props.status ?? 'active',
    clusterId: props.clusterId,
    q: search || undefined,
    page: 1,
    limit: PAGE_LIMIT,
  });

  const options = useMemo<PickerOption[]>(
    () =>
      (data?.items ?? []).map((u) => ({
        id: u.id,
        label: u.name,
        detail: [u.email, u.mobile, u.role].filter(Boolean).join(' · '),
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
              {props.placeholder ?? 'Pick users…'}
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
          title={`Pick ${props.role ? `${props.role.toLowerCase()}s` : 'users'}`}
          options={options}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          searchPlaceholder="Search by name, email, mobile, or id…"
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
        placeholder={
          props.placeholder ??
          `Pick ${props.role ? `a ${props.role.toLowerCase()}` : 'a user'}…`
        }
        onClick={() => setOpen(true)}
        onClear={() => props.onChange(null)}
        disabled={props.disabled}
        className={props.className}
      />
      <PickerDialog
        mode="single"
        open={open}
        onClose={() => setOpen(false)}
        title={`Pick ${props.role ? `a ${props.role.toLowerCase()}` : 'a user'}`}
        options={options}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
        searchPlaceholder="Search by name, email, mobile, or id…"
        onSearchChange={setSearch}
        value={props.value}
        onSelect={props.onChange}
      />
    </>
  );
};
