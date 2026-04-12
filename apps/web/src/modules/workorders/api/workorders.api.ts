import { apiClient } from '../../../core/api/client';

export type WOStatus = 'nova' | 'v_reseni' | 'vyresena' | 'uzavrena' | 'zrusena';
export type WOPriority = 'nizka' | 'normalni' | 'vysoka' | 'kriticka';

export interface ApiUser {
  id: string;
  name: string;
  email?: string;
}

export interface ApiWorkOrderComment {
  id: string;
  workOrderId: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface ApiWorkOrder {
  id: string;
  tenantId: string;
  propertyId: string | null;
  unitId: string | null;
  assetId: string | null;
  helpdeskTicketId: string | null;
  title: string;
  description: string | null;
  workType: string;
  priority: WOPriority;
  status: WOStatus;
  assignee: string | null;
  requester: string | null;
  assigneeUserId: string | null;
  requesterUserId: string | null;
  dispatcherUserId: string | null;
  deadline: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  laborCost: number | null;
  materialCost: number | null;
  totalCost: number | null;
  note: string | null;
  workSummary: string | null;
  findings: string | null;
  recommendation: string | null;
  requirePhoto: boolean;
  requireHours: boolean;
  requireSummary: boolean;
  requireProtocol: boolean;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string; address?: string } | null;
  unit?: { id: string; name: string; area?: number; floor?: number } | null;
  asset?: { id: string; name: string } | null;
  helpdeskTicket?: { id: string; number: number; title: string; status: string } | null;
  assigneeUser?: ApiUser | null;
  requesterUser?: ApiUser | null;
  dispatcherUser?: ApiUser | null;
  comments: ApiWorkOrderComment[];
}

export interface WOStats {
  total: number;
  open: number;
  completedToday: number;
  overdue: number;
}

export interface CreateWorkOrderDto {
  title: string;
  description?: string;
  workType?: string;
  priority?: string;
  propertyId?: string;
  unitId?: string;
  assetId?: string;
  helpdeskTicketId?: string;
  assignee?: string;
  requester?: string;
  assigneeUserId?: string;
  requesterUserId?: string;
  dispatcherUserId?: string;
  deadline?: string;
  estimatedHours?: number;
  laborCost?: number;
  materialCost?: number;
  note?: string;
}

export interface CompletionStatus {
  canComplete: boolean;
  violations: string[];
  requirements: {
    requirePhoto: boolean;
    requireHours: boolean;
    requireSummary: boolean;
    requireProtocol: boolean;
  };
}

export interface UpdateWorkOrderDto extends Partial<CreateWorkOrderDto> {
  workSummary?: string;
  findings?: string;
  recommendation?: string;
  actualHours?: number;
}

export interface CreateFromTicketDto {
  title?: string;
  description?: string;
  priority?: string;
  assigneeUserId?: string;
  dispatcherUserId?: string;
  deadline?: string;
  note?: string;
}

export const workOrdersApi = {
  list: async (params?: { status?: string; priority?: string; propertyId?: string; search?: string }) => {
    const { data } = await apiClient.get<ApiWorkOrder[]>('/work-orders', { params });
    return data;
  },

  stats: async (propertyId?: string) => {
    const { data } = await apiClient.get<WOStats>('/work-orders/stats', { params: propertyId ? { propertyId } : undefined });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiWorkOrder>(`/work-orders/${id}`);
    return data;
  },

  completionStatus: async (id: string) => {
    const { data } = await apiClient.get<CompletionStatus>(`/work-orders/${id}/completion-status`);
    return data;
  },

  create: async (dto: CreateWorkOrderDto) => {
    const { data } = await apiClient.post<ApiWorkOrder>('/work-orders', dto);
    return data;
  },

  update: async (id: string, dto: UpdateWorkOrderDto) => {
    const { data } = await apiClient.put<ApiWorkOrder>(`/work-orders/${id}`, dto);
    return data;
  },

  changeStatus: async (id: string, status: string) => {
    const { data } = await apiClient.put<ApiWorkOrder>(`/work-orders/${id}/status`, { status });
    return data;
  },

  addComment: async (id: string, text: string) => {
    const { data } = await apiClient.post<ApiWorkOrderComment>(`/work-orders/${id}/comments`, { text });
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/work-orders/${id}`);
    return data;
  },

  createFromTicket: async (ticketId: string, dto: CreateFromTicketDto) => {
    const { data } = await apiClient.post<ApiWorkOrder>(`/helpdesk/${ticketId}/work-orders`, dto);
    return data;
  },

  listForTicket: async (ticketId: string) => {
    const { data } = await apiClient.get<ApiWorkOrder[]>(`/helpdesk/${ticketId}/work-orders`);
    return data;
  },
};
