import { apiClient } from '../../../core/api/client';

export interface ApiLeaseAgreement {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string | null;
  residentId: string | null;
  contractNumber: string | null;
  contractType: 'najem' | 'podnajem' | 'sluzebni' | 'jiny';
  status: 'aktivni' | 'ukoncena' | 'pozastavena' | 'pripravovana';
  monthlyRent: number;
  deposit: number | null;
  depositPaid: number | null;
  startDate: string;
  endDate: string | null;
  indefinite: boolean;
  noticePeriod: number;
  renewalType: 'pisemna' | 'automaticka' | 'nevztahuje';
  terminatedAt: string | null;
  terminationNote: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string; address?: string };
  unit?: { id: string; name: string; area?: number; floor?: number } | null;
  resident?: { id: string; firstName: string; lastName: string; email?: string; phone?: string } | null;
}

export interface ContractStats {
  total: number;
  active: number;
  terminated: number;
  expiringSoon: number;
  monthlyRentTotal: number;
}

export interface CreateContractDto {
  propertyId: string;
  unitId?: string;
  residentId?: string;
  contractType?: string;
  monthlyRent: number;
  deposit?: number;
  startDate: string;
  endDate?: string;
  indefinite?: boolean;
  noticePeriod?: number;
  renewalType?: string;
  note?: string;
}

export interface UpdateContractDto extends Partial<CreateContractDto> {
  status?: string;
}

export const contractsApi = {
  list: async (params?: { status?: string; propertyId?: string; search?: string }) => {
    const { data } = await apiClient.get<ApiLeaseAgreement[]>('/contracts', { params });
    return data;
  },

  stats: async () => {
    const { data } = await apiClient.get<ContractStats>('/contracts/stats');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiLeaseAgreement>(`/contracts/${id}`);
    return data;
  },

  create: async (dto: CreateContractDto) => {
    const { data } = await apiClient.post<ApiLeaseAgreement>('/contracts', dto);
    return data;
  },

  update: async (id: string, dto: UpdateContractDto) => {
    const { data } = await apiClient.put<ApiLeaseAgreement>(`/contracts/${id}`, dto);
    return data;
  },

  terminate: async (id: string, dto: { terminatedAt?: string; terminationNote?: string }) => {
    const { data } = await apiClient.put<ApiLeaseAgreement>(`/contracts/${id}/terminate`, dto);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/contracts/${id}`);
    return data;
  },
};
