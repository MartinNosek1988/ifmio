import { useParams } from 'react-router-dom'
import { useAssembly } from '../lib/assemblyApi'
import { useVotingSocket } from '../lib/useVotingSocket'
import { LoadingSpinner } from '../../../shared/components'
import { LiveTallyBars } from './LiveTallyBars'
import { LiveVoteLog } from './LiveVoteLog'
import { LiveResultReveal } from './LiveResultReveal'
import { LiveQuorumBar } from './LiveQuorumBar'
import { LiveWaitingState } from './LiveWaitingState'
import { LivePendingKeypads } from './LivePendingKeypads'

export default function LiveDashboardPage() {
  const { assemblyId } = useParams()
  const { data: assembly, isLoading } = useAssembly(assemblyId!)
  const ws = useVotingSocket(assemblyId)

  if (isLoading || !assembly) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: 80 }}><LoadingSpinner /></div>
      </div>
    )
  }

  const totalS = ws.quorum?.totalShares ?? Number(assembly.totalShares ?? 0)
  const presentS = ws.quorum?.presentShares ?? Number(assembly.presentShares ?? 0)
  const isVoting = ws.votingState?.votingOpen ?? false
  const hasResult = !!ws.lastResult

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: ws.isConnected ? '#22c55e' : '#ef4444',
              animation: ws.isConnected ? 'pulse 2s infinite' : undefined,
            }} />
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
              ŽIVÉ HLASOVÁNÍ
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginTop: 4 }}>
            {assembly.property?.name}
          </div>
        </div>
        <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontSize: '.9rem' }}>
          Shromáždění #{assembly.assemblyNumber}
          <div style={{ fontSize: '.8rem' }}>{ws.isConnected ? '🟢 Online' : '🔴 Offline'}</div>
        </div>
      </div>

      {/* Quorum bar */}
      <div style={{ padding: '16px 32px' }}>
        <LiveQuorumBar presentShares={presentS} totalShares={totalS} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Current item title */}
        {ws.votingState && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
              {ws.votingState.itemTitle}
            </div>
          </div>
        )}

        {/* State-based content */}
        {hasResult && ws.lastResult ? (
          <LiveResultReveal
            result={ws.lastResult.result}
            votesFor={ws.lastResult.votesFor}
            votesAgainst={ws.lastResult.votesAgainst}
            votesAbstain={ws.lastResult.votesAbstain}
          />
        ) : isVoting && ws.tally ? (
          <LiveTallyBars
            votesFor={ws.tally.votesFor}
            votesAgainst={ws.tally.votesAgainst}
            votesAbstain={ws.tally.votesAbstain}
            totalVoted={ws.tally.totalVoted}
            totalEligible={ws.tally.totalEligible}
          />
        ) : (
          <LiveWaitingState />
        )}

        {/* Pending keypads */}
        {isVoting && ws.pendingKeypads && (
          <LivePendingKeypads
            pending={ws.pendingKeypads.pending}
            totalKeypads={ws.pendingKeypads.totalKeypads}
            votedKeypads={ws.pendingKeypads.votedKeypads}
          />
        )}

        {/* Vote log */}
        {ws.voteLog.length > 0 && (
          <LiveVoteLog votes={ws.voteLog} />
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
}
