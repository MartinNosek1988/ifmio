import { useState } from 'react'
import { Modal, Button } from '../../../shared/components'
import { useManualBallotEntry } from '../lib/perRollamApi'
import { MAJORITY_LABELS, CHOICE_LABELS, type VoteChoice } from '../lib/assemblyTypes'
import type { PerRollamBallot, PerRollamItem } from '../lib/perRollamTypes'

interface Props {
  votingId: string
  ballot: PerRollamBallot
  items: PerRollamItem[]
  onClose: () => void
}

export default function BallotManualEntryModal({ votingId, ballot, items, onClose }: Props) {
  const manualMut = useManualBallotEntry()
  const [choices, setChoices] = useState<Record<string, VoteChoice>>({})

  const handleSave = () => {
    const votes = items.map(item => ({
      itemId: item.id,
      choice: choices[item.id] ?? 'ZDRZET',
    }))
    manualMut.mutate({ votingId, ballotId: ballot.id, votes }, { onSuccess: () => onClose() })
  }

  const allFilled = items.every(item => choices[item.id])

  return (
    <Modal open onClose={onClose} title="Ruční zadání hlasů" subtitle={ballot.name}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={handleSave} disabled={manualMut.isPending || !allFilled}>
          {manualMut.isPending ? 'Ukládám...' : 'Uložit'}
        </Button>
      </div>}>
      <div style={{ marginBottom: 12, fontSize: '.85rem', color: 'var(--text-muted)' }}>
        Jednotky: {ballot.unitIds.join(', ') || '—'} • Podíl: {(Number(ballot.totalShare) * 100).toFixed(4)} %
      </div>

      {items.map(item => (
        <div key={item.id} style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 4 }}>
            {item.orderNumber}. {item.title}
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            {MAJORITY_LABELS[item.majorityType]}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {(['ANO', 'NE', 'ZDRZET'] as VoteChoice[]).map(ch => (
              <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '.9rem' }}>
                <input type="radio" name={`manual-${item.id}`} checked={choices[item.id] === ch}
                  onChange={() => setChoices(c => ({ ...c, [item.id]: ch }))}
                  style={{ width: 18, height: 18 }} />
                {CHOICE_LABELS[ch]}
              </label>
            ))}
          </div>
        </div>
      ))}
    </Modal>
  )
}
