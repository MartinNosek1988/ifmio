import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../core/auth/auth.store';

export function SuperAdminGuard() {
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['super-admin', 'check'],
    queryFn: () => apiClient.get('/super-admin/check').then((r) => r.data),
    staleTime: Infinity,
    retry: false,
    enabled: !isAuthLoading,
  });

  if (isAuthLoading || isLoading) return null;
  if (isError || data?.isSuperAdmin !== true) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
