import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth/auth.store'
import { useMyUnits, useMyPrescriptions, useMyTickets, useMyKonto, useMyVotings, useMyESignRequests } from './api/portal.queries'
import { portalApi } from './api/portal.api'
import { boardMessagesApi, type BoardMessage } from '../board-messages/api'
import { Building2, FileText, Headphones, Wallet, Plus, Gauge, FolderOpen, Vote, FileSignature, MessageSquare, Megaphone } from 'lucide-react'
import { LoadingSpinner } from '../../shared/components'

export default function PortalPage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const { data: units, isLoading: unitsLoading } = useMyUnits()
  const { data: prescriptions } = useMyPrescriptions()
  const { data: tickets } = useMyTickets()
  const { data: konto } = useMyKonto()
  const { data: votings } = useMyVotings()
  const { data: esignReqs } = useMyESignRequests()
  const pendingVotings = (votings ?? []).filter((v: any) => !v.hasResponded)
  const pendingESign = (esignReqs ?? []).filter((r: any) => r.signatoryStatus === 'pending' || r.signatoryStatus === 'viewed')
  const { data: unreadCount } = useQuery({
    queryKey: ['portal', 'messages', 'unread'],
    queryFn: portalApi.getUnreadMessageCount,
  })
  const { data: boardFeed = [] } = useQuery({
    queryKey: ['portal', 'board-messages'],
    queryFn: boardMessagesApi.portalFeed,
  })
  const latestBoardMessages = (boardFeed as BoardMessage[]).slice(0, 3)

  const totalMonthly = (prescriptions ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
  const openTickets = (tickets ?? []).filter((t: any) => t.status === 'open' || t.status === 'in_progress').length
  const balance = konto?.totalBalance ?? 0
  const propertyNames = [...new Set((units ?? []).map((u: any) => u.property?.name).filter(Boolean))].join(', ')

  if (unitsLoading) return <LoadingSpinner />

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s',
  }

  return (
    <div data-testid="portal-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          Dobrý den{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-muted" style={{ marginTop: 4, fontSize: '.9rem' }}>Vítejte v klientském portálu</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle} onClick={() => navigate('/portal/units')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Building2 size={20} style={{ color: 'var(--primary, #6366f1)' }} />
            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Moje jednotky</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{(units ?? []).length}</div>
          {propertyNames && <div className="text-muted" style={{ fontSize: '.78rem', marginTop: 4 }}>{propertyNames}</div>}
        </div>

        <div style={cardStyle} onClick={() => navigate('/portal/prescriptions')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <FileText size={20} style={{ color: 'var(--accent-blue, #3b82f6)' }} />
            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Předpisy plateb</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalMonthly.toLocaleString('cs-CZ')} Kč</div>
          <div className="text-muted" style={{ fontSize: '.78rem', marginTop: 4 }}>měsíčně</div>
        </div>

        <div style={cardStyle} onClick={() => navigate('/portal/tickets')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Headphones size={20} style={{ color: 'var(--accent-orange, #f59e0b)' }} />
            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Otevřené požadavky</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{openTickets}</div>
        </div>

        {(unreadCount ?? 0) > 0 && (
          <div style={cardStyle} onClick={() => navigate('/portal/messages')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <MessageSquare size={20} style={{ color: 'var(--primary, #6366f1)' }} />
              <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Nepřečtené zprávy</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{unreadCount}</div>
          </div>
        )}

        <div style={cardStyle} onClick={() => navigate('/portal/konto')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Wallet size={20} style={{ color: balance >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }} />
            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Konto</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: balance >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-muted" style={{ fontSize: '.78rem', marginTop: 4 }}>{balance >= 0 ? 'Přeplatek' : 'Nedoplatek'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn--primary" onClick={() => navigate('/portal/tickets')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Nový požadavek
        </button>
        <button className="btn" onClick={() => navigate('/portal/meters')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={15} /> Zadat odečet
        </button>
        <button className="btn" onClick={() => navigate('/portal/documents')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderOpen size={15} /> Dokumenty
        </button>
      </div>

      {latestBoardMessages.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Nastenka</h2>
            <button className="btn btn--sm" onClick={() => navigate('/portal/nastenka')} style={{ fontSize: '.78rem' }}>
              Zobrazit vse
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {latestBoardMessages.map(msg => (
              <div
                key={msg.id}
                onClick={() => navigate('/portal/nastenka')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                  background: 'var(--surface)', border: `1px solid ${!msg.isRead ? 'var(--primary, #6366f1)' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', textDecoration: 'none', color: 'var(--text)',
                }}
              >
                <Megaphone size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: msg.isRead ? 400 : 600, fontSize: '0.9rem' }}>{msg.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(msg.createdAt).toLocaleDateString('cs-CZ')}
                    {msg.author?.name && ` · ${msg.author.name}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(pendingVotings.length > 0 || pendingESign.length > 0) && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>Čekající akce</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingVotings.map((v: any) => (
              <a key={v.ballotId} href={`/portal/voting`} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                textDecoration: 'none', color: 'var(--text)',
              }}>
                <Vote size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{v.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Hlasování · do {new Date(v.deadline).toLocaleDateString('cs-CZ')}</div>
                </div>
              </a>
            ))}
            {pendingESign.map((r: any) => (
              <a key={r.signatoryId} href={r.accessToken ? `/sign/${r.accessToken}` : '/portal/esign'} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                textDecoration: 'none', color: 'var(--text)',
              }}>
                <FileSignature size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.documentTitle}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Čeká na podpis · do {new Date(r.expiresAt).toLocaleDateString('cs-CZ')}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
