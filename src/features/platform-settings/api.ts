import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlatformSetting, SettingValue } from './types';

export const platformSettingsKeys = {
  all: ['platform-settings'] as const,
  list: () => ['platform-settings', 'list'] as const,
};

export const usePlatformSettings = () =>
  useQuery({
    queryKey: platformSettingsKeys.list(),
    queryFn: () => api.get<PlatformSetting[]>('/admin/platform-settings'),
  });

export const useUpdatePlatformSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: SettingValue }) =>
      api.put<PlatformSetting>(`/admin/platform-settings/${key}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformSettingsKeys.all }),
  });
};
