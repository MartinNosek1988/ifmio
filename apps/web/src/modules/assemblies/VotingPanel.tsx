import { useState, useEffect } from 'react'
import { Badge, Button } from '../../shared/components'
import { useVotes, useRecordVotes, useEvaluateVote } from './lib/assemblyApi'
import {
  type AgendaItem, type Attendee, type VoteChoice,
  MAJORITY_LABELS, RESULT_LABELS, CHOICE_LABELS,
} from './lib/assemblyTypes'

interface Props {
  assemblyId: string
  item: AgendaItem
  attendees: Attendee[]
}

export default function VotingPanel({ assemblyId, item, attendees }: Props) {
  const { data: votes = [] } = useVotes(assemblyId, item.id)
  const recordMut = useRecordVotes()
  const evaluateMut = useEvaluateVote()
  const presentAttendees = attendees.filter(a => a.isPresent && !a.leftAt)

  const hasResult = !!item.result
  const [choices, setChoices] = useState<Record<string, VoteChoice>>({})
  const [revoting, setRevoting] = useState(false)

  // Initialize choices from existing votes
  useEffect(() => {
    const map: Record<string, VoteChoice> = {}
    for (const v of votes) map[v.attendeeId] = v.choice
    setChoices(map)
  }, [votes])

  const setAll = (choice: VoteChoice) => {
    const map: Record<string, VoteChoice> = {}
    for (const a of presentAttendees) map[a.id] = choice
    setChoices(map)
  }

  const handleSave = async () => {
    const voteData = presentAttendees
      .filter(a => choices[a.id])
      .map(a => ({ attendeeId: a.id, choice: choices[a.id] }))
    await recordMut.mutateAsync({ assemblyId, itemId: item.id, votes: voteData })
    await evaluateMut.mutateAsync({ assemblyId, itemId: item.id })
    setRevoting(false)
  }

  const showForm = !hasResult || revoting

  return (
    <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
          Bod č. {item.orderNumber}: {item.title}
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
          Většina: {MAJORITY_LABELS[item.majorityType]}
        </div>
        {item.description && (
          <div style={{ fontSize: '.85rem', marginTop: 6, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
            {item.description}
          </div>
        )}
      </div>

      {/* Result display */}
      {hasResult && !revoting && (
        <div>
          <div style={{
            padding: 16, borderRadius: 8, marginBottom: 16,
            background: item.result === 'SCHVALENO' ? 'rgba(34,197,94,.1)' : item.result === 'NESCHVALENO' ? 'rgba(239,68,68,.1)' : 'rgba(100,100,100,.1)',
            border: `1px solid ${item.result === 'SCHVALENO' ? '#22c55e' : item.result === 'NESCHVALENO' ? '#ef4444' : 'var(--border)'}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6, color: item.result === 'SCHVALENO' ? '#22c55e' : item.result === 'NESCHVALENO' ? '#ef4444' : 'var(--text-muted)' }}>
              {item.result === 'SCHVALENO' ? '✓ ' : item.result === 'NESCHVALENO' ? '✗ ' : ''}{RESULT_LABELS[item.result!]}
            </div>
            <div style={{ fontSize: '.85rem' }}>
              Pro: {formatSharePct(item.votesFor)} | Proti: {formatSharePct(item.votesAgainst)} | Zdržel se: {formatSharePct(item.votesAbstain)}
            </div>
          </div>

          {/* Vote breakdown table */}
          <div style={{ fontSize: '.85rem', marginBottom: 12, fontWeight: 600 }}>Podrobný rozpis:</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)' }}>Jméno</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>Podíl</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>Hlas</th>
              </tr>
            </thead>
            <tbody>
              {votes.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>{v.attendee?.name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {(Number(v.shareWeight) * 100).toFixed(4)} %
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <Badge variant={v.choice === 'ANO' ? 'green' : v.choice === 'NE' ? 'red' : 'muted'}>
                      {CHOICE_LABELS[v.choice]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Button size="sm" onClick={() => setRevoting(true)}>Přehlasovat</Button>
          </div>
        </div>
      )}

      {/* Vote recording form */}
      {showForm && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <Button size="sm" onClick={() => setAll('ANO')}>Všichni ANO</Button>
            <Button size="sm" onClick={() => setAll('NE')}>Všichni NE</Button>
            <Button size="sm" onClick={() => setAll('ZDRZET')}>Všichni ZDRŽET</Button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)' }}>Jméno</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>Podíl</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#22c55e' }}>ANO</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#ef4444' }}>NE</th>
                <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>ZDRŽET</th>
              </tr>
            </thead>
            <tbody>
              {presentAttendees.map(att => (
                <tr key={att.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}>{att.name}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {(Number(att.totalShare) * 100).toFixed(4)} %
                  </td>
                  {(['ANO', 'NE', 'ZDRZET'] as VoteChoice[]).map(ch => (
                    <td key={ch} style={{ padding: '8px', textAlign: 'center' }}>
                      <input
                        type="radio"
                        name={`vote-${att.id}`}
                        checked={choices[att.id] === ch}
                        onChange={() => setChoices(c => ({ ...c, [att.id]: ch }))}
                        style={{ cursor: 'pointer', width: 18, height: 18 }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {revoting && <Button onClick={() => setRevoting(false)}>Zrušit</Button>}
            <Button variant="primary" onClick={handleSave} disabled={recordMut.isPending || evaluateMut.isPending}>
              {recordMut.isPending || evaluateMut.isPending ? 'Ukládám...' : 'Uložit hlasování'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatSharePct(val: string | null | undefined): string {
  if (!val) return '0.00 %'
  return (Number(val) * 100).toFixed(2) + ' %'
}
