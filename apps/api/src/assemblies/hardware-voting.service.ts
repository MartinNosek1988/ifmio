import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { VotingGateway } from './voting.gateway'
import { AssembliesService } from './assemblies.service'
import type { AuthUser } from '@ifmio/shared-types'
import type { VoteChoice } from '@prisma/client'

@Injectable()
export class HardwareVotingService {
  private readonly logger = new Logger(HardwareVotingService.name)

  constructor(
    private prisma: PrismaService,
    private gateway: VotingGateway,
    private assemblies: AssembliesService,
  ) {}

  // ─── Session management ────────────────────────────────────────

  async createSession(user: AuthUser, assemblyId: string) {
    const assembly = await this.assemblies.findOne(user, assemblyId)

    const existing = await this.prisma.hardwareVotingSession.findUnique({ where: { assemblyId } })
    if (existing) return existing

    return this.prisma.hardwareVotingSession.create({
      data: { assemblyId, tenantId: user.tenantId, isActive: true },
    })
  }

  async getSession(user: AuthUser, assemblyId: string) {
    await this.assemblies.findOne(user, assemblyId)
    const session = await this.prisma.hardwareVotingSession.findUnique({ where: { assemblyId } })
    if (!session) throw new NotFoundException('Hardware session neexistuje')
    return { ...session, connectedClients: this.gateway.getConnectedCount(assemblyId) }
  }

  async deactivateSession(user: AuthUser, assemblyId: string) {
    await this.assemblies.findOne(user, assemblyId)
    const session = await this.prisma.hardwareVotingSession.findUnique({ where: { assemblyId } })
    if (!session) throw new NotFoundException('Hardware session neexistuje')
    return this.prisma.hardwareVotingSession.update({
      where: { id: session.id },
      data: { isActive: false, votingOpen: false },
    })
  }

  // ─── Voting control ────────────────────────────────────────────

  async openVoting(user: AuthUser, assemblyId: string, agendaItemId: string) {
    await this.assemblies.findOne(user, assemblyId)
    const session = await this.prisma.hardwareVotingSession.findUnique({ where: { assemblyId } })
    if (!session || !session.isActive) throw new BadRequestException('Hardware session není aktivní')

    const item = await this.prisma.assemblyAgendaItem.findFirst({ where: { id: agendaItemId, assemblyId } })
    if (!item) throw new NotFoundException('Bod programu nenalezen')

    await this.prisma.hardwareVotingSession.update({
      where: { id: session.id },
      data: { currentItemId: agendaItemId, votingOpen: true },
    })

    this.gateway.broadcastVotingState(assemblyId, {
      agendaItemId, votingOpen: true, itemTitle: item.title,
    })

    return { success: true, agendaItemId, itemTitle: item.title }
  }

  async closeVoting(user: AuthUser, assemblyId: string) {
    const session = await this.prisma.hardwareVotingSession.findUnique({ where: { assemblyId } })
    if (!session || !session.currentItemId) throw new BadRequestException('Žádné aktivní hlasování')

    const itemId = session.currentItemId

    await this.prisma.hardwareVotingSession.update({
      where: { id: session.id },
      data: { votingOpen: false },
    })

    // Evaluate the vote
    const result = await this.assemblies.evaluateVote(user, assemblyId, itemId)

    this.gateway.broadcastVotingState(assemblyId, {
      agendaItemId: itemId, votingOpen: false, itemTitle: '',
    })

    this.gateway.broadcastResult(assemblyId, {
      agendaItemId: itemId,
      result: result.result,
      votesFor: result.votesFor,
      votesAgainst: result.votesAgainst,
      votesAbstain: result.votesAbstain,
    })

    return result
  }

  // ─── Bridge endpoints ──────────────────────────────────────────

  async receiveVote(bridgeApiKey: string, data: { keypadId: string; choice: string; timestamp: number }) {
    const session = await this.prisma.hardwareVotingSession.findUnique({ where: { bridgeApiKey } })
    if (!session) throw new NotFoundException('Neplatný API klíč')
    if (!session.isActive || !session.votingOpen || !session.currentItemId) {
      return { success: false, error: 'Hlasování není otevřeno' }
    }

    // Find attendee by keypadId
    const attendee = await this.prisma.assemblyAttendee.findFirst({
      where: { assemblyId: session.assemblyId, keypadId: data.keypadId },
    })
    if (!attendee) {
      this.logger.warn(`Vote from unregistered keypad ${data.keypadId}`)
      return { success: false, error: 'Neregistrovaný ovladač' }
    }

    const shareWeight = Number(attendee.totalShare)

    // Upsert vote
    await this.prisma.assemblyVote.upsert({
      where: { agendaItemId_attendeeId: { agendaItemId: session.currentItemId, attendeeId: attendee.id } },
      update: { choice: data.choice as VoteChoice, shareWeight, keypadId: data.keypadId, receivedAt: new Date() },
      create: {
        agendaItemId: session.currentItemId, attendeeId: attendee.id,
        choice: data.choice as VoteChoice, shareWeight,
        keypadId: data.keypadId, receivedAt: new Date(),
      },
    })

    // Broadcast vote
    this.gateway.broadcastVote(session.assemblyId, {
      keypadId: data.keypadId,
      attendeeName: attendee.name,
      choice: data.choice,
      shareWeight,
      agendaItemId: session.currentItemId,
      timestamp: new Date(),
    })

    // Recalculate and broadcast tally
    const votes = await this.prisma.assemblyVote.findMany({ where: { agendaItemId: session.currentItemId } })
    let votesFor = 0, votesAgainst = 0, votesAbstain = 0
    for (const v of votes) {
      const w = Number(v.shareWeight)
      if (v.choice === 'ANO') votesFor += w
      else if (v.choice === 'NE') votesAgainst += w
      else votesAbstain += w
    }

    const presentAttendees = await this.prisma.assemblyAttendee.count({
      where: { assemblyId: session.assemblyId, isPresent: true, leftAt: null },
    })

    this.gateway.broadcastTally(session.assemblyId, {
      agendaItemId: session.currentItemId,
      votesFor, votesAgainst, votesAbstain,
      totalVoted: votes.length,
      totalEligible: presentAttendees,
    })

    return { success: true, attendeeName: attendee.name, choice: data.choice }
  }

  async receivePing(bridgeApiKey: string, data: { timestamp: number; keypadCount?: number }) {
    const session = await this.prisma.hardwareVotingSession.findUnique({ where: { bridgeApiKey } })
    if (!session) throw new NotFoundException('Neplatný API klíč')

    await this.prisma.hardwareVotingSession.update({
      where: { id: session.id },
      data: {
        lastPingAt: new Date(),
        ...(data.keypadCount !== undefined ? { connectedKeypads: data.keypadCount } : {}),
      },
    })

    return { success: true, votingOpen: session.votingOpen, currentItemId: session.currentItemId }
  }
}
