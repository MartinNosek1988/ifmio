import type { BaseEntity } from './base';

export type TicketStatus = 'new' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Ticket extends BaseEntity {
  property_id: string;
  unit_id?: string;
  asset_id?: string;
  work_order_id?: string;

  title: string;
  description: string;

  status: TicketStatus;
  priority: TicketPriority;
  kategorie?: string;

  reporter_person_id?: string;
  assigned_user_id?: string;

  created_date: string;
  due_date?: string;
  resolved_date?: string;

  sla_response_deadline?: string;
  sla_resolution_deadline?: string;

  komentare: TicketComment[];
  tagy: string[];
}

export interface TicketComment {
  id: string;
  author_user_id: string;
  text: string;
  created_at: string;
  is_internal: boolean;
}

export interface WorkOrder extends BaseEntity {
  property_id: string;
  unit_id?: string;
  asset_id?: string;
  ticket_id?: string;

  title: string;
  description: string;

  status: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: TicketPriority;

  assigned_user_id?: string;
  dodavatel_person_id?: string;

  planned_date?: string;
  completed_date?: string;
  due_date?: string;

  naklady_kc?: number;
  doklad_id?: string;

  poznamka?: string;
}
