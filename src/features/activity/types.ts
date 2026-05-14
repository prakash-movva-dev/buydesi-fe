// Mirrors backend `src/modules/activity/activity.model.ts`.

export interface ActivityLogEntry {
  _id: string;
  id?: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  requestId: string | null;
  ip: string | null;
  status: number | null;
  at: string;
}

export interface ActivityListQuery {
  actorId?: string;
  actorRole?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface ActivityListMeta {
  total: number;
  page: number;
  limit: number;
}
