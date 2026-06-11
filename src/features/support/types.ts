// Mirrors backend `src/modules/support/support.types.ts`.

export type SupportCategory =
  | 'return'
  | 'refund'
  | 'grievance'
  | 'product_quality'
  | 'delivery'
  | 'other';

export type SupportRaiserRole = 'BUYER' | 'SELLER';

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';

export type SupportEscalationLevel = 'support' | 'cluster' | 'super';

export type SupportResolutionAction = 'refund' | 'replacement' | 'rejected' | 'other';

export interface SupportTicketEvent {
  event: string;
  at: string;
  byUserId: string | null;
  notes?: string;
  fromStatus?: SupportStatus;
  toStatus?: SupportStatus;
  fromLevel?: SupportEscalationLevel;
  toLevel?: SupportEscalationLevel;
}

export type SupportMessageAuthorRole = 'BUYER' | 'SELLER' | 'STAFF';

export type SupportMessageChannel = 'in_app' | 'email' | 'call';

export interface SupportTicketMessage {
  _id?: string;
  body: string;
  authorId: string;
  authorRole: SupportMessageAuthorRole;
  internal: boolean;
  channel?: SupportMessageChannel;
  at: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  raisedBy: string;
  raiserRole: SupportRaiserRole;
  category: SupportCategory;
  subject: string;
  description: string;
  orderId: string | null;
  clusterId: string | null;
  attachments: string[];
  assignedTo: string | null;
  status: SupportStatus;
  escalationLevel: SupportEscalationLevel;
  sla: {
    responseDueAt: string;
    resolutionDueAt: string;
    firstResponseAt: string | null;
    resolvedAt: string | null;
  };
  resolution: {
    action: SupportResolutionAction | null;
    by: string | null;
    at: string | null;
    notes: string | null;
  };
  refundIssued: {
    amountInr: number;
    at: string;
    by: string;
  } | null;
  history: SupportTicketEvent[];
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by GET /support/tickets/:id. */
export interface TicketDetailResponse {
  ticket: SupportTicket;
  sla: {
    responseBreached: boolean;
    resolutionBreached: boolean;
  };
}

export interface TicketsListQuery {
  status?: SupportStatus;
  category?: SupportCategory;
  escalationLevel?: SupportEscalationLevel;
  clusterId?: string;
  /** Either a user ObjectId, or the literal "none" for unassigned tickets. */
  assignedTo?: string;
  page: number;
  limit: number;
}

export interface TicketsListMeta {
  total: number;
  page: number;
  limit: number;
}
