import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Clock, CheckCircle2, Play } from 'lucide-react'
import { apiClient } from '../../core/api/client'
import { Badge, Button, LoadingState } from '../../shared/components'
import { useToast } from '../../shared/components/toast/Toast'
import SignatureModal from './SignatureModal'

const STATUS_LABELS: Record<string, string> = {
  nova: 'Nový', v_reseni: 'V řešení', vyresena: 'Vyřešený', uzavrena: 'Uzavřený',
}

function getLocalDate() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function MySchedulePage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [date] = useState(getLocalDate)
  const [signatureWoId, setSignatureWoId] = useState<string | null>(null)

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['workorders', 'my-schedule', date],
    queryFn: () => apiClient.get('/work-orders/my-schedule', { params: { date } }).then(r => r.data),
  })

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const payload = await new Promise<{ gpsStartLat?: number; gpsStartLng?: number }>((resolve) => {
        if (!navigator.geolocation) { resolve({}); return }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ gpsStartLat: pos.coords.latitude, gpsStartLng: pos.coords.longitude }),
          () => resolve({}),
          { timeout: 5000 },
        )
      })
      return apiClient.post(`/work-orders/${id}/start`, payload)
    },
    onSuccess: () => {
      toast.success('Příjezd zaznamenán')
      queryClient.invalidateQueries({ queryKey: ['workorders', 'my-schedule'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/work-orders/${id}/complete`, {}),
    onSuccess: () => {
      toast.success('Práce dokončena')
      queryClient.invalidateQueries({ queryKey: ['workorders', 'my-schedule'] })
    },
  })

  if (isLoading) return <LoadingState />

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', marginBottom: 16 }}>Můj plán — {new Date(date).toLocaleDateString('cs-CZ')}</h2>

      {workOrders.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>Dnes nemáte naplánované žádné úkoly.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workOrders.map((wo: any) => (
          <div key={wo.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{wo.title}</div>
                {wo.property && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '.82rem', marginTop: 4 }}>
                    <MapPin size={13} /> {wo.property.name} · {wo.property.address}, {wo.property.city}
                  </div>
                )}
                {wo.scheduledTimeFrom && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '.82rem', marginTop: 2 }}>
                    <Clock size={13} /> {wo.scheduledTimeFrom}{wo.scheduledTimeTo ? ` – ${wo.scheduledTimeTo}` : ''}
                  </div>
                )}
              </div>
              <Badge variant={wo.status === 'vyresena' ? 'green' : wo.status === 'v_reseni' ? 'blue' : 'muted'}>
                {STATUS_LABELS[wo.status] ?? wo.status}
              </Badge>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {wo.status === 'nova' && (
                <Button variant="primary" onClick={() => startMutation.mutate(wo.id)} disabled={startMutation.isPending} icon={<Play size={14} />}>
                  Přijel jsem
                </Button>
              )}
              {wo.status === 'v_reseni' && (
                <Button variant="primary" onClick={() => completeMutation.mutate(wo.id)} disabled={completeMutation.isPending} icon={<CheckCircle2 size={14} />}>
                  Dokončit
                </Button>
              )}
              {wo.status === 'vyresena' && !wo.signedAt && (
                <Button onClick={() => setSignatureWoId(wo.id)}>Podepsat</Button>
              )}
              {wo.signedAt && (
                <span style={{ fontSize: '.82rem', color: 'var(--color-finance-positive, #16a34a)' }}>✓ Podepsáno</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {signatureWoId && (
        <SignatureModal
          workOrderId={signatureWoId}
          onClose={() => setSignatureWoId(null)}
          onSuccess={() => {
            setSignatureWoId(null)
            queryClient.invalidateQueries({ queryKey: ['workorders', 'my-schedule'] })
          }}
        />
      )}
    </div>
  )
}
