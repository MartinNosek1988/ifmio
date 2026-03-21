import type { MajorityType, VoteResult, VoteChoice } from './assemblyTypes'
export type { MajorityType, VoteResult, VoteChoice }

export type PerRollamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
export type BallotStatus = 'PENDING' | 'SUBMITTED' | 'MANUAL_ENTRY'
export type BallotMethod = 'ONLINE' | 'PAPER_UPLOAD' | 'MANUAL'

export interface PerRollamVoting {
  id: string
  tenantId: string
  propertyId: string
  title: string
  description: string | null
  votingNumber: number
  publishedAt: string | null
  deadline: string
  resultsNotifiedAt: string | null
  status: PerRollamStatus
  totalShares: string | null
  respondedShares: string | null
  isQuorate: boolean | null
  documentIds: string[]
  notes: string | null
  createdAt: string
  property?: { id: string; name: string; address?: string; city?: string }
  items?: PerRollamItem[]
  ballots?: PerRollamBallot[]
  _count?: { items: number; ballots: number }
}

export interface PerRollamItem {
  id: string
  votingId: string
  orderNumber: number
  title: string
  description: string | null
  majorityType: MajorityType
  result: VoteResult | null
  votesFor: string | null
  votesAgainst: string | null
  votesAbstain: string | null
}

export interface PerRollamBallot {
  id: string
  votingId: string
  principalId: string | null
  partyId: string | null
  name: string
  unitIds: string[]
  totalShare: string
  status: BallotStatus
  submittedAt: string | null
  submissionMethod: BallotMethod | null
  accessToken: string | null
  tokenExpiresAt: string | null
  responses?: PerRollamResponse[]
  voting?: PerRollamVoting
  _count?: { responses: number }
}

export interface PerRollamResponse {
  id: string
  itemId: string
  ballotId: string
  choice: VoteChoice
  shareWeight: string
}

export interface PerRollamProgress {
  total: number
  submitted: number
  pending: number
  totalShares: number
  respondedShares: number
  shareProgress: number
}

export const PR_STATUS_LABELS: Record<PerRollamStatus, string> = {
  DRAFT: 'Příprava',
  PUBLISHED: 'Probíhá',
  CLOSED: 'Uzavřeno',
  COMPLETED: 'Dokončeno',
  CANCELLED: 'Zrušeno',
}

export const PR_STATUS_COLORS: Record<PerRollamStatus, string> = {
  DRAFT: 'muted',
  PUBLISHED: 'blue',
  CLOSED: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

export const BALLOT_STATUS_LABELS: Record<BallotStatus, string> = {
  PENDING: 'Čeká',
  SUBMITTED: 'Odevzdáno',
  MANUAL_ENTRY: 'Ručně zadáno',
}

export const BALLOT_STATUS_COLORS: Record<BallotStatus, string> = {
  PENDING: 'yellow',
  SUBMITTED: 'green',
  MANUAL_ENTRY: 'blue',
}
