import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState, ErrorState } from '../../shared/components'
import { useParty } from './api/parties.queries'

type Tab = 'general' | 'relations' | 'documents'

export default function PartyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: party, isLoading, error } = useParty(id!)
  const [tab, setTab] = useState<Tab>('general')

  if (isLoading) return <LoadingState />
  if (error || !party) return (
    <div>
      <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/parties')}>Zpět</Button>
      <ErrorState message="Subjekt nenalezen." />
    </div>
  )

  const displayName = (party.displayName ?? '').replace(/^SJM\s+/i, 'SJ ')
  const neuvedeno = <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>neuvedeno</span>
  const ownershipsCount = party._count?.principals ?? 0

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: 'Obecné' },
    { key: 'relations', label: `Vazby (${ownershipsCount})` },
    { key: 'documents', label: 'Doklady (0)' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8, fontSize: '.82rem', color: 'var(--text-muted)' }}>
        <button onClick={() => navigate('/parties')} style={{ background: 'none', border: 'none', color: 'var(--primary, #6366f1)', cursor: 'pointer', padding: 0, fontSize: '.82rem' }}>
          Adresář osob
        </button>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{displayName}</span>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <Button size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/parties')}>Zavřít</Button>
        <Button size="sm" icon={<Pencil size={13} />}>Upravit</Button>
        <Button size="sm" icon={<Trash2 size={13} />} style={{ color: 'var(--danger)' }}>Smazat</Button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{displayName}</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge variant={party.type === 'company' ? 'yellow' : party.type === 'hoa' ? 'purple' : 'blue'}>
            {party.type === 'company' ? 'Firma' : party.type === 'hoa' ? 'SVJ' : 'Osoba'}
          </Badge>
          {!party.isActive && <Badge variant="muted">Neaktivní</Badge>}
          {party.datumZaniku && <Badge variant="red">Zaniklý</Badge>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OBECNÉ TAB ──────────────────────────────── */}
      {tab === 'general' && (
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Left — address */}
          <div style={{ flex: 1 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Adresa — sídlo</div>
              <div style={{ fontSize: '.9rem', lineHeight: 1.8 }}>
                <div>{party.street || neuvedeno}</div>
                <div>{[party.postalCode, party.city].filter(Boolean).join(' ') || neuvedeno}</div>
                <div style={{ color: 'var(--text-muted)' }}>{party.countryCode === 'CZ' ? 'Česká republika' : party.countryCode === 'SK' ? 'Slovenská republika' : party.countryCode || 'Česká republika'}</div>
              </div>
            </div>
          </div>

          {/* Right — basic info */}
          <div style={{ flex: 1 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Základní údaje</div>
              {[
                { label: 'IČ', value: party.ic },
                { label: 'DIČ', value: party.dic },
                { label: 'E-mail', value: party.email },
                { label: 'Telefon', value: party.phone },
                { label: 'Web', value: party.website },
                { label: 'Dat. schránka', value: party.dataBoxId },
                { label: 'Bankovní účet', value: party.bankAccount ? `${party.bankAccount}${party.bankCode ? `/${party.bankCode}` : ''}` : null },
                { label: 'IBAN', value: party.iban },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
                  <span className="text-muted">{label}:</span>
                  <span>{value || neuvedeno}</span>
                </div>
              ))}
              {party.pravniForma && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '.85rem' }}>
                  <span className="text-muted">Právní forma:</span>
                  <span>{party.pravniForma}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VAZBY TAB ───────────────────────────────── */}
      {tab === 'relations' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          {party.principals && party.principals.length > 0 ? (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr>
                    {['Klient', 'Typ', 'Smluv'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {party.principals.map((pr: any) => (
                    <tr key={pr.id} onClick={() => navigate(`/principals/${pr.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{pr.displayName}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        <Badge variant="muted">{pr.type}</Badge>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{pr._count?.managementContracts ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Žádné vazby" description="Tento subjekt nemá žádné navázané klienty ani vlastnictví." />
          )}
        </div>
      )}

      {/* ── DOKLADY TAB ─────────────────────────────── */}
      {tab === 'documents' && <EmptyState title="Žádné doklady" description="K tomuto subjektu nejsou přiřazeny žádné doklady." />}
    </div>
  )
}
