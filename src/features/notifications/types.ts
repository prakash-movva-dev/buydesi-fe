// Mirrors the safe shape returned by GET /notifications (backend
// `src/modules/notifications/notification.model.ts`). Mongo serialises `_id`
// and the controller returns lean documents, so both `id` and `_id` may be
// present depending on the path; we normalise in the api layer.

export interface AdminNotification {
  id?: string;
  _id?: string;
  templateKey: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationsMeta {
  total: number;
  page: number;
  limit: number;
  unread: number;
}

export interface NotificationsListQuery {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}
