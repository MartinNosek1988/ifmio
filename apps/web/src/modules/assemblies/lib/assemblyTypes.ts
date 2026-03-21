export type AssemblyStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MajorityType = 'NADPOLOVICNI_PRITOMNYCH' | 'NADPOLOVICNI_VSECH' | 'KVALIFIKOVANA' | 'JEDNOMYSLNA'
export type VoteResult = 'SCHVALENO' | 'NESCHVALENO' | 'NEUSNASENO'
export type VoteChoice = 'ANO' | 'NE' | 'ZDRZET'

export interface Assembly {
  id: string
  tenantId: string
  propertyId: string
  title: string
  description: string | null
  assemblyNumber: number
  scheduledAt: string
  location: string
  status: AssemblyStatus
  startedAt: string | null
  endedAt: string | null
  totalShares: string | null
  presentShares: string | null
  isQuorate: boolean | null
  notes: string | null
  createdAt: string
  updatedAt: string
  property?: { id: string; name: string; address?: string; city?: string }
  agendaItems?: AgendaItem[]
  attendees?: Attendee[]
  _count?: { agendaItems: number; attendees: number }
}

export interface AgendaItem {
  id: string
  assemblyId: string
  orderNumber: number
  title: string
  description: string | null
  requiresVote: boolean
  majorityType: MajorityType
  result: VoteResult | null
  votesFor: string | null
  votesAgainst: string | null
  votesAbstain: string | null
  isCounterProposal: boolean
  parentItemId: string | null
  notes: string | null
  counterProposals?: AgendaItem[]
  _count?: { votes: number }
}

export interface Attendee {
  id: string
  assemblyId: string
  principalId: string | null
  partyId: string | null
  name: string
  unitIds: string[]
  totalShare: string
  isPresent: boolean
  registeredAt: string
  leftAt: string | null
  hasPowerOfAttorney: boolean
  powerOfAttorneyFrom: string | null
  keypadId: string | null
  notes: string | null
  _count?: { votes: number }
}

export interface Vote {
  id: string
  agendaItemId: string
  attendeeId: string
  choice: VoteChoice
  shareWeight: string
  attendee?: { id: string; name: string; totalShare: string }
}

export interface QuorumStatus {
  totalShares: number
  presentShares: number
  quorumPercentage: number
  isQuorate: boolean
}

export interface VoteEvaluation {
  result: VoteResult
  votesFor: number
  votesAgainst: number
  votesAbstain: number
  totalShares: number
  presentShares: number
  majorityType: MajorityType
}

export const STATUS_LABELS: Record<AssemblyStatus, string> = {
  DRAFT: 'Příprava',
  PUBLISHED: 'Publikováno',
  IN_PROGRESS: 'Probíhá',
  COMPLETED: 'Dokončeno',
  CANCELLED: 'Zrušeno',
}

export const STATUS_COLORS: Record<AssemblyStatus, string> = {
  DRAFT: 'muted',
  PUBLISHED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

export const MAJORITY_LABELS: Record<MajorityType, string> = {
  NADPOLOVICNI_PRITOMNYCH: 'Nadpoloviční přítomných',
  NADPOLOVICNI_VSECH: 'Nadpoloviční všech',
  KVALIFIKOVANA: 'Kvalifikovaná (75 %)',
  JEDNOMYSLNA: 'Jednomyslná (100 %)',
}

export const RESULT_LABELS: Record<VoteResult, string> = {
  SCHVALENO: 'Schváleno',
  NESCHVALENO: 'Neschváleno',
  NEUSNASENO: 'Neusnášeníschopné',
}

export const CHOICE_LABELS: Record<VoteChoice, string> = {
  ANO: 'Ano',
  NE: 'Ne',
  ZDRZET: 'Zdržet se',
}
