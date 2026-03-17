import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../shared/components'
import { apiClient } from '../../core/api/client'

interface ChannelStatus {
  channel: string
  label: string
  configured: boolean
}

export function ChannelStatusSection() {
  const { data: channels = [] } = useQuery<ChannelStatus[]>({
    queryKey: ['communication', 'channels'],
    queryFn: () => apiClient.get('/communication/channels').then(r => r.data),
  })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
      <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12, marginTop: 0 }}>Komunikační kanály</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {channels.map(ch => (
          <div key={ch.channel} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ch.configured ? 'var(--accent-green, #22c55e)' : 'var(--text-muted, #9ca3af)' }} />
            <span style={{ fontWeight: 500, minWidth: 140 }}>{ch.label}</span>
            <Badge variant={ch.configured ? 'green' : 'muted'}>
              {ch.configured ? 'Aktivní' : 'Nenastaveno'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
