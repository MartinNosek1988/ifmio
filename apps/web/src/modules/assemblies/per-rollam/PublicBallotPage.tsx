import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePublicBallot, useSubmitPublicBallot } from '../lib/perRollamApi'
import { MAJORITY_LABELS, CHOICE_LABELS, type VoteChoice } from '../lib/assemblyTypes'
import { LoadingSpinner } from '../../../shared/components'

export default function PublicBallotPage() {
  const { accessToken } = useParams()
  const { data: ballot, isLoading, error } = usePublicBallot(accessToken ?? '')
  const submitMut = useSubmitPublicBallot()
  const [choices, setChoices] = useState<Record<string, VoteChoice>>({})
  const [submitted, setSubmitted] = useState(false)

  const wrap: React.CSSProperties = {
    maxWidth: 640, margin: '0 auto', padding: '24px 16px', minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  if (isLoading) return <div style={wrap}><div style={{ textAlign: 'center', padding: 60 }}><LoadingSpinner /></div></div>

  if (error || !ballot) {
    return (
      <div style={wrap}>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: '0 0 8px' }}>Neplatný odkaz</h2>
          <p style={{ color: '#6b7280' }}>Tento hlasovací lístek není platný nebo vypršel.</p>
        </div>
      </div>
    )
  }

  const voting = ballot.voting
  const items = voting?.items ?? []
  const isExpired = ballot.tokenExpiresAt && new Date() > new Date(ballot.tokenExpiresAt)
  const isAlreadySubmitted = ballot.status !== 'PENDING'
  const isVotingActive = voting?.status === 'PUBLISHED'

  // Success state after submit
  if (submitted) {
    return (
      <div style={wrap}>
        <Header propertyName={voting?.property?.name} />
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: '0 0 8px', color: '#22c55e' }}>Děkujeme za vaše hlasování!</h2>
          <p style={{ color: '#6b7280' }}>Vaše hlasy byly úspěšně zaznamenány.</p>
        </div>
      </div>
    )
  }

  // Already submitted
  if (isAlreadySubmitted) {
    return (
      <div style={wrap}>
        <Header propertyName={voting?.property?.name} />
        <div style={{ background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 600, color: '#166534' }}>Vaše hlasy byly zaznamenány</div>
          <div style={{ color: '#6b7280', fontSize: '.85rem', marginTop: 4 }}>
            {ballot.submittedAt ? `Odevzdáno: ${new Date(ballot.submittedAt).toLocaleString('cs-CZ')}` : ''}
          </div>
        </div>
        {/* Show submitted choices read-only */}
        {ballot.responses?.map((r: any) => {
          const item = items.find((i: any) => i.id === r.itemId)
          return item ? (
            <div key={r.id} style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{item.orderNumber}. {item.title}</div>
              <div style={{ marginTop: 4, fontWeight: 600, color: r.choice === 'ANO' ? '#22c55e' : r.choice === 'NE' ? '#ef4444' : '#6b7280' }}>
                Váš hlas: {CHOICE_LABELS[r.choice as VoteChoice]}
              </div>
            </div>
          ) : null
        })}
      </div>
    )
  }

  // Expired
  if (isExpired || !isVotingActive) {
    return (
      <div style={wrap}>
        <Header propertyName={voting?.property?.name} />
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h2 style={{ margin: '0 0 8px' }}>Termín pro hlasování vypršel</h2>
          <p style={{ color: '#6b7280' }}>
            Termín: {voting?.deadline ? new Date(voting.deadline).toLocaleDateString('cs-CZ') : '—'}
          </p>
        </div>
      </div>
    )
  }

  // Active voting form
  const allFilled = items.every((i: any) => choices[i.id])

  const handleSubmit = () => {
    if (!allFilled) return
    if (!confirm('Opravdu chcete odeslat hlasování? Hlasy nelze dodatečně změnit.')) return
    const votes = items.map((i: any) => ({ itemId: i.id, choice: choices[i.id] }))
    submitMut.mutate({ accessToken: accessToken!, votes }, { onSuccess: () => setSubmitted(true) })
  }

  return (
    <div style={wrap}>
      <Header propertyName={voting?.property?.name} />

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px' }}>{voting?.title}</h2>
        {voting?.description && <p style={{ color: '#6b7280', fontSize: '.9rem', margin: '8px 0' }}>{voting.description}</p>}
      </div>

      {/* Voter info */}
      <div style={{ background: '#f3f4f6', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: '.9rem' }}>
        <div style={{ fontWeight: 600 }}>Hlasujete za:</div>
        <div style={{ marginTop: 4 }}>
          {ballot.name} • Jednotky: {ballot.unitIds?.join(', ') || '—'} • Podíl: {(Number(ballot.totalShare) * 100).toFixed(4)} %
        </div>
        <div style={{ marginTop: 4, color: '#6b7280' }}>
          Termín: do {voting?.deadline ? new Date(voting.deadline).toLocaleDateString('cs-CZ') : '—'}
        </div>
      </div>

      {/* Voting items */}
      {items.map((item: any) => (
        <div key={item.id} style={{ marginBottom: 20, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
            {item.orderNumber}. {item.title}
          </div>
          {item.description && <p style={{ color: '#6b7280', fontSize: '.85rem', margin: '4px 0 8px', lineHeight: 1.5 }}>{item.description}</p>}
          <div style={{ fontSize: '.8rem', color: '#9ca3af', marginBottom: 12 }}>
            Požadovaná většina: {MAJORITY_LABELS[item.majorityType as keyof typeof MAJORITY_LABELS] ?? item.majorityType}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(['ANO', 'NE', 'ZDRZET'] as VoteChoice[]).map(ch => {
              const selected = choices[item.id] === ch
              const colors = ch === 'ANO' ? { bg: '#dcfce7', border: '#22c55e', text: '#166534' }
                : ch === 'NE' ? { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' }
                : { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }

              return (
                <button key={ch} onClick={() => setChoices(c => ({ ...c, [item.id]: ch }))}
                  style={{
                    flex: 1, minWidth: 90, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    fontWeight: 600, fontSize: '.95rem', textAlign: 'center',
                    border: `2px solid ${selected ? colors.border : '#e5e7eb'}`,
                    background: selected ? colors.bg : '#fff',
                    color: selected ? colors.text : '#6b7280',
                    transition: 'all 0.15s',
                  }}>
                  {CHOICE_LABELS[ch]}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Submit */}
      <button onClick={handleSubmit} disabled={!allFilled || submitMut.isPending}
        style={{
          width: '100%', padding: '16px 24px', borderRadius: 12, cursor: allFilled ? 'pointer' : 'not-allowed',
          border: 'none', fontWeight: 700, fontSize: '1.05rem',
          background: allFilled ? '#6366f1' : '#d1d5db',
          color: allFilled ? '#fff' : '#9ca3af',
          marginTop: 8, transition: 'background 0.2s',
        }}>
        {submitMut.isPending ? 'Odesílám...' : 'Odeslat hlasování'}
      </button>

      {submitMut.isError && (
        <div style={{ color: '#ef4444', fontSize: '.85rem', marginTop: 8, textAlign: 'center' }}>
          Nepodařilo se odeslat hlasování. Zkuste to znovu.
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 32, padding: 16, color: '#9ca3af', fontSize: '.75rem' }}>
        Powered by ifmio • Grand Facility
      </div>
    </div>
  )
}

function Header({ propertyName }: { propertyName?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#6366f1', marginBottom: 4 }}>ifmio</div>
      <div style={{ fontSize: '.9rem', color: '#6b7280' }}>Hlasování per rollam</div>
      {propertyName && <div style={{ fontSize: '.85rem', color: '#9ca3af', marginTop: 2 }}>{propertyName}</div>}
    </div>
  )
}
