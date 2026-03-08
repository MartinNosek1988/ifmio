import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';
import type { Ticket, TicketComment, TicketStatus, TicketPriority } from '../../shared/schema/ticket';

const TICKETS_KEY = 'estateos_tickets';

const STATUS_MAP: Record<string, TicketStatus> = {
  nova: 'new', v_reseni: 'in_progress', vyresena: 'resolved', uzavrena: 'closed',
};
const PRIO_MAP: Record<string, TicketPriority> = {
  nizka: 'low', normalni: 'medium', vysoka: 'high', kriticka: 'critical',
};

type R = Record<string, unknown>;

function normalize(raw: R): Ticket {
  return {
    id: String(raw.id || ''),
    tenant_id: String(raw.tenant_id || ''),
    created_at: String(raw.created_at || ''),
    updated_at: String(raw.updated_at || ''),
    deleted_at: (raw.deleted_at as string | null) || null,
    property_id: String(raw.property_id || raw.propId || ''),
    unit_id: raw.unit_id != null ? String(raw.unit_id) : raw.jednotkaId != null ? String(raw.jednotkaId) : undefined,
    asset_id: raw.asset_id != null ? String(raw.asset_id) : undefined,
    work_order_id: raw.work_order_id != null ? String(raw.work_order_id) : undefined,
    title: String(raw.title || raw.nazev || ''),
    description: String(raw.description || raw.popis || ''),
    status: (STATUS_MAP[String(raw.status || raw.stav || '')] || raw.status || 'new') as TicketStatus,
    priority: (PRIO_MAP[String(raw.priority || raw.priorita || '')] || raw.priority || 'medium') as TicketPriority,
    kategorie: raw.kategorie != null ? String(raw.kategorie) : undefined,
    reporter_person_id: raw.reporter_person_id != null ? String(raw.reporter_person_id) : undefined,
    assigned_user_id: raw.assigned_user_id != null ? String(raw.assigned_user_id) : undefined,
    created_date: String(raw.created_date || raw.datumVytvoreni || ''),
    due_date: raw.due_date != null ? String(raw.due_date) : raw.terminDo != null ? String(raw.terminDo) : undefined,
    resolved_date: raw.resolved_date != null ? String(raw.resolved_date) : undefined,
    komentare: Array.isArray(raw.komentare) ? raw.komentare as TicketComment[] : [],
    tagy: Array.isArray(raw.tagy) ? raw.tagy as string[] : [],
    // extra legacy fields preserved as-is
    ...('zadavatel' in raw ? { zadavatel: raw.zadavatel } : {}),
    ...('cisloProtokolu' in raw ? { cisloProtokolu: raw.cisloProtokolu } : {}),
  } as Ticket & R;
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['open', 'in_progress', 'cancelled'],
  open: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'open', 'cancelled'],
  resolved: ['closed', 'open'],
  closed: [],
  cancelled: ['new'],
};

interface HelpdeskStore {
  tickets: Ticket[];
  load: () => void;
  getById: (id: string) => Ticket | undefined;
  create: (data: Partial<Ticket> & R) => Ticket;
  update: (id: string, data: Partial<Ticket>) => void;
  remove: (id: string) => void;
  transition: (id: string, newStatus: TicketStatus) => boolean;
  addComment: (ticketId: string, text: string, isInternal?: boolean) => void;
  getAllowedTransitions: (status: TicketStatus) => TicketStatus[];
  getStats: () => { total: number; open: number; today: number; critical: number };
}

export const useHelpdeskStore = create<HelpdeskStore>((set, get) => ({
  tickets: [],

  load: () => {
    const raw = filterActive(loadFromStorage<R[]>(TICKETS_KEY, []));
    set({ tickets: raw.map(normalize) });
  },

  getById: (id) => get().tickets.find(t => t.id === id),

  create: (data) => {
    const ticket = normalize({
      ...makeEntityBase(),
      status: 'new',
      priority: 'medium',
      created_date: new Date().toISOString().slice(0, 10),
      komentare: [],
      tagy: [],
      ...data,
    });
    const all = loadFromStorage<R[]>(TICKETS_KEY, []);
    saveToStorage(TICKETS_KEY, [...all, ticket]);
    set(s => ({ tickets: [...s.tickets, ticket] }));
    return ticket;
  },

  update: (id, data) => {
    const all = loadFromStorage<R[]>(TICKETS_KEY, []);
    const updated = all.map(t => String(t.id) === id
      ? { ...t, ...data, updated_at: new Date().toISOString() } : t);
    saveToStorage(TICKETS_KEY, updated);
    set({ tickets: filterActive(updated).map(normalize) });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<R[]>(TICKETS_KEY, []);
    const updated = all.map(t => String(t.id) === id
      ? { ...t, deleted_at: now, updated_at: now } : t);
    saveToStorage(TICKETS_KEY, updated);
    set({ tickets: filterActive(updated).map(normalize) });
  },

  transition: (id, newStatus) => {
    const ticket = get().getById(id);
    if (!ticket) return false;
    const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(newStatus)) return false;
    const extra: Partial<Ticket> = {};
    if (newStatus === 'resolved') extra.resolved_date = new Date().toISOString().slice(0, 10);
    get().update(id, { status: newStatus, ...extra });
    return true;
  },

  addComment: (ticketId, text, isInternal = false) => {
    const ticket = get().getById(ticketId);
    if (!ticket) return;
    const comment: TicketComment = {
      id: crypto.randomUUID(),
      author_user_id: 'current',
      text,
      created_at: new Date().toISOString(),
      is_internal: isInternal,
    };
    get().update(ticketId, { komentare: [...ticket.komentare, comment] });
  },

  getAllowedTransitions: (status) => ALLOWED_TRANSITIONS[status] || [],

  getStats: () => {
    const { tickets } = get();
    const closedSet = new Set<TicketStatus>(['resolved', 'closed', 'cancelled']);
    const open = tickets.filter(t => !closedSet.has(t.status)).length;
    const today = tickets.filter(t => t.created_date === new Date().toISOString().slice(0, 10)).length;
    const critical = tickets.filter(t => t.priority === 'critical' && !closedSet.has(t.status)).length;
    return { total: tickets.length, open, today, critical };
  },
}));
