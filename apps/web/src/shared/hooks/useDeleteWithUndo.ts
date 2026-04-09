import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useToast } from '../components/toast/Toast'

export function useDeleteWithUndo({
  deleteFn,
  undoFn,
  invalidateKey,
  entityName,
}: {
  deleteFn: (id: string) => Promise<unknown>
  undoFn?: (id: string) => Promise<unknown>
  invalidateKey: QueryKey
  entityName: string
}) {
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: deleteFn,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: invalidateKey })
      if (undoFn) {
        toast.show({
          message: `${entityName} smazán`,
          type: 'success',
          duration: 10000,
          action: {
            label: 'Vrátit zpět',
            onClick: async () => {
              try {
                await undoFn(id)
                qc.invalidateQueries({ queryKey: invalidateKey })
                toast.success('Obnoveno')
              } catch {
                toast.error('Obnovení selhalo')
              }
            },
          },
        })
      } else {
        toast.success(`${entityName} smazán`)
      }
    },
    onError: () => toast.error(`Smazání selhalo`),
  })
}
