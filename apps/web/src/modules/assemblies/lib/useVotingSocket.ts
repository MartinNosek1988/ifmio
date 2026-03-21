import { useEffect, useRef, useCallback, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

interface VoteEvent {
  keypadId: string; attendeeName: string; choice: string
  shareWeight: number; agendaItemId: string; timestamp: string
}

interface TallyEvent {
  agendaItemId: string; votesFor: number; votesAgainst: number; votesAbstain: number
  totalVoted: number; totalEligible: number
}

interface QuorumEvent {
  presentShares: number; totalShares: number; quorumPercentage: number; isQuorate: boolean
}

interface VotingStateEvent {
  agendaItemId: string; votingOpen: boolean; itemTitle: string
}

interface ResultEvent {
  agendaItemId: string; result: string
  votesFor: number; votesAgainst: number; votesAbstain: number
}

export function useVotingSocket(assemblyId: string | undefined) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastVote, setLastVote] = useState<VoteEvent | null>(null)
  const [tally, setTally] = useState<TallyEvent | null>(null)
  const [quorum, setQuorum] = useState<QuorumEvent | null>(null)
  const [votingState, setVotingState] = useState<VotingStateEvent | null>(null)
  const [lastResult, setLastResult] = useState<ResultEvent | null>(null)
  const [voteLog, setVoteLog] = useState<VoteEvent[]>([])

  useEffect(() => {
    if (!assemblyId) return

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
    const socket = io(`${apiUrl}/voting`, {
      query: { assemblyId },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('vote:received', (data: VoteEvent) => {
      setLastVote(data)
      setVoteLog(prev => [data, ...prev].slice(0, 100))
    })
    socket.on('tally:update', (data: TallyEvent) => setTally(data))
    socket.on('quorum:update', (data: QuorumEvent) => setQuorum(data))
    socket.on('voting:state', (data: VotingStateEvent) => setVotingState(data))
    socket.on('voting:result', (data: ResultEvent) => setLastResult(data))

    socketRef.current = socket
    return () => { socket.disconnect(); socketRef.current = null }
  }, [assemblyId])

  const clearLog = useCallback(() => setVoteLog([]), [])

  return { isConnected, lastVote, tally, quorum, votingState, lastResult, voteLog, clearLog }
}
