import { useMemo, useState } from 'react';
import { useUsersList } from '@/features/users/api';
import type { UserRole } from '@/types/api';
import { AutocompleteField } from './AutocompleteField';
import type { PickerOption } from './PickerDialog';

interface CommonProps {
  /** Pre-filter results by role (e.g. SELLER, PROMOTER, CATEGORY_ADMIN). Omit for any. */
  role?: UserRole;
  /** Status filter — defaults to 'active'. */
  status?: 'active' | 'pending' | 'suspended';
  /** Limit to a specific cluster (useful for picking a regional admin). */
  clusterId?: string;
  placeholder?: string;
  /** Floating label, so the picker lines up with the fields beside it. */
  label?: string;
  required?: boolean;
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
  const [search, setSearch] = useState('');
  const { data, isLoading } = useUsersList({
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
        placeholder={props.placeholder ?? 'Pick users…'}
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
      placeholder={
        props.placeholder ?? `Pick ${props.role ? `a ${props.role.toLowerCase()}` : 'a user'}…`
      }
      onSearch={setSearch}
    />
  );
};
