import { useState } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { Badge, Button, Modal } from '../../shared/components'
import { useAttendees, usePopulateAttendees, useUpdateAttendee } from './lib/assemblyApi'
import { QuorumBar } from './QuorumBar'
import type { Assembly, Attendee } from './lib/assemblyTypes'

interface Props {
  assembly: Assembly
}

export default function AttendeeRegistration({ assembly }: Props) {
  const { data: attendees = [] } = useAttendees(assembly.id)
  const populateMut = usePopulateAttendees()
  const updateMut = useUpdateAttendee()
  const [addManual, setAddManual] = useState(false)

  const presentCount = attendees.filter(a => a.isPresent && !a.leftAt).length
  const totalShares = Number(assembly.totalShares ?? 0)
  const presentShares = attendees
    .filter(a => a.isPresent && !a.leftAt)
    .reduce((sum, a) => sum + Number(a.totalShare), 0)

  const togglePresent = (att: Attendee) => {
    updateMut.mutate({
      assemblyId: assembly.id,
      attendeeId: att.id,
      data: { isPresent: !att.isPresent },
    })
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: '.9rem' }}>
          <span style={{ fontWeight: 600 }}>Přítomno: {presentCount}/{attendees.length} vlastníků</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
            ({totalShares > 0 ? ((presentShares / totalShares) * 100).toFixed(2) : '0.00'} % podílů)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" icon={<Users size={14} />}
            onClick={() => populateMut.mutate(assembly.id)}
            disabled={populateMut.isPending}>
            {populateMut.isPending ? 'Načítám...' : 'Načíst vlastníky'}
          </Button>
          <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setAddManual(true)}>
            Přidat účastníka
          </Button>
        </div>
      </div>

      {/* Quorum bar */}
      <QuorumBar presentShares={presentShares} totalShares={totalShares} />

      {/* Attendee table */}
      {attendees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Žádní účastníci. Klikněte na „Načíst vlastníky" pro import z evidence.
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '8px', textAlign: 'center', width: 40 }}>✓</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Jméno</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Jednotky</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Podíl</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Plná moc</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Poznámky</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map(att => (
                <tr key={att.id} style={{ borderBottom: '1px solid var(--border)', opacity: att.leftAt ? 0.4 : 1 }}>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={att.isPresent && !att.leftAt}
                      onChange={() => togglePresent(att)}
                      disabled={updateMut.isPending}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '8px', fontWeight: 500 }}>{att.name}</td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '.8rem' }}>
                    {att.unitIds.length > 0 ? att.unitIds.join(', ').slice(0, 30) : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {(Number(att.totalShare) * 100).toFixed(4)} %
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {att.hasPowerOfAttorney && (
                      <Badge variant="purple">PM: {att.powerOfAttorneyFrom ?? '?'}</Badge>
                    )}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '.8rem' }}>
                    {att.notes ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual add modal placeholder */}
      {addManual && (
        <Modal open onClose={() => setAddManual(false)} title="Přidat účastníka"
          footer={<Button onClick={() => setAddManual(false)}>Zavřít</Button>}>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
            Pro ruční přidání účastníka použijte API endpoint POST /assemblies/:id/attendees.
            UI formulář bude doplněn v dalších fázích.
          </p>
        </Modal>
      )}
    </div>
  )
}
