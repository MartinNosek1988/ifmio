import { apiClient } from '../../../core/api/client';

export interface ApiPurchaseOrder {
  id: string;
  tenantId: string;
  propertyId?: string;
  number: string;
  supplierId?: string;
  supplierName: string;
  supplierIco?: string;
  supplierDic?: string;
  supplierEmail?: string;
  sourceType?: 'work_order' | 'helpdesk' | 'manual';
  sourceId?: string;
  description?: string;
  deliveryAddress?: string;
  amountBase: number;
  vatRate?: number;
  vatAmount?: number;
  amountTotal: number;
  currency: string;
  issueDate: string;
  deliveryDate?: string;
  validUntil?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'delivered' | 'cancelled';
  matchStatus: 'unmatched' | 'partial' | 'matched';
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  createdBy: string;
  items: ApiPurchaseOrderItem[];
  invoices?: { id: string; number: string; amountTotal: number; approvalStatus: string }[];
  property?: { id: string; name: string };
  supplier?: { id: string; displayName: string; ic?: string; email?: string };
}

export interface ApiPurchaseOrderItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  catalogCode?: string;
  position: number;
}

export interface POStats {
  totalOpen: number;
  pendingApproval: number;
  awaitingInvoice: number;
  matched: number;
  totalAmount: number;
}

export interface POListResponse {
  items: ApiPurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const purchaseOrdersApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<POListResponse>('/purchase-orders', { params }).then(r => r.data),
  stats: () =>
    apiClient.get<POStats>('/purchase-orders/stats').then(r => r.data),
  getById: (id: string) =>
    apiClient.get<ApiPurchaseOrder>(`/purchase-orders/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post<ApiPurchaseOrder>('/purchase-orders', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put<ApiPurchaseOrder>(`/purchase-orders/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/purchase-orders/${id}`),
  submit: (id: string) =>
    apiClient.post<ApiPurchaseOrder>(`/purchase-orders/${id}/submit`).then(r => r.data),
  approve: (id: string) =>
    apiClient.post<ApiPurchaseOrder>(`/purchase-orders/${id}/approve`).then(r => r.data),
  send: (id: string) =>
    apiClient.post<ApiPurchaseOrder>(`/purchase-orders/${id}/send`).then(r => r.data),
  cancel: (id: string, reason: string) =>
    apiClient.post(`/purchase-orders/${id}/cancel`, { reason }).then(r => r.data),
  matchInvoice: (id: string, invoiceId: string) =>
    apiClient.post(`/purchase-orders/${id}/match-invoice`, { invoiceId }).then(r => r.data),
  unmatchInvoice: (id: string, invoiceId: string) =>
    apiClient.delete(`/purchase-orders/${id}/match-invoice/${invoiceId}`).then(r => r.data),
  createFromWorkOrder: (woId: string, data?: any) =>
    apiClient.post<ApiPurchaseOrder>(`/work-orders/${woId}/create-purchase-order`, data || {}).then(r => r.data),
  createFromTicket: (ticketId: string, data?: any) =>
    apiClient.post<ApiPurchaseOrder>(`/helpdesk/${ticketId}/create-purchase-order`, data || {}).then(r => r.data),
};
