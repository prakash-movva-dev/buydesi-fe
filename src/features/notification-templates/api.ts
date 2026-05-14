import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NotificationTemplate {
  title: string;
  body: string;
}

export type LocalisedTemplate = Record<string, NotificationTemplate>;

export type TemplatesCatalogue = Record<string, LocalisedTemplate>;

export const templateKeys = {
  all: ['notification-templates'] as const,
};

export const useNotificationTemplates = () =>
  useQuery({
    queryKey: templateKeys.all,
    queryFn: () => api.get<TemplatesCatalogue>('/notifications/templates'),
    staleTime: 60_000 * 5,
  });
