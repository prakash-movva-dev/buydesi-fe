import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlatformSetting, SettingValue } from './types';

/**
 * Lightweight reader for the allow-list of settings exposed to any admin
 * tier. Use this from lower-tier admin UIs (Support, Regional, Category)
 * that need to render configurable thresholds without the super-tier
 * settings page.
 *
 * The endpoint is admin-only — pass `enabled: false` when the current
 * viewer is a non-admin (e.g. a seller/promoter raiser on a shared page)
 * to avoid a guaranteed 403.
 */
export const useExposedSettings = (enabled = true) =>
  useQuery({
    queryKey: ['platform-settings', 'exposed'],
    queryFn: () => api.get<PlatformSetting[]>('/admin/platform-settings/exposed'),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

export const useExposedSettingMap = (enabled = true) => {
  const { data, ...rest } = useExposedSettings(enabled);
  const map = useMemo(() => {
    const m = new Map<string, SettingValue>();
    for (const s of data ?? []) m.set(s.key, s.value);
    return m;
  }, [data]);
  return { ...rest, data, map };
};

export const readNumber = (
  map: Map<string, SettingValue>,
  key: string,
  fallback: number,
): number => {
  const v = map.get(key);
  return typeof v === 'number' ? v : fallback;
};

export const readBoolean = (
  map: Map<string, SettingValue>,
  key: string,
  fallback: boolean,
): boolean => {
  const v = map.get(key);
  return typeof v === 'boolean' ? v : fallback;
};
