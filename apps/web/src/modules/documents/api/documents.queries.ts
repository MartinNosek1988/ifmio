import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from './documents.api'

export const documentKeys = {
  list: (p?: any) => ['documents', 'list', p] as const,
}

export function useDocuments(params?: any) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn:  () => documentsApi.list(params),
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: any }) =>
      documentsApi.upload(file, meta),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess:  () =>
      qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}
