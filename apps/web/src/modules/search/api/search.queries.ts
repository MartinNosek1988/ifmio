import { useQuery } from '@tanstack/react-query';
import { searchApi } from './search.api';

export function useSearch(query: string, limit = 20) {
  return useQuery({
    queryKey: ['search', query, limit],
    queryFn: () => searchApi.search(query, limit),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });
}
