import { apiClient } from '../../../core/api/client';

export interface SearchResultItem {
  id: string;
  type: 'property' | 'unit' | 'resident' | 'ticket' | 'document';
  title: string;
  subtitle?: string;
  url: string;
}

export interface SearchResult {
  query: string;
  total: number;
  results: SearchResultItem[];
}

export const searchApi = {
  search: async (q: string, limit = 20): Promise<SearchResult> => {
    const { data } = await apiClient.get<SearchResult>('/search', {
      params: { q, limit },
    });
    return data;
  },
};
