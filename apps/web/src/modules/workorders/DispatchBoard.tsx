import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Badge, LoadingState } from '../../shared/components'
import type { WorkOrderSchedule } from '@ifmio/shared-types'

const PRIORITY_COLORS: Record<string, string> = {
  nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  nova: 'Nový', v_reseni: 'V řešení', vyresena: 'Vyřešený', uzavrena: 'Uzavřený',
}

function getLocalDate() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function DispatchBoard() {
  const [date, setDate] = useState(getLocalDate)

  const { data: schedule = [], isLoading } = useQuery<WorkOrderSchedule[]>({
    queryKey: ['workorders', 'dispatch', date],
    queryFn: () => apiClient.get('/work-orders/dispatch', { params: { date } }).then(r => r.data),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Dispečink</h2>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }} />
      </div>

      {isLoading ? <LoadingState /> : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(schedule.length || 1, 4)}, 1fr)`, gap: 16 }}>
          {schedule.map(tech => (
            <div key={tech.userId} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--teal-50, #E6F5F3)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700 }}>
                  {tech.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                {tech.userName}
                <Badge variant="muted">{tech.workOrders.length}</Badge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tech.workOrders.map(wo => (
                  <div key={wo.id} style={{ padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, border: '1px solid var(--border)', fontSize: '.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{wo.scheduledTimeFrom ?? '—'}</span>
                      <Badge variant={PRIORITY_COLORS[wo.priority] as any}>{wo.priority}</Badge>
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>{wo.title}</div>
                    {wo.property && <div style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>{wo.property.name} · {wo.property.address}</div>}
                    <Badge variant={wo.status === 'vyresena' ? 'green' : wo.status === 'v_reseni' ? 'blue' : 'muted'}>
                      {STATUS_LABELS[wo.status] ?? wo.status}
                    </Badge>
                  </div>
                ))}
                {tech.workOrders.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '.82rem', textAlign: 'center', padding: 16 }}>Žádné úkoly</div>
                )}
              </div>
            </div>
          ))}
          {schedule.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
              Na {date} nejsou naplánované žádné výjezdy
            </div>
          )}
        </div>
      )}
    </div>
  )
}
