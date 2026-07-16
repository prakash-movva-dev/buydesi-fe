import { useMemo, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/types/api';
import { usePlatformSettings, useUpdatePlatformSetting } from './api';
import type { PlatformSetting, SettingValue, SettingValueType } from './types';

const GROUP_LABEL: Record<string, string> = {
  support: 'Support',
  orders: 'Orders',
  reviews: 'Reviews',
  notifications: 'Notifications',
  payouts: 'Payouts',
  delivery: 'Delivery',
};

const titleCase = (s: string): string =>
  s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const PlatformSettingsPage = () => {
  const settings = usePlatformSettings();
  const [group, setGroup] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, PlatformSetting[]>();
    for (const s of settings.data ?? []) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return map;
  }, [settings.data]);

  const groups = Array.from(grouped.keys()).sort();
  const activeGroup = group ?? groups[0] ?? null;
  const rows = activeGroup ? grouped.get(activeGroup) ?? [] : [];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Platform settings"
        description="Runtime-editable knobs. Changes apply within 5 minutes platform-wide. Every change is recorded to the activity log."
      />

      {settings.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {settings.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {settings.error instanceof Error ? settings.error.message : 'Failed to load settings'}
        </div>
      )}

      {!settings.isLoading && !settings.isError && (
        <>
          <Tabs
            value={activeGroup ?? false}
            onChange={(_e, v) => setGroup(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {groups.map((g) => (
              <Tab key={g} value={g} label={GROUP_LABEL[g] ?? titleCase(g)} />
            ))}
          </Tabs>

          <div className="space-y-3">
            {rows.map((s) => (
              <SettingRow key={s.key} setting={s} />
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No settings in this group.</p>
            )}
          </div>
        </>
      )}
    </Stack>
  );
};

const SettingRow = ({ setting }: { setting: PlatformSetting }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(setting.value));
  const [error, setError] = useState<string | null>(null);
  const update = useUpdatePlatformSetting();

  const onCancel = () => {
    setEditing(false);
    setDraft(String(setting.value));
    setError(null);
  };

  const onSave = async () => {
    const parsed = parseDraft(draft, setting.valueType);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (typeof parsed.value === 'number') {
      if (setting.min !== null && parsed.value < setting.min) {
        setError(`Must be >= ${setting.min}`);
        return;
      }
      if (setting.max !== null && parsed.value > setting.max) {
        setError(`Must be <= ${setting.max}`);
        return;
      }
    }
    try {
      await update.mutateAsync({ key: setting.key, value: parsed.value });
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{setting.label}</CardTitle>
            <CardDescription className="font-mono text-xs">{setting.key}</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {setting.description && (
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        )}

        {editing ? (
          <div className="flex flex-wrap items-end gap-2">
            <Editor
              valueType={setting.valueType}
              draft={draft}
              onChange={setDraft}
              min={setting.min}
              max={setting.max}
            />
            <Button size="sm" onClick={onSave} disabled={update.isPending}>
              <Check className="h-4 w-4" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel} disabled={update.isPending}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            {error && (
              <Alert severity="error" sx={{ flexBasis: '100%' }}>
                {error}
              </Alert>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Current value:</span>
            <span className="font-mono font-semibold">{displayValue(setting)}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Updated {formatDateTime(setting.updatedAt)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Editor = ({
  valueType,
  draft,
  onChange,
  min,
  max,
}: {
  valueType: SettingValueType;
  draft: string;
  onChange: (v: string) => void;
  min: number | null;
  max: number | null;
}) => {
  if (valueType === 'boolean') {
    return (
      <TextField
        select
        size="small"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: 160 }}
        InputLabelProps={{ shrink: true }}
      >
        <MenuItem value="true">Enabled</MenuItem>
        <MenuItem value="false">Disabled</MenuItem>
      </TextField>
    );
  }
  const isNumber =
    valueType === 'integer' || valueType === 'duration_hours' || valueType === 'number';
  const fieldType = isNumber ? ('number' as const) : ('text' as const);
  const numberInputProps = isNumber
    ? {
        inputMode: 'numeric' as const,
        min: min ?? undefined,
        max: max ?? undefined,
        step: valueType === 'number' ? '0.01' : '1',
      }
    : {};
  return (
    <TextField
      type={fieldType}
      size="small"
      value={draft}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: 256 }}
      InputLabelProps={{ shrink: true }}
      inputProps={numberInputProps}
    />
  );
};

interface ParseResult {
  value: SettingValue;
  error?: string;
}

const parseDraft = (draft: string, type: SettingValueType): ParseResult => {
  switch (type) {
    case 'boolean':
      if (draft === 'true') return { value: true };
      if (draft === 'false') return { value: false };
      return { value: false, error: 'Must be true or false' };
    case 'integer':
    case 'duration_hours':
      if (!/^-?\d+$/.test(draft.trim())) return { value: 0, error: 'Must be an integer' };
      return { value: parseInt(draft, 10) };
    case 'number': {
      const n = Number(draft);
      if (!Number.isFinite(n)) return { value: 0, error: 'Must be a number' };
      return { value: n };
    }
    case 'string':
      return { value: draft };
  }
};

const displayValue = (s: PlatformSetting): string => {
  if (s.valueType === 'boolean') return s.value ? 'Enabled' : 'Disabled';
  if (s.valueType === 'duration_hours') return `${s.value} hours`;
  return String(s.value);
};
